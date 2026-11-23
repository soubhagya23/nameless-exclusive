import { listClients, listTasks, teamNames } from "@/lib/db";
import { hqUser } from "@/lib/supabase-server";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const [tasks, clients, user] = await Promise.all([listTasks(), listClients(), hqUser()]);
  const me = (user?.email || "").split("@")[0];
  const team = teamNames();
  // Guess who I am on the board from my email, so "Mine" works without a settings page.
  const myName = team.find((n) => me.toLowerCase().includes(n.toLowerCase())) || "";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2>Board</h2>
        <span className="label" style={{ color: "var(--dim)" }}>{tasks.filter((t) => t.status !== "done").length} open · drag cards between columns</span>
      </div>
      <Board initial={tasks} clients={clients.map((c) => ({ id: c.id, name: c.first_name || c.name, slug: c.slug }))} team={team} myName={myName} />
    </div>
  );
}
