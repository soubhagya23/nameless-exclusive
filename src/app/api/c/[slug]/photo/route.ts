import { NextResponse } from "next/server";
import { getClientBySlug, getRound, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

/** Two steps: {step:"start"} returns a signed upload URL; {step:"done"} confirms the file landed. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const round = await getRound(String(body?.roundId || ""));
  if (!round || round.client_id !== client.id) return NextResponse.json({ error: "unknown shoot" }, { status: 404 });
  const sb = supabaseAdmin();
  const step = String(body?.step || "start");

  if (step === "start") {
    const mime = String(body?.mime || "image/jpeg").split(";")[0].trim();
    const ext = EXT[mime] || "jpg";
    const prompt = String(body?.prompt || "").slice(0, 200);
    const { data: row, error } = await sb.from("photos").insert({ client_id: client.id, round_id: round.id, prompt, storage_path: "pending", mime }).select("id").single();
    if (error || !row) return NextResponse.json({ error: error?.message || "insert failed" }, { status: 500 });
    const path = `${client.slug}/s${round.number}-${row.id}.${ext}`;
    await sb.from("photos").update({ storage_path: path }).eq("id", row.id);
    const { data: signed, error: sErr } = await sb.storage.from("photos").createSignedUploadUrl(path);
    if (sErr || !signed) return NextResponse.json({ error: sErr?.message || "sign failed" }, { status: 500 });
    return NextResponse.json({ photoId: row.id, path, token: signed.token });
  }
  if (step === "done") {
    const photoId = String(body?.photoId || "");
    const { data: p } = await sb.from("photos").select("id, prompt").eq("id", photoId).eq("client_id", client.id).maybeSingle();
    if (!p) return NextResponse.json({ error: "unknown photo" }, { status: 404 });
    await logEvent(client.id, "photo", { shoot: round.number, prompt: p.prompt });
    return NextResponse.json({ ok: true });
  }
  if (step === "remove") {
    const photoId = String(body?.photoId || "");
    const { data: p } = await sb.from("photos").select("id, storage_path").eq("id", photoId).eq("client_id", client.id).maybeSingle();
    if (!p) return NextResponse.json({ error: "unknown photo" }, { status: 404 });
    if (p.storage_path !== "pending") await sb.storage.from("photos").remove([p.storage_path]);
    await sb.from("photos").delete().eq("id", photoId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad step" }, { status: 400 });
}
