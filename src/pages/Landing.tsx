import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Award, Cloud, Code2, Server, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: Cloud, title: "Real AWS Scenarios", desc: "EC2, VPC, IAM, RDS, ALB — actual interview problems with detailed answers." },
  { icon: Server, title: "Kubernetes Deep Dives", desc: "Pod debugging, rolling updates, RBAC, IRSA, Helm rollback." },
  { icon: Code2, title: "CI/CD & DevOps", desc: "Jenkins, GitHub Actions, Terraform, Ansible best practices." },
  { icon: Award, title: "Detailed Explanations", desc: "Each answer breaks down the why, not just the what." },
];

export default function Landing() {
  const { user, hasAccess } = useAuth();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative gradient-hero">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Built by an AWS &amp; DevOps creator</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Crack <span className="text-gradient">AWS &amp; DevOps</span> interviews with scenario-based practice
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Real production scenarios, expert answers, and curated quizzes — built to make you sound senior in your next
              interview.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to={user ? "/quizzes" : "/auth"}>
                  {user ? "Browse quizzes" : "Start free preview"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!hasAccess && (
                <Button asChild size="lg" variant="outline">
                  <Link to="/pricing">See pricing</Link>
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              First 3 questions of every quiz are <span className="text-foreground">free</span>. Unlock everything for ₹199 / year.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Built for serious DevOps engineers</h2>
          <p className="mt-3 text-muted-foreground">No fluff. No leetcode. Just scenarios that actually come up in interviews.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="gradient-card border-border/60 shadow-card">
              <CardContent className="p-6">
                <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container pb-24">
        <Card className="mx-auto max-w-2xl gradient-card border-primary/30 shadow-glow">
          <CardContent className="p-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3 w-3" /> One-time payment
            </div>
            <h3 className="mt-4 text-3xl font-bold">Full Access</h3>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold">₹199</span>
              <span className="text-muted-foreground">/ year</span>
            </div>
            <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /> All AWS &amp; DevOps quizzes</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /> Detailed scenario answers</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /> New questions added regularly</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /> 365 days unlimited access</li>
            </ul>
            <Button asChild size="lg" className="mt-8 gradient-primary text-primary-foreground hover:opacity-90">
              <Link to={user ? "/pricing" : "/auth"}>{hasAccess ? "You have Pro access" : "Unlock everything"}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MadhuOps — AWS &amp; DevOps Interview Prep
      </footer>
    </div>
  );
}
