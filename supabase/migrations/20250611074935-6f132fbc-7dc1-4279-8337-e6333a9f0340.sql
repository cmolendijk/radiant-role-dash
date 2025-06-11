
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'employee');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table to manage role assignments
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS public.app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role public.app_role, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $2 AND role = $1
  );
$$;

-- Security definer function to check if user can manage another user
CREATE OR REPLACE FUNCTION public.can_manage_user(target_user_id UUID, manager_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    -- Owner can manage anyone
    public.has_role('owner', $2) OR
    -- Admin can manage anyone
    public.has_role('admin', $2) OR
    -- Manager can manage employees in their team
    (public.has_role('manager', $2) AND EXISTS (
      SELECT 1 FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.team_id = ur2.team_id
      WHERE ur1.user_id = $2 AND ur2.user_id = $1
      AND ur2.role = 'employee'
    ));
$$;

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  );

CREATE POLICY "Admins and owners can view all teams" ON public.teams
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Admins and owners can create teams" ON public.teams
  FOR INSERT WITH CHECK (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Admins and owners can update teams" ON public.teams
  FOR UPDATE USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Owners can delete teams" ON public.teams
  FOR DELETE USING (public.has_role('owner'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and owners can view all roles" ON public.user_roles
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Managers can view roles in their team" ON public.user_roles
  FOR SELECT USING (
    public.has_role('manager') AND team_id IN (
      SELECT team_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  );

CREATE POLICY "Admins and owners can assign roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Admins and owners can update roles" ON public.user_roles
  FOR UPDATE USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Owners can delete role assignments" ON public.user_roles
  FOR DELETE USING (public.has_role('owner'));

-- RLS Policies for tasks table
CREATE POLICY "Users can view tasks assigned to them" ON public.tasks
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Users can view tasks they created" ON public.tasks
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Managers can view tasks in their team" ON public.tasks
  FOR SELECT USING (
    public.has_role('manager') AND (
      team_id IN (
        SELECT team_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND team_id IS NOT NULL
      ) OR created_by = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can view all tasks" ON public.tasks
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Managers, admins and owners can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    public.has_role('manager') OR public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Task creators can update their tasks" ON public.tasks
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Assigned users can update task status" ON public.tasks
  FOR UPDATE USING (assigned_to = auth.uid());

CREATE POLICY "Managers can update tasks in their team" ON public.tasks
  FOR UPDATE USING (
    public.has_role('manager') AND team_id IN (
      SELECT team_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  );

CREATE POLICY "Admins and owners can update all tasks" ON public.tasks
  FOR UPDATE USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Admins and owners can delete tasks" ON public.tasks
  FOR DELETE USING (
    public.has_role('admin') OR public.has_role('owner')
  );

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Managers can view profiles of their team members" ON public.profiles
  FOR SELECT USING (
    public.has_role('manager') AND id IN (
      SELECT ur1.user_id FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.team_id = ur2.team_id
      WHERE ur2.user_id = auth.uid() AND ur1.team_id IS NOT NULL
    )
  );

CREATE POLICY "Admins and owners can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins and owners can update all profiles" ON public.profiles
  FOR UPDATE USING (
    public.has_role('admin') OR public.has_role('owner')
  );

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Create trigger function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger to handle new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
