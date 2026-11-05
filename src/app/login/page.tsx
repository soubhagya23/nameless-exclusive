import { redirect } from "next/navigation";
import { hqUser, supabaseServer, allowedEmails } from "@/lib/supabase-server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const allowed = allowedEmails();
  if (!email || (allowed.length && !allowed.includes(email))) redirect("/login?e=notallowed");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${proto}://${host}/auth/callback` } });
  if (error) redirect("/login?e=" + encodeURIComponent(error.message));
  redirect("/login?sent=1");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; e?: string }> }) {
  const user = await hqUser();
  if (user) redirect("/hq");
  const sp = await searchParams;
  return (
    <div className="center">
      <form className="box" action={sendLink}>
        <span className="redact" />
        <h2 style={{ color: "#fff" }}>HQ <span className="acc">sign in.</span></h2>
        {sp.sent ? <p className="notice" style={{ background: "#1a1a1a", borderColor: "#2a2a2a", color: "#fff" }}>Link sent. Open the email on this device.</p> : null}
        {sp.e ? <p className="notice err" style={{ background: "#1a1a1a" }}>{sp.e === "notallowed" ? "That email is not on the list." : sp.e}</p> : null}
        <input type="email" name="email" placeholder="you@thenameless.studio" required autoComplete="email" />
        <button className="btn" type="submit" style={{ background: "#fff", color: "#111", borderColor: "#fff" }}>Email me a link</button>
        <span className="label" style={{ color: "var(--dim)" }}>No password. The link signs you in.</span>
      </form>
    </div>
  );
}
