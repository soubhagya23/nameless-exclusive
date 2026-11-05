import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClientBySlug, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { transcribeRecording } from "@/lib/transcribe";

export const maxDuration = 300;

/** Called once the browser has finished uploading. Marks duration and kicks off transcription in the background. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const recordingId = String(body?.recordingId || "");
  const duration = Math.max(0, Math.round(Number(body?.duration) || 0));
  const sb = supabaseAdmin();
  const { data: rec } = await sb.from("recordings").select("id, kind, client_id").eq("id", recordingId).eq("client_id", client.id).maybeSingle();
  if (!rec) return NextResponse.json({ error: "unknown recording" }, { status: 404 });
  await sb.from("recordings").update({ duration_secs: duration }).eq("id", rec.id);
  await logEvent(client.id, "recording", { recordingId: rec.id, kind: rec.kind, duration });

  // Transcribe after the response is sent so the client is not kept waiting.
  after(async () => {
    try { await transcribeRecording(rec.id); } catch (e) { console.error("transcribe failed", e); }
  });
  return NextResponse.json({ ok: true });
}
