import { NextResponse } from "next/server";
import { getClientBySlug, getRound, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const round = await getRound(String(body?.roundId || ""));
  if (!round || round.client_id !== client.id || round.status !== "live") return NextResponse.json({ error: "round not live" }, { status: 409 });
  const days = Array.isArray(body?.days) ? body.days.map(String).filter((d: string) => round.config.shootOptions.includes(d)) : [];
  const { error } = await supabaseAdmin().from("clients").update({ shoot_days: days }).eq("id", client.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent(client.id, "days", { days });
  return NextResponse.json({ ok: true });
}
