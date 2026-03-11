import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageShell } from "../../components/AppPageShell";
import { BillingClient } from "../../components/BillingClient";
import { auth } from "../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../lib/user-profile-repository";

function getLanguageFromHeaders(h: Headers) {
  const cookie = h.get("cookie") || "";

  const match = cookie.match(/app-language=(tr|en|de)/);

  if (match) return match[1];

  const accept = h.get("accept-language") || "";

  if (accept.startsWith("tr")) return "tr";
  if (accept.startsWith("de")) return "de";

  return "en";
}

const TEXT = {
  tr: {
    title: "Faturalandırma",
    subtitle:
      "Abonelik planınızı, kullanım limitlerinizi ve gelecekteki ödeme yükseltmelerinizi yönetin.",
  },

  en: {
    title: "Billing",
    subtitle:
      "Manage your subscription plan, limits, and future payment upgrades.",
  },

  de: {
    title: "Abrechnung",
    subtitle:
      "Verwalten Sie Ihren Abonnementplan, Limits und zukünftige Zahlungs-Upgrades.",
  },
};

export default async function BillingPage() {
  const h = await headers();

  const session = await auth.api.getSession({
    headers: h,
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

  const lang = getLanguageFromHeaders(h) as "tr" | "en" | "de";

  const t = TEXT[lang];

  return (
    <AppPageShell
      title={t.title}
      subtitle={t.subtitle}
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