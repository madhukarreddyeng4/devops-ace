import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";

type Quiz = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number | null;
  category: { name: string } | null;
};

export default function Quizzes() {
  const { hasAccess, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, slug, description, difficulty, estimated_minutes, category:categories(name)")
        .eq("is_published", true)
        .order("display_order");
      if (error) toast.error("Failed to load quizzes");
      setQuizzes((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const diffColor = (d: string) =>
    d === "beginner" ? "bg-success/15 text-success" : d === "advanced" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold">Quizzes</h1>
            <p className="mt-1 text-muted-foreground">Practice scenario-based AWS &amp; DevOps interview questions.</p>
          </div>
          {!authLoading && !hasAccess && (
            <Button asChild className="gradient-primary text-primary-foreground">
              <Link to="/pricing">Unlock all questions for ₹199</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : quizzes.length === 0 ? (
          <p className="text-muted-foreground">No quizzes published yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <Card key={q.id} className="gradient-card border-border/60 shadow-card transition-all hover:shadow-glow">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    {q.category && <Badge variant="outline">{q.category.name}</Badge>}
                    <Badge className={diffColor(q.difficulty)} variant="secondary">{q.difficulty}</Badge>
                  </div>
                  <CardTitle>{q.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{q.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {q.estimated_minutes && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.estimated_minutes} min</span>
                    )}
                    {!hasAccess && <span className="flex items-center gap-1 text-primary"><Lock className="h-3 w-3" /> 3 free, then locked</span>}
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/quiz/${q.slug}`}>Start <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
