import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  ensureUserProfile,
  getUserProfileByStripeCustomerId,
  updateUserSubscriptionFromStripe,
  resetUserToFreePlan,
} from "../../../../lib/user-profile-repository";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey);

type PaidPlanName = "starter" | "pro" | "agency";

function getPlanFromPriceId(
  priceId: string | null | undefined
): PaidPlanName | null {
  if (!priceId) return null;

  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";

  return null;
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
    console.log("WEBHOOK RAW OK");
    console.log("WEBHOOK EVENT TYPE:", event.type);
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR:", err?.message || err);
    return new NextResponse(
      `Webhook Error: ${err?.message || "Invalid signature"}`,
      {
        status: 400,
      }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("CHECKOUT SESSION HIT");

        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId ?? null;
        const planFromSession = session.metadata?.plan ?? null;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        console.log("SESSION USER ID:", userId);
        console.log("SESSION PLAN FROM METADATA:", planFromSession);
        console.log("SESSION CUSTOMER ID:", customerId);
        console.log("SESSION SUBSCRIPTION ID:", subscriptionId);

        if (!userId || !customerId || !subscriptionId) {
          console.warn(
            "checkout.session.completed missing userId/customerId/subscriptionId"
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

        console.log("CHECKOUT SUB PRICE ID:", priceId);
        console.log("CHECKOUT RESOLVED PLAN:", plan);
        console.log("CHECKOUT SUB STATUS:", subscription.status);

        if (!plan) {
          console.warn("No plan resolved from checkout.session.completed");
          break;
        }

        const updated = await updateUserSubscriptionFromStripe({
          userId,
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
        });

        console.log("CHECKOUT UPDATED PROFILE:", updated);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        console.log("SUBSCRIPTION EVENT HIT:", event.type);

        const subscription = event.data.object as Stripe.Subscription;

        const userId = await resolveUserIdFromSubscription(subscription);
        console.log("SUBSCRIPTION RESOLVED USER ID:", userId);

        if (!userId) {
          console.warn(`${event.type}: userId not found`);
          break;
        }

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const plan = getPlanFromPriceId(priceId);

        console.log("SUBSCRIPTION CUSTOMER ID:", customerId);
        console.log("SUBSCRIPTION PRICE ID:", priceId);
        console.log("SUBSCRIPTION PLAN:", plan);
        console.log("SUBSCRIPTION STATUS:", subscription.status);

        if (!customerId || !plan) {
          console.warn(`${event.type}: missing customerId or plan`);
          break;
        }

        const updated = await updateUserSubscriptionFromStripe({
          userId,
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
        });

        console.log("SUBSCRIPTION UPDATED PROFILE:", updated);
        break;
      }

      case "customer.subscription.deleted": {
        console.log("SUBSCRIPTION DELETE HIT");

        const subscription = event.data.object as Stripe.Subscription;

        const userId = await resolveUserIdFromSubscription(subscription);
        console.log("DELETE RESOLVED USER ID:", userId);

        if (!userId) {
          console.warn("customer.subscription.deleted: userId not found");
          break;
        }

        const reset = await resetUserToFreePlan(userId);
        console.log("RESET PROFILE TO FREE:", reset);
        break;
      }

      default:
        console.log("WEBHOOK EVENT IGNORED:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_HANDLER_ERROR:", err);
    return new NextResponse(err?.message ?? "Webhook handler failed", {
      status: 500,
    });
  }
}