import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAcademyCourse, useAcademyLessons, useAcademyProgress, useMarkLessonComplete } from "@/hooks/useAcademy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

interface Props {
  courseId: string;
  lessonId: string;
  onBack: () => void;
  onSelectLesson: (lessonId: string) => void;
}

export function AcademyLessonViewer({ courseId, lessonId, onBack, onSelectLesson }: Props) {
  const { t } = useTranslation();
  const { data: course } = useAcademyCourse(courseId);
  const { data: lessons = [] } = useAcademyLessons(courseId);
  const { data: progress = [] } = useAcademyProgress(courseId);
  const markComplete = useMarkLessonComplete();

  const publishedLessons = lessons.filter((l: any) => l.is_published);
  const currentIndex = publishedLessons.findIndex((l: any) => l.id === lessonId);
  const lesson = publishedLessons[currentIndex];
  const prevLesson = currentIndex > 0 ? publishedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < publishedLessons.length - 1 ? publishedLessons[currentIndex + 1] : null;

  const completedLessonIds = new Set(
    progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id)
  );
  const isCompleted = completedLessonIds.has(lessonId);

  const handleMarkComplete = () => {
    markComplete.mutate({ courseId, lessonId });
  };

  // Extract YouTube embed URL
  const embedUrl = useMemo(() => {
    if (!lesson?.video_url) return null;
    const url = lesson.video_url;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Direct URL
    return url;
  }, [lesson?.video_url]);

  if (!lesson) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("academy.lessonNotFound")}</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">{t("common.back")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {course?.title || t("common.back")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {publishedLessons.length}
        </span>
      </div>

      {/* Video Player */}
      {embedUrl && (
        <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
          {embedUrl.includes("youtube.com") || embedUrl.includes("vimeo.com") ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              controls
            />
          )}
        </div>
      )}

      {/* Lesson Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-muted-foreground mt-1">{lesson.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lesson.duration_minutes > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {lesson.duration_minutes} min
              </Badge>
            )}
            {isCompleted ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("academy.completed")}
              </Badge>
            ) : (
              <Button size="sm" onClick={handleMarkComplete} disabled={markComplete.isPending} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("academy.markComplete")}
              </Button>
            )}
          </div>
        </div>

        {/* Content HTML */}
        {lesson.content_html && (
          <Card>
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content_html) }} />
            </CardContent>
          </Card>
        )}

        {/* Attachment */}
        {lesson.attachment_url && (
          <a
            href={lesson.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/50 transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{t("academy.attachment")}</p>
              <p className="text-xs text-muted-foreground">{t("academy.downloadAttachment")}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        {prevLesson ? (
          <Button variant="outline" onClick={() => onSelectLesson(prevLesson.id)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("common.previous")}
          </Button>
        ) : <div />}
        {nextLesson ? (
          <Button onClick={() => onSelectLesson(nextLesson.id)} className="gap-2">
            {t("common.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" onClick={onBack} className="gap-2">
            {t("academy.backToCourse")}
          </Button>
        )}
      </div>

      {/* Side Lesson List */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <h4 className="text-sm font-semibold text-foreground mb-3">{t("academy.courseContent")}</h4>
          {publishedLessons.map((l: any, idx: number) => {
            const isDone = completedLessonIds.has(l.id);
            const isCurrent = l.id === lessonId;
            return (
              <button
                key={l.id}
                onClick={() => onSelectLesson(l.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors",
                  isCurrent
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0",
                  isDone ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <span className="truncate">{l.title}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
