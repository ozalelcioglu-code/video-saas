import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  return new Stripe(secretKey);
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { ok: false, error: "STRIPE_WEBHOOK_SECRET is not set" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const body = await req.text();
    const stripe = getStripe();

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
      case "invoice.paid":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        console.log("STRIPE WEBHOOK EVENT:", event.type);
        break;

      default:
        console.log("Unhandled Stripe event:", event.type);
        break;
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error: any) {
    console.error("STRIPE_WEBHOOK_ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Webhook handler failed",
      },
      { status: 500 }
    );
  }
}