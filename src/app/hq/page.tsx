import Link from "next/link";
import { listClients, shootStage } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Round, RoundConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

function ago(iso: string) { const h = (Date.now() - new Date(iso).getTime()) / 36e5; if (h < 1) return "just now"; if (h < 48) return `${Math.round(h)} h ago`; return `${Math.round(h / 24)} days ago`; }

export default async function HQHome() {
  const clients = await listClients();
  const sb = supabaseAdmin();
  const ids = clients.map((c) => c.id);
  const [{ data: answers }, { data: recs }, { data: rounds }, { data: asks }, { data: events }] = ids.length
    ? await Promise.all([
        sb.from("card_answers").select("client_id, round_id").in("client_id", ids),
        sb.from("recordings").select("client_id, kind, round_id").in("client_id", ids),
        sb.from("rounds").select("*").in("client_id", ids),
        sb.from("asks").select("client_id, status").in("client_id", ids),
        sb.from("events").select("client_id, type, created_at").in("client_id", ids).order("created_at", { ascending: false }).limit(500),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const clientHost = process.env.CLIENT_HOST;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h2>Clients</h2>
        <span className="label" style={{ color: "var(--dim)" }}>{clients.length} on the books</span>
      </div>
      {!clients.length ? <div className="notice">No clients yet. <Link href="/hq/new">Add the first one.</Link></div> : null}
      <div className="hq-grid">
        {clients.map((c) => {
          const mine = ((rounds || []) as Round[]).filter((x) => x.client_id === c.id).sort((a, b) => a.number - b.number);
          const shoots = mine.filter((x) => x.kind !== "questionnaire" && x.number !== 0);
          const qr = mine.find((x) => x.kind === "questionnaire" || x.number === 0);
          const cur = shoots.find((x) => x.status === "live") || [...shoots].reverse().find((x) => x.plan_status && x.plan_status !== "none" && x.status !== "done") || (qr && qr.status !== "done" ? qr : null) || shoots[shoots.length - 1] || qr;
          const curLabel = cur ? (cur.kind === "questionnaire" || cur.number === 0 ? "Questionnaire" : `Shoot ${cur.number}`) : "";
          const cfg = (cur?.config || {}) as Partial<RoundConfig>;
          const n = cur ? (answers || []).filter((a) => a.client_id === c.id && a.round_id === cur.id).length : 0;
          const hasDrive = cur ? (recs || []).some((x) => x.client_id === c.id && x.round_id === cur.id && x.kind === "drive") : false;
          const stage = cur ? shootStage({ ...cur, config: { cards: cfg.cards || [], prompts: cfg.prompts || [], shootOptions: [], photoAsks: [] }, plan: cur.plan || {}, plan_status: cur.plan_status || "none", checklist_done: [] } as Round, n, hasDrive) : null;
          const open = (asks || []).filter((a) => a.client_id === c.id && a.status === "open").length;
          const last = (events || []).find((e) => e.client_id === c.id && !["shoot_sent", "questionnaire_sent", "shoot_drafted", "shoot_done", "plan_sent", "asked", "client_created"].includes(e.type));
          const quiet = cur?.sent_at && stage === "live" && n === 0 ? (Date.now() - new Date(cur.sent_at).getTime()) / 36e5 : 0;
          const amber = quiet >= 48;
          return (
            <Link key={c.id} href={`/hq/${c.slug}`} className="tile" style={amber ? { borderColor: "#c77d00" } : undefined}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span className={`pill ${stage === "live" || stage === "answered" ? "ok" : ""}`}>{cur ? `${curLabel} · ${stage}` : "nothing yet"}</span>
                <span className="label" style={{ color: amber ? "#8a5600" : "var(--dim)" }}>{amber ? `quiet ${Math.round(quiet / 24)} days` : last ? ago(last.created_at) : "no activity"}</span>
              </div>
              <h3>{c.name}</h3>
              <div style={{ fontSize: 14 }}>Cards {n} / {(cfg.cards || []).length}{(cfg.prompts || []).length ? ` · Drive ${hasDrive ? "in" : "not yet"}` : ""}{open ? ` · ${open} open question${open === 1 ? "" : "s"}` : ""}{cur?.plan?.date ? ` · ${cur.plan.date}` : ""}</div>
              <span className="label" style={{ color: "var(--dim)" }}>{clientHost ? `${clientHost}/${c.slug}` : `/c/${c.slug}`}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
