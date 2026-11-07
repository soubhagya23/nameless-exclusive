import { notFound } from "next/navigation";
import { getClientBySlug, getRound } from "@/lib/db";
import RoundForm from "./round-form";
import { actionRedraft, actionLoadQuestionnaire } from "../../../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function EditRound({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ note?: string }> }) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const client = await getClientBySlug(slug);
  const round = await getRound(id);
  if (!client || !round || round.client_id !== client.id) notFound();
  return (
    <div>
      <span className="label" style={{ color: "var(--dim)" }}><a href="/hq">Clients</a> / <a href={`/hq/${slug}?s=${round.id}`}>{client.first_name}</a> / {round.kind === "questionnaire" ? "questionnaire" : `shoot ${round.number}`}</span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "6px 0 6px" }}>
        <h2 style={{ margin: 0 }}>{round.kind === "questionnaire" ? "The questionnaire" : `Shoot ${round.number}`}</h2>
        {round.status === "draft" && round.number > 1 ? <form action={actionRedraft.bind(null, round.id, slug)}><button className="btn small ghost" type="submit">Draft again with AI</button></form> : null}
        {round.kind === "questionnaire" || round.number === 1 ? <form action={actionLoadQuestionnaire.bind(null, round.id, slug)}><button className="btn small ghost" type="submit" title="Replaces this with the house set for this client. Answers already given stay attached by card id.">{round.kind === "questionnaire" ? "Load the questionnaire set" : "Load the shoot 1 set"}</button></form> : null}
      </div>
      {sp.note ? <p className="notice err" style={{ marginBottom: 12 }}>AI draft did not work ({sp.note}), so this is the template. Edit it or try Draft again.</p> : null}
      <p className="label" style={{ color: "var(--dim)", marginBottom: 20 }}>{round.status === "live" ? "Live on his page. Saving updates it straight away; answers already given stay attached by card id." : round.status === "draft" ? "Draft. He cannot see it until you press Send on his page in HQ." : "Done. He no longer sees this; you can still fix typos."}</p>
      <RoundForm roundId={round.id} slug={slug} title={round.title} config={round.config} status={round.status} number={round.number} kind={round.kind} />
    </div>
  );
}
