import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";

export function useAcademyCategories() {
  return useQuery({
    queryKey: ["academy-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademyCourses(categoryId?: string) {
  return useQuery({
    queryKey: ["academy-courses", categoryId],
    queryFn: async () => {
      let q = supabase
        .from("academy_courses")
        .select("*, academy_categories(name)")
        .order("sort_order");
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademyCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["academy-course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_courses")
        .select("*, academy_categories(name)")
        .eq("id", courseId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademyLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ["academy-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useAcademyProgress(courseId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["academy-progress", user?.id, courseId],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("academy_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkLessonComplete() {
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, lessonId }: { courseId: string; lessonId: string }) => {
      if (!user || !activeCompanyId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("academy_progress")
        .upsert(
          {
            tenant_id: activeCompanyId,
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
            watch_percent: 100,
          },
          { onConflict: "user_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-progress"] });
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();

  return useMutation({
    mutationFn: async (cat: { id?: string; name: string; description?: string; scope_type: string; sort_order?: number }) => {
      const payload = {
        ...cat,
        tenant_id: cat.scope_type === "tenant" ? activeCompanyId : null,
        created_by: user?.id,
      };
      if (cat.id) {
        const { error } = await supabase.from("academy_categories").update(payload).eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academy_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-categories"] });
      toast.success("Categoria salva!");
    },
  });
}

export function useSaveCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();

  return useMutation({
    mutationFn: async (course: {
      id?: string;
      title: string;
      description?: string;
      category_id?: string;
      scope_type: string;
      level?: string;
      estimated_duration_minutes?: number;
      is_published?: boolean;
      thumbnail_url?: string;
    }) => {
      const payload = {
        ...course,
        tenant_id: course.scope_type === "tenant" ? activeCompanyId : null,
        created_by: user?.id,
      };
      if (course.id) {
        const { error } = await supabase.from("academy_courses").update(payload).eq("id", course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academy_courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success("Curso salvo!");
    },
  });
}

export function useSaveLesson() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (lesson: {
      id?: string;
      course_id: string;
      title: string;
      description?: string;
      video_url?: string;
      content_html?: string;
      attachment_url?: string;
      duration_minutes?: number;
      sort_order?: number;
      is_published?: boolean;
      is_preview?: boolean;
    }) => {
      if (lesson.id) {
        const { error } = await supabase.from("academy_lessons").update(lesson).eq("id", lesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academy_lessons").insert(lesson);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-lessons"] });
      toast.success("Aula salva!");
    },
  });
}
