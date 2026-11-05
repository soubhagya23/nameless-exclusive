import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientBySlug, getAnswers, getRecordings, getCurrentRound, getAsks, getPhotos, listRounds, shootStage } from "@/lib/db";
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
  const [round, rounds] = await Promise.all([getCurrentRound(client.id), listRounds(client.id)]);
  if (!round) return <Quiet client={{ name: client.name, first_name: client.first_name, portrait_url: client.portrait_url }} round={null} />;

  const [allAnswers, allRecordings, asks, photos] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getAsks(client.id), getPhotos(client.id, round.id)]);
  const answers = allAnswers.filter((a) => a.round_id === round.id);
  const recordings = allRecordings.filter((r) => r.round_id === round.id);
  // Only shoots he has been sent or that are planned are worth showing him.
  const shoots = rounds
    .filter((r) => r.status !== "draft" || r.plan_status !== "none")
    .map((r) => ({ id: r.id, number: r.number, title: r.title, stage: shootStage(r, allAnswers.filter((a) => a.round_id === r.id).length, allRecordings.some((x) => x.round_id === r.id && x.kind === "drive")), date: r.plan?.date || null }));

  return (
    <Handshake
      client={{ slug: client.slug, name: client.name, first_name: client.first_name, portrait_url: client.portrait_url, wa_number: client.wa_number, shoot_days: client.shoot_days, akshayName: client.config.akshayName || "Akshay" }}
      shoot={{ id: round.id, number: round.number, title: round.title, live: round.status === "live", config: round.config, plan: round.plan, plan_status: round.plan_status, checklist_done: round.checklist_done }}
      shoots={shoots}
      initialAsks={asks.map((a) => ({ id: a.id, question: a.question, status: a.status, answer_text: a.answer_text, recording_id: a.recording_id }))}
      initialAnswers={answers.map((a) => ({ card_id: a.card_id, verdict: a.verdict, note: a.note, recording_id: a.recording_id }))}
      initialRecordings={recordings.map((r) => ({ id: r.id, kind: r.kind, card_id: r.card_id, duration_secs: r.duration_secs }))}
      initialPhotos={photos.map((p) => ({ id: p.id, prompt: p.prompt }))}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
      supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
    />
  );
}
