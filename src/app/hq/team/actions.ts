"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hqUser } from "@/lib/supabase-server";

async function guard() {
  const u = await hqUser();
  if (!u) throw new Error("not signed in");
  return u;
}

export async function actionAddMember(formData: FormData) {
  const u = await guard();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That does not look like an email");
  if (!name) throw new Error("A first name, so the board can show it");
  const { error } = await supabaseAdmin().from("team").upsert({ email, name, created_by: u.email || "" }, { onConflict: "email" });
  if (error) throw new Error(error.message);
  revalidatePath("/hq/team"); revalidatePath("/hq/board");
}

export async function actionRemoveMember(id: string) {
  const u = await guard();
  const { data } = await supabaseAdmin().from("team").select("email").eq("id", id).maybeSingle();
  if (data && data.email === (u.email || "").toLowerCase()) throw new Error("You cannot remove yourself");
  const { error } = await supabaseAdmin().from("team").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hq/team"); revalidatePath("/hq/board");
}
