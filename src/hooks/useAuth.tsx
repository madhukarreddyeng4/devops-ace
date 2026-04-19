import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          loadUserContext(sess.user.id);
        }, 0);
      } else {
        setRoles([]);
        setHasAccess(false);
        setAccessExpiresAt(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadUserContext(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserContext(userId: string) {
    const [{ data: rolesData }, { data: payment }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("payments")
        .select("access_expires_at")
        .eq("user_id", userId)
        .eq("status", "paid")
        .gt("access_expires_at", new Date().toISOString())
        .order("access_expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setRoles((rolesData?.map((r) => r.role as AppRole)) ?? []);
    setHasAccess(!!payment);
    setAccessExpiresAt(payment?.access_expires_at ?? null);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    user,
    roles,
    isAdmin: roles.includes("admin"),
    hasAccess,
    accessExpiresAt,
    loading,
    signOut,
  };
}
