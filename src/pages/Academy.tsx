import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAcademyCategories, useAcademyCourses, useAcademyProgress } from "@/hooks/useAcademy";
import { useAuth } from "@/contexts/AuthContext";
import { AcademyHome } from "@/components/academy/AcademyHome";
import { AcademyCourseDetail } from "@/components/academy/AcademyCourseDetail";
import { AcademyLessonViewer } from "@/components/academy/AcademyLessonViewer";
import { AcademyAdmin } from "@/components/academy/AcademyAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Settings2 } from "lucide-react";

export default function Academy() {
  const { t } = useTranslation();
  const { isMaster, isCeo } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [tab, setTab] = useState("learn");

  const canAdmin = isMaster || isCeo;

  if (selectedLessonId && selectedCourseId) {
    return (
      <AcademyLessonViewer
        courseId={selectedCourseId}
        lessonId={selectedLessonId}
        onBack={() => setSelectedLessonId(null)}
        onSelectLesson={setSelectedLessonId}
      />
    );
  }

  if (selectedCourseId) {
    return (
      <AcademyCourseDetail
        courseId={selectedCourseId}
        onBack={() => setSelectedCourseId(null)}
        onSelectLesson={(lessonId) => setSelectedLessonId(lessonId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("academy.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("academy.subtitle")}</p>
          </div>
        </div>
      </div>

      {canAdmin ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="learn" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              {t("academy.learning")}
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {t("academy.management")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="learn">
            <AcademyHome onSelectCourse={setSelectedCourseId} />
          </TabsContent>
          <TabsContent value="admin">
            <AcademyAdmin />
          </TabsContent>
        </Tabs>
      ) : (
        <AcademyHome onSelectCourse={setSelectedCourseId} />
      )}
    </div>
  );
}
