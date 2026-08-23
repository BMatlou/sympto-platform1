import HealthHome from "@/components/dashboard/health-home";
import HealthQuickActions from "@/components/dashboard/health-quick-actions";

export default function DashboardRoute() {
  return (
    <>
      <HealthHome />
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <HealthQuickActions />
      </div>
    </>
  );
}
