import { NextRequest, NextResponse } from "next/server";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.userId;
        const plan   = session.metadata?.plan;
        if (!userId || !plan) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await supabaseAdmin.from("profiles").update({
          plan,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq("id", userId);
        break;
      }
      case "customer.subscription.updated": {
        const sub     = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const plan    = planFromPriceId(priceId) ?? "free";
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id").eq("stripe_subscription_id", sub.id).single();
        if (!profile) break;
        await supabaseAdmin.from("profiles").update({
          plan,
          subscription_status: sub.status,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq("id", (profile as { id: string }).id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from("profiles").update({
          plan: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("stripe_subscription_id", sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = (invoice as unknown as { subscription?: string }).subscription;
        if (subId) {
          await supabaseAdmin.from("profiles").update({ subscription_status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
