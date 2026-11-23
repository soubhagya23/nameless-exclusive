import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cookie-backed client for HQ auth (magic link sessions). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. Middleware refreshes sessions.
        }
      },
    },
  });
}

/** Who can sign in: the HQ_ALLOWED_EMAILS env list plus everyone on the Team page (the `team` table). */
export async function allowedEmails(): Promise<string[]> {
  const env = (process.env.HQ_ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  try {
    const { supabaseAdmin } = await import("./supabase-admin");
    const { data } = await supabaseAdmin().from("team").select("email");
    return Array.from(new Set([...env, ...(data || []).map((r) => String(r.email).toLowerCase())]));
  } catch {
    return env;
  }
}

/** Returns the signed-in HQ user, or null when not signed in or not on the allow list. */
export async function hqUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  const allowed = await allowedEmails();
  if (allowed.length && !allowed.includes(email)) return null;
  return data.user;
}
