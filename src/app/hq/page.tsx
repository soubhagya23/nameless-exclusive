import Link from "next/link";
import { listClients } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function HQHome() {
  const clients = await listClients();
  const sb = supabaseAdmin();
  const ids = clients.map((c) => c.id);
  const [{ data: answers }, { data: recs }, { data: rounds }] = ids.length
    ? await Promise.all([sb.from("card_answers").select("client_id, round_id").in("client_id", ids), sb.from("recordings").select("client_id, kind, transcript_status, round_id").in("client_id", ids), sb.from("rounds").select("id, client_id, number, title, status, config, shoot_date").in("client_id", ids)])
    : [{ data: [] }, { data: [] }, { data: [] }];
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
          const live = (rounds || []).filter((x) => x.client_id === c.id).sort((a, b) => b.number - a.number).find((x) => x.status === "live") || (rounds || []).filter((x) => x.client_id === c.id).sort((a, b) => b.number - a.number)[0];
          const total = live ? ((live.config as { cards?: unknown[] }).cards || []).length : 0;
          const n = (answers || []).filter((a) => a.client_id === c.id && (!live || a.round_id === live.id)).length;
          const r = (recs || []).filter((x) => x.client_id === c.id && (!live || x.round_id === live.id));
          const drive = r.find((x) => x.kind === "drive");
          return (
            <Link key={c.id} href={`/hq/${c.slug}`} className="tile">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="pill">{c.status}</span><span className="label" style={{ color: "var(--dim)" }}>{new Date(c.updated_at).toLocaleDateString("en-AU")}</span></div>
              <h3>{c.name}</h3>
              <div style={{ fontSize: 14 }}>{live ? `Round ${live.number}, ${live.title} (${live.status})` : "No round"} · Cards {n} / {total} · Drive {drive ? (drive.transcript_status === "done" ? "transcribed" : drive.transcript_status) : "not yet"}{live?.shoot_date ? ` · Shoot ${live.shoot_date}` : ""}</div>
              <span className="label" style={{ color: "var(--dim)" }}>{clientHost ? `${clientHost}/${c.slug}` : `/c/${c.slug}`}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
