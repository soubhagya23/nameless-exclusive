import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

/** Supabase magic link lands here with ?code=...; exchange it for a session cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/hq`);
    return NextResponse.redirect(`${origin}/login?e=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
