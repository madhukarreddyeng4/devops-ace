import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  const { user, hasAccess, accessExpiresAt, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handlePay = async () => {
    setBusy(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load Razorpay"); return; }

      const { data, error } = await supabase.functions.invoke("create-order");
      if (error || !data?.order_id) {
        toast.error(data?.error ?? "Could not create order");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "MadhuOps",
        description: "AWS & DevOps Interview Prep — 1 year access",
        prefill: { email: user?.email ?? "" },
        theme: { color: "#f97316" },
        handler: async (resp: any) => {
          const verify = await supabase.functions.invoke("verify-payment", {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          if (verify.error) {
            toast.error("Payment verification failed");
          } else {
            toast.success("Payment successful! You now have full access.");
            setTimeout(() => window.location.assign("/quizzes"), 800);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed"));
      rzp.open();
    } finally {
      // setBusy(false) happens in handler/modal close
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-16">
        {hasAccess ? (
          <Card className="gradient-card border-success/40">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-bold">You're all set!</h1>
              <p className="mt-3 text-muted-foreground">
                Pro access active until <strong>{accessExpiresAt ? new Date(accessExpiresAt).toLocaleDateString() : "—"}</strong>.
              </p>
              <Button asChild className="mt-6 gradient-primary text-primary-foreground">
                <Link to="/quizzes">Browse quizzes</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="gradient-card border-primary/30 shadow-glow">
            <CardContent className="p-10 text-center">
              <h1 className="text-3xl font-bold">Unlock everything for ₹199</h1>
              <p className="mt-3 text-muted-foreground">One payment. 365 days. All quizzes, all questions, all explanations.</p>
              <div className="mt-6 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">₹199</span>
                <span className="text-muted-foreground">/ year</span>
              </div>
              <Button onClick={handlePay} disabled={busy} size="lg" className="mt-8 gradient-primary text-primary-foreground">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening checkout...</> : "Pay with Razorpay"}
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">Secure payment via Razorpay. UPI, cards, netbanking, wallets.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
