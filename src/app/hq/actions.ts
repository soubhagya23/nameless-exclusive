"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hqUser } from "@/lib/supabase-server";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase-admin";
import { generateBrief } from "@/lib/brief";
import { transcribeRecording } from "@/lib/transcribe";
import { draftNextShoot } from "@/lib/draft";
import { getRound, listRounds, logEvent } from "@/lib/db";
import { followUpRound } from "@/lib/templates";
import type { RoundConfig, ShootPlan } from "@/lib/types";

async function guard() {
  const u = await hqUser();
  if (!u) throw new Error("not signed in");
  return u;
}

function cleanConfig(raw: unknown): RoundConfig {
  const c = (raw || {}) as Partial<RoundConfig>;
  const cards = (Array.isArray(c.cards) ? c.cards : []).map((x) => ({ id: String(x.id || "").trim(), claim: String(x.claim || "").trim(), why: String(x.why || "").trim(), clip: String(x.clip || "").trim() || undefined })).filter((x) => x.id && x.claim);
  const prompts = (Array.isArray(c.prompts) ? c.prompts : []).map((x) => ({ q: String(x.q || "").trim(), h: String(x.h || "").trim() })).filter((x) => x.q);
  const shootOptions = (Array.isArray(c.shootOptions) ? c.shootOptions : []).map((x) => String(x).trim()).filter(Boolean);
  const photoAsks = (Array.isArray(c.photoAsks) ? c.photoAsks : []).map((x) => String(x).trim()).filter(Boolean);
  const ids = new Set<string>();
  for (const card of cards) { if (ids.has(card.id)) throw new Error(`Two cards share the id "${card.id}"`); ids.add(card.id); }
  if (!cards.length) throw new Error("A shoot needs at least one card");
  return { lede: String(c.lede || "").trim(), intro: String(c.intro || "").trim(), secondsPerPrompt: Math.max(20, Math.min(300, Number(c.secondsPerPrompt) || 90)), cards, prompts, shootOptions, photoAsks };
}

function friendly(e: unknown): never {
  const m = e instanceof Error ? e.message : String(e);
  if (/duplicate key|unique/i.test(m) && /slug/i.test(m)) throw new Error("That link is already taken by another client. Pick a different slug.");
  throw new Error(m);
}

/* ---------- clients ---------- */

export async function actionSaveClient(clientId: string | null, formData: FormData) {
  await guard();
  const name = String(formData.get("name") || "").trim();
  const first_name = String(formData.get("first_name") || "").trim() || name.split(" ")[0];
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const portrait_url = String(formData.get("portrait_url") || "").trim() || null;
  const wa_number = String(formData.get("wa_number") || "").replace(/[^0-9]/g, "") || null;
  const config = { area: String(formData.get("area") || "").trim(), akshayName: String(formData.get("akshayName") || "").trim() || "Akshay" };
  if (!name || !slug) throw new Error("Name and slug are required");
  const sb = supabaseAdmin();
  if (clientId) {
    const { error } = await sb.from("clients").update({ name, first_name, slug, portrait_url, wa_number, config }).eq("id", clientId);
    if (error) friendly(error);
  } else {
    let roundConfig: RoundConfig;
    try { roundConfig = cleanConfig(JSON.parse(String(formData.get("round") || "{}"))); } catch (e) { throw new Error(e instanceof Error ? e.message : "Shoot 1 is not valid"); }
    const { data: exists } = await sb.from("clients").select("id").eq("slug", slug).maybeSingle();
    if (exists) throw new Error("That link is already taken by another client. Pick a different slug.");
    const { data, error } = await sb.from("clients").insert({ name, first_name, slug, portrait_url, wa_number, config }).select("id").single();
    if (error || !data) friendly(error || "insert failed");
    const { error: rErr } = await sb.from("rounds").insert({ client_id: data.id, number: 1, title: "Shoot 1", status: "draft", config: roundConfig });
    if (rErr) friendly(rErr);
    await logEvent(data.id, "client_created", {});
  }
  revalidatePath("/hq");
  redirect(`/hq/${slug}`);
}

/* ---------- shoots ---------- */

export async function actionSaveRound(roundId: string, slug: string, formData: FormData) {
  await guard();
  const title = String(formData.get("title") || "").trim() || "Shoot";
  let config: RoundConfig;
  try { config = cleanConfig(JSON.parse(String(formData.get("round") || "{}"))); } catch (e) { throw new Error(e instanceof Error ? e.message : "Shoot is not valid"); }
  const { error } = await supabaseAdmin().from("rounds").update({ title, config }).eq("id", roundId);
  if (error) throw new Error(error.message);
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}?s=${roundId}`);
}

/** New shoot: AI draft from everything we know, or the follow-up template. Always a draft until Send. */
export async function actionNewShoot(clientId: string, slug: string, formData: FormData) {
  await guard();
  const how = String(formData.get("how") || "ai");
  const rounds = await listRounds(clientId);
  const number = (rounds[rounds.length - 1]?.number || 0) + 1;
  let config: RoundConfig = followUpRound;
  let note = "";
  if (how === "ai") {
    try { config = await draftNextShoot(clientId, number); } catch (e) { note = e instanceof Error ? e.message : String(e); config = followUpRound; }
  } else if (how === "previous" && rounds.length) {
    config = { ...rounds[rounds.length - 1].config, shootOptions: [] };
  }
  const { data, error } = await supabaseAdmin().from("rounds").insert({ client_id: clientId, number, title: `Shoot ${number}`, status: "draft", config }).select("id").single();
  if (error || !data) throw new Error(error?.message || "insert failed");
  await logEvent(clientId, "shoot_drafted", { shoot: number, how, note });
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}/rounds/${data.id}${note ? "?note=" + encodeURIComponent(note) : ""}`);
}

/** Redo the AI draft on an existing draft shoot. */
export async function actionRedraft(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) throw new Error("shoot not found");
  const config = await draftNextShoot(round.client_id, round.number);
  await supabaseAdmin().from("rounds").update({ config }).eq("id", roundId);
  revalidatePath(`/hq/${slug}/rounds/${roundId}`);
}

/** Send: the shoot goes live on his page. Other live shoots close. */
export async function actionSendShoot(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) throw new Error("shoot not found");
  const sb = supabaseAdmin();
  await sb.from("rounds").update({ status: "done" }).eq("client_id", round.client_id).eq("status", "live").neq("id", roundId);
  await sb.from("clients").update({ shoot_days: [] }).eq("id", round.client_id);
  await sb.from("rounds").update({ status: "live", sent_at: new Date().toISOString() }).eq("id", roundId);
  await logEvent(round.client_id, "shoot_sent", { shoot: round.number });
  revalidatePath(`/hq/${slug}`); revalidatePath("/hq");
}

export async function actionShootDone(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) return;
  await supabaseAdmin().from("rounds").update({ status: "done" }).eq("id", roundId);
  await logEvent(round.client_id, "shoot_done", { shoot: round.number });
  revalidatePath(`/hq/${slug}`); revalidatePath("/hq");
}

export async function actionReopenShoot(roundId: string, slug: string) {
  await guard();
  await supabaseAdmin().from("rounds").update({ status: "draft" }).eq("id", roundId);
  revalidatePath(`/hq/${slug}`);
}

export async function actionDeleteRound(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) return;
  if (round.status !== "draft" || round.number === 1) throw new Error("Only drafts after shoot 1 can be deleted");
  await supabaseAdmin().from("rounds").delete().eq("id", roundId);
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}`);
}

/* ---------- plan ---------- */

export async function actionSavePlan(roundId: string, slug: string, formData: FormData) {
  await guard();
  const round = await getRound(roundId);
  if (!round) throw new Error("shoot not found");
  const plan: ShootPlan = {
    date: String(formData.get("date") || "").trim(),
    callTime: String(formData.get("callTime") || "").trim(),
    place: String(formData.get("place") || "").trim(),
    runOfDay: String(formData.get("runOfDay") || "").trim(),
    wear: String(formData.get("wear") || "").trim(),
    bring: String(formData.get("bring") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    checklist: String(formData.get("checklist") || "").split("\n").map((s) => s.trim()).filter(Boolean),
  };
  const send = String(formData.get("send") || "") === "1";
  const patch: Record<string, unknown> = { plan, shoot_date: plan.date || null };
  if (send) { patch.plan_status = round.plan_status === "accepted" ? "accepted" : "sent"; }
  const sb = supabaseAdmin();
  await sb.from("rounds").update(patch).eq("id", roundId);
  if (send) { await sb.from("clients").update({ status: "plan" }).eq("id", round.client_id); await logEvent(round.client_id, "plan_sent", { shoot: round.number, date: plan.date }); }
  revalidatePath(`/hq/${slug}`);
}

export async function actionUnsendPlan(roundId: string, slug: string) {
  await guard();
  await supabaseAdmin().from("rounds").update({ plan_status: "none", plan_accepted_at: null, checklist_done: [] }).eq("id", roundId);
  revalidatePath(`/hq/${slug}`);
}

/* ---------- asks ---------- */

export async function actionAsk(clientId: string, slug: string, formData: FormData) {
  await guard();
  const question = String(formData.get("question") || "").trim().slice(0, 500);
  if (!question) return;
  await supabaseAdmin().from("asks").insert({ client_id: clientId, question });
  await logEvent(clientId, "asked", { question });
  revalidatePath(`/hq/${slug}`);
}

export async function actionDeleteAsk(askId: string, slug: string) {
  await guard();
  await supabaseAdmin().from("asks").delete().eq("id", askId);
  revalidatePath(`/hq/${slug}`);
}

/* ---------- reset ---------- */

export async function actionResetClient(clientId: string, slug: string) {
  await guard();
  const sb = supabaseAdmin();
  const { data: recs } = await sb.from("recordings").select("storage_path").eq("client_id", clientId);
  const paths = (recs || []).map((r) => r.storage_path).filter((p) => p && p !== "pending");
  if (paths.length) await sb.storage.from(RECORDINGS_BUCKET).remove(paths);
  const { data: ph } = await sb.from("photos").select("storage_path").eq("client_id", clientId);
  const ppaths = (ph || []).map((r) => r.storage_path).filter((p) => p && p !== "pending");
  if (ppaths.length) await sb.storage.from("photos").remove(ppaths);
  await sb.from("card_answers").delete().eq("client_id", clientId);
  await sb.from("recordings").delete().eq("client_id", clientId);
  await sb.from("photos").delete().eq("client_id", clientId);
  await sb.from("asks").delete().eq("client_id", clientId);
  await sb.from("briefs").delete().eq("client_id", clientId);
  await sb.from("events").delete().eq("client_id", clientId);
  await sb.from("rounds").update({ plan_status: "none", plan_accepted_at: null, checklist_done: [], sent_at: null, shoot_date: null, shoot_note: null }).eq("client_id", clientId);
  await sb.from("rounds").update({ status: "draft" }).eq("client_id", clientId).neq("number", 1);
  await sb.from("rounds").update({ status: "live" }).eq("client_id", clientId).eq("number", 1);
  await sb.from("clients").update({ shoot_days: [], status: "handshake" }).eq("id", clientId);
  revalidatePath(`/hq/${slug}`); revalidatePath("/hq");
}

/* ---------- briefs, transcripts ---------- */

export async function actionGenerateBrief(clientId: string, slug: string) {
  await guard();
  await generateBrief(clientId);
  revalidatePath(`/hq/${slug}`);
}

export async function actionRetranscribe(recordingId: string, slug: string) {
  await guard();
  try { await transcribeRecording(recordingId); } catch { /* status is on the row */ }
  revalidatePath(`/hq/${slug}`);
}

export async function actionSaveBriefEdit(briefId: string, slug: string, formData: FormData) {
  await guard();
  const edited = String(formData.get("edited") || "");
  await supabaseAdmin().from("briefs").update({ edited_content: edited }).eq("id", briefId);
  revalidatePath(`/hq/${slug}`);
}
