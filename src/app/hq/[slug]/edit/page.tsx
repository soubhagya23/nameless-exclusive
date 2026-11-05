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
      <h2 style={{ marginBottom: 20 }}>Edit {client.first_name}&apos;s page</h2>
      <ClientForm clientId={client.id} initial={{ name: client.name, first_name: client.first_name, slug: client.slug, wa_number: client.wa_number || "", portrait_url: client.portrait_url || "", config: JSON.stringify(client.config, null, 2) }} />
    </div>
  );
}
