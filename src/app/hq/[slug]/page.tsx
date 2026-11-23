import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, getAnswers, getRecordings, getBriefs, getAsks, getEvents, listRounds, shootStage, questionnaireOf, shootsOf, listLinks } from "@/lib/db";
import LinkForm from "../links/link-form";
import LinksList from "../links/links-list";
import { msgAsk } from "@/lib/whatsapp";
import { actionNewShoot, actionAsk, actionDeleteAsk } from "../actions";
import ResetButton from "./reset-button";
import CopyButton from "../copy-button";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  questionnaire_sent: () => "we sent the intro questions",
  shoot_drafted: (p) => (Number(p.shoot) === 0 ? "we reloaded the intro questions" : `we drafted shoot ${p.shoot}`),
  shoot_done: (p) => `we marked shoot ${p.shoot} done`,
  plan_sent: (p) => `we sent the plan for shoot ${p.shoot}`,
  asked: (p) => `we asked: “${p.question}”`,
  client_created: () => "client created",
};

export default async function ClientOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const rounds = await listRounds(client.id);
  const [allAnswers, recordings, briefs, asks, events, links] = await Promise.all([getAnswers(client.id), getRecordings(client.id), getBriefs(client.id), getAsks(client.id), getEvents(client.id), listLinks(client.id)]);
  const questionnaire = questionnaireOf(rounds);
  const shoots = shootsOf(rounds);
  const stageOf = (r: typeof rounds[number]) => shootStage(r, allAnswers.filter((a) => a.round_id === r.id).length, recordings.some((x) => x.round_id === r.id && x.kind === "drive"));
  const countOf = (r: typeof rounds[number]) => allAnswers.filter((a) => a.round_id === r.id).length;
  const brief = briefs[0];
  const openAsks = asks.filter((a) => a.status === "open");
  const clientHost = process.env.CLIENT_HOST;
  const link = clientHost ? `https://${clientHost}/${client.slug}` : `/c/${client.slug}`;
  const lastActivity = events.find((e) => !["shoot_sent", "questionnaire_sent", "shoot_drafted", "shoot_done", "plan_sent", "asked", "client_created"].includes(e.type));
  const qStage = questionnaire ? stageOf(questionnaire) : null;
  const qDone = questionnaire ? qStage === "answered" || qStage === "done" : false;

  // One line per stage card: where it is and what we do next.
  function line(r: typeof rounds[number]): { pill: string; cls: string; text: string } {
    const st = stageOf(r); const n = countOf(r); const total = r.config.cards.length;
    const quiet = r.sent_at && st === "live" && n === 0 ? (Date.now() - new Date(r.sent_at).getTime()) / 36e5 : 0;
    if (r.kind === "questionnaire") {
      if (st === "not sent") return { pill: "not sent", cls: "warn", text: "Check the cards, then send him the link." };
      if (st === "live") return { pill: `${n} of ${total}`, cls: "ok", text: quiet >= 48 ? `Sent ${Math.round(quiet / 24)} days ago, nothing yet. Nudge him.` : n ? "He is on it. Finish lands in the brief." : "Sent. Waiting on his first tap." };
      if (st === "answered") return { pill: "all in", cls: "ok", text: brief ? "Cards in, brief drafted. Mark done when you are happy." : "Cards in. Write the first brief draft." };
      return { pill: "done", cls: "", text: "Closed. Answers are in the brief." };
    }
    if (st === "not sent") return { pill: "draft", cls: "warn", text: total ? `${total} questions ready. Add references, then send.` : "Empty. Add questions and references." };
    if (st === "live") return { pill: `${n} of ${total}`, cls: "ok", text: quiet >= 48 ? `Sent ${Math.round(quiet / 24)} days ago, nothing yet. Nudge him.` : n ? "Answering. Plan the day when they are in." : "Sent. Waiting on his first answer." };
    if (st === "answered") return { pill: "answered", cls: "ok", text: "Answers in. Fill the plan and send it." };
    if (st === "planned") return { pill: "plan sent", cls: "ok", text: `Waiting on Works for me${r.plan?.date ? ` for ${r.plan.date}` : ""}.` };
    if (st === "confirmed") return { pill: "locked", cls: "ok", text: `${r.plan?.date || "Day locked"}. Checklist ${r.checklist_done.length} of ${(r.plan?.checklist || []).length}.` };
    return { pill: "done", cls: "", text: "Shot. Footage in Links." };
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <span className="label" style={{ color: "var(--dim)" }}><Link href="/hq">Clients</Link> / {client.slug}</span>
          <h2 style={{ marginTop: 6 }}>{client.name}</h2>
          <span className="label" style={{ color: "var(--dim)" }}>{lastActivity ? `Last seen ${ago(lastActivity.created_at)}` : "No activity yet"}{openAsks.length ? ` · ${openAsks.length} open question${openAsks.length === 1 ? "" : "s"}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="btn small ghost" href={`/hq/${client.slug}/edit`}>Edit client</Link>
          <a className="btn small" href={link} target="_blank" rel="noopener">Open his page</a>
          <ResetButton clientId={client.id} slug={client.slug} />
        </div>
      </div>

      {/* The journey: intro questions, then one card per shoot, then add one */}
      <div className="stages-row">
        {questionnaire ? (() => { const l = line(questionnaire); return (
          <Link href={`/hq/${client.slug}/stage/${questionnaire.id}`} className="stagecard">
            <div className="top"><span className="label" style={{ color: "var(--dim)" }}>Step 1</span><span className={`pill ${l.cls}`}>{l.pill}</span></div>
            <h3>Intro questions</h3>
            <p>{l.text}</p>
            <span className="label" style={{ color: "var(--dim)" }}>{questionnaire.config.cards.length} cards{questionnaire.sent_at ? ` · sent ${ago(questionnaire.sent_at)}` : ""}</span>
          </Link>
        ); })() : null}
        {shoots.map((r) => { const l = line(r); return (
          <Link key={r.id} href={`/hq/${client.slug}/stage/${r.id}`} className={`stagecard ${!qDone && r.status === "draft" ? "dim" : ""}`}>
            <div className="top"><span className="label" style={{ color: "var(--dim)" }}>Step {r.number + 1}</span><span className={`pill ${l.cls}`}>{l.pill}</span></div>
            <h3>Shoot {r.number}{r.plan?.date ? <span style={{ color: "var(--dim)", fontWeight: 400 }}> · {r.plan.date}</span> : null}</h3>
            <p>{l.text}</p>
            <span className="label" style={{ color: "var(--dim)" }}>{r.config.cards.length} questions · {(r.config.references || []).length} references{r.sent_at ? ` · sent ${ago(r.sent_at)}` : ""}</span>
          </Link>
        ); })}
        <form action={actionNewShoot.bind(null, client.id, client.slug)} className="stagecard add">
          <div className="top"><span className="label" style={{ color: "var(--dim)" }}>Step {shoots.length + 2}</span></div>
          <h3>Add a shoot</h3>
          <p>{shoots.length ? `Shoot ${shoots.length + 1}, drafted from what we know so far.` : "Shoot 1, drafted from the intro questions."}</p>
          <select name="how" style={{ font: "inherit", fontSize: 13, padding: "8px 10px", border: "1px solid var(--line)", background: "#fff", width: "100%" }}>
            <option value="ai">Draft with AI from what we know</option>
            <option value="template">Start from the template</option>
            {shoots.length ? <option value="previous">Copy the last shoot</option> : null}
          </select>
          <button className="btn small" type="submit" style={{ justifySelf: "start" }}>Add</button>
        </form>
      </div>

      <div className="two" style={{ marginTop: 14 }}>
        <div>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <h3 style={{ marginBottom: 0 }}>Brief</h3>
              {questionnaire ? <Link className="label" href={`/hq/${client.slug}/stage/${questionnaire.id}`} style={{ color: "var(--dim)" }}>{brief ? "open and edit" : "write it"}</Link> : null}
            </div>
            {brief ? (
              <>
                <span className="label" style={{ color: "var(--dim)" }}>{brief.edited_content ? "Edited" : "Drafted"} {ago(brief.created_at)}{briefs.length > 1 ? ` · ${briefs.length} drafts` : ""}</span>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap", maxHeight: 180, overflow: "hidden", maskImage: "linear-gradient(#000 60%, transparent)" }}>{(brief.edited_content || brief.content).slice(0, 700)}</p>
              </>
            ) : <p className="label" style={{ color: "var(--dim)" }}>{qDone ? "Cards are in. Write the first draft from the Intro questions card." : "Written once his cards are in."}</p>}
          </div>

          <div className="panel">
            <h3>Ask him something</h3>
            <form action={actionAsk.bind(null, client.id, client.slug)} className="form" style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <input name="question" placeholder="One question, plain words. It appears on his page under From Akshay." required maxLength={300} style={{ flex: 1, minWidth: 240 }} />
              <button className="btn small" type="submit">Ask</button>
            </form>
            {asks.length ? (
              <div className="rowlist" style={{ marginTop: 12 }}>
                {asks.map((a) => {
                  const rec = a.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
                  return (
                    <div key={a.id}>
                      <span className={`pill ${a.status === "answered" ? "yes" : "skip"}`}>{a.status}</span>
                      <div>
                        <div style={{ color: "var(--ink)" }}>{a.question}</div>
                        {a.answer_text ? <div style={{ marginTop: 4 }}>“{a.answer_text}”</div> : null}
                        {rec ? <div style={{ marginTop: 8 }}><audio controls preload="none" src={`/api/hq/audio/${rec.id}`} />{rec.transcript ? <div className="transcript">{rec.transcript}</div> : <span className="state">transcript {rec.transcript_status}</span>}</div> : null}
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                          {a.status === "open" ? <CopyButton text={msgAsk(client.first_name, client.slug)} label="Copy the WhatsApp" waNumber={client.wa_number} /> : null}
                          <form action={actionDeleteAsk.bind(null, a.id, client.slug)}><button className="btn link" type="submit" style={{ fontSize: 11 }}>Remove</button></form>
                        </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <h3 style={{ marginBottom: 0 }}>Links · {links.length}</h3>
              <Link className="label" href="/hq/links" style={{ color: "var(--dim)" }}>all links</Link>
            </div>
            <LinksList links={links} back={`/hq/${client.slug}`} />
            <div style={{ marginTop: 12 }}><LinkForm clients={[]} clientId={client.id} back={`/hq/${client.slug}`} compact /></div>
          </div>
          <div className="panel">
            <h3>Activity</h3>
            {!events.length ? <p className="label" style={{ color: "var(--dim)" }}>Nothing yet.</p> : (
              <div className="rowlist" style={{ fontSize: 14 }}>
                {events.slice(0, 20).map((e) => (
                  <div key={e.id}><span className="label" style={{ color: "var(--dim)" }}>{ago(e.created_at)}</span><div>{(EVENT_WORDS[e.type] || (() => e.type))(e.payload || {})}</div></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
