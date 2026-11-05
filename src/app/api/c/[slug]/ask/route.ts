import { NextResponse } from "next/server";
import { getClientBySlug, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** The client answers a question HQ asked him: one line of text, a recording, or both. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const askId = String(body?.askId || "");
  const text = String(body?.text || "").slice(0, 1000);
  const recordingId = body?.recordingId ? String(body.recordingId) : null;
  if (!text && !recordingId) return NextResponse.json({ error: "empty" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: ask } = await sb.from("asks").select("id").eq("id", askId).eq("client_id", client.id).maybeSingle();
  if (!ask) return NextResponse.json({ error: "unknown ask" }, { status: 404 });
  const { error } = await sb.from("asks").update({ status: "answered", answer_text: text, recording_id: recordingId, answered_at: new Date().toISOString() }).eq("id", askId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent(client.id, "ask_answered", { askId, hasVoice: !!recordingId });
  return NextResponse.json({ ok: true });
}
