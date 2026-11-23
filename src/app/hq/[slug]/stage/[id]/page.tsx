import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs, getAsks, getPhotos, getEvents, listRounds, shootStage, getRound } from "@/lib/db";
import { msgShootLive, msgPlanSent, msgNudge, msgAsk } from "@/lib/whatsapp";
import { actionGenerateBrief, actionRetranscribe, actionSaveBriefEdit, actionAsk, actionDeleteAsk, actionSendShoot, actionShootDone, actionReopenShoot, actionSavePlan, actionUnsendPlan, actionDeleteRound } from "../../../actions";
import CopyButton from "../../../copy-button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }
function ago(iso: string) { const h = (Date.now() - new Date(iso).getTime()) / 36e5; if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`; if (h < 48) return `${Math.round(h)} h ago`; return `${Math.round(h / 24)} days ago`; }
export default async function StagePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const client = await getClientBySlug(slug);
  const shoot = await getRound(id);
  if (!client || !shoot || shoot.client_id !== client.id) notFound();
  const rounds = await listRounds(client.id);
  const [allAnswers, recordings, briefs, asks, photos, events] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getBriefs(client.id), getAsks(client.id), getPhotos(client.id), getEvents(client.id)]);
  const stages = Object.fromEntries(rounds.map((r) => [r.id, shootStage(r, allAnswers.filter((a) => a.round_id === r.id).length, recordings.some((x) => x.round_id === r.id && x.kind === "drive"))]));
  const isQ = shoot.kind === "questionnaire";
  const label = (r: { kind: string; number: number }) => (r.kind === "questionnaire" ? "Intro questions" : `Shoot ${r.number}`);
  const answers = allAnswers.filter((a) => a.round_id === shoot.id);
  const shootRecs = recordings.filter((r) => r.round_id === shoot.id);
  const shootPhotos = photos.filter((p) => p.round_id === shoot.id);
  const drive = shootRecs.find((r) => r.kind === "drive");
  const brief = briefs[0];
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const stage = stages[shoot.id];
  const openAsks = asks.filter((a) => a.status === "open").length;
  const quietHours = shoot.sent_at && stage === "live" && answers.length === 0 ? (Date.now() - new Date(shoot.sent_at).getTime()) / 36e5 : 0;
  void events; void link;

  return (
    <div>
      <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / <Link href={`/hq/${client.slug}`}>{client.first_name}</Link> / {label(shoot)}</span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16, marginTop: 6, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{label(shoot)}{!isQ && shoot.plan?.date ? <span style={{ color: "var(--dim)", fontWeight: 400 }}> · {shoot.plan.date}</span> : null}</h2>
        <Link className="btn small ghost" href={`/hq/${client.slug}`}>Back to {client.first_name}</Link>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`pill ${stage === "live" || stage === "answered" ? "ok" : stage === "not sent" ? "warn" : ""}`}>{stage}</span>
          <Link className="btn small ghost" href={`/hq/${client.slug}/rounds/${shoot.id}`}>{isQ ? "Edit the cards" : "Edit what he sees"}</Link>
          {shoot.status === "draft" ? <form action={actionSendShoot.bind(null, shoot.id, client.slug)}><button className="btn small" type="submit">Send to him (goes live)</button></form> : null}
          {shoot.status === "live" ? <><CopyButton text={msgShootLive(client.first_name, shoot.number, client.slug)} label="Copy the WhatsApp" waNumber={client.wa_number} /><form action={actionShootDone.bind(null, shoot.id, client.slug)}><button className="btn small ghost" type="submit">Mark done</button></form></> : null}
          {shoot.status === "done" ? <form action={actionReopenShoot.bind(null, shoot.id, client.slug)}><button className="btn small ghost" type="submit">Back to draft</button></form> : null}
          {shoot.status === "draft" && !isQ && answers.length === 0 ? <form action={actionDeleteRound.bind(null, shoot.id, client.slug)}><button className="btn link" type="submit" style={{ fontSize: 11 }}>Delete this shoot</button></form> : null}
          {shoot.sent_at ? <span className="label" style={{ color: "var(--dim)" }}>sent {ago(shoot.sent_at)}</span> : null}
        </div>
        {isQ ? <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Goes out once, when he is onboarded. His answers feed the brief. Shoots come after.</p> : null}
        {quietHours >= 48 ? (
          <div className="notice" style={{ marginTop: 12, borderColor: "#c77d00", color: "#8a5600", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>Sent {Math.round(quietHours / 24)} days ago, nothing answered yet.</span>
            <CopyButton text={msgNudge(client.first_name, shoot.number, client.slug)} label="Copy a nudge" waNumber={client.wa_number} />
          </div>
        ) : null}
      </div>

      {shoot ? (
        <div className="two">
          <div>
            {shoot.config.cards.length ? (
            <div className="panel">
              <h3>{isQ ? "Cards" : "Questions"} · {answers.length} of {shoot.config.cards.length}</h3>
              <div className="rowlist">
                {shoot.config.cards.map((c) => {
                  const a = answers.find((x) => x.card_id === c.id);
                  const voice = a?.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
                  return (
                    <div key={c.id}>
                      <span>{a ? <span className={`pill ${a.verdict}`}>{c.kind === "question" ? (a.verdict === "skip" ? "skipped" : "answered") : a.verdict === "yes" ? "This is me" : a.verdict === "no" ? "Not quite" : "Do not use"}</span> : <span className="pill skip">waiting</span>}</span>
                      <div>
                        <div style={{ color: "var(--ink)" }}>{c.kind === "question" ? <span className="label" style={{ color: "var(--dim)", marginRight: 6 }}>Q</span> : null}{c.claim}</div>
                        {a?.note ? <div style={{ marginTop: 4 }}>“{a.note}”</div> : null}
                        {voice ? (
                          <div style={{ marginTop: 8 }}>
                            <audio controls preload="none" src={`/api/hq/audio/${voice.id}`} />
                            {voice.transcript ? <div className="transcript">{voice.transcript}</div> : <span className="state">transcript {voice.transcript_status}{voice.transcript_error ? `: ${voice.transcript_error}` : ""}</span>}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            ) : null}

            {drive ? (
              <div className="panel">
                <h3>Drive and talk (older shoot)</h3>
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
                    {shoot.config.prompts.length ? <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Prompts he was shown: {shoot.config.prompts.map((p) => p.q).join(" / ")}</p> : null}
                  </div>
                )}
              </div>
            ) : null}

            {(shoot.config.references || []).length ? (
              <div className="panel">
                <h3>References on his page · {(shoot.config.references || []).length}</h3>
                <div className="rowlist">
                  {(shoot.config.references || []).map((r, k) => (
                    <div key={k}>
                      <span className="label" style={{ color: "var(--dim)" }}>{String(k + 1).padStart(2, "0")}</span>
                      <div><a href={r.url} target="_blank" rel="noopener" style={{ color: "var(--ink)" }}>{r.title}</a>{r.note ? <div style={{ marginTop: 4 }}>{r.note}</div> : null}</div>
                    </div>
                  ))}
                </div>
                <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Add or change them under Edit what he sees.</p>
              </div>
            ) : null}

            {shootPhotos.length ? (
              <div className="panel">
                <h3>Photos · {shootPhotos.length}</h3>
                {!shootPhotos.length ? <p>Asked for: {shoot.config.photoAsks.join(" · ")}. Nothing in yet.</p> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {shootPhotos.map((p) => (
                      <a key={p.id} href={`/api/hq/photo/${p.id}`} target="_blank" rel="noopener" style={{ display: "grid", gap: 6, textDecoration: "none" }}>
                        <img src={`/api/hq/photo/${p.id}`} alt={p.prompt} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", border: "1px solid var(--line)", background: "var(--grey)" }} />
                        <span className="label" style={{ color: "var(--dim)" }}>{p.prompt}</span>
                      </a>
                    ))}
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
                <span className="label" style={{ color: "var(--dim)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>Shows on his page under "From {client.config.akshayName || "Akshay"}". {openAsks ? <CopyButton text={msgAsk(client.first_name, client.slug)} label="Copy a WhatsApp nudge" waNumber={client.wa_number} /> : null}</span>
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
                          {rec ? <div style={{ marginTop: 8 }}><audio controls preload="none" src={`/api/hq/audio/${rec.id}`} />{rec.transcript ? <div className="transcript">{rec.transcript}</div> : <span className="state">transcript {rec.transcript_status}</span>}</div> : null}
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
            {!isQ ? (
            <div className="panel">
              <h3>Shoot {shoot.number} plan</h3>
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                {client.shoot_days.length ? <>He can do: {client.shoot_days.map((d) => <span key={d} className="pill yes" style={{ marginRight: 6 }}>{d}</span>)}</> : shoot.config.shootOptions.length ? "He has not picked days yet." : "No day options were asked in this shoot."}
              </p>
              <form action={actionSavePlan.bind(null, shoot.id, client.slug)} className="form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>Date<input name="date" defaultValue={shoot.plan.date || client.shoot_days[0] || ""} placeholder="Sat 15 Nov" list={`d-${shoot.id}`} /><datalist id={`d-${shoot.id}`}>{client.shoot_days.map((d) => <option key={d} value={d} />)}</datalist></label>
                  <label>Call time<input name="callTime" defaultValue={shoot.plan.callTime || ""} placeholder="9:00 AM" /></label>
                </div>
                <label>Where we meet<input name="place" defaultValue={shoot.plan.place || ""} placeholder="Your place, then the Truganina office" /></label>
                <label>Run of day (one stop per line)<textarea name="runOfDay" defaultValue={shoot.plan.runOfDay || ""} placeholder={"9:00 Home, coffee, the phone lesson\n10:00 The drive, car audio\n11:00 Office\n12:30 One listing\n14:00 Lunch, the sit-down\n15:30 Hero shots"} style={{ minHeight: 140, fontFamily: "inherit", fontSize: 15 }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>Wear<textarea name="wear" defaultValue={shoot.plan.wear || ""} placeholder={"Two looks: auction day, off duty\nPlain colours, no thin stripes"} style={{ minHeight: 80, fontFamily: "inherit", fontSize: 15 }} /></label>
                  <label>Bring<textarea name="bring" defaultValue={shoot.plan.bring || ""} placeholder={"Phone charged, storage cleared\nKeys to a listing"} style={{ minHeight: 80, fontFamily: "inherit", fontSize: 15 }} /></label>
                </div>
                <label>Day-before checklist (one per line, he ticks them)<textarea name="checklist" defaultValue={(shoot.plan.checklist || []).join("\n")} placeholder={"Phone charged\nTwo outfits ready\nListing keys sorted\nTell the office we are coming"} style={{ minHeight: 100, fontFamily: "inherit", fontSize: 15 }} /></label>
                <label>Note under the date (optional)<input name="note" defaultValue={shoot.plan.note || ""} placeholder="Coffee first. Nothing to memorise." /></label>
                <div className="actions">
                  <button className="btn small ghost" type="submit" name="send" value="0">Save draft</button>
                  <button className="btn small" type="submit" name="send" value="1">{shoot.plan_status === "none" ? "Send plan to his page" : "Update on his page"}</button>
                  <span className={`pill ${shoot.plan_status === "accepted" ? "ok" : ""}`}>{shoot.plan_status === "none" ? "not sent" : shoot.plan_status === "sent" ? "waiting on him" : `accepted ${shoot.plan_accepted_at ? ago(shoot.plan_accepted_at) : ""}`}</span>
                </div>
              </form>
              {shoot.plan_status !== "none" ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <CopyButton text={msgPlanSent(client.first_name, shoot.number, shoot.plan.date, client.slug)} label="Copy the WhatsApp" waNumber={client.wa_number} />
                  {shoot.plan_status === "accepted" && (shoot.plan.checklist || []).length ? <span className="label" style={{ color: "var(--dim)" }}>Checklist {shoot.checklist_done.length} of {shoot.plan.checklist!.length}</span> : null}
                  <form action={actionUnsendPlan.bind(null, shoot.id, client.slug)}><button className="btn link" type="submit" style={{ fontSize: 11 }}>Take it off his page</button></form>
                </div>
              ) : null}
            </div>
            ) : null}

            {isQ ? (
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Brief draft</h3>
                <form action={actionGenerateBrief.bind(null, client.id, client.slug)}><button className="btn small" type="submit">{brief ? "Write a new draft" : "Write the first draft"}</button></form>
              </div>
              {!brief ? (
                <p>Written from the questionnaire and every shoot&apos;s answers and transcripts, in our voice, for Akshay to edit. Best once the cards are in. About thirty seconds.</p>
              ) : (
                <form action={actionSaveBriefEdit.bind(null, brief.id, client.slug)} className="form">
                  <span className="label" style={{ color: "var(--dim)" }}>{brief.model} · {new Date(brief.created_at).toLocaleString("en-AU")}{brief.edited_content ? " · edited" : ""}</span>
                  <textarea name="edited" defaultValue={brief.edited_content || brief.content} style={{ minHeight: 420, fontFamily: "inherit", fontSize: 15 }} />
                  <div className="actions"><button className="btn small" type="submit">Save edits</button>{briefs.length > 1 ? <span className="label" style={{ color: "var(--dim)" }}>{briefs.length} drafts kept</span> : null}</div>
                </form>
              )}
            </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
