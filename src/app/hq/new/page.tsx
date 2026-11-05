import ClientForm from "../client-form";
import { defaultConfig, jatinConfig } from "@/lib/templates";

export default function NewClient({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return <NewClientInner searchParams={searchParams} />;
}

async function NewClientInner({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const cfg = sp.t === "jatin" ? jatinConfig : defaultConfig;
  const preset = sp.t === "jatin" ? { name: "Jatin Mehta", first_name: "Jatin", slug: "jatin", wa_number: "61473251606", portrait_url: "https://thenameless.studio/wp-content/uploads/2026/11/jatin-mehta-exclusive.webp" } : {};
  return (
    <div>
      <h2 style={{ marginBottom: 6 }}>New client</h2>
      <p className="label" style={{ color: "var(--dim)", marginBottom: 20 }}>Start from the <a href="/hq/new">default template</a> or <a href="/hq/new?t=jatin">Jatin&apos;s set</a>. Edit the cards for the person before you send the link.</p>
      <ClientForm clientId={null} initial={{ ...preset, config: JSON.stringify(cfg, null, 2) }} />
    </div>
  );
}
