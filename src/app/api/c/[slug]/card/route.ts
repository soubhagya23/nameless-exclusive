import { NextResponse } from "next/server";
import { getClientBySlug, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const card_id = String(body?.card_id || "");
  const verdict = String(body?.verdict || "");
  if (!client.config.cards.some((c) => c.id === card_id) || !["yes", "no", "skip"].includes(verdict)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const note = String(body?.note || "").slice(0, 400);
  const recording_id = body?.recording_id ? String(body.recording_id) : null;
  const { error } = await supabaseAdmin()
    .from("card_answers")
    .upsert({ client_id: client.id, card_id, verdict, note, recording_id }, { onConflict: "client_id,card_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent(client.id, "card", { card_id, verdict, note });
  return NextResponse.json({ ok: true });
}
