"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actionAddMember } from "./actions";

export default function TeamForm() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const form = e.currentTarget;
    try { await actionAddMember(new FormData(form)); form.reset(); router.refresh(); } catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={onSubmit} className="form" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}>
        <label>Email (the one they will sign in with)<input name="email" type="email" required placeholder="name@gmail.com" /></label>
        <label>First name (shown on the board)<input name="name" required placeholder="Pranshee" /></label>
        <button className="btn small" type="submit" disabled={busy}>{busy ? "Adding" : "Add"}</button>
      </div>
      {err ? <div className="notice err">{err}</div> : null}
    </form>
  );
}
