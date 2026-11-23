import { listTeam } from "@/lib/db";
import { hqUser } from "@/lib/supabase-server";
import TeamForm from "./team-form";
import { actionRemoveMember } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [team, user] = await Promise.all([listTeam(), hqUser()]);
  const env = (process.env.HQ_ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const hqHost = process.env.HQ_HOST ? `https://${process.env.HQ_HOST}` : "";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2>Team</h2>
        <span className="label" style={{ color: "var(--dim)" }}>Who can sign in to HQ. No passwords, they get a link by email.</span>
      </div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <h3>Add someone</h3>
        <TeamForm />
        <p className="label" style={{ color: "var(--dim)", marginTop: 12 }}>Then send them this: go to {hqHost || "HQ"}, type your email, open the link from the email on the same device. That is the whole login.</p>
      </div>
      <div className="panel">
        <h3>On the list · {team.length + env.length}</h3>
        <div className="rowlist">
          {env.map((e) => (
            <div key={e}><span className="pill">owner</span><div>{e}<span className="label" style={{ color: "var(--dim)", marginLeft: 8 }}>set in Vercel</span></div></div>
          ))}
          {team.map((m) => (
            <div key={m.id}>
              <span className="pill">{m.name}</span>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span>{m.email}</span>
                {m.email !== (user?.email || "").toLowerCase() ? <form action={actionRemoveMember.bind(null, m.id)}><button className="btn link" type="submit" style={{ fontSize: 11 }}>Remove</button></form> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
