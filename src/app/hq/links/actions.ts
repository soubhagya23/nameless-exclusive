"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hqUser } from "@/lib/supabase-server";
import type { LinkCategory } from "@/lib/types";

const CATS: LinkCategory[] = ["raw", "edits", "brand", "docs", "other"];

async function guard() {
  const u = await hqUser();
  if (!u) throw new Error("not signed in");
  return u;
}

export async function actionAddLink(formData: FormData) {
  const u = await guard();
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("The link must start with https://");
  const title = String(formData.get("title") || "").trim().slice(0, 160) || url.replace(/^https?:\/\//, "").slice(0, 60);
  const category = String(formData.get("category") || "other") as LinkCategory;
  const client_id = String(formData.get("client_id") || "") || null;
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const { error } = await supabaseAdmin().from("links").insert({ title, url, category: CATS.includes(category) ? category : "other", client_id, note, created_by: u.email || "" });
  if (error) throw new Error(error.message);
  revalidatePath("/hq/links");
  const back = String(formData.get("back") || "");
  if (back) revalidatePath(back);
}

export async function actionDeleteLink(id: string, back: string) {
  await guard();
  const { error } = await supabaseAdmin().from("links").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hq/links");
  if (back) revalidatePath(back);
}
