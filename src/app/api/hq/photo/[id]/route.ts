import { NextResponse } from "next/server";
import { hqUser } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Shows a client photo to a signed-in HQ user via a short-lived signed URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await hqUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("photos").select("storage_path").eq("id", id).maybeSingle();
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data, error } = await sb.storage.from("photos").createSignedUrl(p.storage_path, 600);
  if (error || !data) return NextResponse.json({ error: error?.message || "sign failed" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
