import HealthHome from "@/components/dashboard/health-home";
import HealthAccountNav from "@/components/dashboard/health-account-nav";

export default function DashboardRoute() {
  return (
    <>
      <HealthAccountNav />
      <HealthHome />
    </>
  );
}
