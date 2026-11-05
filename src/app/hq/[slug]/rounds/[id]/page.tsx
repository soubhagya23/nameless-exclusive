import { notFound } from "next/navigation";
import { getClientBySlug, getRound } from "@/lib/db";
import RoundForm from "./round-form";

export const dynamic = "force-dynamic";

export default async function EditRound({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const client = await getClientBySlug(slug);
  const round = await getRound(id);
  if (!client || !round || round.client_id !== client.id) notFound();
  return (
    <div>
      <span className="label" style={{ color: "var(--dim)" }}><a href="/hq">Clients</a> / <a href={`/hq/${slug}`}>{client.first_name}</a> / round {round.number}</span>
      <h2 style={{ margin: "6px 0 6px" }}>{round.title}</h2>
      <p className="label" style={{ color: "var(--dim)", marginBottom: 20 }}>{round.status === "live" ? "This round is live. Saving changes updates his page straight away; answers he has already given stay attached by card id." : round.status === "draft" ? "Draft. He cannot see it until you press Go live on his page in HQ." : "Done. Read-only for him; you can still fix typos here."}</p>
      <RoundForm roundId={round.id} slug={slug} title={round.title} config={round.config} status={round.status} />
    </div>
  );
}
