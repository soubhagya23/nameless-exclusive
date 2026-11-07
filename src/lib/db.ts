import { supabaseAdmin } from "./supabase-admin";
import type { Client, CardAnswer, Recording, Brief, Round, RoundConfig, Ask, Photo, Event, ShootPlan, ShootStage } from "./types";
import { defaultQuestionnaire } from "./templates";

export async function getClientBySlug(slug: string): Promise<Client | null> {
  const { data } = await supabaseAdmin().from("clients").select("*").eq("slug", slug).maybeSingle();
  return data ? normaliseClient(data) : null;
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data } = await supabaseAdmin().from("clients").select("*").eq("id", id).maybeSingle();
  return data ? normaliseClient(data) : null;
}

export async function listClients(): Promise<Client[]> {
  const { data } = await supabaseAdmin().from("clients").select("*").order("created_at", { ascending: false });
  return (data || []).map(normaliseClient);
}

export async function listRounds(clientId: string): Promise<Round[]> {
  const { data } = await supabaseAdmin().from("rounds").select("*").eq("client_id", clientId).order("number", { ascending: true });
  return (data || []).map(normaliseRound);
}

export async function getRound(id: string): Promise<Round | null> {
  const { data } = await supabaseAdmin().from("rounds").select("*").eq("id", id).maybeSingle();
  return data ? normaliseRound(data) : null;
}

/** The onboarding questionnaire round (number 0), if the client has one. */
export function questionnaireOf(rounds: Round[]): Round | null {
  return rounds.find((r) => r.kind === "questionnaire") || null;
}
export function shootsOf(rounds: Round[]): Round[] {
  return rounds.filter((r) => r.kind === "shoot");
}

/** The shoot the client's page is about right now: the live one, else the latest with a plan sent, else the latest. */
export function currentShootOf(rounds: Round[]): Round | null {
  const shoots = shootsOf(rounds);
  const live = shoots.find((r) => r.status === "live");
  if (live) return live;
  const planned = [...shoots].reverse().find((r) => r.plan_status !== "none" && r.status !== "done");
  return planned || shoots[shoots.length - 1] || null;
}

export async function getAnswers(clientId: string, roundId?: string): Promise<CardAnswer[]> {
  let q = supabaseAdmin().from("card_answers").select("*").eq("client_id", clientId);
  if (roundId) q = q.eq("round_id", roundId);
  const { data } = await q;
  return (data || []) as CardAnswer[];
}

export async function getRecordings(clientId: string, roundId?: string): Promise<Recording[]> {
  let q = supabaseAdmin().from("recordings").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (roundId) q = q.eq("round_id", roundId);
  const { data } = await q;
  return (data || []) as Recording[];
}

export async function getPhotos(clientId: string, roundId?: string): Promise<Photo[]> {
  let q = supabaseAdmin().from("photos").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (roundId) q = q.eq("round_id", roundId);
  const { data } = await q;
  return (data || []) as Photo[];
}

export async function getBriefs(clientId: string): Promise<Brief[]> {
  const { data } = await supabaseAdmin().from("briefs").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Brief[];
}

export async function getAsks(clientId: string): Promise<Ask[]> {
  const { data } = await supabaseAdmin().from("asks").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Ask[];
}

export async function getEvents(clientId: string, limit = 40): Promise<Event[]> {
  const { data } = await supabaseAdmin().from("events").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(limit);
  return (data || []) as Event[];
}

export async function logEvent(clientId: string, type: string, payload: Record<string, unknown> = {}) {
  await supabaseAdmin().from("events").insert({ client_id: clientId, type, payload });
}

/** Where a round is, from what we have. Works for the questionnaire too (it never has a plan). */
export function shootStage(r: Round, answersCount: number, hasDrive: boolean): ShootStage {
  if (r.status === "done") return "done";
  if (r.plan_status === "accepted") return "confirmed";
  if (r.plan_status === "sent") return "planned";
  if (r.status === "draft") return "not sent";
  const need = r.config.cards.length;
  const driveOk = r.config.prompts.length ? hasDrive : true;
  if ((need > 0 || r.config.prompts.length > 0) && answersCount >= need && driveOk) return "answered";
  return "live";
}

function normaliseClient(row: Record<string, unknown>): Client {
  return { ...(row as unknown as Client), config: (row.config as Client["config"]) || {}, shoot_days: (row.shoot_days as string[]) || [] };
}

function normaliseRound(row: Record<string, unknown>): Round {
  const cfg = (row.config as Partial<RoundConfig>) || {};
  const config: RoundConfig = {
    ...defaultQuestionnaire,
    ...cfg,
    cards: Array.isArray(cfg.cards) ? cfg.cards : [],
    prompts: Array.isArray(cfg.prompts) ? cfg.prompts : [],
    shootOptions: Array.isArray(cfg.shootOptions) ? cfg.shootOptions : [],
    photoAsks: Array.isArray(cfg.photoAsks) ? cfg.photoAsks : [],
    references: Array.isArray(cfg.references) ? cfg.references : [],
  };
  const plan = ((row.plan as ShootPlan) || {}) as ShootPlan;
  return {
    ...(row as unknown as Round),
    kind: row.kind === "questionnaire" || Number(row.number) === 0 ? "questionnaire" : "shoot",
    config,
    plan: { ...plan, checklist: Array.isArray(plan.checklist) ? plan.checklist : [] },
    plan_status: (row.plan_status as Round["plan_status"]) || "none",
    checklist_done: Array.isArray(row.checklist_done) ? (row.checklist_done as string[]) : [],
  };
}
