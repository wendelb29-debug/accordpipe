import { CloserPanel } from "@/components/closer/CloserPanel";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Closer() {
  return (
    <PageContainer>
      <div className="pb-28">
        <CloserPanel />
      </div>
    </PageContainer>
  );
}
