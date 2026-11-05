import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs, getCurrentRound, getAsks } from "@/lib/db";
import { actionGenerateBrief, actionRetranscribe, actionSaveBriefEdit, actionAsk, actionDeleteAsk } from "../actions";
import ResetButton from "./reset-button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }

export default async function ClientDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const round = await getCurrentRound(client.id);
  const [answers, recordings, briefs, asks] = await Promise.all([
    round ? getAnswers(client.id, round.id) : Promise.resolve([]),
    getRecordings(client.id),
    getBriefs(client.id),
    getAsks(client.id),
  ]);
  const brief = briefs[0];
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const drive = recordings.find((r) => r.kind === "drive" && (!round || r.round_id === round.id));
  const cards = round?.config.cards || [];
  const prompts = round?.config.prompts || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / {client.slug}</span>
          <h2 style={{ marginTop: 6 }}>{client.name}</h2>
          <span className="label" style={{ color: "var(--dim)" }}>Cards {answers.length} / {cards.length} · Drive {drive ? (drive.transcript_status === "done" ? "transcribed" : drive.transcript_status) : "not yet"} · {asks.filter((a) => a.status === "open").length} open question{asks.filter((a) => a.status === "open").length === 1 ? "" : "s"}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {round ? <Link className="btn small ghost" href={`/hq/${client.slug}/rounds/${round.id}`}>Edit cards and prompts</Link> : null}
          <Link className="btn small ghost" href={`/hq/${client.slug}/edit`}>Edit client</Link>
          <a className="btn small" href={link} target="_blank" rel="noopener">Open his page</a>
          <ResetButton clientId={client.id} slug={client.slug} />
        </div>
      </div>

      <div className="two">
        <div>
          <div className="panel">
            <h3>Cards · {answers.length} of {cards.length}</h3>
            <div className="rowlist">
              {cards.map((c) => {
                const a = answers.find((x) => x.card_id === c.id);
                const fix = a?.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
                return (
                  <div key={c.id}>
                    <span>{a ? <span className={`pill ${a.verdict}`}>{a.verdict === "yes" ? "That is me" : a.verdict === "no" ? "Not quite" : "Do not use"}</span> : <span className="pill skip">waiting</span>}</span>
                    <div>
                      <div style={{ color: "var(--ink)" }}>{c.claim}</div>
                      {a?.note ? <div style={{ marginTop: 4 }}>“{a.note}”</div> : null}
                      {fix ? (
                        <div style={{ marginTop: 8 }}>
                          <audio controls preload="none" src={`/api/hq/audio/${fix.id}`} />
                          {fix.transcript ? <div className="transcript">{fix.transcript}</div> : <span className="state">transcript {fix.transcript_status}{fix.transcript_error ? `: ${fix.transcript_error}` : ""}</span>}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {prompts.length ? (
            <div className="panel">
              <h3>Drive and talk</h3>
              {!drive ? <p>Not recorded yet. He sees it as his next job once the cards are done.</p> : (
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                    <span className="pill">{fmt(drive.duration_secs)}</span>
                    <span className={`pill ${drive.transcript_status === "done" ? "ok" : drive.transcript_status === "failed" ? "warn" : ""}`}>transcript {drive.transcript_status}</span>
                    <span className="label" style={{ color: "var(--dim)" }}>{new Date(drive.created_at).toLocaleString("en-AU")}</span>
                    {drive.transcript_status !== "running" ? <form action={actionRetranscribe.bind(null, drive.id, client.slug)}><button className="btn small ghost" type="submit">{drive.transcript ? "Transcribe again" : "Transcribe now"}</button></form> : null}
                  </div>
                  <audio controls preload="none" src={`/api/hq/audio/${drive.id}`} />
                  {drive.transcript ? <div className="transcript">{drive.transcript}</div> : drive.transcript_error ? <p className="notice err" style={{ marginTop: 10 }}>{drive.transcript_error}</p> : null}
                  <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Prompts he was shown: {prompts.map((p) => p.q).join(" / ")}</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="panel">
            <h3>Ask him something</h3>
            <form action={actionAsk.bind(null, client.id, client.slug)} className="form">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input name="question" placeholder="Which listing can we film at on the 15th?" maxLength={500} required style={{ flex: 1, minWidth: 240 }} />
                <button className="btn small" type="submit">Ask</button>
              </div>
              <span className="label" style={{ color: "var(--dim)" }}>Shows on his page under "From {client.config.akshayName || "Akshay"}". He answers by voice or one line; it lands here with the transcript.</span>
            </form>
            {asks.length ? (
              <div className="rowlist" style={{ marginTop: 16 }}>
                {asks.map((a) => {
                  const rec = a.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
                  return (
                    <div key={a.id}>
                      <span><span className={`pill ${a.status === "answered" ? "ok" : ""}`}>{a.status}</span></span>
                      <div>
                        <div style={{ color: "var(--ink)" }}>{a.question}</div>
                        {a.answer_text ? <div style={{ marginTop: 4 }}>“{a.answer_text}”</div> : null}
                        {rec ? (
                          <div style={{ marginTop: 8 }}>
                            <audio controls preload="none" src={`/api/hq/audio/${rec.id}`} />
                            {rec.transcript ? <div className="transcript">{rec.transcript}</div> : <span className="state">transcript {rec.transcript_status}</span>}
                          </div>
                        ) : null}
                        <form action={actionDeleteAsk.bind(null, a.id, client.slug)} style={{ marginTop: 6 }}><button className="btn link" type="submit" style={{ fontSize: 11 }}>Remove</button></form>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Shoot days he can do</h3>
            {client.shoot_days.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{client.shoot_days.map((d) => <span key={d} className="pill yes">{d}</span>)}</div> : <p>Nothing picked yet. Options on his page: {round?.config.shootOptions.join(", ") || "none set"}.</p>}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Brief draft</h3>
              <form action={actionGenerateBrief.bind(null, client.id, client.slug)}><button className="btn small" type="submit">{brief ? "Write a new draft" : "Write the first draft"}</button></form>
            </div>
            {!brief ? (
              <p>Written from his card answers and every transcript, in our voice, for Akshay to edit. Best after the drive is transcribed. About thirty seconds.</p>
            ) : (
              <form action={actionSaveBriefEdit.bind(null, brief.id, client.slug)} className="form">
                <span className="label" style={{ color: "var(--dim)" }}>{brief.model} · {new Date(brief.created_at).toLocaleString("en-AU")}{brief.edited_content ? " · edited" : ""}</span>
                <textarea name="edited" defaultValue={brief.edited_content || brief.content} style={{ minHeight: 520, fontFamily: "inherit", fontSize: 15 }} />
                <div className="actions"><button className="btn small" type="submit">Save edits</button>{briefs.length > 1 ? <span className="label" style={{ color: "var(--dim)" }}>{briefs.length} drafts kept</span> : null}</div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
