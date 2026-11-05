import { NextResponse } from "next/server";
import { getClientBySlug } from "@/lib/db";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase-admin";

const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac" };

/** Creates the recording row and a short-lived signed URL the browser uploads straight into storage. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const kind = String(body?.kind || "");
  if (!["fix", "drive", "answer"].includes(kind)) return NextResponse.json({ error: "bad kind" }, { status: 400 });
  const cardId = body?.cardId ? String(body.cardId) : null;
  const rawMime = String(body?.mime || "audio/webm");
  const baseMime = rawMime.split(";")[0].trim();
  const ext = EXT[baseMime] || "webm";

  const sb = supabaseAdmin();
  const { data: rec, error } = await sb
    .from("recordings")
    .insert({ client_id: client.id, kind, card_id: cardId, storage_path: "pending", mime: baseMime, transcript_status: "pending" })
    .select("id")
    .single();
  if (error || !rec) return NextResponse.json({ error: error?.message || "insert failed" }, { status: 500 });

  const path = `${client.slug}/${kind}${cardId ? "-" + cardId : ""}-${rec.id}.${ext}`;
  await sb.from("recordings").update({ storage_path: path }).eq("id", rec.id);
  const { data: signed, error: sErr } = await sb.storage.from(RECORDINGS_BUCKET).createSignedUploadUrl(path);
  if (sErr || !signed) return NextResponse.json({ error: sErr?.message || "sign failed" }, { status: 500 });
  return NextResponse.json({ recordingId: rec.id, path, token: signed.token });
}
