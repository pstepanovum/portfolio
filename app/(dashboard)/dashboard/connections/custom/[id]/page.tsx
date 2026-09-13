import { notFound } from "next/navigation";
import { CustomMcpApp } from "@/components/admin/custom-mcp-app";
import { getCustomMcpServer } from "@/lib/connections/custom-mcp";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function CustomMcpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const server = await getCustomMcpServer(id);

  if (!server) {
    notFound();
  }

  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const notice = first(query.connected)
    ? `Connected ${first(query.connected)}.`
    : first(query.error) ?? null;

  return <CustomMcpApp initial={server} initialNotice={notice} />;
}
