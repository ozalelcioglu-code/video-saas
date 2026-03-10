import { sql } from "./db";
import { getRemainingCredits, PLAN_RULES, type PlanName } from "./plans";

type StripeManagedPlan = "starter" | "pro" | "agency";

function getPlanLimits(plan: PlanName) {
  const rule = PLAN_RULES[plan];

  return {
    monthlyVideoLimit: rule.monthlyVideoLimit,
    maxDurationSec: rule.maxDurationSec,
  };
}

export async function ensureUserProfile(input: {
  userId: string;
  email: string;
  fullName?: string | null;
}) {
  const existing = await sql`
    select *
    from user_profiles
    where user_id = ${input.userId}::text
    limit 1
  `;

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan
    )
    values (
      ${input.userId}::text,
      ${input.email},
      ${input.fullName ?? null},
      'free'
    )
    returning *
  `;

  return inserted[0];
}

export async function getUserProfile(userId: string) {
  const rows = await sql`
    select *
    from user_profiles
    where user_id = ${userId}::text
    limit 1
  `;

  return rows[0] ?? null;
}

export async function getUserProfileByStripeCustomerId(stripeCustomerId: string) {
  const rows = await sql`
    select *
    from user_profiles
    where stripe_customer_id = ${stripeCustomerId}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function getMonthlyVideoUsage(userId: string) {
  const rows = await sql`
    select count(*)::int as count
    from videos
    where user_id = ${userId}::text
      and date_trunc('month', created_at) = date_trunc('month', now())
  `;

  return rows[0]?.count ?? 0;
}

export async function getResolvedUserPlan(userId: string) {
  const profile = await getUserProfile(userId);

  const plan = (profile?.plan ?? "free") as PlanName;
  const usedThisMonth = await getMonthlyVideoUsage(userId);
  const remainingCredits = getRemainingCredits(plan, usedThisMonth);

  return {
    profile,
    plan,
    planLabel: PLAN_RULES[plan].label,
    usedThisMonth,
    remainingCredits,
    maxDurationSec: PLAN_RULES[plan].maxDurationSec,
    monthlyVideoLimit: PLAN_RULES[plan].monthlyVideoLimit,
  };
}

export async function updateUserPlan(userId: string, plan: PlanName) {
  const updated = await sql`
    update user_profiles
    set
      plan = ${plan},
      updated_at = now()
    where user_id = ${userId}::text
    returning *
  `;

  return updated[0] ?? null;
}

export async function updateUserPlanByUserId(
  userId: string,
  plan: PlanName
) {
  const updated = await sql`
    update user_profiles
    set
      plan = ${plan},
      updated_at = now()
    where user_id = ${userId}::text
    returning *
  `;

  return updated[0] ?? null;
}

export async function updateUserStripeCustomerId(
  userId: string,
  customerId: string
) {
  const updated = await sql`
    update user_profiles
    set
      stripe_customer_id = ${customerId},
      updated_at = now()
    where user_id = ${userId}::text
    returning *
  `;

  return updated[0] ?? null;
}

export async function updateUserSubscriptionFromStripe(input: {
  userId: string;
  plan: StripeManagedPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  subscriptionStatus: string;
}) {
  const limits = getPlanLimits(input.plan);

  const updated = await sql`
    update user_profiles
    set
      plan = ${input.plan},
      stripe_customer_id = ${input.stripeCustomerId},
      stripe_subscription_id = ${input.stripeSubscriptionId},
      stripe_price_id = ${input.stripePriceId},
      subscription_status = ${input.subscriptionStatus},
      monthly_video_limit = ${limits.monthlyVideoLimit},
      max_video_seconds = ${limits.maxDurationSec},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning *
  `;

  return updated[0] ?? null;
}

export async function resetUserToFreePlan(userId: string) {
  const limits = getPlanLimits("free");

  const updated = await sql`
    update user_profiles
    set
      plan = 'free',
      subscription_status = 'canceled',
      monthly_video_limit = ${limits.monthlyVideoLimit},
      max_video_seconds = ${limits.maxDurationSec},
      updated_at = now()
    where user_id = ${userId}::text
    returning *
  `;

  return updated[0] ?? null;
}