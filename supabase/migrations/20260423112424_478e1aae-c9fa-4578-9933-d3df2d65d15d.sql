-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Tabla user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Función has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Políticas para user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Reemplazar políticas públicas en invoices
DROP POLICY IF EXISTS "Public read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public delete invoices" ON public.invoices;

CREATE POLICY "Authenticated read invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins insert invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Reemplazar políticas públicas en issuers
DROP POLICY IF EXISTS "Public read issuers" ON public.issuers;
DROP POLICY IF EXISTS "Public insert issuers" ON public.issuers;
DROP POLICY IF EXISTS "Public update issuers" ON public.issuers;

CREATE POLICY "Authenticated read issuers"
ON public.issuers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins insert issuers"
ON public.issuers FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update issuers"
ON public.issuers FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete issuers"
ON public.issuers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));