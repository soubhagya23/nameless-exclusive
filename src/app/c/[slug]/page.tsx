import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientBySlug, getAnswers, getRecordings, getCurrentRound, getAsks } from "@/lib/db";
import Handshake from "./handshake";
import Quiet from "./quiet";

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
  const round = await getCurrentRound(client.id);
  if (!round) {
    return <Quiet client={{ name: client.name, first_name: client.first_name, portrait_url: client.portrait_url }} round={null} />;
  }
  const [answers, recordings, asks] = await Promise.all([getAnswers(client.id, round.id), getRecordings(client.id, round.id), getAsks(client.id)]);

  return (
    <Handshake
      client={{ slug: client.slug, name: client.name, first_name: client.first_name, portrait_url: client.portrait_url, wa_number: client.wa_number, shoot_days: client.shoot_days, akshayName: client.config.akshayName || "Akshay" }}
      round={{ id: round.id, number: round.number, title: round.title, config: round.config, shoot_date: round.shoot_date, shoot_note: round.shoot_note, live: round.status === "live" }}
      initialAsks={asks.map((a) => ({ id: a.id, question: a.question, status: a.status, answer_text: a.answer_text, recording_id: a.recording_id }))}
      initialAnswers={answers.map((a) => ({ card_id: a.card_id, verdict: a.verdict, note: a.note, recording_id: a.recording_id }))}
      initialRecordings={recordings.map((r) => ({ id: r.id, kind: r.kind, card_id: r.card_id, duration_secs: r.duration_secs }))}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
      supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
    />
  );
}
