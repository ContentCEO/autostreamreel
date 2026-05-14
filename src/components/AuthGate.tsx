"use client";

import { useEffect, useState } from "react";
import { AuthChallenge } from "@/components/AuthChallenge";

type Status = "checking" | "skipped" | "challenging" | "passed";

// Probes /api/auth/challenge first. If OWNER_NAME / OWNER_CODE aren't set
// on the server, immediately skips and renders the layout (no flash of an
// auth screen). Otherwise renders AuthChallenge until it passes.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("cc_authed") === "1") {
      setStatus("passed");
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/auth/challenge");
        const j = await r.json();
        if (!j.required) {
          sessionStorage.setItem("cc_authed", "1");
          setStatus("skipped");
        } else {
          setStatus("challenging");
        }
      } catch {
        sessionStorage.setItem("cc_authed", "1");
        setStatus("skipped");
      }
    })();
  }, []);

  if (status === "checking") {
    // Stay on black while we check — avoids the flash.
    return <div className="fixed inset-0 bg-black z-[200]" />;
  }
  if (status === "challenging") {
    return <AuthChallenge onPass={() => setStatus("passed")} />;
  }
  return (
    <div className="opacity-100 transition-opacity duration-500">
      {children}
    </div>
  );
}
