import ClientForm from "../client-form";
import { setsFor } from "@/lib/templates";

export default async function NewClient({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const jatin = sp.t === "jatin";
  const akshay = sp.t === "akshay";
  const preset = jatin
    ? { name: "Jatin Mehta", first_name: "Jatin", slug: "jatin", wa_number: "61473251606", area: "Melbourne North and West", portrait_url: "https://thenameless.studio/wp-content/uploads/2026/11/jatin-mehta-exclusive.webp" }
    : akshay
      ? { name: "Akshay Verma", first_name: "Akshay", slug: "akshay", wa_number: "61473251606", area: "Melbourne", akshayName: "Soubh" }
      : {};
  return (
    <div>
      <h2 style={{ marginBottom: 6 }}>New client</h2>
      <p className="label" style={{ color: "var(--dim)", marginBottom: 20 }}>Start from the <a href="/hq/new">default handshake</a>, <a href="/hq/new?t=jatin">Jatin&apos;s set</a> or <a href="/hq/new?t=akshay">Akshay&apos;s own set</a>. Edit the cards for the person before you send the link.</p>
      <ClientForm clientId={null} initial={preset} round={setsFor(jatin ? "jatin" : akshay ? "akshay" : "").questionnaire} />
    </div>
  );
}
