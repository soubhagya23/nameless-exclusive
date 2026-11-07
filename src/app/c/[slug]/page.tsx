import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientBySlug, getAnswers, getRecordings, getAsks, getPhotos, listRounds, shootStage, questionnaireOf, currentShootOf, shootsOf } from "@/lib/db";
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
  const rounds = await listRounds(client.id);
  const questionnaire = questionnaireOf(rounds);
  const shoot = currentShootOf(rounds);
  if (!questionnaire && !shoot) return <Quiet client={{ name: client.name, first_name: client.first_name, portrait_url: client.portrait_url }} round={null} />;

  const liveIds = [questionnaire, shoot].filter((r) => r && r.status === "live").map((r) => r!.id);
  const [allAnswers, allRecordings, asks, allPhotos] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getAsks(client.id), getPhotos(client.id)]);
  const answers = allAnswers.filter((a) => a.round_id && liveIds.includes(a.round_id));
  const recordings = allRecordings.filter((r) => r.round_id && liveIds.includes(r.round_id));
  const photos = allPhotos.filter((p) => p.round_id && liveIds.includes(p.round_id));
  // Only shoots he has been sent or that are planned are worth showing him.
  const shoots = shootsOf(rounds)
    .filter((r) => r.status !== "draft" || r.plan_status !== "none")
    .map((r) => ({ id: r.id, number: r.number, title: r.title, stage: shootStage(r, allAnswers.filter((a) => a.round_id === r.id).length, allRecordings.some((x) => x.round_id === r.id && x.kind === "drive")), date: r.plan?.date || null }));

  return (
    <Handshake
      client={{ slug: client.slug, name: client.name, first_name: client.first_name, portrait_url: client.portrait_url, wa_number: client.wa_number, shoot_days: client.shoot_days, akshayName: client.config.akshayName || "Akshay" }}
      questionnaire={questionnaire ? { id: questionnaire.id, number: 0, title: questionnaire.title, live: questionnaire.status === "live", config: questionnaire.config } : null}
      shoot={shoot ? { id: shoot.id, number: shoot.number, title: shoot.title, live: shoot.status === "live", config: shoot.config, plan: shoot.plan, plan_status: shoot.plan_status, checklist_done: shoot.checklist_done } : null}
      shoots={shoots}
      initialAsks={asks.map((a) => ({ id: a.id, question: a.question, status: a.status, answer_text: a.answer_text, recording_id: a.recording_id }))}
      initialAnswers={answers.map((a) => ({ round_id: a.round_id || "", card_id: a.card_id, verdict: a.verdict, note: a.note, recording_id: a.recording_id }))}
      initialRecordings={recordings.map((r) => ({ id: r.id, round_id: r.round_id, kind: r.kind, card_id: r.card_id, duration_secs: r.duration_secs }))}
      initialPhotos={photos.map((p) => ({ id: p.id, prompt: p.prompt, round_id: p.round_id }))}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
      supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
    />
  );
}
