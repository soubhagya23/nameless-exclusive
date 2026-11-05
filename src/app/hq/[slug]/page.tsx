import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs, listRounds } from "@/lib/db";
import { actionGenerateBrief, actionRetranscribe, actionSaveBriefEdit, actionSetStatus, actionNewRound, actionRoundStatus, actionConfirmShoot, actionResetRound } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STATUSES = ["handshake", "thinking", "plan", "shoot", "running", "paused"];
function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }

export default async function ClientDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const rounds = await listRounds(client.id);
  const round = rounds.find((x) => x.id === sp.r) || rounds.find((x) => x.status === "live") || rounds[0] || null;
  const [answers, recordings, briefs] = await Promise.all([round ? getAnswers(client.id, round.id) : Promise.resolve([]), round ? getRecordings(client.id, round.id) : Promise.resolve([]), getBriefs(client.id)]);
  const brief = briefs[0];
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const drive = recordings.find((r) => r.kind === "drive");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / {client.slug}</span>
          <h2 style={{ marginTop: 6 }}>{client.name}</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <form action={actionSetStatus.bind(null, client.id, client.slug)} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select name="status" defaultValue={client.status} style={{ font: "inherit", fontSize: 13, padding: "8px 10px", border: "1px solid var(--line)", background: "#fff" }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn small ghost" type="submit">Set</button>
          </form>
          <Link className="btn small ghost" href={`/hq/${client.slug}/edit`}>Edit client</Link>
          <a className="btn small" href={link} target="_blank" rel="noopener">Open his page</a>
        </div>
      </div>

      {/* Rounds strip */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="label" style={{ color: "var(--dim)" }}>Rounds</span>
            {rounds.map((r) => (
              <Link key={r.id} href={`/hq/${client.slug}?r=${r.id}`} className={`pill ${r.id === round?.id ? "yes" : ""}`}>
                {r.number}. {r.title} · {r.status}{r.shoot_date ? ` · ${r.shoot_date}` : ""}
              </Link>
            ))}
          </div>
          <form action={actionNewRound.bind(null, client.id, client.slug)} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select name="from" style={{ font: "inherit", fontSize: 13, padding: "8px 10px", border: "1px solid var(--line)", background: "#fff" }}>
              <option value="followup">Start from the follow-up template</option>
              <option value="previous">Copy the latest round</option>
            </select>
            <button className="btn small" type="submit">New round</button>
          </form>
        </div>
        {round ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <span className={`pill ${round.status === "live" ? "ok" : round.status === "draft" ? "warn" : ""}`}>{round.status}</span>
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Round {round.number}: {round.title}</strong>
            <Link className="btn small ghost" href={`/hq/${client.slug}/rounds/${round.id}`}>Edit cards and prompts</Link>
            {round.status === "draft" ? <form action={actionRoundStatus.bind(null, round.id, client.slug)}><input type="hidden" name="status" value="live" /><button className="btn small" type="submit">Go live on his page</button></form> : null}
            {round.status === "live" ? <form action={actionRoundStatus.bind(null, round.id, client.slug)}><input type="hidden" name="status" value="done" /><button className="btn small ghost" type="submit">Mark done</button></form> : null}
            {round.status === "done" ? <form action={actionRoundStatus.bind(null, round.id, client.slug)}><input type="hidden" name="status" value="live" /><button className="btn small ghost" type="submit">Reopen</button></form> : null}
            <form action={actionResetRound.bind(null, round.id, client.slug)} style={{ marginLeft: "auto" }}><button className="btn link" type="submit" style={{ color: "var(--red)", borderColor: "var(--red)" }}>Reset this round (wipes answers and recordings)</button></form>
          </div>
        ) : <p style={{ marginTop: 12 }}>No rounds yet. Press New round.</p>}
      </div>

      {round ? (
        <div className="two">
          <div>
            <div className="panel">
              <h3>Cards · {answers.length} of {round.config.cards.length}</h3>
              <div className="rowlist">
                {round.config.cards.map((c) => {
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

            {round.config.prompts.length ? (
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
                    <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Prompts he was shown: {round.config.prompts.map((p) => p.q).join(" / ")}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <div className="panel">
              <h3>Shoot day</h3>
              {round.shoot_date ? (
                <p><span className="pill yes">{round.shoot_date}</span>{round.shoot_note ? <span style={{ marginLeft: 10 }}>{round.shoot_note}</span> : null}</p>
              ) : null}
              <p style={{ marginTop: round.shoot_date ? 12 : 0, fontSize: 15 }}>
                {client.shoot_days.length ? <>He picked: {client.shoot_days.map((d) => <span key={d} className="pill" style={{ marginRight: 6 }}>{d}</span>)}</> : round.config.shootOptions.length ? "Nothing picked yet." : "No shoot options in this round."}
              </p>
              <form action={actionConfirmShoot.bind(null, round.id, client.id, client.slug)} className="form" style={{ marginTop: 12 }}>
                <label>Confirm the day (pick one of his, or type one)
                  <input name="shoot_date" list={`days-${round.id}`} defaultValue={round.shoot_date || client.shoot_days[0] || ""} placeholder="Sat 15 Nov" />
                  <datalist id={`days-${round.id}`}>{client.shoot_days.map((d) => <option key={d} value={d} />)}{round.config.shootOptions.map((d) => <option key={"o" + d} value={d} />)}</datalist>
                </label>
                <label>Note he sees under it (optional)<input name="shoot_note" defaultValue={round.shoot_note || ""} placeholder="9am at your place. Coffee first." /></label>
                <div className="actions"><button className="btn small" type="submit">{round.shoot_date ? "Update shoot day" : "Confirm shoot day"}</button><span className="label" style={{ color: "var(--dim)" }}>Sets his status to shoot and shows the date on his page.</span></div>
              </form>
            </div>

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Brief draft</h3>
                <form action={actionGenerateBrief.bind(null, client.id, client.slug)}><button className="btn small" type="submit">{brief ? "Write a new draft" : "Write the first draft"}</button></form>
              </div>
              {!brief ? (
                <p>Written from every round&apos;s card verdicts and transcripts, in our voice, for Akshay to edit. Best after the drive is transcribed. About thirty seconds.</p>
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
      ) : null}
    </div>
  );
}
