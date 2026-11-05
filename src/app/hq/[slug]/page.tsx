import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs, getAsks, getPhotos, getEvents, listRounds, shootStage } from "@/lib/db";
import { msgShootLive, msgPlanSent, msgNudge, msgAsk } from "@/lib/whatsapp";
import { actionGenerateBrief, actionRetranscribe, actionSaveBriefEdit, actionAsk, actionDeleteAsk, actionNewShoot, actionSendShoot, actionShootDone, actionReopenShoot, actionSavePlan, actionUnsendPlan } from "../actions";
import ResetButton from "./reset-button";
import CopyButton from "../copy-button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }
function ago(iso: string) { const h = (Date.now() - new Date(iso).getTime()) / 36e5; if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`; if (h < 48) return `${Math.round(h)} h ago`; return `${Math.round(h / 24)} days ago`; }
const EVENT_WORDS: Record<string, (p: Record<string, unknown>) => string> = {
  card: (p) => `answered a card (${p.verdict})${p.note ? `: “${p.note}”` : ""}`,
  recording: (p) => (p.kind === "drive" ? `recorded the drive, ${fmt(Number(p.duration) || 0)}` : p.kind === "answer" ? "sent a voice note on a question" : "sent a voice note on a card"),
  days: (p) => `picked shoot days: ${(p.days as string[] || []).join(", ") || "none"}`,
  ask_answered: () => "answered a question",
  plan_accepted: (p) => `accepted the plan for shoot ${p.shoot}`,
  checklist: (p) => `ticked ${p.done} of ${p.of} on the checklist`,
  photo: (p) => `sent a photo: ${p.prompt}`,
  recording_deleted: () => "re-did a recording",
  shoot_sent: (p) => `we sent shoot ${p.shoot}`,
  shoot_drafted: (p) => `we drafted shoot ${p.shoot}`,
  shoot_done: (p) => `we marked shoot ${p.shoot} done`,
  plan_sent: (p) => `we sent the plan for shoot ${p.shoot}`,
  asked: (p) => `we asked: “${p.question}”`,
  client_created: () => "client created",
};

export default async function ClientDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const rounds = await listRounds(client.id);
  const [allAnswers, recordings, briefs, asks, photos, events] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getBriefs(client.id), getAsks(client.id), getPhotos(client.id), getEvents(client.id)]);
  const stages = Object.fromEntries(rounds.map((r) => [r.id, shootStage(r, allAnswers.filter((a) => a.round_id === r.id).length, recordings.some((x) => x.round_id === r.id && x.kind === "drive"))]));
  const shoot = rounds.find((r) => r.id === sp.s) || rounds.find((r) => r.status === "live") || [...rounds].reverse().find((r) => r.plan_status !== "none" && r.status !== "done") || rounds[rounds.length - 1] || null;
  const answers = shoot ? allAnswers.filter((a) => a.round_id === shoot.id) : [];
  const shootRecs = shoot ? recordings.filter((r) => r.round_id === shoot.id) : [];
  const shootPhotos = shoot ? photos.filter((p) => p.round_id === shoot.id) : [];
  const drive = shootRecs.find((r) => r.kind === "drive");
  const brief = briefs[0];
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const stage = shoot ? stages[shoot.id] : null;
  const openAsks = asks.filter((a) => a.status === "open").length;
  const quietHours = shoot?.sent_at && stage === "live" && answers.length === 0 ? (Date.now() - new Date(shoot.sent_at).getTime()) / 36e5 : 0;
  const lastActivity = events.find((e) => !["shoot_sent", "shoot_drafted", "shoot_done", "plan_sent", "asked", "client_created"].includes(e.type));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / {client.slug}</span>
          <h2 style={{ marginTop: 6 }}>{client.name}</h2>
          <span className="label" style={{ color: "var(--dim)" }}>{lastActivity ? `Last seen ${ago(lastActivity.created_at)}` : "No activity yet"}{openAsks ? ` · ${openAsks} open question${openAsks === 1 ? "" : "s"}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="btn small ghost" href={`/hq/${client.slug}/edit`}>Edit client</Link>
          <a className="btn small" href={link} target="_blank" rel="noopener">Open his page</a>
          <ResetButton clientId={client.id} slug={client.slug} />
        </div>
      </div>

      {/* Shoot tabs */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {rounds.map((r) => (
              <Link key={r.id} href={`/hq/${client.slug}?s=${r.id}`} className={`pill ${r.id === shoot?.id ? "yes" : ""}`} style={{ padding: "8px 14px" }}>
                Shoot {r.number} · {stages[r.id]}{r.plan?.date ? ` · ${r.plan.date}` : ""}
              </Link>
            ))}
          </div>
          <form action={actionNewShoot.bind(null, client.id, client.slug)} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select name="how" style={{ font: "inherit", fontSize: 13, padding: "8px 10px", border: "1px solid var(--line)", background: "#fff" }}>
              <option value="ai">Draft with AI from what we know</option>
              <option value="template">Start from the follow-up template</option>
              <option value="previous">Copy the last shoot</option>
            </select>
            <button className="btn small" type="submit">New shoot</button>
          </form>
        </div>
        {shoot ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <span className={`pill ${stage === "live" || stage === "answered" ? "ok" : stage === "not sent" ? "warn" : ""}`}>{stage}</span>
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Shoot {shoot.number}</strong>
            <Link className="btn small ghost" href={`/hq/${client.slug}/rounds/${shoot.id}`}>Edit questions</Link>
            {shoot.status === "draft" ? <form action={actionSendShoot.bind(null, shoot.id, client.slug)}><button className="btn small" type="submit">Send to him (goes live)</button></form> : null}
            {shoot.status === "live" ? <><CopyButton text={msgShootLive(client.first_name, shoot.number, client.slug)} label="Copy the WhatsApp" waNumber={client.wa_number} /><form action={actionShootDone.bind(null, shoot.id, client.slug)}><button className="btn small ghost" type="submit">Mark done</button></form></> : null}
            {shoot.status === "done" ? <form action={actionReopenShoot.bind(null, shoot.id, client.slug)}><button className="btn small ghost" type="submit">Back to draft</button></form> : null}
            {shoot.sent_at ? <span className="label" style={{ color: "var(--dim)" }}>sent {ago(shoot.sent_at)}</span> : null}
          </div>
        ) : <p style={{ marginTop: 12 }}>No shoots yet. Press New shoot.</p>}
        {quietHours >= 48 ? (
          <div className="notice" style={{ marginTop: 12, borderColor: "#c77d00", color: "#8a5600", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>Sent {Math.round(quietHours / 24)} days ago, nothing answered yet.</span>
            <CopyButton text={msgNudge(client.first_name, shoot!.number, client.slug)} label="Copy a nudge" waNumber={client.wa_number} />
          </div>
        ) : null}
      </div>

      {shoot ? (
        <div className="two">
          <div>
            <div className="panel">
              <h3>Cards · {answers.length} of {shoot.config.cards.length}</h3>
              <div className="rowlist">
                {shoot.config.cards.map((c) => {
                  const a = answers.find((x) => x.card_id === c.id);
                  const voice = a?.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
                  return (
                    <div key={c.id}>
                      <span>{a ? <span className={`pill ${a.verdict}`}>{a.verdict === "yes" ? "That is me" : a.verdict === "no" ? "Not quite" : "Do not use"}</span> : <span className="pill skip">waiting</span>}</span>
                      <div>
                        <div style={{ color: "var(--ink)" }}>{c.claim}</div>
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

            {shoot.config.prompts.length ? (
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
                    <p className="label" style={{ color: "var(--dim)", marginTop: 10 }}>Prompts he was shown: {shoot.config.prompts.map((p) => p.q).join(" / ")}</p>
                  </div>
                )}
              </div>
            ) : null}

            {shoot.config.photoAsks.length || shootPhotos.length ? (
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

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Brief draft</h3>
                <form action={actionGenerateBrief.bind(null, client.id, client.slug)}><button className="btn small" type="submit">{brief ? "Write a new draft" : "Write the first draft"}</button></form>
              </div>
              {!brief ? (
                <p>Written from every shoot&apos;s answers and transcripts, in our voice, for Akshay to edit. Best after the drive is transcribed. About thirty seconds.</p>
              ) : (
                <form action={actionSaveBriefEdit.bind(null, brief.id, client.slug)} className="form">
                  <span className="label" style={{ color: "var(--dim)" }}>{brief.model} · {new Date(brief.created_at).toLocaleString("en-AU")}{brief.edited_content ? " · edited" : ""}</span>
                  <textarea name="edited" defaultValue={brief.edited_content || brief.content} style={{ minHeight: 420, fontFamily: "inherit", fontSize: 15 }} />
                  <div className="actions"><button className="btn small" type="submit">Save edits</button>{briefs.length > 1 ? <span className="label" style={{ color: "var(--dim)" }}>{briefs.length} drafts kept</span> : null}</div>
                </form>
              )}
            </div>

            <div className="panel">
              <h3>Activity</h3>
              {!events.length ? <p>Nothing yet.</p> : (
                <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                  {events.slice(0, 25).map((e) => (
                    <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10 }}>
                      <span className="label" style={{ color: "var(--dim)", paddingTop: 2 }}>{ago(e.created_at)}</span>
                      <span style={{ color: e.type.startsWith("shoot_") || e.type === "plan_sent" || e.type === "asked" || e.type === "client_created" ? "var(--dim)" : "var(--ink)" }}>{(EVENT_WORDS[e.type] || (() => e.type))(e.payload || {})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
