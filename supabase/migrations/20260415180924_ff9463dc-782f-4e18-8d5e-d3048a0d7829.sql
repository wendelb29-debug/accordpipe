
-- =============================================
-- ACADEMY CATEGORIES
-- =============================================
CREATE TABLE public.academy_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('global', 'tenant')),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_categories ENABLE ROW LEVEL SECURITY;

-- View: global published OR own tenant
CREATE POLICY "academy_categories_select" ON public.academy_categories
  FOR SELECT TO authenticated
  USING (
    (scope_type = 'global' AND is_active = true)
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

-- Insert: master can create global; tenant users create tenant-scoped
CREATE POLICY "academy_categories_insert" ON public.academy_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

-- Update
CREATE POLICY "academy_categories_update" ON public.academy_categories
  FOR UPDATE TO authenticated
  USING (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

-- Delete
CREATE POLICY "academy_categories_delete" ON public.academy_categories
  FOR DELETE TO authenticated
  USING (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

-- =============================================
-- ACADEMY COURSES
-- =============================================
CREATE TABLE public.academy_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('global', 'tenant')),
  category_id UUID REFERENCES public.academy_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  level TEXT NOT NULL DEFAULT 'basic' CHECK (level IN ('basic', 'intermediate', 'advanced')),
  estimated_duration_minutes INTEGER DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_courses_select" ON public.academy_courses
  FOR SELECT TO authenticated
  USING (
    (scope_type = 'global' AND is_published = true)
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "academy_courses_insert" ON public.academy_courses
  FOR INSERT TO authenticated
  WITH CHECK (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "academy_courses_update" ON public.academy_courses
  FOR UPDATE TO authenticated
  USING (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "academy_courses_delete" ON public.academy_courses
  FOR DELETE TO authenticated
  USING (
    (scope_type = 'global' AND public.is_master(auth.uid()))
    OR
    (scope_type = 'tenant' AND tenant_id = public.get_user_company_id(auth.uid()))
  );

-- =============================================
-- ACADEMY LESSONS
-- =============================================
CREATE TABLE public.academy_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content_html TEXT,
  attachment_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

-- Lessons inherit visibility from course
CREATE POLICY "academy_lessons_select" ON public.academy_lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_courses c
      WHERE c.id = course_id
      AND (
        (c.scope_type = 'global' AND c.is_published = true)
        OR
        (c.scope_type = 'tenant' AND c.tenant_id = public.get_user_company_id(auth.uid()))
      )
    )
  );

CREATE POLICY "academy_lessons_insert" ON public.academy_lessons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_courses c
      WHERE c.id = course_id
      AND (
        (c.scope_type = 'global' AND public.is_master(auth.uid()))
        OR
        (c.scope_type = 'tenant' AND c.tenant_id = public.get_user_company_id(auth.uid()))
      )
    )
  );

CREATE POLICY "academy_lessons_update" ON public.academy_lessons
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_courses c
      WHERE c.id = course_id
      AND (
        (c.scope_type = 'global' AND public.is_master(auth.uid()))
        OR
        (c.scope_type = 'tenant' AND c.tenant_id = public.get_user_company_id(auth.uid()))
      )
    )
  );

CREATE POLICY "academy_lessons_delete" ON public.academy_lessons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_courses c
      WHERE c.id = course_id
      AND (
        (c.scope_type = 'global' AND public.is_master(auth.uid()))
        OR
        (c.scope_type = 'tenant' AND c.tenant_id = public.get_user_company_id(auth.uid()))
      )
    )
  );

-- =============================================
-- ACADEMY PROGRESS
-- =============================================
CREATE TABLE public.academy_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT now(),
  watch_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own progress
CREATE POLICY "academy_progress_select" ON public.academy_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "academy_progress_insert" ON public.academy_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "academy_progress_update" ON public.academy_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_academy_courses_category ON public.academy_courses(category_id);
CREATE INDEX idx_academy_courses_tenant ON public.academy_courses(tenant_id);
CREATE INDEX idx_academy_lessons_course ON public.academy_lessons(course_id);
CREATE INDEX idx_academy_progress_user ON public.academy_progress(user_id, course_id);
CREATE INDEX idx_academy_progress_lesson ON public.academy_progress(lesson_id);

-- Triggers for updated_at
CREATE TRIGGER update_academy_categories_updated_at BEFORE UPDATE ON public.academy_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_academy_courses_updated_at BEFORE UPDATE ON public.academy_courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_academy_lessons_updated_at BEFORE UPDATE ON public.academy_lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_academy_progress_updated_at BEFORE UPDATE ON public.academy_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
