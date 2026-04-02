"use client";

import { useEffect } from "react";
import { initializeFirebaseAnalytics } from "@/lib/firebase/client";

export function FirebaseAnalytics() {
  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  return null;
}
