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
  const rows = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      monthly_video_limit,
      max_video_seconds,
      updated_at
    )
    values (
      ${input.userId}::text,
      ${input.email},
      ${input.fullName ?? null},
      'free',
      ${PLAN_RULES.free.monthlyVideoLimit},
      ${PLAN_RULES.free.maxDurationSec},
      now()
    )
    on conflict (user_id)
    do update set
      email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now()
    returning *
  `;

  return rows[0] ?? null;
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
    where stripe_customer_id = ${stripeCustomerId}::text
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
  const limits = getPlanLimits(plan);

  const rows = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      monthly_video_limit,
      max_video_seconds,
      updated_at
    )
    values (
      ${userId}::text,
      '',
      null,
      ${plan},
      ${limits.monthlyVideoLimit},
      ${limits.maxDurationSec},
      now()
    )
    on conflict (user_id)
    do update set
      plan = excluded.plan,
      monthly_video_limit = excluded.monthly_video_limit,
      max_video_seconds = excluded.max_video_seconds,
      updated_at = now()
    returning *
  `;

  return rows[0] ?? null;
}

export async function updateUserPlanByUserId(
  userId: string,
  plan: PlanName
) {
  return updateUserPlan(userId, plan);
}

export async function updateUserStripeCustomerId(
  userId: string,
  customerId: string
) {
  const existing = await getUserProfile(userId);

  const rows = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      stripe_customer_id,
      monthly_video_limit,
      max_video_seconds,
      updated_at
    )
    values (
      ${userId}::text,
      ${existing?.email ?? ""},
      ${existing?.full_name ?? null},
      ${(existing?.plan ?? "free") as PlanName},
      ${customerId},
      ${existing?.monthly_video_limit ?? PLAN_RULES.free.monthlyVideoLimit},
      ${existing?.max_video_seconds ?? PLAN_RULES.free.maxDurationSec},
      now()
    )
    on conflict (user_id)
    do update set
      stripe_customer_id = excluded.stripe_customer_id,
      updated_at = now()
    returning *
  `;

  return rows[0] ?? null;
}

export async function updateUserSubscriptionFromStripe(input: {
  userId: string;
  plan: StripeManagedPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  subscriptionStatus: string;
}) {
  const existing = await getUserProfile(input.userId);
  const limits = getPlanLimits(input.plan);

  const rows = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      subscription_status,
      monthly_video_limit,
      max_video_seconds,
      updated_at
    )
    values (
      ${input.userId}::text,
      ${existing?.email ?? ""},
      ${existing?.full_name ?? null},
      ${input.plan},
      ${input.stripeCustomerId},
      ${input.stripeSubscriptionId},
      ${input.stripePriceId},
      ${input.subscriptionStatus},
      ${limits.monthlyVideoLimit},
      ${limits.maxDurationSec},
      now()
    )
    on conflict (user_id)
    do update set
      plan = excluded.plan,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      subscription_status = excluded.subscription_status,
      monthly_video_limit = excluded.monthly_video_limit,
      max_video_seconds = excluded.max_video_seconds,
      updated_at = now()
    returning *
  `;

  return rows[0] ?? null;
}

export async function resetUserToFreePlan(userId: string) {
  const existing = await getUserProfile(userId);
  const limits = getPlanLimits("free");

  const rows = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      subscription_status,
      monthly_video_limit,
      max_video_seconds,
      updated_at
    )
    values (
      ${userId}::text,
      ${existing?.email ?? ""},
      ${existing?.full_name ?? null},
      'free',
      'canceled',
      ${limits.monthlyVideoLimit},
      ${limits.maxDurationSec},
      now()
    )
    on conflict (user_id)
    do update set
      plan = 'free',
      subscription_status = 'canceled',
      monthly_video_limit = ${limits.monthlyVideoLimit},
      max_video_seconds = ${limits.maxDurationSec},
      updated_at = now()
    returning *
  `;

  return rows[0] ?? null;
}