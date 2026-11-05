import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
