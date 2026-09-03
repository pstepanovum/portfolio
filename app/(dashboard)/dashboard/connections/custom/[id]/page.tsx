import { notFound } from "next/navigation";
import { CustomMcpApp } from "@/components/admin/custom-mcp-app";
import { getCustomMcpServer } from "@/lib/connections/custom-mcp";

export const dynamic = "force-dynamic";

export default async function CustomMcpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await getCustomMcpServer(id);

  if (!server) {
    notFound();
  }

  return <CustomMcpApp initial={server} />;
}
