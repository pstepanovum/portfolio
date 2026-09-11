import { PlaidApp } from "@/components/admin/plaid-app";
import { getPlaidEnvironment, isPlaidConfigured } from "@/lib/connections/plaid";
import { isFromAnotherEnvironment, listPlaidItems } from "@/lib/connections/plaid-store";
import { getFinanceToolCatalog } from "@/lib/mcp/tool-catalog";

export const dynamic = "force-dynamic";

export default async function PlaidPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const configured = isPlaidConfigured();

  const items = configured ? await listPlaidItems() : [];
  const notice = first(query.linked)
    ? "Bank linked."
    : first(query.error) ?? null;

  return (
    <PlaidApp
      items={items}
      strandedIds={items.filter(isFromAnotherEnvironment).map((item) => item.id)}
      tools={getFinanceToolCatalog().map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        badge: tool.scope,
        destructive: tool.destructive,
      }))}
      environment={getPlaidEnvironment()}
      configured={configured}
      initialNotice={notice}
    />
  );
}
