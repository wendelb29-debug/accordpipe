import { useTranslation } from "react-i18next";
import { useAcademyCourse, useAcademyLessons, useAcademyProgress } from "@/hooks/useAcademy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, PlayCircle, Download,
  FileText, Play
} from "lucide-react";
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
      {/* Hero banner with course info - Netflix style */}
      <div className="relative rounded-2xl overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-56 lg:h-72 object-cover"
          />
        ) : (
          <div className="w-full h-56 lg:h-72 bg-gradient-to-br from-primary/15 via-primary/5 to-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-4 -ml-2 text-foreground/80 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{course.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {publishedLessons.length} episódios
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalDuration} min
              </span>
            )}
            <span>{progressPercent}% concluído</span>
          </div>
          <div className="flex gap-3 mt-4">
            {nextLesson && (
              <Button onClick={() => onSelectLesson(nextLesson.id)} className="gap-2">
                <Play className="h-4 w-4" />
                {completedCount > 0 ? "Continuar" : "Assistir"}
              </Button>
            )}
            {!nextLesson && publishedLessons.length > 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Curso concluído
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {publishedLessons.length > 0 && (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {completedCount} de {publishedLessons.length} episódios concluídos
          </p>
        </div>
      )}

      {/* Episodes */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Episódios</h3>
        <div className="space-y-2">
          {publishedLessons.map((lesson: any, idx: number) => {
            const isCompleted = completedLessonIds.has(lesson.id);
            return (
              <div
                key={lesson.id}
                className={cn(
                  "group rounded-xl border transition-all hover:border-primary/30",
                  isCompleted ? "border-green-500/20 bg-green-500/[0.02]" : "border-border"
                )}
              >
                {/* Main episode row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => onSelectLesson(lesson.id)}
                >
                  {/* Number / check */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                    isCompleted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>

                  {/* Thumbnail mini */}
                  <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-muted shrink-0 hidden sm:block">
                    {lesson.video_url ? (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
                        <PlayCircle className="h-6 w-6 text-primary/40 group-hover:text-primary/70 transition-colors" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {lesson.title}
                    </p>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lesson.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {lesson.duration_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes} min
                        </span>
                      )}
                      {lesson.attachment_url && (
                        <span className="flex items-center gap-1 text-primary/70">
                          <FileText className="h-3 w-3" />
                          Anexo
                        </span>
                      )}
                      {lesson.is_preview && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">Preview</Badge>
                      )}
                    </div>
                  </div>

                  {/* Play button */}
                  <div className="shrink-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Play className="h-4 w-4 text-primary ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Attachment row */}
                {lesson.attachment_url && (
                  <div className="border-t border-border/50 px-4 py-2.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">Material complementar</p>
                      <p className="text-[10px] text-muted-foreground">Arquivo anexado a este episódio</p>
                    </div>
                    <a
                      href={lesson.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {publishedLessons.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum episódio disponível ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
