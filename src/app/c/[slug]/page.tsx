import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientBySlug, getAnswers, getRecordings } from "@/lib/db";
import Handshake from "./handshake";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  return { title: client ? `nameless – ${client.first_name}` : "nameless", robots: { index: false, follow: false } };
}

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const [answers, recordings] = await Promise.all([getAnswers(client.id), getRecordings(client.id)]);

  return (
    <Handshake
      client={{ slug: client.slug, name: client.name, first_name: client.first_name, portrait_url: client.portrait_url, wa_number: client.wa_number, shoot_days: client.shoot_days, config: client.config }}
      initialAnswers={answers.map((a) => ({ card_id: a.card_id, verdict: a.verdict, note: a.note, recording_id: a.recording_id }))}
      initialRecordings={recordings.map((r) => ({ id: r.id, kind: r.kind, card_id: r.card_id, duration_secs: r.duration_secs }))}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
      supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
    />
  );
}
