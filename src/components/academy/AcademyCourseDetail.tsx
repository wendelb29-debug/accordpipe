import { useTranslation } from "react-i18next";
import { useAcademyCourse, useAcademyLessons, useAcademyProgress } from "@/hooks/useAcademy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, PlayCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  onBack: () => void;
  onSelectLesson: (lessonId: string) => void;
}

export function AcademyCourseDetail({ courseId, onBack, onSelectLesson }: Props) {
  const { t } = useTranslation();
  const { data: course, isLoading: loadingCourse } = useAcademyCourse(courseId);
  const { data: lessons = [], isLoading: loadingLessons } = useAcademyLessons(courseId);
  const { data: progress = [] } = useAcademyProgress(courseId);

  const completedLessonIds = new Set(
    progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id)
  );

  const publishedLessons = lessons.filter((l: any) => l.is_published);
  const completedCount = publishedLessons.filter((l: any) => completedLessonIds.has(l.id)).length;
  const progressPercent = publishedLessons.length > 0 ? Math.round((completedCount / publishedLessons.length) * 100) : 0;
  const totalDuration = publishedLessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);

  // Find first incomplete lesson to continue
  const nextLesson = publishedLessons.find((l: any) => !completedLessonIds.has(l.id));

  if (loadingCourse || loadingLessons) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Button>

      {/* Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {course.thumbnail_url ? (
            <div className="rounded-xl overflow-hidden h-56 lg:h-72">
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-xl h-56 lg:h-72 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-primary/20" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            {course.description && <p className="text-muted-foreground mt-2">{course.description}</p>}
          </div>
        </div>

        {/* Sidebar Info */}
        <Card className="h-fit">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("academy.progress")}</span>
                <span className="font-semibold text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completedCount}/{publishedLessons.length} {t("academy.lessonsCompleted")}
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                {publishedLessons.length} {t("academy.lessons")}
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {totalDuration} min
                </div>
              )}
            </div>

            {nextLesson && (
              <Button className="w-full gap-2" onClick={() => onSelectLesson(nextLesson.id)}>
                <PlayCircle className="h-4 w-4" />
                {completedCount > 0 ? t("academy.continue") : t("academy.startCourse")}
              </Button>
            )}

            {publishedLessons.length > 0 && !nextLesson && (
              <Badge className="w-full justify-center py-2 bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t("academy.courseCompleted")}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lesson List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">{t("academy.courseContent")}</h3>
        {publishedLessons.map((lesson: any, idx: number) => {
          const isCompleted = completedLessonIds.has(lesson.id);
          return (
            <Card
              key={lesson.id}
              className={cn(
                "cursor-pointer hover:border-primary/30 transition-all",
                isCompleted && "border-green-500/20 bg-green-500/5"
              )}
              onClick={() => onSelectLesson(lesson.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold",
                  isCompleted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{lesson.title}</p>
                  {lesson.description && (
                    <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  {lesson.duration_minutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.duration_minutes} min
                    </span>
                  )}
                  {lesson.is_preview && (
                    <Badge variant="outline" className="text-xs">Preview</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {publishedLessons.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("academy.noLessons")}</p>
        )}
      </div>
    </div>
  );
}
