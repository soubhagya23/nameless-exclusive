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

export function allowedEmails(): string[] {
  return (process.env.HQ_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns the signed-in HQ user, or null when not signed in or not on the allow list. */
export async function hqUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  const allowed = allowedEmails();
  if (allowed.length && !allowed.includes(email)) return null;
  return data.user;
}
