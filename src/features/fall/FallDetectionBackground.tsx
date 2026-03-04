import { useRef } from "react";
import { useFallDetection } from "./useFallDetection";
import { useFallStore } from "../../store/fall.slice";
import { loadEmergencyContact } from "../../services/emergency/contact";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";

export default function FallDetectionBackground() {
  const config = useFallStore((s) => s.config);
  const countdownActive = useFallStore((s) => s.countdownActive);
  const countdownSec = useFallStore((s) => s.countdownSec);
  const forceSendNow = useFallStore((s) => s.forceSendNow);
  const cancelCountdown = useFallStore((s) => s.cancelCountdown);

  const fix = useLocationStore((s) => s.fix);

  const sendingRef = useRef(false);

  useFallDetection({
    countdownSeconds: config.countdownSeconds,
    warmupMs: config.warmupMs,
    cooldownMs: config.cooldownMs,
    minSampleHz: config.minSampleHz,
    onConfirmed: async () => {
      if (sendingRef.current) return;
      sendingRef.current = true;

      try {
        const contact = await loadEmergencyContact();
        if (!contact?.email) {
          alert("Aucun contact d’urgence configuré (Réglages).");
          return;
        }

        await sendEmergencyEmail({
          contact,
          currentLocation: fix ?? null,
        });
      } finally {
        setTimeout(() => {
          sendingRef.current = false;
        }, 1500);
      }
    },
  });

  if (!countdownActive) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
        <div className="text-lg font-bold text-zinc-100">Chute détectée</div>
        <div className="text-sm text-zinc-300">
          Envoi de l&apos;email dans <span className="font-bold text-sky-300">{countdownSec}s</span>
        </div>
        <div className="text-xs text-zinc-400">Si tout va bien, annule maintenant.</div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={cancelCountdown}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
          >
            Annuler
          </button>

          <button
            onClick={forceSendNow}
            className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
