"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RoundConfig, ShootPlan, ShootStage } from "@/lib/types";

type Verdict = "yes" | "no" | "skip";
type Answer = { card_id: string; verdict: Verdict; note: string; recording_id: string | null };
type Rec = { id: string; kind: "fix" | "drive" | "answer"; card_id: string | null; duration_secs: number };
type AskItem = { id: string; question: string; status: "open" | "answered"; answer_text: string; recording_id: string | null };
type PhotoItem = { id: string; prompt: string };
type ShootSummary = { id: string; number: number; title: string; stage: ShootStage; date: string | null };

type Props = {
  client: { slug: string; name: string; first_name: string; portrait_url: string | null; wa_number: string | null; shoot_days: string[]; akshayName: string };
  shoot: { id: string; number: number; title: string; live: boolean; config: RoundConfig; plan: ShootPlan; plan_status: "none" | "sent" | "accepted"; checklist_done: string[] };
  shoots: ShootSummary[];
  initialAsks: AskItem[];
  initialAnswers: Answer[];
  initialRecordings: Rec[];
  initialPhotos: PhotoItem[];
  supabaseUrl: string;
  supabaseAnon: string;
};

function fmt(s: number) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${r > 9 ? r : "0" + r}`; }
function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export default function Handshake({ client, shoot, shoots, initialAsks, initialAnswers, initialRecordings, initialPhotos, supabaseUrl, supabaseAnon }: Props) {
  const cfg = shoot.config;
  const cards = cfg.cards;
  const prompts = cfg.prompts;
  const photoAsks = cfg.photoAsks || [];
  const secondsPerPrompt = cfg.secondsPerPrompt || 90;
  const live = shoot.live;
  const who = client.akshayName;
  const api = (path: string) => `/api/c/${client.slug}/${path}`;

  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(initialAnswers.map((a) => [a.card_id, a])));
  const [recs, setRecs] = useState<Rec[]>(initialRecordings);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [idx, setIdx] = useState(() => { const first = cards.findIndex((c) => !initialAnswers.some((a) => a.card_id === c.id)); return first === -1 ? 0 : first; });
  const [fixOpen, setFixOpen] = useState(false);
  const [fixText, setFixText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [cardRecId, setCardRecId] = useState<string | null>(null);
  const [cardRecUrl, setCardRecUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState<"" | "card" | "drive" | "ask">("");
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
  const [planStatus, setPlanStatus] = useState(shoot.plan_status);
  const [ticked, setTicked] = useState<string[]>(shoot.checklist_done || []);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const promptStartedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const toastTimer = useRef<number | null>(null);
  const liveIdxRef = useRef(0);

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const answered = useMemo(() => cards.filter((c) => answers[c.id]).length, [answers, cards]);
  const allDone = cards.length > 0 && answered >= cards.length;
  const showDone = allDone && !reviewing;
  const driveRec = recs.find((r) => r.kind === "drive");
  const card = cards[idx];
  const openAsks = asks.filter((a) => a.status === "open");
  const plan = shoot.plan || {};
  const checklist = plan.checklist || [];
  const photosNeeded = photoAsks.filter((p) => !photos.some((x) => x.prompt === p));

  function say(msg: string) { setToast(msg); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 1800); }
  async function post(path: string, body: unknown) {
    const r = await fetch(api(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(body as object), roundId: shoot.id }) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function job(): { line: string; href?: string; cta?: string } {
    if (openAsks.length) return { line: openAsks.length === 1 ? `${who} has one question for you.` : `${who} has ${openAsks.length} questions for you.`, href: "#asks", cta: "See it" };
    if (planStatus === "sent") return { line: `Shoot ${shoot.number} is planned${plan.date ? ` for ${plan.date}` : ""}. One tap if it works.`, href: "#plan", cta: "See the plan" };
    if (planStatus === "accepted" && checklist.length && ticked.length < checklist.length) return { line: `Shoot ${shoot.number}${plan.date ? ` is ${plan.date}` : ""}. Tick the list the day before.`, href: "#plan", cta: "Open the list" };
    if (planStatus === "accepted") return { line: `Shoot ${shoot.number}${plan.date ? `: ${plan.date}` : ""}. We will message you the morning before.` };
    if (live && !allDone) return { line: answered > 0 ? `Finish the cards. ${cards.length - answered} left.` : `Tap through ${cards.length} cards. About three minutes.`, href: "#cards", cta: answered > 0 ? "Continue" : "Start" };
    if (live && prompts.length && !driveRec) return { line: "Cards done. Ten minutes on your next drive.", href: "#drive", cta: "Go to the drive" };
    if (live && photosNeeded.length) return { line: photosNeeded.length === 1 ? "One photo and you are done." : `${photosNeeded.length} photos and you are done.`, href: "#photos", cta: "Send photos" };
    if (live) return { line: "Done. Nothing else needed this week." };
    return { line: "Nothing to do right now. We are working on our side." };
  }
  const j = job();

  function nextUnanswered(from: number, map: Record<string, Answer>) { for (let k = 1; k <= cards.length; k++) { const n = (from + k) % cards.length; if (!map[cards[n].id]) return n; } return from; }

  async function saveAnswer(cardId: string, verdict: Verdict, note: string, recording_id: string | null) {
    const a: Answer = { card_id: cardId, verdict, note, recording_id };
    const map = { ...answersRef.current, [cardId]: a };
    answersRef.current = map; setAnswers(map);
    try { await post("card", a); } catch { say("Could not save that one. Check your connection."); }
  }
  /** Tap a verdict: saved at once, he stays on the card so he can add a voice note, then taps Next. */
  function answer(verdict: Verdict, note = "") {
    const prev = answers[card.id];
    void saveAnswer(card.id, verdict, note || prev?.note || "", cardRecId || prev?.recording_id || null);
    setFixOpen(false);
  }
  function goTo(k: number) { setIdx(Math.max(0, Math.min(cards.length - 1, k))); setFixOpen(false); setFixText(""); setCardRecId(null); setCardRecUrl(null); }
  function next() {
    const map = answersRef.current;
    if (cards.every((c) => map[c.id])) { setReviewing(false); return; }
    const n = nextUnanswered(idx, map);
    goTo(n <= idx ? nextUnanswered(-1, map) : n);
  }

  async function toggleDay(label: string) {
    const next = days.includes(label) ? days.filter((d) => d !== label) : [...days, label];
    setDays(next);
    try { await post("days", { days: next }); say(days.includes(label) ? "Removed" : "Noted"); } catch { say("Could not save. Check your connection."); }
  }

  async function sendAsk(askId: string) {
    const text = (askText[askId] || "").trim(); const rec = askRec[askId];
    if (!text && !rec) { say("Say it or type a line first."); return; }
    try {
      await post("ask", { askId, text, recordingId: rec ? rec.id : null });
      setAsks((list) => list.map((a) => (a.id === askId ? { ...a, status: "answered", answer_text: text, recording_id: rec ? rec.id : null } : a)));
      setAskActive(null); say("Sent.");
    } catch { say("Could not send. Check your connection."); }
  }

  async function acceptPlan() {
    try { await post("plan", { action: "accept" }); setPlanStatus("accepted"); say("Locked in. See you then."); } catch { say("Could not send. Check your connection."); }
  }
  async function tick(item: string) {
    const next = ticked.includes(item) ? ticked.filter((x) => x !== item) : [...ticked, item];
    setTicked(next);
    try { await post("plan", { action: "checklist", done: next }); } catch { say("Could not save. Check your connection."); }
  }

  function canRecord() { return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof MediaRecorder !== "undefined"); }

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
    } catch (e) { console.error(e); say("Upload failed. Keep the page open and try again."); return null; } finally { setUploading(false); }
  }

  async function startRecording(kind: "card" | "drive" | "ask", askId?: string) {
    if (!canRecord()) { say("No microphone in this browser. Use WhatsApp instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      const forCard = card?.id;
      const forCardKind = card?.kind || "claim";
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
        if (kind === "card") {
          setCardRecUrl(url);
          const id = await upload("fix", blob, secs, forCard || null);
          if (id && forCard) {
            setCardRecId(id);
            const prev = answersRef.current[forCard];
            if (prev) { await saveAnswer(forCard, prev.verdict, prev.note, id); say("Attached. Tap Next when you are ready."); }
            else if (forCardKind === "question") { await saveAnswer(forCard, "yes", "", id); say("Got it. Tap Next when you are ready."); }
            else say("Got it. Now tap This is me or Not quite.");
          }
        }
        else if (kind === "ask") { const id = await upload("answer", blob, secs, askId || null); if (id && askId) { setAskRec((m) => ({ ...m, [askId]: { id, url } })); say("Got it. Press Send when you are ready."); } }
        else { setDriveUrl(url); const id = await upload("drive", blob, secs, null); if (id) say("Done. It is with us."); }
      };
      mr.start(1000); recorder.current = mr; startedAt.current = Date.now(); promptStartedAt.current = Date.now();
      setRecSecs(0); setRecording(kind);
      if (kind === "drive") { liveIdxRef.current = 0; setLiveIdx(0); setLiveProg(0); try { if ("wakeLock" in navigator) wake.current = await navigator.wakeLock.request("screen"); } catch {} }
      timer.current = window.setInterval(() => {
        setRecSecs(Math.round((Date.now() - startedAt.current) / 1000));
        if (kind === "drive") { const el = (Date.now() - promptStartedAt.current) / 1000; setLiveProg(Math.min(100, Math.round((100 * el) / secondsPerPrompt))); if (el >= secondsPerPrompt) nextPrompt(); }
      }, 500);
    } catch { say("Microphone blocked. Allow it in your browser, or use WhatsApp."); }
  }
  function stopRecording() { const mr = recorder.current; if (mr && mr.state !== "inactive") mr.stop(); else setRecording(""); }
  async function redoDrive() {
    const rec = recs.find((r) => r.kind === "drive"); if (!rec) return;
    try { await post("recording/delete", { recordingId: rec.id }); setRecs((r) => r.filter((x) => x.id !== rec.id)); if (driveUrl) URL.revokeObjectURL(driveUrl); setDriveUrl(null); say("Cleared. Start the drive whenever you are ready."); } catch { say("Could not clear it. Check your connection."); }
  }
  function nextPrompt() { const k = liveIdxRef.current + 1; if (k >= prompts.length) { stopRecording(); return; } liveIdxRef.current = k; setLiveIdx(k); promptStartedAt.current = Date.now(); setLiveProg(0); }

  async function sendPhoto(prompt: string, file: File) {
    setPhotoBusy(prompt);
    try {
      const mime = file.type || "image/jpeg";
      const { photoId, path, token } = await post("photo", { step: "start", prompt, mime });
      const sb = createClient(supabaseUrl, supabaseAnon);
      const { error } = await sb.storage.from("photos").uploadToSignedUrl(path, token, file, { contentType: mime });
      if (error) throw error;
      await post("photo", { step: "done", photoId });
      setPhotos((p) => [{ id: photoId, prompt }, ...p]);
      say("Got it.");
    } catch (e) { console.error(e); say("Could not send the photo. Try again."); } finally { setPhotoBusy(null); }
  }
  async function removePhoto(id: string) {
    try { await post("photo", { step: "remove", photoId: id }); setPhotos((p) => p.filter((x) => x.id !== id)); } catch { say("Could not remove it."); }
  }

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const wa = (text: string) => `https://wa.me/${client.wa_number || ""}?text=${encodeURIComponent(text)}`;
  const driveWa = wa(`Drive notes from ${client.first_name}. Sending them one by one:\n` + prompts.map((p, k) => `${k + 1}. ${p.q}`).join("\n"));
  const stageWord = (s: ShootStage) => (s === "done" ? "done" : s === "confirmed" ? "locked" : s === "planned" ? "planned" : s === "answered" ? "answered" : s === "live" ? "now" : "soon");
  let section = 0;
  const num = () => `( 0${++section} )`;

  return (
    <div>
      <header className="band dark hero">
        <div className="in">
          <div className="nav">
            <span className="redact" aria-label="nameless" />
            {live && cards.length ? <span className="count label"><span>With us</span><b>{answered} / {cards.length}</b><span className="bar"><i style={{ width: `${Math.round((100 * answered) / cards.length)}%` }} /></span></span> : <span className="label" style={{ color: "var(--dim)" }}>Exclusive / {client.name}</span>}
          </div>
          {shoots.length > 1 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              {shoots.map((s) => <span key={s.id} className="pill" style={{ background: s.id === shoot.id ? "#fff" : "transparent", color: s.id === shoot.id ? "var(--ink)" : "var(--dim)", borderColor: s.id === shoot.id ? "#fff" : "var(--dline)" }}>Shoot {s.number} · {stageWord(s.stage)}{s.date ? ` · ${s.date}` : ""}</span>)}
            </div>
          ) : null}
          <div className="top">
            <div>
              <span className="label" style={{ color: "var(--dim)" }}>( Shoot {shoot.number}{shoot.number === 1 ? " / the handshake" : ""} )</span>
              <h1 style={{ marginTop: 14 }}>{client.first_name}.<br />{shoot.number === 1 ? <>We did the <span className="acc">homework.</span></> : <>Shoot <span className="acc">{shoot.number}.</span></>}</h1>
              {live ? <p className="lede">{cfg.lede}</p> : null}
            </div>
            {client.portrait_url ? <figure><img src={client.portrait_url} alt={client.name} width={560} height={560} /></figure> : <div />}
          </div>
          <div className="job">
            <span className="label">Your one job this week</span>
            <b>{j.line}</b>
            {j.href ? <div style={{ marginTop: 10 }}><a className="btn" href={j.href}>{j.cta}</a></div> : null}
          </div>
        </div>
      </header>

      {planStatus !== "none" ? (
        <section className="band" id="plan">
          <div className="in">
            <div className="head"><span className="label">{num()}</span><div><h2>Shoot {shoot.number}, <span className="acc">planned.</span></h2><p>{planStatus === "accepted" ? "Locked in. This is the day." : "Read it once. If it works, one tap."}</p></div></div>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ background: "var(--ink)", color: "#fff", padding: "18px 22px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <h3 style={{ fontWeight: 400, fontSize: 24 }}>{plan.date || "Date to come"}{plan.callTime ? `, ${plan.callTime}` : ""}</h3>
                <span className="label" style={{ color: "var(--dim)" }}>{planStatus === "accepted" ? "Locked" : "Waiting on you"}</span>
              </div>
              <div className="rowlist" style={{ padding: "6px 22px 20px" }}>
                {plan.place ? <div><span className="k" style={{ color: "var(--ink)" }}>Where</span><div>{plan.place}</div></div> : null}
                {plan.runOfDay ? <div><span className="k" style={{ color: "var(--ink)" }}>Run of day</span><div style={{ whiteSpace: "pre-wrap" }}>{plan.runOfDay}</div></div> : null}
                {plan.wear ? <div><span className="k" style={{ color: "var(--ink)" }}>Wear</span><div style={{ whiteSpace: "pre-wrap" }}>{plan.wear}</div></div> : null}
                {plan.bring ? <div><span className="k" style={{ color: "var(--ink)" }}>Bring</span><div style={{ whiteSpace: "pre-wrap" }}>{plan.bring}</div></div> : null}
                {plan.note ? <div><span className="k" style={{ color: "var(--ink)" }}>Note</span><div>{plan.note}</div></div> : null}
              </div>
              {planStatus === "sent" ? (
                <div style={{ padding: "0 22px 22px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="btn" type="button" onClick={acceptPlan}>Works for me</button>
                  {client.wa_number ? <a className="btn ghost" href={wa(`About shoot ${shoot.number}${plan.date ? ` on ${plan.date}` : ""}: `)} target="_blank" rel="noopener">Something does not work</a> : null}
                </div>
              ) : null}
              {planStatus === "accepted" && checklist.length ? (
                <div style={{ padding: "0 22px 22px" }}>
                  <span className="label" style={{ color: "var(--dim)", display: "block", marginBottom: 10 }}>The day before · {ticked.length} of {checklist.length}</span>
                  <div style={{ display: "grid", gap: 6 }}>
                    {checklist.map((item) => (
                      <button key={item} type="button" onClick={() => tick(item)} className="btn ghost" style={{ justifyContent: "flex-start", textTransform: "none", letterSpacing: "-0.01em", fontFamily: "var(--fh)", fontSize: 16, gap: 12, background: ticked.includes(item) ? "var(--grey)" : "transparent", borderColor: ticked.includes(item) ? "var(--grey)" : "var(--line)", color: ticked.includes(item) ? "var(--dim)" : "var(--ink)", textDecoration: ticked.includes(item) ? "line-through" : "none" }}>
                        <span style={{ width: 16, height: 16, border: "1px solid currentColor", display: "inline-block", background: ticked.includes(item) ? "currentColor" : "transparent" }} />{item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {live && cards.length ? (
        <section className="band grey" id="cards">
          <div className="in">
            <div className="head"><span className="label">{num()}</span><div><h2>{shoot.number === 1 ? <>Is this <span className="acc">you?</span></> : <>Before shoot <span className="acc">{shoot.number}.</span></>}</h2><p>{cfg.intro}{cards.every((c) => c.kind === "question") ? " Any language." : cards.every((c) => (c.kind || "claim") === "claim") ? " Two taps per card. Add your voice if you want to." : ""}</p></div></div>
            {!showDone ? (
              <div className="card">
                <div className="meta">
                  <span className="label">{card.kind === "question" ? "Question" : "Card"} {String(idx + 1).padStart(2, "0")} of {cards.length}</span>
                  <div className="dots">{cards.map((c, k) => <button key={c.id} type="button" aria-label={`Card ${k + 1}`} className={`dot ${answers[c.id]?.verdict || ""} ${k === idx ? "cur" : ""}`} onClick={() => goTo(k)} />)}</div>
                </div>
                <p className="claim">{card.claim}</p>
                <p className="why">{card.why}</p>
                {card.clip ? <div className="clip"><audio controls preload="none" src={card.clip} /><span className="state">Hear {who} ask it</span></div> : null}
                {(() => {
                  const cur = answers[card.id];
                  const isQ = card.kind === "question";
                  const hasVoice = !!(cardRecId || cur?.recording_id);
                  const busy = uploading || recording === "card";
                  return (
                    <>
                      {isQ ? (
                        <div className="acts two">
                          <button className={`btn recbtn ${recording === "card" ? "on" : ""}`} type="button" onClick={() => (recording === "card" ? stopRecording() : startRecording("card"))} disabled={uploading || (recording !== "" && recording !== "card")}>
                            {recording === "card" ? `Stop · ${fmt(recSecs)}` : hasVoice ? "Say it again" : "Answer with your voice"}
                          </button>
                          {cur ? <button className="btn ghost" type="button" onClick={next} disabled={busy}>Next</button> : <button className="btn ghost" type="button" onClick={() => { answer("skip"); }} disabled={busy}>Skip this one</button>}
                        </div>
                      ) : (
                        <div className="acts two">
                          <button className={`btn ${cur && cur.verdict !== "yes" ? "ghost" : ""}`} type="button" onClick={() => answer("yes")} disabled={busy}>{cur?.verdict === "yes" ? "This is me ✓" : "This is me"}</button>
                          <button className={`btn ${cur?.verdict === "no" || cur?.verdict === "skip" ? "" : "ghost"}`} type="button" onClick={() => answer("no")} disabled={busy}>{cur?.verdict === "no" || cur?.verdict === "skip" ? "Not quite ✓" : "Not quite"}</button>
                        </div>
                      )}
                      {cur || hasVoice || recording === "card" ? (
                        <div className="after">
                          {!isQ ? (
                            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                              <button className={`btn link recbtn ${recording === "card" ? "on" : ""}`} type="button" style={{ gap: 8 }} onClick={() => (recording === "card" ? stopRecording() : startRecording("card"))} disabled={uploading || (recording !== "" && recording !== "card")}>
                                {recording === "card" ? `Stop · ${fmt(recSecs)}` : hasVoice ? "Say it again" : "Want to add something? Say it"}
                              </button>
                              {!fixOpen && !recording ? <button className="btn link" type="button" onClick={() => { setFixOpen(true); setFixText(cur?.note || ""); }}>Or type a line</button> : null}
                              {uploading && recording === "" ? <span className="state">Saving</span> : null}
                              {hasVoice && !uploading && recording === "" ? <span className="state">Voice note attached</span> : null}
                            </div>
                          ) : (uploading && recording === "" ? <span className="state">Saving</span> : hasVoice && recording === "" ? <span className="state">Voice note attached</span> : null)}
                          {cardRecUrl ? <audio controls preload="metadata" src={cardRecUrl} style={{ marginTop: 8 }} /> : null}
                          {fixOpen ? (
                            <div className="fix">
                              <div className="row">
                                <input type="text" value={fixText} onChange={(e) => setFixText(e.target.value)} placeholder="One line, any language" maxLength={240} autoFocus />
                                <button className="btn" type="button" onClick={() => { answer(cur?.verdict || "no", fixText.trim()); say("Saved."); }} disabled={busy}>Save</button>
                              </div>
                            </div>
                          ) : null}
                          {cur?.note && !fixOpen ? <p className="state" style={{ marginTop: 8 }}>You said: “{cur.note}”</p> : null}
                        </div>
                      ) : null}
                      <div className="navrow">
                        <button className="btn link" type="button" onClick={() => goTo(idx - 1)} disabled={idx === 0 || busy}>Back</button>
                        {cur && !isQ ? <button className="btn" type="button" onClick={next} disabled={busy}>{answered >= cards.length ? "Done" : "Next"}</button> : <span />}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="done">
                <h3>Cards <span className="acc">done.</span></h3>
                <p>All {cards.length} are with us.{prompts.length && !driveRec ? " Next, ten minutes on your next drive." : photosNeeded.length ? " One more thing: a photo or two." : ""}</p>
                {prompts.length && !driveRec ? <a className="btn" href="#drive">Go to the drive</a> : photosNeeded.length ? <a className="btn" href="#photos">Send photos</a> : null}
                <button className="btn link" type="button" style={{ marginLeft: 16 }} onClick={() => { setReviewing(true); goTo(0); }}>Go back through the cards</button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {live && (prompts.length || cfg.shootOptions.length) ? (
        <section className="band dark" id="drive">
          <div className="in">
            {prompts.length ? (
              <>
                <div className="head"><span className="label">{num()}</span><div><h2>Drive and <span className="acc">talk.</span></h2><p style={{ color: "var(--dim)" }}>Next time you are in the car, press Start the drive, put the phone in the cradle, and talk. We show you one thing to talk about at a time and move on by ourselves. One recording, no stopping and starting. Hindi, Punjabi, English or a mix, whatever comes out. Leave out client names, addresses and sale prices. If something is for our ears only, say background only and we keep it that way.</p></div></div>
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
              </>
            ) : null}
            {cfg.shootOptions.length ? (
              <div style={{ marginTop: prompts.length ? 28 : 0 }}>
                <span className="label" style={{ color: "var(--dim)", display: "block", marginBottom: 10 }}>Which days could work for this shoot? Tap all that do.</span>
                <div className="chips">{cfg.shootOptions.map((d) => <button key={d} className="chip" type="button" aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>{d}</button>)}</div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {live && photoAsks.length ? (
        <section className="band" id="photos">
          <div className="in">
            <div className="head"><span className="label">{num()}</span><div><h2>Show us, <span className="acc">don&apos;t tell us.</span></h2><p>Any photo from your phone. Rubbish quality is fine. We only need to see it.</p></div></div>
            <div style={{ display: "grid", gap: 12 }}>
              {photoAsks.map((p) => {
                const mine = photos.filter((x) => x.prompt === p);
                return (
                  <div key={p} className="card" style={{ borderColor: mine.length ? "var(--line)" : "var(--ink)" }}>
                    <div className="meta"><span className="label">{mine.length ? `Got ${mine.length}` : "Needed"}</span></div>
                    <p className="claim" style={{ fontSize: "clamp(22px, 3.6vw, 30px)" }}>{p}</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
                      <label className="btn" style={{ cursor: "pointer" }}>
                        {photoBusy === p ? "Sending" : mine.length ? "Send another" : "Take or choose a photo"}
                        <input type="file" accept="image/*" style={{ display: "none" }} disabled={photoBusy !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) sendPhoto(p, f); e.currentTarget.value = ""; }} />
                      </label>
                      {mine.length ? <button type="button" className="btn link" onClick={() => removePhoto(mine[0].id)}>Remove the last one</button> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {asks.length ? (
        <section className="band grey" id="asks">
          <div className="in">
            <div className="head"><span className="label">{num()}</span><div><h2>From <span className="acc">{who}.</span></h2><p>Quick ones. Say it or type a line, then Send.</p></div></div>
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

      {shoot.number === 1 ? (
        <section className="band" id="after">
          <div className="in">
            <details>
              <summary>What happens after</summary>
              <div className="stages">
                <div className="stage"><span className="label">Day 3 to 7</span><div><b>We think.</b> Positioning, your two pillars, a 30-day plan, the first shoot plan. One 30-minute call with {who}, no prep.</div></div>
                <div className="stage"><span className="label">Day 8</span><div><b>Your plan lands on this page.</b> Read it once. One button: Works for me.</div></div>
                <div className="stage"><span className="label">Day 10 to 12</span><div><b>Shoot 1.</b> You live the day, we film it.</div></div>
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
      ) : null}

      <footer className="band dark" style={{ paddingTop: 28 }}>
        <div className="in foot"><span className="label">Private page. Please do not share the link.</span><span className="label"><a href="https://instagram.com/callitnameless" target="_blank" rel="noopener">@callitnameless</a> &nbsp;·&nbsp; <a href="mailto:hello@thenameless.studio">hello@thenameless.studio</a></span></div>
      </footer>

      {recording === "drive" ? (
        <div className="live">
          <div className="lt"><span className="rec">{fmt(recSecs)}</span><button className="btn ghost" type="button" onClick={stopRecording}>Finish</button></div>
          <div className="lp"><span className="label">{liveIdx + 1} of {prompts.length}</span><p className="lq">{prompts[liveIdx].q}</p><p className="lh">{prompts[liveIdx].h}</p></div>
          <div><div className="prog"><i style={{ width: `${liveProg}%` }} /></div><div className="lb"><span className="state" style={{ color: "var(--dim)" }}>Moves on by itself. Tap Next if you are done early.</span><button className="btn" type="button" onClick={nextPrompt}>{liveIdx + 1 >= prompts.length ? "Finish" : "Next"}</button></div></div>
        </div>
      ) : null}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
