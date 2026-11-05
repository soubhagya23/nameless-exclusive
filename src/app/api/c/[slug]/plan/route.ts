import { NextResponse } from "next/server";
import { getClientBySlug, getRound, logEvent } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** "Works for me" on the shoot plan, and checklist ticks. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const round = await getRound(String(body?.roundId || ""));
  if (!round || round.client_id !== client.id) return NextResponse.json({ error: "unknown shoot" }, { status: 404 });
  const sb = supabaseAdmin();
  const action = String(body?.action || "");
  if (action === "accept") {
    if (round.plan_status === "none") return NextResponse.json({ error: "no plan yet" }, { status: 409 });
    await sb.from("rounds").update({ plan_status: "accepted", plan_accepted_at: new Date().toISOString() }).eq("id", round.id);
    await sb.from("clients").update({ status: "shoot" }).eq("id", client.id);
    await logEvent(client.id, "plan_accepted", { shoot: round.number, date: round.plan.date || null });
    return NextResponse.json({ ok: true });
  }
  if (action === "checklist") {
    const done = Array.isArray(body?.done) ? body.done.map(String).filter((d: string) => (round.plan.checklist || []).includes(d)) : [];
    await sb.from("rounds").update({ checklist_done: done }).eq("id", round.id);
    await logEvent(client.id, "checklist", { shoot: round.number, done: done.length, of: (round.plan.checklist || []).length });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
