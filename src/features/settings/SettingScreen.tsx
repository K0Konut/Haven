import { useEffect, useMemo, useState } from "react";
import FallDetectionPanel from "../fall/FallDetectionPanel";
import FallDebugPanel from "../fall/FallDebugPanel";
import {
  loadEmergencyContact,
  saveEmergencyContact,
  clearEmergencyContact,
  type EmergencyContact,
} from "../../services/emergency/contact";
import emailjs from "@emailjs/browser";
import { useLocationStore } from "../../store/location.slice";
import { useFallStore } from "../../store/fall.slice";

const DEFAULT_MSG =
  "🚨 Haven : chute potentielle détectée. Si je ne réponds pas, peux-tu me contacter ?";

export default function SettingsScreen() {
  const fix = useLocationStore((s) => s.fix);
  const fallConfig = useFallStore((s) => s.config);
  const setFallConfig = useFallStore((s) => s.setConfig);

  const [contact, setContact] = useState<EmergencyContact>({
    email: "",
    message: DEFAULT_MSG,
  });
  const [status, setStatus] = useState<string | null>(null);

  // Vérification simple si l'email contient un '@'
  const emailOk = useMemo(() => contact.email.includes("@"), [contact.email]);

  useEffect(() => {
    (async () => {
      const saved = await loadEmergencyContact();
      if (saved) setContact(saved);
    })();
  }, []);

  async function handleSave() {
    setStatus(null);
    if (!contact.email.trim()) {
      setStatus("⚠️ Renseigne une adresse email.");
      return;
    }
    await saveEmergencyContact({
      email: contact.email.trim(),
      message: contact.message?.trim() || DEFAULT_MSG,
    });
    setStatus("✅ Contact enregistré.");
  }

  async function handleClear() {
    await clearEmergencyContact();
    setContact({ email: "", message: DEFAULT_MSG });
    setStatus("✅ Contact supprimé.");
  }

  async function handleTestEmail() {
    setStatus("⏳ Envoi du test...");
    const email = contact.email.trim();

    if (!emailOk) {
      setStatus("⚠️ Format d'email invalide.");
      return;
    }

    const templateParams = {
      to_email: email,
      message:
        (contact.message?.trim() || DEFAULT_MSG) + " (Ceci est un TEST)",
      location: fix ? `${fix.lat}, ${fix.lng}` : "Non disponible",
    };

    try {
      await emailjs.send(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        templateParams,
        "YOUR_PUBLIC_KEY"
      );
      setStatus("✅ Email de test envoyé !");
    } catch (error) {
      console.error("Erreur EmailJS:", error);
      setStatus("❌ Échec de l'envoi.");
    }
  }

  function applySensitivity(raw: number) {
    const sensitivity = Math.max(0, Math.min(100, raw));
    const t = sensitivity / 100;

    const impactG = Number((1.55 - 0.6 * t).toFixed(2));
    const impactGyroDps = Math.round(150 - 85 * t);
    const freefallG = Number((0.5 + 0.22 * t).toFixed(2));

    setFallConfig({
      sensitivity,
      impactG,
      impactGyroDps,
      freefallG,
    });
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Réglages</h1>
        <p className="text-sm text-zinc-400">
          Sécurité, capteurs et préférences.
        </p>
      </header>

      <FallDetectionPanel />
      <FallDebugPanel />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-100">
          Sensibilité détection de chute
        </div>
        <div className="text-xs text-zinc-400">
          Ajuste la sensibilité des capteurs (accélération, gravité, gyroscope).
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={fallConfig.sensitivity ?? 60}
            onChange={(e) => applySensitivity(Number(e.target.value))}
            className="w-full accent-sky-400"
          />

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Moins sensible</span>
            <span className="text-zinc-200 font-semibold">{fallConfig.sensitivity ?? 60}%</span>
            <span>Plus sensible</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-100">
          Contact d'urgence
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Email du contact</span>
          <input
            type="email"
            value={contact.email}
            onChange={(e) =>
              setContact((c) => ({ ...c, email: e.target.value }))
            }
            placeholder="exemple@monmail.com"
            className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Message d'alerte</span>
          <textarea
            value={contact.message}
            onChange={(e) =>
              setContact((c) => ({ ...c, message: e.target.value }))
            }
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Enregistrer
          </button>

          <button
            onClick={handleClear}
            className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Supprimer
          </button>
        </div>

        <button
          onClick={handleTestEmail}
          disabled={!emailOk}
          className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15 disabled:opacity-50"
        >
          Tester l'envoi d'email
        </button>

        {status && <div className="text-xs text-zinc-300">{status}</div>}

        <p className="text-xs text-zinc-500">
          L'alerte envoie un mail automatique à ton contact avec ta position
          GPS.
        </p>

        <div className="text-[11px] text-zinc-500">
          Position actuelle :{" "}
          <span className="text-zinc-300">
            {fix
              ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
