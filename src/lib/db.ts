import { supabaseAdmin } from "./supabase-admin";
import type { Client, CardAnswer, Recording, Brief, Round, RoundConfig, Ask } from "./types";
import { defaultRound } from "./templates";

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
  const { data } = await supabaseAdmin().from("rounds").select("*").eq("client_id", clientId).order("number", { ascending: false });
  return (data || []).map(normaliseRound);
}

export async function getRound(id: string): Promise<Round | null> {
  const { data } = await supabaseAdmin().from("rounds").select("*").eq("id", id).maybeSingle();
  return data ? normaliseRound(data) : null;
}

/** The round the client's page shows right now: the live one, else the most recent done one (read-only), else null. */
export async function getCurrentRound(clientId: string): Promise<Round | null> {
  const rounds = await listRounds(clientId);
  return rounds.find((r) => r.status === "live") || rounds.find((r) => r.status === "done") || null;
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

export async function getBriefs(clientId: string): Promise<Brief[]> {
  const { data } = await supabaseAdmin().from("briefs").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Brief[];
}

export async function getAsks(clientId: string): Promise<Ask[]> {
  const { data } = await supabaseAdmin().from("asks").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Ask[];
}

export async function logEvent(clientId: string, type: string, payload: Record<string, unknown> = {}) {
  await supabaseAdmin().from("events").insert({ client_id: clientId, type, payload });
}

function normaliseClient(row: Record<string, unknown>): Client {
  return { ...(row as unknown as Client), config: (row.config as Client["config"]) || {}, shoot_days: (row.shoot_days as string[]) || [] };
}

function normaliseRound(row: Record<string, unknown>): Round {
  const cfg = (row.config as Partial<RoundConfig>) || {};
  const config: RoundConfig = {
    ...defaultRound,
    ...cfg,
    cards: Array.isArray(cfg.cards) ? cfg.cards : defaultRound.cards,
    prompts: Array.isArray(cfg.prompts) ? cfg.prompts : defaultRound.prompts,
    shootOptions: Array.isArray(cfg.shootOptions) ? cfg.shootOptions : [],
  };
  return { ...(row as unknown as Round), config };
}
