import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AcademyHome } from "@/components/academy/AcademyHome";
import { AcademyCourseDetail } from "@/components/academy/AcademyCourseDetail";
import { AcademyLessonViewer } from "@/components/academy/AcademyLessonViewer";
import { AcademyAdmin } from "@/components/academy/AcademyAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Settings2, Sparkles } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";

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
    <div className="space-y-4">
      {canAdmin ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="learn" className="gap-2">
              <BrandIcon icon={GraduationCap} tone="amber" size="sm" />
              Aprendizado
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <BrandIcon icon={Settings2} tone="slate" size="sm" />
              Gestão
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
