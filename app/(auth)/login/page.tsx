import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminShellClasses } from "@/components/admin/styles";
import { getAdminSession } from "@/lib/firebase/auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className={`${adminShellClasses} flex min-h-screen items-center px-6 py-16`}>
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 self-center">
          <div className="text-sm uppercase tracking-[0.25em] text-white/55">
            Welcome Back
          </div>
          <h1 className="max-w-2xl text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Let&apos;s keep your portfolio fresh, sharp, and ready for the next
            opportunity.
          </h1>
          <p className="max-w-xl text-lg text-white/65">
            Sign in to manage projects, certifications, timeline entries, resume
            access, contact messages, and AI-assisted content updates.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
