"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hqUser } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateBrief } from "@/lib/brief";
import { transcribeRecording } from "@/lib/transcribe";
import { defaultConfig, jatinConfig } from "@/lib/templates";
import type { ClientConfig } from "@/lib/types";

async function guard() {
  const u = await hqUser();
  if (!u) throw new Error("not signed in");
  return u;
}

export async function actionGenerateBrief(clientId: string, slug: string) {
  await guard();
  await generateBrief(clientId);
  revalidatePath(`/hq/${slug}`);
}

export async function actionRetranscribe(recordingId: string, slug: string) {
  await guard();
  try { await transcribeRecording(recordingId); } catch { /* status is stored on the row */ }
  revalidatePath(`/hq/${slug}`);
}

export async function actionSaveBriefEdit(briefId: string, slug: string, formData: FormData) {
  await guard();
  const edited = String(formData.get("edited") || "");
  await supabaseAdmin().from("briefs").update({ edited_content: edited }).eq("id", briefId);
  revalidatePath(`/hq/${slug}`);
}

export async function actionSetStatus(clientId: string, slug: string, formData: FormData) {
  await guard();
  const status = String(formData.get("status") || "handshake");
  await supabaseAdmin().from("clients").update({ status }).eq("id", clientId);
  revalidatePath(`/hq/${slug}`);
  revalidatePath("/hq");
}

export async function actionSaveClient(clientId: string | null, formData: FormData) {
  await guard();
  const name = String(formData.get("name") || "").trim();
  const first_name = String(formData.get("first_name") || "").trim() || name.split(" ")[0];
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const portrait_url = String(formData.get("portrait_url") || "").trim() || null;
  const wa_number = String(formData.get("wa_number") || "").replace(/[^0-9]/g, "") || null;
  let config: ClientConfig;
  try { config = JSON.parse(String(formData.get("config") || "{}")); } catch { throw new Error("Config is not valid JSON"); }
  if (!name || !slug || !Array.isArray(config.cards) || !config.cards.length) throw new Error("Name, slug and at least one card are required");
  const sb = supabaseAdmin();
  if (clientId) {
    const { error } = await sb.from("clients").update({ name, first_name, slug, portrait_url, wa_number, config }).eq("id", clientId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("clients").insert({ name, first_name, slug, portrait_url, wa_number, config });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/hq");
  redirect(`/hq/${slug}`);
}

export async function templateFor(kind: "default" | "jatin") {
  return JSON.stringify(kind === "jatin" ? jatinConfig : defaultConfig, null, 2);
}
