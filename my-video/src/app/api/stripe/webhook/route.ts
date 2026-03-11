import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  stripe,
  STRIPE_PRICE_MAP,
  type PaidPlanName,
} from "../../../../lib/stripe";
import {
  ensureUserProfile,
  getUserProfileByStripeCustomerId,
  updateUserSubscriptionFromStripe,
  resetUserToFreePlan,
} from "../../../../lib/user-profile-repository";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

function getPlanFromPriceId(
  priceId: string | null | undefined
): PaidPlanName | null {
  if (!priceId) return null;

  const entry = Object.entries(STRIPE_PRICE_MAP).find(
    ([, mappedPriceId]) => mappedPriceId === priceId
  );

  return entry ? (entry[0] as PaidPlanName) : null;
}

async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription
) {
  const metadataUserId = subscription.metadata?.userId;
  if (metadataUserId) return metadataUserId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const profile = await getUserProfileByStripeCustomerId(customerId);
  return profile?.user_id ?? null;
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("WEBHOOK ERROR: Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log("WEBHOOK VERIFIED:", {
      id: event.id,
      type: event.type,
      livemode: event.livemode,
    });
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR:", err?.message || err);
    return new NextResponse(
      `Webhook Error: ${err?.message || "Invalid signature"}`,
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId =
          session.metadata?.userId ?? session.client_reference_id ?? null;

        const planFromSession = session.metadata?.plan ?? null;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        console.log("CHECKOUT SESSION:", {
          sessionId: session.id,
          userId,
          planFromSession,
          customerId,
          subscriptionId,
          metadata: session.metadata,
        });

        if (!userId || !customerId || !subscriptionId) {
          console.warn(
            "CHECKOUT SKIPPED: missing userId/customerId/subscriptionId"
          );
          break;
        }

        await ensureUserProfile({
          userId,
          email: session.customer_details?.email ?? "",
          fullName: session.customer_details?.name ?? null,
        });

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const plan =
          getPlanFromPriceId(priceId) ??
          (planFromSession as PaidPlanName | null);

        console.log("CHECKOUT SUBSCRIPTION:", {
          subscriptionId: subscription.id,
          status: subscription.status,
          priceId,
          resolvedPlan: plan,
        });

        if (!plan) {
          console.warn("CHECKOUT SKIPPED: plan could not be resolved", {
            priceId,
            planFromSession,
          });
          break;
        }

        await updateUserSubscriptionFromStripe({
          userId,
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
        });

        console.log("CHECKOUT PROFILE UPDATED:", {
          userId,
          plan,
          customerId,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const userId = await resolveUserIdFromSubscription(subscription);
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const plan = getPlanFromPriceId(priceId);

        console.log("SUBSCRIPTION EVENT:", {
          type: event.type,
          subscriptionId: subscription.id,
          userId,
          customerId,
          priceId,
          resolvedPlan: plan,
          status: subscription.status,
          metadata: subscription.metadata,
        });

        if (!userId) {
          console.warn("SUBSCRIPTION SKIPPED: userId not found");
          break;
        }

        if (!customerId || !plan) {
          console.warn("SUBSCRIPTION SKIPPED: missing customerId or plan", {
            customerId,
            priceId,
          });
          break;
        }

        await updateUserSubscriptionFromStripe({
          userId,
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
        });

        console.log("SUBSCRIPTION PROFILE UPDATED:", {
          userId,
          plan,
          customerId,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(subscription);

        console.log("SUBSCRIPTION DELETE:", {
          subscriptionId: subscription.id,
          userId,
          metadata: subscription.metadata,
        });

        if (!userId) {
          console.warn("DELETE SKIPPED: userId not found");
          break;
        }

        await resetUserToFreePlan(userId);
        console.log("PROFILE RESET TO FREE:", { userId });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        console.log("INVOICE EVENT:", event.type);
        break;
      }

      default:
        console.log("WEBHOOK EVENT IGNORED:", event.type);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_HANDLER_ERROR:", err?.message || err);
    return new NextResponse(err?.message ?? "Webhook handler failed", {
      status: 500 }
    );
  }
}