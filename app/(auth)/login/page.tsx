import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminShellClasses } from "@/components/admin/styles";
import { AdminThemeScript } from "@/components/admin/theme-script";
import { getAdminSession } from "@/lib/firebase/auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

/**
 * Only same-site paths may be used as a post-login destination, so the `next`
 * parameter cannot be turned into an open redirect. Protocol-relative values
 * ("//evil.com") and backslash variants are rejected alongside absolute URLs.
 */
function resolveSafeNextPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string" || !candidate.startsWith("/")) {
    return null;
  }

  if (candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return null;
  }

  return candidate;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = resolveSafeNextPath(params.next);
  const session = await getAdminSession();

  if (session) {
    redirect(nextPath ?? "/dashboard");
  }

  return (
    <main className={`${adminShellClasses} flex min-h-screen items-center px-6 py-16`}>
      <AdminThemeScript />
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 self-center">
          <div className="text-sm uppercase tracking-[0.25em] text-admin-muted">
            Welcome Back
          </div>
          <h1 className="max-w-2xl text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Let&apos;s keep your portfolio fresh, sharp, and ready for the next
            opportunity.
          </h1>
          <p className="max-w-xl text-lg text-admin-muted">
            Sign in to manage projects, certifications, timeline entries, resume
            access, contact messages, and AI-assisted content updates.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
