import { NextResponse } from "next/server";
import { hqUser } from "@/lib/supabase-server";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase-admin";

/** Streams a recording to a signed-in HQ user via a short-lived signed URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await hqUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: rec } = await sb.from("recordings").select("storage_path").eq("id", id).maybeSingle();
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data, error } = await sb.storage.from(RECORDINGS_BUCKET).createSignedUrl(rec.storage_path, 600);
  if (error || !data) return NextResponse.json({ error: error?.message || "sign failed" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
