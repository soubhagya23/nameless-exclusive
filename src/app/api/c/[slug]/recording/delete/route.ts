import { NextResponse } from "next/server";
import { getClientBySlug, logEvent } from "@/lib/db";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase-admin";

/** The client re-does a recording: remove the file and the row. Only his own recordings, by id. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const recordingId = String(body?.recordingId || "");
  const sb = supabaseAdmin();
  const { data: rec } = await sb.from("recordings").select("id, storage_path, kind").eq("id", recordingId).eq("client_id", client.id).maybeSingle();
  if (!rec) return NextResponse.json({ error: "unknown recording" }, { status: 404 });
  if (rec.storage_path && rec.storage_path !== "pending") await sb.storage.from(RECORDINGS_BUCKET).remove([rec.storage_path]);
  await sb.from("card_answers").update({ recording_id: null }).eq("recording_id", rec.id);
  await sb.from("recordings").delete().eq("id", rec.id);
  await logEvent(client.id, "recording_deleted", { recordingId: rec.id, kind: rec.kind });
  return NextResponse.json({ ok: true });
}
