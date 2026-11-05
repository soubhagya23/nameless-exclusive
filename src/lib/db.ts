import { supabaseAdmin } from "./supabase-admin";
import type { Client, CardAnswer, Recording, Brief, ClientConfig } from "./types";
import { defaultConfig } from "./templates";

export async function getClientBySlug(slug: string): Promise<Client | null> {
  const { data } = await supabaseAdmin().from("clients").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return normalise(data);
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data } = await supabaseAdmin().from("clients").select("*").eq("id", id).maybeSingle();
  return data ? normalise(data) : null;
}

export async function listClients(): Promise<Client[]> {
  const { data } = await supabaseAdmin().from("clients").select("*").order("created_at", { ascending: false });
  return (data || []).map(normalise);
}

export async function getAnswers(clientId: string): Promise<CardAnswer[]> {
  const { data } = await supabaseAdmin().from("card_answers").select("*").eq("client_id", clientId);
  return (data || []) as CardAnswer[];
}

export async function getRecordings(clientId: string): Promise<Recording[]> {
  const { data } = await supabaseAdmin().from("recordings").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Recording[];
}

export async function getBriefs(clientId: string): Promise<Brief[]> {
  const { data } = await supabaseAdmin().from("briefs").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data || []) as Brief[];
}

export async function logEvent(clientId: string, type: string, payload: Record<string, unknown> = {}) {
  await supabaseAdmin().from("events").insert({ client_id: clientId, type, payload });
}

function normalise(row: Record<string, unknown>): Client {
  const config = { ...defaultConfig, ...((row.config as ClientConfig) || {}) };
  return { ...(row as unknown as Client), config, shoot_days: (row.shoot_days as string[]) || [] };
}
