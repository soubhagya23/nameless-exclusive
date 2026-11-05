import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs } from "@/lib/db";
import { actionGenerateBrief, actionRetranscribe, actionSaveBriefEdit, actionSetStatus } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STATUSES = ["handshake", "thinking", "plan", "shoot", "running", "paused"];

function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }

export default async function ClientDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const [answers, recordings, briefs] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getBriefs(client.id)]);
  const brief = briefs[0];
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const drive = recordings.find((r) => r.kind === "drive");
  const genBrief = actionGenerateBrief.bind(null, client.id, client.slug);
  const setStatus = actionSetStatus.bind(null, client.id, client.slug);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / {client.slug}</span>
          <h2 style={{ marginTop: 6 }}>{client.name}</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <form action={setStatus} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select name="status" defaultValue={client.status} style={{ font: "inherit", fontSize: 13, padding: "8px 10px", border: "1px solid var(--line)", background: "#fff" }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn small ghost" type="submit">Set</button>
          </form>
          <Link className="btn small ghost" href={`/hq/${client.slug}/edit`}>Edit page</Link>
          <a className="btn small" href={link} target="_blank" rel="noopener">Open his page</a>
        </div>
      </div>

      <div className="two">
        <div>
          <div className="panel">
            <h3>Cards · {answers.length} of {client.config.cards.length}</h3>
            <div className="rowlist">
              {client.config.cards.map((c) => {
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
                          {fix.transcript ? <div className="transcript">{fix.transcript}</div> : <span className="state">transcript {fix.transcript_status}</span>}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Prompts he was shown: {client.config.prompts.map((p) => p.q).join(" / ")}</p>
              </div>
            )}
          </div>

          {recordings.filter((r) => r.kind === "answer").length ? (
            <div className="panel">
              <h3>Other voice notes</h3>
              {recordings.filter((r) => r.kind === "answer").map((r) => (
                <div key={r.id} style={{ marginBottom: 14 }}>
                  <audio controls preload="none" src={`/api/hq/audio/${r.id}`} />
                  {r.transcript ? <div className="transcript">{r.transcript}</div> : <span className="state">transcript {r.transcript_status}</span>}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="panel">
            <h3>Shoot days he picked</h3>
            {client.shoot_days.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{client.shoot_days.map((d) => <span key={d} className="pill yes">{d}</span>)}</div> : <p>Nothing picked yet. Options on his page: {client.config.shootOptions.join(", ") || "none set"}.</p>}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Brief draft</h3>
              <form action={genBrief}><button className="btn small" type="submit">{brief ? "Write a new draft" : "Write the first draft"}</button></form>
            </div>
            {!brief ? (
              <p>Written by Claude from the card verdicts and the transcripts, in our voice, for Akshay to edit. Best after the drive is transcribed. About thirty seconds.</p>
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
