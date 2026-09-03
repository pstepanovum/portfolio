import { notFound } from "next/navigation";
import { CustomMcpApp } from "@/components/admin/custom-mcp-app";
import { getCustomMcpServer } from "@/lib/connections/custom-mcp";

export const dynamic = "force-dynamic";

export default async function CustomMcpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
