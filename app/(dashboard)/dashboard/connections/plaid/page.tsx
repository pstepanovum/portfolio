import { PlaidApp } from "@/components/admin/plaid-app";
import { getPlaidEnvironment, isPlaidConfigured } from "@/lib/connections/plaid";
import { isFromAnotherEnvironment, listPlaidItems } from "@/lib/connections/plaid-store";
import { getFinanceToolCatalog } from "@/lib/mcp/tool-catalog";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function PlaidPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

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
