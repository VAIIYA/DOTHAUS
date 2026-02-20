"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export const InstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!installEvent) return null;

  return (
    <button
      onClick={async () => {
        await installEvent.prompt();
        const result = await installEvent.userChoice;
        if (result.outcome === "accepted") {
          setInstallEvent(null);
        }
      }}
      className="hidden sm:inline-flex items-center justify-center px-3 py-2 rounded-lg border border-neon-blue/40 text-neon-blue text-xs font-black uppercase tracking-wider"
    >
      Install App
    </button>
  );
};
