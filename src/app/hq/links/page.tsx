import Link from "next/link";
import { listClients, listLinks } from "@/lib/db";
import LinkForm from "./link-form";
import LinksList from "./links-list";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const [links, clients] = await Promise.all([listLinks(), listClients()]);
  const groups = [
    { id: null as string | null, name: "Agency", slug: "" },
    ...clients.map((c) => ({ id: c.id as string | null, name: c.name, slug: c.slug })),
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2>Links</h2>
        <span className="label" style={{ color: "var(--dim)" }}>Every Drive folder and shared link, in one place. {links.length} so far.</span>
      </div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <h3>Add a link</h3>
        <LinkForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} back="/hq/links" />
      </div>
      {groups.map((g) => {
        const mine = links.filter((l) => l.client_id === g.id);
        if (!mine.length && g.id) return null;
        return (
          <div key={g.id || "agency"} className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h3>{g.name}</h3>
              {g.slug ? <Link className="label" href={`/hq/${g.slug}`} style={{ color: "var(--dim)" }}>open client</Link> : null}
            </div>
            <LinksList links={mine} back="/hq/links" />
          </div>
        );
      })}
    </div>
  );
}
