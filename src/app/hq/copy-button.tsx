"use client";

import { useState } from "react";

/** Copies a ready message to the clipboard, and offers a wa.me link as the fallback. */
export default function CopyButton({ text, label = "Copy message", waNumber, small = true }: { text: string; label?: string; waNumber?: string | null; small?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { window.prompt("Copy this:", text); }
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className={`btn ghost ${small ? "small" : ""}`} onClick={copy}>{done ? "Copied" : label}</button>
      {waNumber ? <a className={`btn ${small ? "small" : ""}`} href={`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">Open WhatsApp</a> : null}
    </span>
  );
}
