"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RoundConfig } from "@/lib/types";

type Verdict = "yes" | "no" | "skip";
type Answer = { card_id: string; verdict: Verdict; note: string; recording_id: string | null };
type Rec = { id: string; kind: "fix" | "drive" | "answer"; card_id: string | null; duration_secs: number };
type AskItem = { id: string; question: string; status: "open" | "answered"; answer_text: string; recording_id: string | null };

type Props = {
  client: { slug: string; name: string; first_name: string; portrait_url: string | null; wa_number: string | null; shoot_days: string[]; akshayName: string };
  round: { id: string; number: number; title: string; config: RoundConfig; shoot_date: string | null; shoot_note: string | null; live: boolean };
  initialAsks: AskItem[];
  initialAnswers: Answer[];
  initialRecordings: Rec[];
  supabaseUrl: string;
  supabaseAnon: string;
};

function fmt(s: number) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${r > 9 ? r : "0" + r}`;
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export default function Handshake({ client, round, initialAsks, initialAnswers, initialRecordings, supabaseUrl, supabaseAnon }: Props) {
  const cfg = round.config;
  const cards = cfg.cards;
  const prompts = cfg.prompts;
  const secondsPerPrompt = cfg.secondsPerPrompt || 90;
  const api = (path: string) => `/api/c/${client.slug}/${path}`;

  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(initialAnswers.map((a) => [a.card_id, a])));
  const [recs, setRecs] = useState<Rec[]>(initialRecordings);
  const [idx, setIdx] = useState(() => {
    const first = cards.findIndex((c) => !initialAnswers.some((a) => a.card_id === c.id));
    return first === -1 ? 0 : first;
  });
  const [fixOpen, setFixOpen] = useState(false);
  const [fixText, setFixText] = useState("");
  const [fixRecId, setFixRecId] = useState<string | null>(null);
  const [fixUrl, setFixUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState<"" | "fix" | "drive" | "ask">("");
  const [recSecs, setRecSecs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [days, setDays] = useState<string[]>(client.shoot_days || []);
  const [toast, setToast] = useState("");
  const [liveIdx, setLiveIdx] = useState(0);
  const [liveProg, setLiveProg] = useState(0);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [asks, setAsks] = useState<AskItem[]>(initialAsks);
  const [askText, setAskText] = useState<Record<string, string>>({});
  const [askRec, setAskRec] = useState<Record<string, { id: string; url: string }>>({});
  const [askActive, setAskActive] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const promptStartedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const toastTimer = useRef<number | null>(null);
  const liveIdxRef = useRef(0);

  const answered = useMemo(() => cards.filter((c) => answers[c.id]).length, [answers, cards]);
  const allDone = answered >= cards.length;
  const driveRec = recs.find((r) => r.kind === "drive");
  const card = cards[idx];

  function say(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }

  async function post(path: string, body: unknown) {
    const r = await fetch(api(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(body as object), roundId: round.id }) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  const who = client.akshayName;
  const openAsks = asks.filter((a) => a.status === "open");
  function jobLine() {
    if (openAsks.length) return openAsks.length === 1 ? `${who} has one question for you.` : `${who} has ${openAsks.length} questions for you.`;
    if (!allDone) return answered > 0 ? `Finish the cards. ${cards.length - answered} left.` : `Tap through ${cards.length} cards. About three minutes.`;
    if (prompts.length && !driveRec) return "Cards done. Ten minutes on your next drive.";
    if (round.shoot_date) return `Done. Shoot day: ${round.shoot_date}.`;
    return "Done. Nothing else needed this week.";
  }

  function nextUnanswered(from: number, map: Record<string, Answer>) {
    for (let j = 1; j <= cards.length; j++) {
      const k = (from + j) % cards.length;
      if (!map[cards[k].id]) return k;
    }
    return from;
  }

  async function answer(verdict: Verdict, note = "", recording_id: string | null = null) {
    const a: Answer = { card_id: card.id, verdict, note, recording_id };
    const map = { ...answers, [card.id]: a };
    setAnswers(map);
    setFixOpen(false); setFixText(""); setFixRecId(null); setFixUrl(null);
    setIdx(nextUnanswered(idx, map));
    try { await post("card", a); } catch { say("Could not save that one. Check your connection."); }
  }

  async function sendAsk(askId: string) {
    const text = (askText[askId] || "").trim();
    const rec = askRec[askId];
    if (!text && !rec) { say("Say it or type a line first."); return; }
    try {
      await post("ask", { askId, text, recordingId: rec ? rec.id : null });
      setAsks((list) => list.map((a) => (a.id === askId ? { ...a, status: "answered", answer_text: text, recording_id: rec ? rec.id : null } : a)));
      setAskActive(null);
      say("Sent.");
    } catch { say("Could not send. Check your connection."); }
  }

  async function toggleDay(label: string) {
    const next = days.includes(label) ? days.filter((d) => d !== label) : [...days, label];
    setDays(next);
    try { await post("days", { days: next }); say(days.includes(label) ? "Removed" : "Noted"); } catch { say("Could not save. Check your connection."); }
  }

  function canRecord() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof MediaRecorder !== "undefined");
  }

  async function upload(kind: "fix" | "drive" | "answer", blob: Blob, secs: number, cardId: string | null): Promise<string | null> {
    setUploading(true);
    try {
      const mime = blob.type || "audio/webm";
      const { recordingId, path, token } = await post("upload-url", { kind, cardId, mime });
      const sb = createClient(supabaseUrl, supabaseAnon);
      const { error } = await sb.storage.from("recordings").uploadToSignedUrl(path, token, blob, { contentType: mime });
      if (error) throw error;
      await post("recording", { recordingId, duration: secs });
      setRecs((r) => [{ id: recordingId, kind, card_id: cardId, duration_secs: secs }, ...r.filter((x) => !(kind === "drive" && x.kind === "drive"))]);
      return recordingId;
    } catch (e) {
      console.error(e);
      say("Upload failed. Keep the page open and try again.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function startRecording(kind: "fix" | "drive" | "ask", askId?: string) {
    if (!canRecord()) { say("No microphone in this browser. Use WhatsApp instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) window.clearInterval(timer.current);
        const secs = Math.round((Date.now() - startedAt.current) / 1000);
        const blob = new Blob(chunks.current, { type: mr.mimeType || mime || "audio/webm" });
        setRecording("");
        if (wake.current) { try { await wake.current.release(); } catch {} wake.current = null; }
        if (secs < 2) return;
        const url = URL.createObjectURL(blob);
        if (kind === "fix") {
          setFixUrl(url);
          const id = await upload("fix", blob, secs, card.id);
          if (id) { setFixRecId(id); say("Got it"); }
        } else if (kind === "ask") {
          const id = await upload("answer", blob, secs, askId || null);
          if (id && askId) { setAskRec((m) => ({ ...m, [askId]: { id, url } })); say("Got it. Press Send when you are ready."); }
        } else {
          setDriveUrl(url);
          const id = await upload("drive", blob, secs, null);
          if (id) say("Done. It is with us.");
        }
      };
      mr.start(1000);
      recorder.current = mr;
      startedAt.current = Date.now();
      promptStartedAt.current = Date.now();
      setRecSecs(0);
      setRecording(kind);
      if (kind === "drive") {
        liveIdxRef.current = 0; setLiveIdx(0); setLiveProg(0);
        try { if ("wakeLock" in navigator) wake.current = await navigator.wakeLock.request("screen"); } catch {}
      }
      timer.current = window.setInterval(() => {
        setRecSecs(Math.round((Date.now() - startedAt.current) / 1000));
        if (kind === "drive") {
          const el = (Date.now() - promptStartedAt.current) / 1000;
          setLiveProg(Math.min(100, Math.round((100 * el) / secondsPerPrompt)));
          if (el >= secondsPerPrompt) nextPrompt();
        }
      }, 500);
    } catch {
      say("Microphone blocked. Allow it in your browser, or use WhatsApp.");
    }
  }

  function stopRecording() {
    const mr = recorder.current;
    if (mr && mr.state !== "inactive") mr.stop(); else setRecording("");
  }

  async function redoDrive() {
    const rec = recs.find((r) => r.kind === "drive");
    if (!rec) return;
    try {
      await post("recording/delete", { recordingId: rec.id });
      setRecs((r) => r.filter((x) => x.id !== rec.id));
      if (driveUrl) URL.revokeObjectURL(driveUrl);
      setDriveUrl(null);
      say("Cleared. Start the drive whenever you are ready.");
    } catch { say("Could not clear it. Check your connection."); }
  }

  function nextPrompt() {
    const k = liveIdxRef.current + 1;
    if (k >= prompts.length) { stopRecording(); return; }
    liveIdxRef.current = k; setLiveIdx(k); promptStartedAt.current = Date.now(); setLiveProg(0);
  }

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const wa = (text: string) => `https://wa.me/${client.wa_number || ""}?text=${encodeURIComponent(text)}`;
  const driveWa = wa(`Drive notes from ${client.first_name}. Sending them one by one:\n` + prompts.map((p, k) => `${k + 1}. ${p.q}`).join("\n"));

  return (
    <div>
      <header className="band dark hero">
        <div className="in">
          <div className="nav">
            <span className="redact" aria-label="nameless" />
            <span className="count label"><span>With us</span><b>{answered} / {cards.length}</b><span className="bar"><i style={{ width: `${Math.round((100 * answered) / cards.length)}%` }} /></span></span>
          </div>
          <div className="top">
            <div>
              <span className="label" style={{ color: "var(--dim)" }}>( Exclusive / {client.name} )</span>
              <h1 style={{ marginTop: 14 }}>{client.first_name}.<br />{round.number === 1 ? <>We did the <span className="acc">homework.</span></> : <>Round <span className="acc">{round.number}.</span></>}</h1>
              <p className="lede">{cfg.lede}</p>
            </div>
            {client.portrait_url ? <figure><img src={client.portrait_url} alt={client.name} width={560} height={560} /></figure> : <div />}
          </div>
          <div className="job">
            <span className="label">Your one job this week</span>
            <b>{jobLine()}</b>
            {round.shoot_date ? <span style={{ color: "var(--dim)" }}>{round.shoot_note || "We message you the morning before with the run of day."}</span> : null}
            {openAsks.length ? <div style={{ marginTop: 10 }}><a className="btn" href="#asks">See the question{openAsks.length > 1 ? "s" : ""}</a></div> : !allDone || (prompts.length && !driveRec) ? <div style={{ marginTop: 10 }}><a className="btn" href={allDone ? "#drive" : "#cards"}>{allDone ? "Go to the drive" : "Start"}</a></div> : null}
          </div>
        </div>
      </header>

      <section className="band grey" id="cards">
        <div className="in">
          <div className="head"><span className="label">( 01 )</span><div><h2>Is this <span className="acc">you?</span></h2><p>{cfg.intro} Tap That is me, Not quite, or Do not use.</p></div></div>
          {!allDone ? (
            <div className="card">
              <div className="meta">
                <span className="label">Card {String(idx + 1).padStart(2, "0")} of {cards.length}</span>
                <div className="dots">{cards.map((c, j) => <span key={c.id} className={`dot ${answers[c.id]?.verdict || ""} ${j === idx ? "cur" : ""}`} />)}</div>
              </div>
              <p className="claim">{card.claim}</p>
              <p className="why">{card.why}</p>
              {card.clip ? <div className="clip"><audio controls preload="none" src={card.clip} /><span className="state">Hear {who} ask it</span></div> : null}
              <div className="acts">
                <button className="btn" type="button" onClick={() => answer("yes")}>That is me</button>
                <button className="btn ghost" type="button" onClick={() => setFixOpen(true)}>Not quite</button>
                <button className="btn ghost" type="button" onClick={() => answer("skip")}>Do not use</button>
              </div>
              {fixOpen ? (
                <div className="fix">
                  <span className="label" style={{ color: "var(--ink)" }}>What is off? Say it in any language, or type one line.</span>
                  <div className="row">
                    <button className={`btn recbtn ${recording === "fix" ? "on" : ""}`} type="button" onClick={() => (recording === "fix" ? stopRecording() : startRecording("fix"))} disabled={uploading}>
                      {recording === "fix" ? "Stop" : fixRecId ? "Say it again" : "Say it"}
                    </button>
                    {recording === "fix" ? <span className="state">{fmt(recSecs)}</span> : null}
                    {uploading ? <span className="state">Saving</span> : null}
                  </div>
                  {fixUrl ? <div className="row"><audio controls preload="metadata" src={fixUrl} /></div> : null}
                  <div className="row">
                    <input type="text" value={fixText} onChange={(e) => setFixText(e.target.value)} placeholder="One line is enough" maxLength={240} />
                    <button className="btn" type="button" onClick={() => answer("no", fixText.trim(), fixRecId)} disabled={uploading || recording === "fix"}>Save</button>
                  </div>
                  <button className="btn link" type="button" style={{ justifySelf: "start" }} onClick={() => setFixOpen(false)}>Back</button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="done">
              <h3>Cards <span className="acc">done.</span></h3>
              <p>All {cards.length} are with us.{prompts.length ? " Next, ten minutes on your next drive." : ""}</p>
              {prompts.length ? <a className="btn" href="#drive">Go to the drive</a> : null}
              <button className="btn link" type="button" style={{ marginLeft: 16 }} onClick={() => { setIdx(0); setAnswers({}); }}>Go back through the cards</button>
            </div>
          )}
        </div>
      </section>

      {prompts.length || cfg.shootOptions.length ? <section className="band dark" id="drive">
        <div className="in">
          {prompts.length ? <>
          <div className="head"><span className="label">( 02 )</span><div><h2>Drive and <span className="acc">talk.</span></h2><p style={{ color: "var(--dim)" }}>Next time you are in the car, press Start the drive, put the phone in the cradle, and talk. We show you one thing to talk about at a time and move on by ourselves. One recording, no stopping and starting. About ten minutes. Hindi, Punjabi, English or a mix, whatever comes out.</p></div></div>
          <div className="drive">
            <div className="prompts">{prompts.map((p, k) => <span key={k}><b>{k + 1}. </b>{p.q}</span>)}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn" type="button" onClick={() => startRecording("drive")} disabled={!!driveRec || uploading || recording !== ""}>{driveRec ? "Drive done" : "Start the drive"}</button>
              {client.wa_number ? <a className="btn ghost" href={driveWa} target="_blank" rel="noopener">Or voice notes on WhatsApp</a> : null}
              {driveRec ? <span className="state">{fmt(driveRec.duration_secs)} recorded</span> : null}
              {uploading && recording === "" ? <span className="state">Sending</span> : null}
            </div>
            {driveRec ? (
              <div style={{ display: "grid", gap: 8 }}>
                <span className="label" style={{ color: "var(--dim)" }}>Your drive{driveUrl ? "" : " is with us"}</span>
                {driveUrl ? <audio controls preload="metadata" src={driveUrl} /> : null}
                <button className="btn link" type="button" style={{ justifySelf: "start" }} onClick={redoDrive} disabled={uploading}>Record it again</button>
              </div>
            ) : null}
          </div>
          </> : null}
          {cfg.shootOptions.length ? (
            <div style={{ marginTop: prompts.length ? 28 : 0 }}>
              <span className="label" style={{ color: "var(--dim)", display: "block", marginBottom: 10 }}>Which days could work for the first shoot? Tap all that do.</span>
              <div className="chips">{cfg.shootOptions.map((d) => <button key={d} className="chip" type="button" aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>{d}</button>)}</div>
            </div>
          ) : null}
        </div>
      </section> : null}

      {asks.length ? (
        <section className="band grey" id="asks">
          <div className="in">
            <div className="head"><span className="label">( 03 )</span><div><h2>From <span className="acc">{who}.</span></h2><p>Quick ones. Say it or type a line, then Send.</p></div></div>
            <div style={{ display: "grid", gap: 12 }}>
              {asks.map((a) => (
                <div key={a.id} className="card" style={{ borderColor: a.status === "answered" ? "var(--line)" : "var(--ink)" }}>
                  <div className="meta"><span className="label">{a.status === "answered" ? "Answered" : "Open"}</span></div>
                  <p className="claim" style={{ fontSize: "clamp(22px, 3.6vw, 30px)" }}>{a.question}</p>
                  {a.status === "answered" ? (
                    <p className="why">{a.answer_text ? `“${a.answer_text}”` : "Voice note sent."}{a.recording_id && a.answer_text ? " Plus a voice note." : ""}</p>
                  ) : (
                    <div className="fix" style={{ marginTop: 18 }}>
                      <div className="row">
                        <button className={`btn recbtn ${recording === "ask" && askActive === a.id ? "on" : ""}`} type="button" disabled={uploading || (recording !== "" && !(recording === "ask" && askActive === a.id))} onClick={() => { if (recording === "ask" && askActive === a.id) { stopRecording(); } else { setAskActive(a.id); startRecording("ask", a.id); } }}>
                          {recording === "ask" && askActive === a.id ? "Stop" : askRec[a.id] ? "Say it again" : "Say it"}
                        </button>
                        {recording === "ask" && askActive === a.id ? <span className="state">{fmt(recSecs)}</span> : null}
                        {uploading && askActive === a.id ? <span className="state">Saving</span> : null}
                      </div>
                      {askRec[a.id] ? <div className="row"><audio controls preload="metadata" src={askRec[a.id].url} /></div> : null}
                      <div className="row">
                        <input type="text" value={askText[a.id] || ""} onChange={(e) => setAskText((m) => ({ ...m, [a.id]: e.target.value }))} placeholder="Or type a line" maxLength={1000} />
                        <button className="btn" type="button" onClick={() => sendAsk(a.id)} disabled={uploading || recording !== ""}>Send</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="band" id="after">
        <div className="in">
          <details>
            <summary>What happens after</summary>
            <div className="stages">
              <div className="stage"><span className="label">Day 3 to 7</span><div><b>We think.</b> Positioning, your two pillars, a 30-day plan, the first shoot plan. One 30-minute call with {who}, no prep.</div></div>
              <div className="stage"><span className="label">Day 8</span><div><b>Your plan lands on this page.</b> Read it once. One button: Works for me.</div></div>
              <div className="stage"><span className="label">Day 10 to 12</span><div><b>Shoot Day 1.</b> 9am at your place, coffee, the drive, the office, one listing, hero shots. You live the day, we film it.</div></div>
              <div className="stage"><span className="label">Every month</span><div><b>You capture, we build.</b> Stories almost every day, 12 to 15 reels a month. Check with us before reposting anything.</div></div>
            </div>
          </details>
          <details>
            <summary>Your side, our side</summary>
            <div className="stages">
              <div className="stage"><span className="label">Yours</span><div>Three minutes of cards. Ten minutes in the car. One call. One shoot day. Drop clips in your folder when you remember.</div></div>
              <div className="stage"><span className="label">Ours</span><div>Everything else. Research, positioning, planning, shooting, editing, captions, scheduling, and deciding what never gets posted.</div></div>
            </div>
          </details>
        </div>
      </section>

      <footer className="band dark" style={{ paddingTop: 28 }}>
        <div className="in foot"><span className="label">Private page. Please do not share the link.</span><span className="label"><a href="https://instagram.com/callitnameless" target="_blank" rel="noopener">@callitnameless</a> &nbsp;·&nbsp; <a href="mailto:hello@thenameless.studio">hello@thenameless.studio</a></span></div>
      </footer>

      {recording === "drive" ? (
        <div className="live">
          <div className="lt"><span className="rec">{fmt(recSecs)}</span><button className="btn ghost" type="button" onClick={stopRecording}>Finish</button></div>
          <div className="lp">
            <span className="label">{liveIdx + 1} of {prompts.length}</span>
            <p className="lq">{prompts[liveIdx].q}</p>
            <p className="lh">{prompts[liveIdx].h}</p>
          </div>
          <div>
            <div className="prog"><i style={{ width: `${liveProg}%` }} /></div>
            <div className="lb"><span className="state" style={{ color: "var(--dim)" }}>Moves on by itself. Tap Next if you are done early.</span><button className="btn" type="button" onClick={nextPrompt}>{liveIdx + 1 >= prompts.length ? "Finish" : "Next"}</button></div>
          </div>
        </div>
      ) : null}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
