"use client";

import Image from "next/image";

export default function StashPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <Image
        src="/stash/logo.svg"
        alt="Stash"
        width={120}
        height={120}
        priority
      />
      <a
        href="/stash/Stash_0.1.0_aarch64.dmg"
        download
        className="px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm tracking-wide hover:opacity-80 transition-opacity"
      >
        Download Stash
      </a>
    </main>
  );
}
