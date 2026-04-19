import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-razorpay-signature",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// PUBLIC endpoint (Razorpay calls it). No JWT verification.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response("Not configured", { status: 500 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    const rawBody = await req.text();
    if (!signature) return new Response("Missing signature", { status: 400 });

    const expected = await hmacSha256Hex(webhookSecret, rawBody);
    if (expected !== signature) {
      console.warn("Webhook signature mismatch");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const eventType = event.event;
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;

    if (!orderId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "Content-Type": "application/json" } });
    }

    const { data: existing } = await admin
      .from("payments")
      .select("id, status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (!existing) {
      console.warn("Webhook for unknown order:", orderId);
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (eventType === "payment.captured" && existing.status !== "paid") {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      await admin.from("payments").update({
        status: "paid",
        razorpay_payment_id: payment.id,
        access_expires_at: expires.toISOString(),
      }).eq("id", existing.id);
    } else if (eventType === "payment.failed") {
      await admin.from("payments").update({ status: "failed" }).eq("id", existing.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response("Error", { status: 500 });
  }
});
