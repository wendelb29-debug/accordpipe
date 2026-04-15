import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAcademyCategories,
  useAcademyCourses,
  useAcademyLessons,
  useSaveCategory,
  useSaveCourse,
  useSaveLesson,
} from "@/hooks/useAcademy";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, BookOpen, Layers, Video, GripVertical } from "lucide-react";

export function AcademyAdmin() {
  const { t } = useTranslation();
  const { isMaster } = useAuth();
  const { data: categories = [] } = useAcademyCategories();
  const { data: courses = [] } = useAcademyCourses();
  const [adminTab, setAdminTab] = useState("courses");
  const [catDialog, setCatDialog] = useState(false);
  const [courseDialog, setCourseDialog] = useState(false);
  const [lessonDialog, setLessonDialog] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [editLesson, setEditLesson] = useState<any>(null);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<string | null>(null);

  return (
    <div className="space-y-6 mt-6">
      <Tabs value={adminTab} onValueChange={setAdminTab}>
        <TabsList>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("academy.courses")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Layers className="h-4 w-4" />
            {t("academy.categories")}
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditCat(null); setCatDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> {t("academy.newCategory")}
            </Button>
          </div>
          <div className="grid gap-3">
            {categories.map((cat: any) => (
              <Card key={cat.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                    <Badge variant="outline" className="mt-1 text-xs">
                      {cat.scope_type === "global" ? "Global" : "Tenant"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditCat(cat); setCatDialog(true); }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t("academy.noCategories")}</p>
            )}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditCourse(null); setCourseDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> {t("academy.newCourse")}
            </Button>
          </div>
          <div className="grid gap-3">
            {courses.map((course: any) => (
              <Card key={course.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {course.scope_type === "global" ? "Global" : "Tenant"}
                        </Badge>
                        <Badge variant={course.is_published ? "default" : "secondary"} className="text-xs">
                          {course.is_published ? t("academy.published") : t("academy.draft")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedCourseForLessons(course.id); setLessonDialog(false); }}
                      className="gap-1"
                    >
                      <Video className="h-3 w-3" />
                      {t("academy.lessons")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditCourse(course); setCourseDialog(true); }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {courses.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t("academy.noCourses")}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Lessons Panel */}
      {selectedCourseForLessons && (
        <LessonsPanel
          courseId={selectedCourseForLessons}
          onClose={() => setSelectedCourseForLessons(null)}
          onAddLesson={() => { setEditLesson(null); setLessonDialog(true); }}
          onEditLesson={(l: any) => { setEditLesson(l); setLessonDialog(true); }}
        />
      )}

      {/* Category Dialog */}
      <CategoryDialog
        open={catDialog}
        onClose={() => setCatDialog(false)}
        category={editCat}
        isMaster={isMaster}
      />

      {/* Course Dialog */}
      <CourseDialog
        open={courseDialog}
        onClose={() => setCourseDialog(false)}
        course={editCourse}
        categories={categories}
        isMaster={isMaster}
      />

      {/* Lesson Dialog */}
      <LessonDialog
        open={lessonDialog}
        onClose={() => setLessonDialog(false)}
        lesson={editLesson}
        courseId={selectedCourseForLessons}
      />
    </div>
  );
}

function LessonsPanel({ courseId, onClose, onAddLesson, onEditLesson }: any) {
  const { t } = useTranslation();
  const { data: lessons = [] } = useAcademyLessons(courseId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("academy.lessons")}</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={onAddLesson} className="gap-1">
            <Plus className="h-3 w-3" /> {t("academy.newLesson")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lessons.map((lesson: any, idx: number) => (
          <div
            key={lesson.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 cursor-pointer transition-all"
            onClick={() => onEditLesson(lesson)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {lesson.video_url && <Video className="h-3 w-3 text-muted-foreground" />}
              <Badge variant={lesson.is_published ? "default" : "secondary"} className="text-xs">
                {lesson.is_published ? t("academy.published") : t("academy.draft")}
              </Badge>
            </div>
          </div>
        ))}
        {lessons.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">{t("academy.noLessons")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryDialog({ open, onClose, category, isMaster }: any) {
  const { t } = useTranslation();
  const save = useSaveCategory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState("tenant");

  const handleOpen = () => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
      setScopeType(category.scope_type);
    } else {
      setName("");
      setDescription("");
      setScopeType(isMaster ? "global" : "tenant");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>{category ? t("academy.editCategory") : t("academy.newCategory")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {isMaster && (
            <div>
              <Label>{t("academy.scope")}</Label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => {
              save.mutate({ id: category?.id, name, description, scope_type: scopeType });
              onClose();
            }}
            disabled={!name.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseDialog({ open, onClose, course, categories, isMaster }: any) {
  const { t } = useTranslation();
  const save = useSaveCourse();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scopeType, setScopeType] = useState("tenant");
  const [level, setLevel] = useState("basic");
  const [duration, setDuration] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnail, setThumbnail] = useState("");

  const handleOpen = () => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || "");
      setCategoryId(course.category_id || "");
      setScopeType(course.scope_type);
      setLevel(course.level);
      setDuration(course.estimated_duration_minutes || 0);
      setIsPublished(course.is_published);
      setThumbnail(course.thumbnail_url || "");
    } else {
      setTitle(""); setDescription(""); setCategoryId("");
      setScopeType(isMaster ? "global" : "tenant");
      setLevel("basic"); setDuration(0); setIsPublished(false); setThumbnail("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent onOpenAutoFocus={handleOpen} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{course ? t("academy.editCourse") : t("academy.newCourse")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>{t("academy.courseTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>{t("academy.thumbnailUrl")}</Label>
            <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("academy.category")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder={t("common.all")} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("academy.level")}</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{t("academy.levelBasic")}</SelectItem>
                  <SelectItem value="intermediate">{t("academy.levelIntermediate")}</SelectItem>
                  <SelectItem value="advanced">{t("academy.levelAdvanced")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("academy.estimatedDuration")}</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            {isMaster && (
              <div>
                <Label>{t("academy.scope")}</Label>
                <Select value={scopeType} onValueChange={setScopeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <Label>{t("academy.publishCourse")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => {
              save.mutate({
                id: course?.id, title, description,
                category_id: categoryId || undefined,
                scope_type: scopeType, level,
                estimated_duration_minutes: duration,
                is_published: isPublished,
                thumbnail_url: thumbnail || undefined,
              });
              onClose();
            }}
            disabled={!title.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LessonDialog({ open, onClose, lesson, courseId }: any) {
  const { t } = useTranslation();
  const save = useSaveLesson();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  const handleOpen = () => {
    if (lesson) {
      setTitle(lesson.title);
      setDescription(lesson.description || "");
      setVideoUrl(lesson.video_url || "");
      setContentHtml(lesson.content_html || "");
      setAttachmentUrl(lesson.attachment_url || "");
      setDuration(lesson.duration_minutes || 0);
      setSortOrder(lesson.sort_order || 0);
      setIsPublished(lesson.is_published);
      setIsPreview(lesson.is_preview);
    } else {
      setTitle(""); setDescription(""); setVideoUrl(""); setContentHtml("");
      setAttachmentUrl(""); setDuration(0); setSortOrder(0);
      setIsPublished(true); setIsPreview(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent onOpenAutoFocus={handleOpen} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lesson ? t("academy.editLesson") : t("academy.newLesson")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>{t("academy.lessonTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>{t("academy.videoUrl")}</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
          </div>
          <div>
            <Label>{t("academy.contentHtml")}</Label>
            <Textarea value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} rows={4} placeholder="HTML" />
          </div>
          <div>
            <Label>{t("academy.attachmentUrl")}</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("academy.durationMin")}</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div>
              <Label>{t("academy.sortOrder")}</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>{t("academy.published")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPreview} onCheckedChange={setIsPreview} />
              <Label>Preview</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => {
              if (!courseId) return;
              save.mutate({
                id: lesson?.id,
                course_id: courseId,
                title, description,
                video_url: videoUrl || undefined,
                content_html: contentHtml || undefined,
                attachment_url: attachmentUrl || undefined,
                duration_minutes: duration,
                sort_order: sortOrder,
                is_published: isPublished,
                is_preview: isPreview,
              });
              onClose();
            }}
            disabled={!title.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
