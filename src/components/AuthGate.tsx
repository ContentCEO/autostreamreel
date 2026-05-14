"use client";

import { useState } from "react";
import { AuthChallenge } from "@/components/AuthChallenge";

// Client wrapper that gates the entire layout behind AuthChallenge until
// either it passes or the server reports no challenge is configured.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [passed, setPassed] = useState(false);
  return (
    <>
      {!passed && <AuthChallenge onPass={() => setPassed(true)} />}
      <div className={passed ? "opacity-100 transition-opacity duration-500" : "opacity-0 pointer-events-none"}>
        {children}
      </div>
    </>
  );
}
