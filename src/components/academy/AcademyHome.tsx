import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAcademyCategories, useAcademyCourses, useAcademyProgress } from "@/hooks/useAcademy";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Search, BookOpen, Clock, GraduationCap, Play, Globe, Building2,
  ChevronLeft, ChevronRight, Sparkles, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSelectCourse: (id: string) => void;
}

const levelColors: Record<string, string> = {
  basic: "bg-green-500/10 text-green-600 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-600 border-red-500/20",
};

const levelLabels: Record<string, Record<string, string>> = {
  "pt-BR": { basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" },
  en: { basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" },
  es: { basic: "Básico", intermediate: "Intermedio", advanced: "Avanzado" },
  "pt-PT": { basic: "Básico", intermediate: "Intermédio", advanced: "Avançado" },
};

export function AcademyHome({ onSelectCourse }: Props) {
  const { t, i18n } = useTranslation();
  const { data: categories = [] } = useAcademyCategories();
  const { data: courses = [], isLoading } = useAcademyCourses();
  const { data: progress = [] } = useAcademyProgress();
  const [search, setSearch] = useState("");

  const lang = i18n.language;
  const labels = levelLabels[lang] || levelLabels["pt-BR"];

  const publishedCourses = useMemo(
    () => courses.filter((c: any) => c.is_published),
    [courses]
  );

  const completedLessonsByCourse = useMemo(() => {
    const map = new Map<string, Set<string>>();
    progress.forEach((p: any) => {
      if (p.completed) {
        if (!map.has(p.course_id)) map.set(p.course_id, new Set());
        map.get(p.course_id)!.add(p.lesson_id);
      }
    });
    return map;
  }, [progress]);

  // Last accessed
  const lastAccessedCourseId = useMemo(() => {
    if (progress.length === 0) return null;
    const sorted = [...progress].sort(
      (a: any, b: any) =>
        new Date(b.updated_at || b.completed_at || b.created_at).getTime() -
        new Date(a.updated_at || a.completed_at || a.created_at).getTime()
    );
    return sorted[0]?.course_id;
  }, [progress]);

  const lastAccessedCourse = publishedCourses.find((c: any) => c.id === lastAccessedCourseId);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return publishedCourses;
    const s = search.toLowerCase();
    return publishedCourses.filter(
      (c: any) => c.title.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s)
    );
  }, [publishedCourses, search]);

  // In progress
  const inProgressCourses = filtered.filter(
    (c: any) => completedLessonsByCourse.has(c.id) && (completedLessonsByCourse.get(c.id)?.size || 0) > 0
  );

  // Group by category
  const globalCourses = filtered.filter((c: any) => c.scope_type === "global");
  const tenantCourses = filtered.filter((c: any) => c.scope_type === "tenant");

  const coursesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; courses: any[] }>();
    filtered.forEach((c: any) => {
      const catId = c.category_id || "__uncategorized";
      const catName = c.academy_categories?.name || "Outros";
      if (!map.has(catId)) map.set(catId, { name: catName, courses: [] });
      map.get(catId)!.courses.push(c);
    });
    return Array.from(map.values());
  }, [filtered]);

  if (isLoading) return <AcademySkeleton />;

  return (
    <div className="space-y-8 mt-2 -mx-2 sm:mx-0">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden mx-2 sm:mx-0">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="relative z-20 p-6 lg:p-10 flex flex-col gap-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Accord Academy</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold text-foreground leading-tight">
            Aprenda a dominar o Accord
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Cursos, trilhas e treinamentos para sua equipe usar todo o potencial da plataforma.
          </p>
          <div className="flex gap-3 pt-2">
            {lastAccessedCourse ? (
              <Button onClick={() => onSelectCourse(lastAccessedCourse.id)} className="gap-2">
                <Play className="h-4 w-4" /> Continuar assistindo
              </Button>
            ) : publishedCourses.length > 0 ? (
              <Button onClick={() => onSelectCourse(publishedCourses[0].id)} className="gap-2">
                <Play className="h-4 w-4" /> Começar a assistir
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 sm:px-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Continue watching row */}
      {inProgressCourses.length > 0 && (
        <NetflixRow title="Continuar assistindo" icon={<Play className="h-4 w-4" />} accent>
          {inProgressCourses.map((course: any) => (
            <NetflixCard
              key={course.id}
              course={course}
              onClick={() => onSelectCourse(course.id)}
              completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
              labels={labels}
              showProgress
            />
          ))}
        </NetflixRow>
      )}

      {/* Global Courses */}
      {globalCourses.length > 0 && (
        <NetflixRow title="Cursos Accord" icon={<Globe className="h-4 w-4" />}>
          {globalCourses.map((course: any) => (
            <NetflixCard
              key={course.id}
              course={course}
              onClick={() => onSelectCourse(course.id)}
              completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
              labels={labels}
            />
          ))}
        </NetflixRow>
      )}

      {/* Tenant Courses */}
      {tenantCourses.length > 0 && (
        <NetflixRow title="Cursos do Tenant" icon={<Building2 className="h-4 w-4" />}>
          {tenantCourses.map((course: any) => (
            <NetflixCard
              key={course.id}
              course={course}
              onClick={() => onSelectCourse(course.id)}
              completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
              labels={labels}
            />
          ))}
        </NetflixRow>
      )}

      {/* By Category */}
      {coursesByCategory
        .filter((g) => g.name !== "Outros" || coursesByCategory.length === 1)
        .map((group) => (
          <NetflixRow key={group.name} title={group.name} icon={<BookOpen className="h-4 w-4" />}>
            {group.courses.map((course: any) => (
              <NetflixCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
                labels={labels}
              />
            ))}
          </NetflixRow>
        ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
            <GraduationCap className="h-10 w-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum curso disponível</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Crie treinamentos e capacite seu time dentro da Accord Academy.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Netflix-style horizontal scrollable row ── */
function NetflixRow({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2 sm:px-0">
        <div className="flex items-center gap-2">
          <span className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</span>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-2 sm:px-0 pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Netflix-style course card ── */
function NetflixCard({
  course,
  onClick,
  completedLessons = 0,
  labels,
  showProgress,
}: {
  course: any;
  onClick: () => void;
  completedLessons?: number;
  labels: Record<string, string>;
  showProgress?: boolean;
}) {
  const hasProgress = completedLessons > 0;

  return (
    <div
      className="flex-none w-[200px] sm:w-[240px] cursor-pointer group snap-start"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-muted flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-primary/25" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
        {/* Progress bar on thumbnail */}
        {showProgress && hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(completedLessons * 20, 100)}%` }}
            />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {hasProgress && !showProgress && (
            <span className="bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
              EM ANDAMENTO
            </span>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="space-y-1 px-0.5">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {course.title}
        </h4>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", levelColors[course.level])}>
            {labels[course.level] || course.level}
          </Badge>
          {course.estimated_duration_minutes > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {course.estimated_duration_minutes}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AcademySkeleton() {
  return (
    <div className="space-y-8 mt-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex-none w-[240px]">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
