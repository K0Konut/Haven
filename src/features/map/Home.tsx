import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadEmergencyContact,
  type EmergencyContact,
} from "../../services/emergency/contact";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";

export default function Home() {
  const navigate = useNavigate();
  const fix = useLocationStore((s) => s.fix);

  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadEmergencyContact();
      if (c) setContact(c);
    })();
  }, []);

  async function handleSos() {
    setStatus(null);
    if (!contact) {
      setStatus("⚠️ Aucun contact d'urgence configuré. Définis-le dans Réglages.");
      return;
    }

    setLoading(true);
    try {
      await sendEmergencyEmail({ contact, currentLocation: fix ?? null });
      setStatus("✅ SOS envoyé (email).");
    } catch (e) {
      console.error(e);
      setStatus("❌ Erreur envoi SOS. Vérifie la configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">👋 Bonjour !</h2>
        <p className="text-sm text-zinc-400">Prêt pour une balade ?</p>
      </header>

      <button
        onClick={() => navigate("/map")}
        className="w-full rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-4 text-sm font-semibold text-sky-200 hover:bg-sky-500/15"
      >
        🚴 Nouvelle balade
      </button>

      {/* Emergency card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">🆘 Contact d’urgence</div>
            <div className="text-xs text-zinc-400">Envoie un email d’alerte avec ta position</div>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="rounded-xl border border-zinc-800 bg-transparent px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Modifier
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
          {contact ? (
            <div className="space-y-1">
              <div className="text-sm text-zinc-100">{contact.email}</div>
              <div className="text-xs text-zinc-400">{contact.message}</div>
            </div>
          ) : (
            <div className="text-xs text-zinc-400">Aucun contact enregistré — configure-le dans Réglages.</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSos}
            disabled={!contact || loading}
            className="flex-1 rounded-xl border border-rose-600 bg-rose-600/10 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-600/20 disabled:opacity-50"
          >
            🔴 SOS — Envoyer alerte
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="rounded-xl border border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ⚙️ Réglages
          </button>
        </div>

        {status && <div className="text-xs text-zinc-300">{status}</div>}

        <div className="text-[11px] text-zinc-500">
          Position actuelle : <span className="text-zinc-300">{fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : "—"}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-100">📊 Vos statistiques</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-center">
            <div className="text-lg font-bold text-zinc-100">12.5</div>
            <div className="text-xs text-zinc-400">km</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-center">
            <div className="text-lg font-bold text-zinc-100">45</div>
            <div className="text-xs text-zinc-400">min</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-center">
            <div className="text-lg font-bold text-zinc-100">3</div>
            <div className="text-xs text-zinc-400">trajets</div>
          </div>
        </div>
      </div>
    </section>
  );
}
