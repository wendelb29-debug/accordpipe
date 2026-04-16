import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAcademyCategories, useAcademyCourses, useAcademyProgress } from "@/hooks/useAcademy";
import { useAcademyLessons } from "@/hooks/useAcademy";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, BookOpen, Clock, GraduationCap, Play, Globe, Building2,
  TrendingUp, Award, Target, ArrowRight, Sparkles, CheckCircle2,
  BarChart3, Zap, BookMarked
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const lang = i18n.language;
  const labels = levelLabels[lang] || levelLabels["pt-BR"];

  const publishedCourses = useMemo(
    () => courses.filter((c: any) => c.is_published),
    [courses]
  );

  // Progress tracking
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

  const totalCompletedLessons = useMemo(() => {
    let count = 0;
    completedLessonsByCourse.forEach((set) => (count += set.size));
    return count;
  }, [completedLessonsByCourse]);

  const coursesStarted = completedLessonsByCourse.size;

  // Overall stats
  const totalDurationMinutes = publishedCourses.reduce(
    (sum: number, c: any) => sum + (c.estimated_duration_minutes || 0), 0
  );

  // Determine course status for filtering
  const getCourseStatus = (courseId: string) => {
    const completed = completedLessonsByCourse.get(courseId);
    if (!completed || completed.size === 0) return "not_started";
    return "in_progress"; // simplified - full completion needs lesson count
  };

  const filteredCourses = useMemo(() => {
    let filtered = publishedCourses;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (c: any) =>
          c.title.toLowerCase().includes(s) ||
          c.description?.toLowerCase().includes(s)
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter((c: any) => c.category_id === selectedCategory);
    }
    if (selectedLevel) {
      filtered = filtered.filter((c: any) => c.level === selectedLevel);
    }
    if (selectedStatus) {
      filtered = filtered.filter((c: any) => {
        const status = getCourseStatus(c.id);
        return status === selectedStatus;
      });
    }
    return filtered;
  }, [publishedCourses, search, selectedCategory, selectedLevel, selectedStatus]);

  const globalCourses = filteredCourses.filter((c: any) => c.scope_type === "global");
  const tenantCourses = filteredCourses.filter((c: any) => c.scope_type === "tenant");

  // In-progress courses
  const inProgressCourses = publishedCourses.filter(
    (c: any) => completedLessonsByCourse.has(c.id) && (completedLessonsByCourse.get(c.id)?.size || 0) > 0
  );

  // Last accessed - pick most recent progress
  const lastAccessedCourseId = useMemo(() => {
    if (progress.length === 0) return null;
    const sorted = [...progress].sort(
      (a: any, b: any) => new Date(b.updated_at || b.completed_at || b.created_at).getTime() -
        new Date(a.updated_at || a.completed_at || a.created_at).getTime()
    );
    return sorted[0]?.course_id;
  }, [progress]);

  const lastAccessedCourse = publishedCourses.find((c: any) => c.id === lastAccessedCourseId);

  if (isLoading) {
    return <AcademySkeleton />;
  }

  return (
    <div className="space-y-8 mt-4">
      {/* Premium Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>
        <div className="relative z-10 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Accord Academy</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                Aprenda a dominar o Accord
              </h2>
              <p className="text-muted-foreground max-w-lg text-sm lg:text-base">
                Cursos, trilhas e treinamentos para sua equipe usar todo o potencial da plataforma.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {lastAccessedCourse ? (
                  <Button onClick={() => onSelectCourse(lastAccessedCourse.id)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Continuar aprendizado
                  </Button>
                ) : publishedCourses.length > 0 ? (
                  <Button onClick={() => onSelectCourse(publishedCourses[0].id)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Começar a aprender
                  </Button>
                ) : null}
                <Button variant="outline" className="gap-2" onClick={() => {
                  document.getElementById("academy-courses-section")?.scrollIntoView({ behavior: "smooth" });
                }}>
                  <BookMarked className="h-4 w-4" />
                  Explorar cursos
                </Button>
              </div>
            </div>

            {/* Progress summary in hero */}
            <div className="grid grid-cols-2 gap-3 lg:w-72 shrink-0">
              <StatMiniCard icon={<BookOpen className="h-4 w-4" />} value={publishedCourses.length} label="Cursos disponíveis" />
              <StatMiniCard icon={<CheckCircle2 className="h-4 w-4" />} value={totalCompletedLessons} label="Aulas concluídas" />
              <StatMiniCard icon={<TrendingUp className="h-4 w-4" />} value={coursesStarted} label="Cursos iniciados" />
              <StatMiniCard icon={<Clock className="h-4 w-4" />} value={`${Math.round(totalDurationMinutes / 60)}h`} label="De conteúdo" />
            </div>
          </div>
        </div>
      </div>

      {/* Continue where you left off */}
      {inProgressCourses.length > 0 && (
        <Section
          title="Continue de onde parou"
          icon={<Play className="h-4 w-4" />}
          accent
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressCourses.slice(0, 3).map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
                labels={labels}
                showProgress
              />
            ))}
          </div>
        </Section>
      )}

      {/* Filters */}
      <div id="academy-courses-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedLevel || "all"} onValueChange={(v) => setSelectedLevel(v === "all" ? null : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? null : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="not_started">Não iniciado</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Badge>
          {categories.map((cat: any) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Global Courses */}
      {globalCourses.length > 0 && (
        <Section title="Cursos Accord" icon={<Globe className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {globalCourses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
                labels={labels}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Tenant Courses */}
      {tenantCourses.length > 0 && (
        <Section title="Cursos do Tenant" icon={<Building2 className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tenantCourses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                completedLessons={completedLessonsByCourse.get(course.id)?.size || 0}
                labels={labels}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Premium Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
            <GraduationCap className="h-10 w-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum curso disponível ainda
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Crie treinamentos, organize trilhas e capacite seu time dentro da Accord Academy.
          </p>
        </div>
      )}
    </div>
  );
}

function StatMiniCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 p-3 space-y-1">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function Section({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CourseCard({
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
    <Card
      className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group overflow-hidden flex flex-col"
      onClick={onClick}
    >
      {course.thumbnail_url ? (
        <div className="h-36 overflow-hidden relative">
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative">
          <BookOpen className="h-10 w-10 text-primary/20 group-hover:text-primary/30 transition-colors" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>
      )}
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          {course.academy_categories?.name && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {course.academy_categories.name}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", levelColors[course.level])}>
            {labels[course.level] || course.level}
          </Badge>
          {hasProgress && (
            <Badge className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
              Em andamento
            </Badge>
          )}
        </div>
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {course.title}
        </h4>
        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          {course.estimated_duration_minutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.estimated_duration_minutes} min
            </span>
          )}
          {course.scope_type === "global" && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> Accord
            </span>
          )}
        </div>
        {showProgress && hasProgress && (
          <div className="space-y-1 pt-1">
            <Progress value={Math.min(completedLessons * 20, 100)} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{completedLessons} aulas concluídas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AcademySkeleton() {
  return (
    <div className="space-y-8 mt-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
