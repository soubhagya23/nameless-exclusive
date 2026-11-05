"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hqUser } from "@/lib/supabase-server";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase-admin";
import { generateBrief } from "@/lib/brief";
import { transcribeRecording } from "@/lib/transcribe";
import { getRound, listRounds } from "@/lib/db";
import type { RoundConfig } from "@/lib/types";

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
  const ids = new Set<string>();
  for (const card of cards) { if (ids.has(card.id)) throw new Error(`Two cards share the id "${card.id}"`); ids.add(card.id); }
  if (!cards.length) throw new Error("A round needs at least one card");
  return { lede: String(c.lede || "").trim(), intro: String(c.intro || "").trim(), secondsPerPrompt: Math.max(20, Math.min(300, Number(c.secondsPerPrompt) || 90)), cards, prompts, shootOptions };
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
    if (error) throw new Error(error.message);
  } else {
    let roundConfig: RoundConfig;
    try { roundConfig = cleanConfig(JSON.parse(String(formData.get("round") || "{}"))); } catch (e) { throw new Error(e instanceof Error ? e.message : "Round is not valid"); }
    const { data, error } = await sb.from("clients").insert({ name, first_name, slug, portrait_url, wa_number, config }).select("id").single();
    if (error || !data) throw new Error(error?.message || "insert failed");
    const { error: rErr } = await sb.from("rounds").insert({ client_id: data.id, number: 1, title: "Handshake", status: "live", config: roundConfig });
    if (rErr) throw new Error(rErr.message);
  }
  revalidatePath("/hq");
  redirect(`/hq/${slug}`);
}

export async function actionSetStatus(clientId: string, slug: string, formData: FormData) {
  await guard();
  const status = String(formData.get("status") || "handshake");
  await supabaseAdmin().from("clients").update({ status }).eq("id", clientId);
  revalidatePath(`/hq/${slug}`); revalidatePath("/hq");
}

/* ---------- rounds ---------- */

export async function actionSaveRound(roundId: string, slug: string, formData: FormData) {
  await guard();
  const title = String(formData.get("title") || "").trim() || "Round";
  let config: RoundConfig;
  try { config = cleanConfig(JSON.parse(String(formData.get("round") || "{}"))); } catch (e) { throw new Error(e instanceof Error ? e.message : "Round is not valid"); }
  const { error } = await supabaseAdmin().from("rounds").update({ title, config }).eq("id", roundId);
  if (error) throw new Error(error.message);
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}`);
}

export async function actionNewRound(clientId: string, slug: string, formData: FormData) {
  await guard();
  const from = String(formData.get("from") || "followup");
  const rounds = await listRounds(clientId);
  const number = (rounds[0]?.number || 0) + 1;
  let config: RoundConfig;
  if (from === "previous" && rounds[0]) {
    config = { ...rounds[0].config, shootOptions: [] };
  } else {
    const { followUpRound } = await import("@/lib/templates");
    config = followUpRound;
  }
  const title = String(formData.get("title") || "").trim() || `Shoot ${number} prep`;
  const { data, error } = await supabaseAdmin().from("rounds").insert({ client_id: clientId, number, title, status: "draft", config }).select("id").single();
  if (error || !data) throw new Error(error?.message || "insert failed");
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}/rounds/${data.id}`);
}

export async function actionRoundStatus(roundId: string, slug: string, formData: FormData) {
  await guard();
  const status = String(formData.get("status") || "draft");
  if (!["draft", "live", "done"].includes(status)) throw new Error("bad status");
  const round = await getRound(roundId);
  if (!round) throw new Error("round not found");
  const sb = supabaseAdmin();
  if (status === "live") {
    // Only one live round per client. Anything else live becomes done.
    await sb.from("rounds").update({ status: "done" }).eq("client_id", round.client_id).eq("status", "live").neq("id", roundId);
    await sb.from("clients").update({ shoot_days: [] }).eq("id", round.client_id);
  }
  await sb.from("rounds").update({ status }).eq("id", roundId);
  revalidatePath(`/hq/${slug}`);
}

export async function actionConfirmShoot(roundId: string, clientId: string, slug: string, formData: FormData) {
  await guard();
  const shoot_date = String(formData.get("shoot_date") || "").trim();
  const shoot_note = String(formData.get("shoot_note") || "").trim() || null;
  if (!shoot_date) throw new Error("Pick or type a day");
  const sb = supabaseAdmin();
  await sb.from("rounds").update({ shoot_date, shoot_note }).eq("id", roundId);
  await sb.from("clients").update({ status: "shoot" }).eq("id", clientId);
  revalidatePath(`/hq/${slug}`); revalidatePath("/hq");
}

export async function actionDeleteRound(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) return;
  if (round.status !== "draft") throw new Error("Only drafts can be deleted");
  await supabaseAdmin().from("rounds").delete().eq("id", roundId);
  revalidatePath(`/hq/${slug}`);
  redirect(`/hq/${slug}`);
}

export async function actionResetRound(roundId: string, slug: string) {
  await guard();
  const round = await getRound(roundId);
  if (!round) throw new Error("round not found");
  const sb = supabaseAdmin();
  const { data: recs } = await sb.from("recordings").select("storage_path").eq("round_id", roundId);
  const paths = (recs || []).map((r) => r.storage_path).filter((p) => p && p !== "pending");
  if (paths.length) await sb.storage.from(RECORDINGS_BUCKET).remove(paths);
  await sb.from("card_answers").delete().eq("round_id", roundId);
  await sb.from("recordings").delete().eq("round_id", roundId);
  await sb.from("rounds").update({ shoot_date: null, shoot_note: null }).eq("id", roundId);
  await sb.from("clients").update({ shoot_days: [] }).eq("id", round.client_id);
  revalidatePath(`/hq/${slug}`);
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
