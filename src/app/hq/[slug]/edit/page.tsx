import { notFound } from "next/navigation";
import { getClientBySlug } from "@/lib/db";
import ClientForm from "../../client-form";

export const dynamic = "force-dynamic";

export default async function EditClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Edit {client.first_name}</h2>
      <p className="label" style={{ color: "var(--dim)", marginBottom: 20 }}>Name, link, portrait. The cards and prompts live on each round; edit those from his page in HQ.</p>
      <ClientForm clientId={client.id} initial={{ name: client.name, first_name: client.first_name, slug: client.slug, wa_number: client.wa_number || "", portrait_url: client.portrait_url || "", area: client.config.area || "", akshayName: client.config.akshayName || "Akshay" }} />
    </div>
  );
}
