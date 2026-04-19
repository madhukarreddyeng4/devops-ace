import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Quiz = { id: string; title: string; slug: string; is_published: boolean; difficulty: string };
type Question = { id: string; quiz_id: string; question_text: string; scenario: string | null; answer: string; explanation: string | null; order_index: number };
type Payment = { id: string; user_id: string; amount_paise: number; status: string; created_at: string; access_expires_at: string | null };

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");

  // new quiz form
  const [nqTitle, setNqTitle] = useState("");
  const [nqSlug, setNqSlug] = useState("");
  const [nqDesc, setNqDesc] = useState("");
  const [nqDiff, setNqDiff] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [nqPublished, setNqPublished] = useState(false);

  // new question form
  const [nQuestion, setNQuestion] = useState("");
  const [nScenario, setNScenario] = useState("");
  const [nAnswer, setNAnswer] = useState("");
  const [nExplanation, setNExplanation] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);
  useEffect(() => { if (selectedQuiz) loadQuestions(selectedQuiz); }, [selectedQuiz]);

  const refresh = async () => {
    const [{ data: qz }, { data: pm }] = await Promise.all([
      supabase.from("quizzes").select("id, title, slug, is_published, difficulty").order("display_order"),
      supabase.from("payments").select("id, user_id, amount_paise, status, created_at, access_expires_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setQuizzes((qz as any) ?? []);
    setPayments((pm as any) ?? []);
    if (qz && qz.length > 0 && !selectedQuiz) setSelectedQuiz(qz[0].id);
  };

  const loadQuestions = async (quizId: string) => {
    const { data } = await supabase.from("questions").select("*").eq("quiz_id", quizId).order("order_index");
    setQuestions((data as any) ?? []);
  };

  const createQuiz = async () => {
    if (!nqTitle || !nqSlug) return toast.error("Title and slug required");
    const { error } = await supabase.from("quizzes").insert({
      title: nqTitle, slug: nqSlug, description: nqDesc, difficulty: nqDiff, is_published: nqPublished,
    });
    if (error) return toast.error(error.message);
    toast.success("Quiz created");
    setNqTitle(""); setNqSlug(""); setNqDesc(""); setNqPublished(false);
    refresh();
  };

  const togglePublished = async (q: Quiz) => {
    await supabase.from("quizzes").update({ is_published: !q.is_published }).eq("id", q.id);
    refresh();
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    refresh();
  };

  const addQuestion = async () => {
    if (!selectedQuiz || !nQuestion || !nAnswer) return toast.error("Question and answer required");
    const nextOrder = questions.length;
    const { error } = await supabase.from("questions").insert({
      quiz_id: selectedQuiz,
      question_text: nQuestion,
      scenario: nScenario || null,
      answer: nAnswer,
      explanation: nExplanation || null,
      order_index: nextOrder,
    });
    if (error) return toast.error(error.message);
    toast.success("Question added");
    setNQuestion(""); setNScenario(""); setNAnswer(""); setNExplanation("");
    loadQuestions(selectedQuiz);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    loadQuestions(selectedQuiz);
  };

  if (loading || !isAdmin) return (<div className="min-h-screen"><Navbar /><div className="container py-10 text-muted-foreground">Loading...</div></div>);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">Admin Panel</h1>

        <Tabs defaultValue="quizzes">
          <TabsList>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* QUIZZES */}
          <TabsContent value="quizzes" className="space-y-6 pt-6">
            <Card>
              <CardHeader><CardTitle>Create Quiz</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div><Label>Title</Label><Input value={nqTitle} onChange={(e) => setNqTitle(e.target.value)} /></div>
                <div><Label>Slug</Label><Input value={nqSlug} onChange={(e) => setNqSlug(e.target.value)} placeholder="my-quiz-slug" /></div>
                <div className="md:col-span-2"><Label>Description</Label><Textarea value={nqDesc} onChange={(e) => setNqDesc(e.target.value)} /></div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={nqDiff} onValueChange={(v: any) => setNqDiff(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={nqPublished} onCheckedChange={setNqPublished} />
                  <Label>Published</Label>
                </div>
                <div className="md:col-span-2"><Button onClick={createQuiz} className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Create</Button></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>All Quizzes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {quizzes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">{q.title} <Badge variant="outline" className="ml-2">{q.difficulty}</Badge></p>
                      <p className="text-xs text-muted-foreground">/{q.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={q.is_published} onCheckedChange={() => togglePublished(q)} />
                        <span className="text-xs">{q.is_published ? "Live" : "Draft"}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteQuiz(q.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QUESTIONS */}
          <TabsContent value="questions" className="space-y-6 pt-6">
            <div className="max-w-md">
              <Label>Quiz</Label>
              <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {quizzes.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader><CardTitle>Add Question</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Scenario (optional)</Label><Textarea value={nScenario} onChange={(e) => setNScenario(e.target.value)} rows={2} /></div>
                <div><Label>Question</Label><Textarea value={nQuestion} onChange={(e) => setNQuestion(e.target.value)} rows={2} /></div>
                <div><Label>Answer</Label><Textarea value={nAnswer} onChange={(e) => setNAnswer(e.target.value)} rows={4} /></div>
                <div><Label>Explanation (optional)</Label><Textarea value={nExplanation} onChange={(e) => setNExplanation(e.target.value)} rows={2} /></div>
                <Button onClick={addQuestion} className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Existing ({questions.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start justify-between rounded-lg border border-border p-3">
                    <div className="flex-1 pr-4">
                      <p className="text-xs text-muted-foreground">#{i + 1}</p>
                      <p className="font-medium">{q.question_text}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYMENTS */}
          <TabsContent value="payments" className="pt-6">
            <Card>
              <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{p.user_id.slice(0, 8)}...</p>
                      <p>{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{(p.amount_paise / 100).toFixed(2)}</p>
                      <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
