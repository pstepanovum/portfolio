import { SecurityManager } from "@/components/admin/security-manager";
import { getMfaState } from "@/lib/auth/mfa";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession({ allowUnenrolled: true });
  const query = await searchParams;
  const state = await getMfaState(session.uid);
  const enroll = Array.isArray(query.enroll) ? query.enroll[0] : query.enroll;

  return <SecurityManager initialState={state} mustEnroll={enroll === "1" || !state.enrolled} email={session.email ?? "admin"} />;
}
