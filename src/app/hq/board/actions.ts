"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hqUser } from "@/lib/supabase-server";
import type { TaskStatus } from "@/lib/types";

const STATUSES: TaskStatus[] = ["todo", "doing", "review", "done"];

async function guard() {
  const u = await hqUser();
  if (!u) throw new Error("not signed in");
  return u;
}

export async function actionAddTask(input: { title: string; status: TaskStatus; client_id?: string | null; assignee?: string; due?: string | null; notes?: string }) {
  const u = await guard();
  const title = String(input.title || "").trim().slice(0, 200);
  if (!title) throw new Error("A card needs a title");
  const status = STATUSES.includes(input.status) ? input.status : "todo";
  const sb = supabaseAdmin();
  const { data: last } = await sb.from("tasks").select("position").eq("status", status).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await sb.from("tasks").insert({
    title, status, client_id: input.client_id || null, assignee: String(input.assignee || "").trim().slice(0, 60), due: input.due || null,
    notes: String(input.notes || "").trim().slice(0, 4000), position: (last?.position ?? 0) + 1, created_by: u.email || "",
  }).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/hq/board");
  return data;
}

export async function actionUpdateTask(id: string, patch: { title?: string; notes?: string; client_id?: string | null; assignee?: string; due?: string | null }) {
  await guard();
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) { const t = String(patch.title).trim().slice(0, 200); if (!t) throw new Error("A card needs a title"); clean.title = t; }
  if (patch.notes !== undefined) clean.notes = String(patch.notes).trim().slice(0, 4000);
  if (patch.client_id !== undefined) clean.client_id = patch.client_id || null;
  if (patch.assignee !== undefined) clean.assignee = String(patch.assignee).trim().slice(0, 60);
  if (patch.due !== undefined) clean.due = patch.due || null;
  const { error } = await supabaseAdmin().from("tasks").update(clean).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hq/board");
}

/** Drop: the card lands in `status` at `index`; every card in that column is renumbered. */
export async function actionMoveTask(id: string, status: TaskStatus, orderedIds: string[]) {
  await guard();
  if (!STATUSES.includes(status)) throw new Error("bad status");
  const sb = supabaseAdmin();
  const updates = orderedIds.map((tid, i) => sb.from("tasks").update({ status, position: i + 1 }).eq("id", tid));
  const results = await Promise.all(updates);
  const bad = results.find((r) => r.error);
  if (bad?.error) throw new Error(bad.error.message);
  if (!orderedIds.includes(id)) await sb.from("tasks").update({ status, position: orderedIds.length + 1 }).eq("id", id);
  revalidatePath("/hq/board");
}

export async function actionDeleteTask(id: string) {
  await guard();
  const { error } = await supabaseAdmin().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hq/board");
}
