import { PageHeader } from "@/components/developer/PageHeader";
import { DevServerManagerCard } from "@/components/developer/DevServerManagerCard";
import { ProjectsWidget } from "@/components/developer/dashboard/ProjectsWidget";
import { RunningTasksWidget } from "@/components/developer/dashboard/RunningTasksWidget";
import { ActiveWorkflowsWidget } from "@/components/developer/dashboard/ActiveWorkflowsWidget";
import { MarketplaceWidget } from "@/components/developer/dashboard/MarketplaceWidget";
import { RecentActivityWidget } from "@/components/developer/dashboard/RecentActivityWidget";
import { SystemHealthWidget } from "@/components/developer/dashboard/SystemHealthWidget";
import { ProviderStatusWidget } from "@/components/developer/dashboard/ProviderStatusWidget";
import { TokenUsageWidget } from "@/components/developer/dashboard/TokenUsageWidget";
import { MetricsWidget } from "@/components/developer/dashboard/MetricsWidget";

export default function DeveloperPage() {
  return (
    <div>
      <PageHeader
        icon="🏠"
        title="Dashboard"
        description="AI Business OS의 운영 현황을 한눈에 확인합니다."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProjectsWidget />
        <RunningTasksWidget />
        <ActiveWorkflowsWidget />
        <MarketplaceWidget />
        <ProviderStatusWidget />
        <TokenUsageWidget />
        <MetricsWidget />
        <RecentActivityWidget />
        <SystemHealthWidget />
        <DevServerManagerCard />
      </div>
    </div>
  );
}
