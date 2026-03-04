import { useEffect, useState } from "react";
import { requestMotionPermission } from "../../services/permissions/motion";
import { useFallStore } from "../../store/fall.slice";
import { loadEmergencyContact } from "../../services/emergency/contact";

export default function FallDetectionPanel() {
  const enabled = useFallStore((s) => s.enabled);
  const setEnabled = useFallStore((s) => s.setEnabled);
  const status = useFallStore((s) => s.status);
  const conf = useFallStore((s) => s.lastConfidence);

  const [contactOk, setContactOk] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const c = await loadEmergencyContact();
      setContactOk(!!c?.email);
    })();
  }, []);

  async function toggle() {
    if (!enabled) {
      const perm = await requestMotionPermission();
      if (perm === "denied") {
        alert("Permission capteurs refusée. Active-la dans les réglages.");
        return;
      }
      const c = await loadEmergencyContact();
      setContactOk(!!c?.email);
      if (!c?.email) {
        alert("Configure un contact d’urgence dans Réglages avant d’activer.");
        return;
      }
    }
    setEnabled(!enabled);
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Détection de chute</div>
            <div className="text-xs text-zinc-400">
              Impact + immobilité • envoie un email au contact d’urgence
            </div>
            {!contactOk && (
              <div className="mt-1 text-xs text-amber-300">
                ⚠️ Aucun contact d’urgence configuré.
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className={`rounded-xl border px-3 py-2 text-xs ${enabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-zinc-800 bg-zinc-900 text-zinc-200"
              }`}
          >
            {enabled ? "Activé" : "Activer"}
          </button>
        </div>

        <div className="text-xs text-zinc-400">
          Statut: <span className="text-zinc-200">{status}</span>
          {enabled && (
            <>
              {" • "}mode: <span className="text-zinc-200">actif en fond (trajet inclus)</span>
            </>
          )}
          {conf != null && (
            <>
              {" • "}confiance:{" "}
              <span className="text-zinc-200">{Math.round(conf * 100)}%</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
