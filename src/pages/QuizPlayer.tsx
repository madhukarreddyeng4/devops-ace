import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id: string;
  scenario: string | null;
  question_text: string;
  answer: string;
  explanation: string | null;
  order_index: number;
  options: string[] | null;
  correct_option: number | null;
};

type Quiz = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

export default function QuizPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { hasAccess, loading: authLoading, user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: q } = await supabase.from("quizzes").select("id, title, slug, description").eq("slug", slug).maybeSingle();
      if (!q) { setLoading(false); return; }
      setQuiz(q);
      const { data: qs, error } = await supabase
        .from("questions")
        .select("id, scenario, question_text, answer, explanation, order_index, options, correct_option")
        .eq("quiz_id", q.id)
        .order("order_index");
      if (error) toast.error("Failed to load questions");
      setQuestions((qs as any) ?? []);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => { setShowAnswer(false); setSelected(null); }, [idx]);

  if (loading || authLoading) {
    return (<div className="min-h-screen"><Navbar /><div className="container py-10 text-muted-foreground">Loading...</div></div>);
  }
  if (!quiz) {
    return (<div className="min-h-screen"><Navbar /><div className="container py-10">Quiz not found.</div></div>);
  }

  const total = questions.length;
  const current = questions[idx];
  const isLocked = !current; // RLS hides questions beyond free tier when no access

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-3">
            <Link to="/quizzes"><ChevronLeft className="mr-1 h-4 w-4" /> All quizzes</Link>
          </Button>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={total ? ((idx + 1) / total) * 100 : 0} className="flex-1" />
            <span className="text-sm text-muted-foreground">{Math.min(idx + 1, total)} / {total}</span>
          </div>
        </div>

        {!user && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4 text-sm">
              <Link to="/auth" className="font-medium text-primary hover:underline">Sign in</Link> to save progress and unlock more questions.
            </CardContent>
          </Card>
        )}

        {isLocked ? (
          <Card className="gradient-card border-primary/40 shadow-glow">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold">Unlock the rest</h2>
              <p className="mt-2 text-muted-foreground">You've completed the free preview. Unlock all questions, all quizzes, for one year.</p>
              <Button asChild size="lg" className="mt-6 gradient-primary text-primary-foreground">
                <Link to="/pricing">Unlock for ₹199</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="gradient-card border-border/60 shadow-card">
            <CardHeader>
              <Badge variant="outline" className="w-fit">Question {idx + 1}</Badge>
              {current.scenario && (
                <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Scenario</p>
                  <p className="text-foreground">{current.scenario}</p>
                </div>
              )}
              <CardTitle className="mt-4 text-xl">{current.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(current.options) && current.options.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {current.options.map((opt, i) => {
                      const isCorrect = current.correct_option === i;
                      const isSelected = selected === i;
                      const revealed = selected !== null;
                      const base = "w-full rounded-lg border p-3 text-left text-sm transition-colors";
                      const cls = !revealed
                        ? "border-border/60 bg-muted/20 hover:bg-muted/40"
                        : isCorrect
                          ? "border-success/50 bg-success/10"
                          : isSelected
                            ? "border-destructive/50 bg-destructive/10"
                            : "border-border/40 bg-muted/10 opacity-70";
                      return (
                        <button
                          key={i}
                          disabled={revealed}
                          onClick={() => setSelected(i)}
                          className={`${base} ${cls}`}
                        >
                          <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {selected !== null && (
                    <>
                      <div className={`rounded-lg border p-4 ${selected === current.correct_option ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${selected === current.correct_option ? "text-success" : "text-destructive"}`}>
                          {selected === current.correct_option ? "Correct" : "Not quite"}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.answer}</p>
                      </div>
                      {current.explanation && (
                        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Why it matters</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.explanation}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : !showAnswer ? (
                <Button onClick={() => setShowAnswer(true)} className="w-full gradient-primary text-primary-foreground">
                  <Eye className="mr-2 h-4 w-4" /> Reveal answer
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Answer</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.answer}</p>
                  </div>
                  {current.explanation && (
                    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Why it matters</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.explanation}</p>
                    </div>
                  )}
                  <Button onClick={() => setShowAnswer(false)} variant="ghost" size="sm">
                    <EyeOff className="mr-2 h-4 w-4" /> Hide
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button onClick={() => setIdx((i) => i + 1)} disabled={!hasAccess && idx >= 2}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
