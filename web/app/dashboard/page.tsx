import PremiumHealthHome from "@/components/dashboard/premium-health-home";
import HealthAccountNav from "@/components/dashboard/health-account-nav";

export default function DashboardRoute() {
  return (
    <>
      <HealthAccountNav />
      <PremiumHealthHome />
    </>
  );
}
