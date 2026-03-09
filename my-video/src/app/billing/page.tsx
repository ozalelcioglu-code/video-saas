
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageShell } from "../../components/AppPageShell";
import { BillingClient } from "../../components/BillingClient";
import { auth } from "../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../lib/user-profile-repository";

export default async function BillingPage() {
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

  return (
    <AppPageShell
      title="Billing"
      subtitle="Manage your subscription plan, limits, and future payment upgrades."
    >
      <BillingClient
        currentPlan={planInfo.plan}
        currentPlanLabel={planInfo.planLabel}
        usedThisMonth={planInfo.usedThisMonth}
        remainingCredits={planInfo.remainingCredits}
        maxDurationSec={planInfo.maxDurationSec}
        monthlyVideoLimit={planInfo.monthlyVideoLimit}
      />
    </AppPageShell>
  );
}