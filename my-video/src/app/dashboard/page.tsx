
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageShell } from "../../components/AppPageShell";
import { DashboardClient } from "../../components/DashboardClient";
import { auth } from "../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../lib/user-profile-repository";
import { getDashboardStats } from "../../lib/dashboard-repository";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.name;

  if (!userId || !userEmail) {
    redirect("/login");
  }

  await ensureUserProfile({
    userId,
    email: userEmail,
    fullName: userName ?? null,
  });

  const planInfo = await getResolvedUserPlan(userId);
  const dashboardStats = await getDashboardStats(userId);

  return (
    <AppPageShell
      title="Dashboard"
      subtitle="Track your plan, monthly usage, remaining credits, and recently generated videos."
    >
      <DashboardClient
        planLabel={planInfo.planLabel}
        usedThisMonth={planInfo.usedThisMonth}
        remainingCredits={planInfo.remainingCredits}
        maxDurationSec={planInfo.maxDurationSec}
        monthlyVideoLimit={planInfo.monthlyVideoLimit}
        totalVideos={dashboardStats.totalVideos}
        recentVideos={dashboardStats.recentVideos as any[]}
      />
    </AppPageShell>
  );
}