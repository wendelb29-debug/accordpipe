import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAcademyCategories, useAcademyCourses, useAcademyProgress } from "@/hooks/useAcademy";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, Clock, GraduationCap, Play, Globe, Building2 } from "lucide-react";
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

  const lang = i18n.language;
  const labels = levelLabels[lang] || levelLabels["pt-BR"];

  const publishedCourses = useMemo(
    () => courses.filter((c: any) => c.is_published),
    [courses]
  );

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
    return filtered;
  }, [publishedCourses, search, selectedCategory]);

  const globalCourses = filteredCourses.filter((c: any) => c.scope_type === "global");
  const tenantCourses = filteredCourses.filter((c: any) => c.scope_type === "tenant");

  // Courses in progress
  const progressMap = new Map<string, number>();
  progress.forEach((p: any) => {
    if (p.completed) {
      progressMap.set(p.course_id, (progressMap.get(p.course_id) || 0) + 1);
    }
  });

  const inProgressCourses = publishedCourses.filter(
    (c: any) => progressMap.has(c.id) && (progressMap.get(c.id) || 0) > 0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("academy.bannerTitle")}</h2>
          <p className="text-muted-foreground max-w-lg">{t("academy.bannerDesc")}</p>
        </div>
        <GraduationCap className="absolute right-8 bottom-4 h-32 w-32 text-primary/5" />
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("academy.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            {t("common.all")}
          </Badge>
          {categories.map((cat: any) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Continue Watching */}
      {inProgressCourses.length > 0 && (
        <Section title={t("academy.continueWatching")} icon={<Play className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressCourses.slice(0, 3).map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                progressCount={progressMap.get(course.id) || 0}
                labels={labels}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Global Courses */}
      {globalCourses.length > 0 && (
        <Section title={t("academy.accordCourses")} icon={<Globe className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalCourses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                labels={labels}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Tenant Courses */}
      {tenantCourses.length > 0 && (
        <Section title={t("academy.tenantCourses")} icon={<Building2 className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenantCourses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course.id)}
                labels={labels}
              />
            ))}
          </div>
        </Section>
      )}

      {filteredCourses.length === 0 && (
        <div className="text-center py-20">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{t("academy.noCourses")}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CourseCard({
  course,
  onClick,
  progressCount,
  labels,
}: {
  course: any;
  onClick: () => void;
  progressCount?: number;
  labels: Record<string, string>;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group overflow-hidden"
      onClick={onClick}
    >
      {course.thumbnail_url ? (
        <div className="h-40 overflow-hidden">
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-primary/30" />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {course.academy_categories?.name && (
            <Badge variant="secondary" className="text-xs">
              {course.academy_categories.name}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-xs", levelColors[course.level])}>
            {labels[course.level] || course.level}
          </Badge>
        </div>
        <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h4>
        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
        {progressCount !== undefined && progressCount > 0 && (
          <Progress value={30} className="h-1.5" />
        )}
      </CardContent>
    </Card>
  );
}
