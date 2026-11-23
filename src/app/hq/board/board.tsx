"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "@/lib/types";
import { actionAddTask, actionUpdateTask, actionMoveTask, actionDeleteTask } from "./actions";

type ClientOpt = { id: string; name: string; slug: string };
const COLS: { key: TaskStatus; title: string; hint: string }[] = [
  { key: "todo", title: "To do", hint: "Agreed, not started" },
  { key: "doing", title: "In progress", hint: "Someone is on it" },
  { key: "review", title: "Review", hint: "Needs eyes before it goes out" },
  { key: "done", title: "Done", hint: "Out the door" },
];

function dueWord(due: string | null) {
  if (!due) return "";
  const d = new Date(due + "T00:00:00"); const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 864e5);
  if (days < 0) return `${-days} d late`; if (days === 0) return "today"; if (days === 1) return "tomorrow"; if (days < 7) return `in ${days} d`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function Board({ initial, clients, team, myName }: { initial: Task[]; clients: ClientOpt[]; team: string[]; myName: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterWho, setFilterWho] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ col: TaskStatus; index: number } | null>(null);
  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [open, setOpen] = useState<Task | null>(null);
  const [err, setErr] = useState("");
  const [, start] = useTransition();

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "";
  const visible = useMemo(() => tasks.filter((t) => (!filterClient || (filterClient === "none" ? !t.client_id : t.client_id === filterClient)) && (!filterWho || t.assignee.toLowerCase() === filterWho.toLowerCase())), [tasks, filterClient, filterWho]);
  const byCol = (col: TaskStatus) => visible.filter((t) => t.status === col).sort((a, b) => a.position - b.position);

  function drop(col: TaskStatus, index: number) {
    if (!dragId) return;
    const moving = tasks.find((t) => t.id === dragId); if (!moving) return;
    const colList = tasks.filter((t) => t.status === col && t.id !== dragId).sort((a, b) => a.position - b.position);
    const idx = Math.max(0, Math.min(index, colList.length));
    const ordered = [...colList.slice(0, idx), { ...moving, status: col }, ...colList.slice(idx)];
    const ids = ordered.map((t) => t.id);
    setTasks((all) => all.map((t) => { const k = ids.indexOf(t.id); return k === -1 ? t : { ...t, status: col, position: k + 1 }; }));
    setDragId(null); setOver(null);
    start(async () => { try { await actionMoveTask(dragId, col, ids); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); router.refresh(); } });
  }
  function add(col: TaskStatus) {
    const title = newTitle.trim(); if (!title) { setAdding(null); return; }
    setNewTitle(""); setAdding(null);
    start(async () => {
      try { const t = (await actionAddTask({ title, status: col, client_id: filterClient && filterClient !== "none" ? filterClient : null, assignee: filterWho || "" })) as Task; setTasks((all) => [...all, t]); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    });
  }
  function save(t: Task, patch: Partial<Task>) {
    setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    if (open?.id === t.id) setOpen({ ...t, ...patch });
    start(async () => { try { await actionUpdateTask(t.id, patch); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); router.refresh(); } });
  }
  function remove(t: Task) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    setTasks((all) => all.filter((x) => x.id !== t.id)); setOpen(null);
    start(async () => { try { await actionDeleteTask(t.id); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); router.refresh(); } });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="pill" style={{ padding: "6px 10px" }}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="none">Agency only</option>
        </select>
        <span style={{ display: "inline-flex", gap: 6 }}>
          <button type="button" className={`pill ${filterWho === "" ? "yes" : ""}`} onClick={() => setFilterWho("")}>Everyone</button>
          {myName ? <button type="button" className={`pill ${filterWho === myName ? "yes" : ""}`} onClick={() => setFilterWho(myName)}>Mine</button> : null}
          {team.filter((n) => n !== myName).map((n) => <button key={n} type="button" className={`pill ${filterWho === n ? "yes" : ""}`} onClick={() => setFilterWho(n)}>{n}</button>)}
        </span>
        {err ? <span className="notice err" style={{ padding: "6px 10px" }}>{err} <button className="btn link" type="button" onClick={() => setErr("")}>ok</button></span> : null}
      </div>

      <div className="board">
        {COLS.map((col) => {
          const list = byCol(col.key);
          return (
            <div key={col.key} className={`bcol ${over?.col === col.key ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); if (!over || over.col !== col.key) setOver({ col: col.key, index: list.length }); }}
              onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); drop(col.key, over?.col === col.key ? over.index : list.length); }}>
              <div className="bhead">
                <div><h3 style={{ margin: 0 }}>{col.title}</h3><span className="label" style={{ color: "var(--dim)" }}>{col.hint}</span></div>
                <span className="pill">{list.length}</span>
              </div>
              <div className="blist">
                {list.map((t, i) => (
                  <div key={t.id}>
                    {over?.col === col.key && over.index === i && dragId !== t.id ? <div className="bslot" /> : null}
                    <div className={`bcard ${dragId === t.id ? "ghost" : ""}`} draggable
                      onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const before = e.clientY < r.top + r.height / 2; setOver({ col: col.key, index: before ? i : i + 1 }); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(col.key, over?.col === col.key ? over.index : i); }}
                      onClick={() => setOpen(t)}>
                      <div className="btitle">{t.title}</div>
                      <div className="bmeta">
                        {t.client_id ? <span className="pill">{clientName(t.client_id)}</span> : null}
                        {t.assignee ? <span className="label">{t.assignee}</span> : <span className="label" style={{ color: "var(--dim)" }}>unassigned</span>}
                        {t.due ? <span className="label" style={{ color: dueWord(t.due).includes("late") || dueWord(t.due) === "today" ? "var(--red)" : "var(--dim)" }}>{dueWord(t.due)}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
                {over?.col === col.key && over.index >= list.length && dragId && !list.some((t) => t.id === dragId && over.index === list.length) ? <div className="bslot" /> : null}
                {adding === col.key ? (
                  <form onSubmit={(e) => { e.preventDefault(); add(col.key); }} className="bcard" style={{ cursor: "default" }}>
                    <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={() => add(col.key)} onKeyDown={(e) => { if (e.key === "Escape") { setNewTitle(""); setAdding(null); } }} placeholder="What needs doing" style={{ width: "100%", border: 0, borderBottom: "1px solid var(--line)", padding: "4px 0", font: "inherit", fontSize: 15, outline: "none", background: "transparent" }} />
                    <span className="label" style={{ color: "var(--dim)", marginTop: 6, display: "block" }}>Enter to add{filterClient && filterClient !== "none" ? ` for ${clientName(filterClient)}` : ""}{filterWho ? `, ${filterWho}` : ""}</span>
                  </form>
                ) : (
                  <button type="button" className="badd" onClick={() => { setAdding(col.key); setNewTitle(""); }}>+ Add a card</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open ? (
        <div className="bmodal" onClick={() => setOpen(null)}>
          <div className="panel" style={{ maxWidth: 560, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="form" style={{ display: "grid", gap: 12 }}>
              <label>Title<input value={open.title} onChange={(e) => setOpen({ ...open, title: e.target.value })} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== tasks.find((t) => t.id === open.id)?.title) save(open, { title: v }); }} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                <label>Client<select value={open.client_id || ""} onChange={(e) => save(open, { client_id: e.target.value || null })}><option value="">Agency</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Who<select value={team.includes(open.assignee) ? open.assignee : open.assignee ? "__other" : ""} onChange={(e) => { if (e.target.value === "__other") { const v = prompt("Name") || ""; save(open, { assignee: v }); } else save(open, { assignee: e.target.value }); }}><option value="">Unassigned</option>{team.map((n) => <option key={n} value={n}>{n}</option>)}<option value="__other">{open.assignee && !team.includes(open.assignee) ? open.assignee : "Someone else"}</option></select></label>
                <label>Due<input type="date" value={open.due || ""} onChange={(e) => save(open, { due: e.target.value || null })} /></label>
                <label>Column<select value={open.status} onChange={(e) => { const col = e.target.value as TaskStatus; const ids = [...tasks.filter((t) => t.status === col && t.id !== open.id).sort((a, b) => a.position - b.position).map((t) => t.id), open.id]; setTasks((all) => all.map((t) => (t.id === open.id ? { ...t, status: col, position: ids.length } : t))); setOpen({ ...open, status: col }); start(async () => { try { await actionMoveTask(open.id, col, ids); } catch (x) { setErr(x instanceof Error ? x.message : String(x)); } }); }}>{COLS.map((c) => <option key={c.key} value={c.key}>{c.title}</option>)}</select></label>
              </div>
              <label>Notes<textarea value={open.notes} onChange={(e) => setOpen({ ...open, notes: e.target.value })} onBlur={(e) => { if (e.target.value !== tasks.find((t) => t.id === open.id)?.notes) save(open, { notes: e.target.value }); }} rows={5} style={{ fontFamily: "inherit", fontSize: 15 }} placeholder="Links, what good looks like, who to ask" /></label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="label" style={{ color: "var(--dim)" }}>added by {open.created_by.split("@")[0] || "someone"}</span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button className="btn small ghost" type="button" onClick={() => remove(open)}>Delete</button>
                  <button className="btn small" type="button" onClick={() => setOpen(null)}>Close</button>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
