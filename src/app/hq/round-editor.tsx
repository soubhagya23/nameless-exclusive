"use client";

import { useState } from "react";
import type { RoundConfig, RoundKind, Card, Prompt, Reference } from "@/lib/types";
import { slugify } from "@/lib/templates";

/**
 * Visual editor for a round: cards, drive prompts, shoot day options.
 * Keeps its state as a RoundConfig and writes it into a hidden field named "round" for the server action.
 */
export default function RoundEditor({ initial, kind = "shoot" }: { initial: RoundConfig; kind?: RoundKind }) {
  const [cfg, setCfg] = useState<RoundConfig>({ ...initial, cards: [...initial.cards], prompts: [...initial.prompts], shootOptions: [...initial.shootOptions], photoAsks: [...(initial.photoAsks || [])], references: [...(initial.references || [])] });
  const isQ = kind === "questionnaire";
  const refs = cfg.references || [];
  function setRef(i: number, patch: Partial<Reference>) { const references = [...refs]; references[i] = { ...references[i], ...patch }; set({ references }); }
  const [newDay, setNewDay] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const set = (patch: Partial<RoundConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const move = <T,>(arr: T[], i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; };

  function setCard(i: number, patch: Partial<Card>) { const cards = [...cfg.cards]; cards[i] = { ...cards[i], ...patch }; set({ cards }); }
  function addCard() { set({ cards: [...cfg.cards, { id: `card-${cfg.cards.length + 1}-${Date.now().toString(36).slice(-3)}`, claim: "", why: "", kind: isQ ? undefined : "question" }] }); }
  function setPrompt(i: number, patch: Partial<Prompt>) { const prompts = [...cfg.prompts]; prompts[i] = { ...prompts[i], ...patch }; set({ prompts }); }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="round" value={JSON.stringify(cfg)} readOnly />

      <div className="panel form">
        <h3>Opening lines</h3>
        <label>Line under his name (the lede)<input value={cfg.lede || ""} onChange={(e) => set({ lede: e.target.value })} /></label>
        <label>{isQ ? "Line above the cards" : "Line above the questions (if any)"}<input value={cfg.intro || ""} onChange={(e) => set({ intro: e.target.value })} /></label>
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{isQ ? "Cards" : "Questions for him"} · {cfg.cards.length}</h3>
          <button className="btn small" type="button" onClick={addCard}>{isQ ? "Add a card" : "Add a question"}</button>
        </div>
        <p style={{ fontSize: 14, marginBottom: 14 }}>{isQ ? "Two kinds. A statement he taps This is me or Not quite on, with a voice note if he wants. Or a question he answers in his voice. Keep each under 25 words." : "What we need to know for this shoot. A question he answers in his voice, or a statement he taps. Start with his day in the week of the shoot. Leave empty if the drive covers it."}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {cfg.cards.map((c, i) => (
            <div key={i} className="form" style={{ border: "1px solid var(--line)", padding: 14, background: "var(--grey)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="label" style={{ color: "var(--dim)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span>Card {String(i + 1).padStart(2, "0")} · id <code style={{ fontFamily: "inherit" }}>{c.id}</code></span>
                  <span style={{ display: "inline-flex", border: "1px solid var(--line)" }}>
                    <button type="button" className="btn small" style={{ background: c.kind === "question" ? "transparent" : "var(--ink)", color: c.kind === "question" ? "var(--ink)" : "#fff", border: 0 }} onClick={() => setCard(i, { kind: undefined })}>Statement</button>
                    <button type="button" className="btn small" style={{ background: c.kind === "question" ? "var(--ink)" : "transparent", color: c.kind === "question" ? "#fff" : "var(--ink)", border: 0 }} onClick={() => setCard(i, { kind: "question" })}>Question</button>
                  </span>
                </span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn small ghost" type="button" onClick={() => set({ cards: move(cfg.cards, i, -1) })} disabled={i === 0}>Up</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ cards: move(cfg.cards, i, 1) })} disabled={i === cfg.cards.length - 1}>Down</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ cards: cfg.cards.filter((_, k) => k !== i) })}>Remove</button>
                </span>
              </div>
              <label>{c.kind === "question" ? "The question" : "The claim"}<input value={c.claim} onChange={(e) => setCard(i, { claim: e.target.value, id: c.id.startsWith("card-") && !c.clip ? slugify(e.target.value).split("-").slice(0, 3).join("-") || c.id : c.id })} placeholder={c.kind === "question" ? "Walk us through a normal working day, start to finish." : "Six months from now, when someone in the West talks real estate, your name comes up first."} /></label>
              <label>{c.kind === "question" ? "A nudge under it" : "Why it matters (small line under it)"}<input value={c.why} onChange={(e) => setCard(i, { why: e.target.value })} placeholder={c.kind === "question" ? "Where you are at 7, at 11, at 4. Where the day actually goes." : "That is the whole job. Recall, then trust."} /></label>
              <label>Akshay asking it, audio URL (optional)<input value={c.clip || ""} onChange={(e) => setCard(i, { clip: e.target.value })} placeholder="https://thenameless.studio/wp-content/uploads/…/card-name.m4a" /></label>
            </div>
          ))}
        </div>
      </div>

      {!isQ ? (
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Drive and talk · {cfg.prompts.length} prompts</h3>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="label" style={{ color: "var(--dim)", display: "flex", gap: 6, alignItems: "center" }}>Seconds each<input type="number" min={20} max={300} value={cfg.secondsPerPrompt || 90} onChange={(e) => set({ secondsPerPrompt: Number(e.target.value) })} style={{ width: 70, font: "inherit", padding: "6px 8px", border: "1px solid var(--line)" }} /></label>
            <button className="btn small" type="button" onClick={() => set({ prompts: [...cfg.prompts, { q: "", h: "" }] })}>Add a prompt</button>
          </span>
        </div>
        <p style={{ fontSize: 14, marginBottom: 14 }}>Shown one at a time, big type, while he records one continuous take. No prompts means no drive section on his page.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {cfg.prompts.map((p, i) => (
            <div key={i} className="form" style={{ border: "1px solid var(--line)", padding: 14, background: "var(--grey)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="label" style={{ color: "var(--dim)" }}>Prompt {i + 1}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn small ghost" type="button" onClick={() => set({ prompts: move(cfg.prompts, i, -1) })} disabled={i === 0}>Up</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ prompts: move(cfg.prompts, i, 1) })} disabled={i === cfg.prompts.length - 1}>Down</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ prompts: cfg.prompts.filter((_, k) => k !== i) })}>Remove</button>
                </span>
              </div>
              <label>The prompt (big)<input value={p.q} onChange={(e) => setPrompt(i, { q: e.target.value })} placeholder="A deal that got difficult." /></label>
              <label>The nudge (small, under it)<input value={p.h} onChange={(e) => setPrompt(i, { h: e.target.value })} placeholder="What was at stake, what you did, what happened." /></label>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {!isQ ? (
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Content references · {refs.length}</h3>
          <button className="btn small" type="button" onClick={() => set({ references: [...refs, { title: "", url: "", note: "" }] })}>Add a reference</button>
        </div>
        <p style={{ fontSize: 14, marginBottom: 14 }}>What we are going for on this shoot. A reel link, an image link, a Drive folder. He sees them under "What we are going for", nothing to do, just to watch. Instagram links open in his app.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {refs.map((r, i) => (
            <div key={i} className="form" style={{ border: "1px solid var(--line)", padding: 14, background: "var(--grey)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="label" style={{ color: "var(--dim)" }}>Reference {i + 1}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn small ghost" type="button" onClick={() => set({ references: move(refs, i, -1) })} disabled={i === 0}>Up</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ references: move(refs, i, 1) })} disabled={i === refs.length - 1}>Down</button>
                  <button className="btn small ghost" type="button" onClick={() => set({ references: refs.filter((_, k) => k !== i) })}>Remove</button>
                </span>
              </div>
              <label>Link<input value={r.url} onChange={(e) => setRef(i, { url: e.target.value })} placeholder="https://www.instagram.com/reel/…" inputMode="url" /></label>
              <label>What it is (big line)<input value={r.title} onChange={(e) => setRef(i, { title: e.target.value })} placeholder="The walk-and-talk pace we want" /></label>
              <label>Why (small line, optional)<input value={r.note || ""} onChange={(e) => setRef(i, { note: e.target.value })} placeholder="Watch how he never looks at the lens. That is the energy." /></label>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      <div className="panel">
        <h3>Photos to ask for</h3>
        <p style={{ fontSize: 14, marginBottom: 12 }}>Each one becomes a card with a camera button. {isQ ? '"A photo of your desk at the office".' : '"A photo of the listing we will film at".'} Leave empty to skip.</p>
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          {cfg.photoAsks.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={d} onChange={(e) => { const photoAsks = [...cfg.photoAsks]; photoAsks[i] = e.target.value; set({ photoAsks }); }} style={{ flex: 1, font: "inherit", fontSize: 15, padding: "10px 12px", border: "1px solid var(--line)" }} />
              <button className="btn small ghost" type="button" onClick={() => set({ photoAsks: cfg.photoAsks.filter((_, k) => k !== i) })}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} placeholder="A photo of ..." style={{ font: "inherit", fontSize: 15, padding: "10px 12px", border: "1px solid var(--line)", minWidth: 260 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newPhoto.trim()) { set({ photoAsks: [...cfg.photoAsks, newPhoto.trim()] }); setNewPhoto(""); } } }} />
          <button className="btn small ghost" type="button" onClick={() => { if (newPhoto.trim()) { set({ photoAsks: [...cfg.photoAsks, newPhoto.trim()] }); setNewPhoto(""); } }}>Add</button>
        </div>
      </div>

      {!isQ ? (
      <div className="panel">
        <h3>Shoot day options</h3>
        <p style={{ fontSize: 14, marginBottom: 12 }}>He taps all that could work. Leave empty if you already have the date.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {cfg.shootOptions.map((d, i) => (
            <span key={i} className="pill" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>{d}<button type="button" onClick={() => set({ shootOptions: cfg.shootOptions.filter((_, k) => k !== i) })} style={{ border: 0, background: "none", padding: 0, fontSize: 14, lineHeight: 1 }} aria-label={`Remove ${d}`}>×</button></span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newDay} onChange={(e) => setNewDay(e.target.value)} placeholder="Sat 15 Nov" style={{ font: "inherit", fontSize: 15, padding: "10px 12px", border: "1px solid var(--line)", minWidth: 180 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newDay.trim()) { set({ shootOptions: [...cfg.shootOptions, newDay.trim()] }); setNewDay(""); } } }} />
          <button className="btn small ghost" type="button" onClick={() => { if (newDay.trim()) { set({ shootOptions: [...cfg.shootOptions, newDay.trim()] }); setNewDay(""); } }}>Add day</button>
        </div>
      </div>
      ) : null}
    </div>
  );
}
