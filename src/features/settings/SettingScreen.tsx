import { useEffect, useMemo, useState } from "react";
import FallDetectionPanel from "../fall/FallDetectionPanel";
import FallDebugPanel from "../fall/FallDebugPanel";
import {
  loadEmergencyContacts,
  saveEmergencyContacts,
  clearEmergencyContacts,
  type EmergencyContact,
} from "../../services/emergency/contact";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";

const DEFAULT_MSG =
  "🚨 SoftRide: chute potentielle détectée. Si je ne réponds pas, peux-tu me contacter ?";

export default function SettingsScreen() {
  const fix = useLocationStore((s) => s.fix);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function isValidEmail(e?: string) {
    if (!e) return false;
    // simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  const emailOk = useMemo(() => isValidEmail(editing?.email), [editing]);

  useEffect(() => {
    (async () => {
      const saved = await loadEmergencyContacts();
      setContacts(saved);
      if (saved.length > 0) setEditing(saved[0]);
    })();
  }, []);

  async function persistContacts(list: EmergencyContact[]) {
    await saveEmergencyContacts(list);
    setContacts(list);
  }

  async function handleSave() {
    setStatus(null);
    if (!editing) return;
    if (!(editing.email ?? "").trim()) {
      setStatus("⚠️ Renseigne une adresse email.");
      return;
    }

    const cleaned: EmergencyContact = {
      id: editing.id ?? String(Date.now()),
      name: editing.name?.trim() || undefined,
      email: editing.email.trim(),
      message: editing.message?.trim() || DEFAULT_MSG,
      phone: editing.phone?.trim() || undefined,
    };

    const idx = contacts.findIndex((c) => c.id === cleaned.id);
    let next = [] as EmergencyContact[];
    if (idx >= 0) {
      next = [...contacts];
      next[idx] = cleaned;
    } else {
      next = [cleaned, ...contacts];
    }

    await persistContacts(next);
    setEditing(cleaned);
    setStatus("✅ Contact enregistré.");
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    const next = contacts.filter((c) => c.id !== id);
    await persistContacts(next);
    setStatus("✅ Contact supprimé.");
    if (next.length > 0) setEditing(next[0]);
    else setEditing({ email: "", message: DEFAULT_MSG });
  }

  async function handleClearAll() {
    await clearEmergencyContacts();
    setContacts([]);
    setEditing({ email: "", message: DEFAULT_MSG });
    setStatus("✅ Tous les contacts supprimés.");
  }

  async function handleTestEmail() {
    setStatus(null);
    const toTest = editing ?? contacts[0];
    if (!toTest || !(toTest.email ?? "").trim()) {
      setStatus("⚠️ Renseigne une adresse email avant de tester.");
      return;
    }

    const msg = (toTest.message?.trim() || DEFAULT_MSG) + "\n\n✅ Test SoftRide : ceci est un message de test (pas une vraie alerte).";

    try {
      await sendEmergencyEmail({ contact: { ...toTest, message: msg }, currentLocation: fix ?? null });
      setStatus("✅ Email envoyé avec succès !");
    } catch (error) {
      console.error("Erreur envoi email:", error);
      const msg = error instanceof Error ? error.message : String(error);
      setStatus(`❌ Erreur lors de l'envoi: ${msg}`);
    }
  }


  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Réglages</h1>
        <p className="text-sm text-zinc-400">Sécurité, capteurs et préférences.</p>
      </header>

      <FallDetectionPanel />
      <FallDebugPanel />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-100">Contacts d’urgence</div>
          <div className="text-xs text-zinc-400">Gère plusieurs contacts (nom, email, message)</div>
        </div>

        <div className="grid gap-2">
          {/* List of contacts */}
          <div className="space-y-2">
            {contacts.length === 0 && (
              <div className="text-xs text-zinc-400">Aucun contact enregistré.</div>
            )}

            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/20 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-zinc-100">{c.name ?? c.email}</div>
                  <div className="text-xs text-zinc-400">{c.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-xl border border-zinc-800 bg-transparent px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="rounded-xl border border-rose-700 bg-transparent px-3 py-1 text-xs text-rose-300 hover:bg-rose-900/10"
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={async () => {
                      setStatus(null);
                      try {
                        const msg = (c.message?.trim() || DEFAULT_MSG) + "\n\n✅ Test SoftRide : ceci est un message de test (pas une vraie alerte).";
                        await sendEmergencyEmail({ contact: { ...c, message: msg }, currentLocation: fix ?? null });
                        setStatus("✅ Email envoyé avec succès !");
                      } catch (err) {
                        console.error(err);
                        const m = err instanceof Error ? err.message : String(err);
                        setStatus(`❌ Erreur lors de l'envoi: ${m}`);
                      }
                    }}
                    className="rounded-xl border border-sky-500/30 bg-transparent px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/8"
                  >
                    Tester
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Nom</div>
            <input
              value={editing?.name ?? ""}
              onChange={(e) => setEditing((ed) => ({ ...(ed ?? { email: "", message: "" }), name: e.target.value } as EmergencyContact))}
              placeholder="Nom du contact (ex: Maman)"
              className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            />

            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Email</span>
              <input
                value={editing?.email ?? ""}
                onChange={(e) => setEditing((ed) => ({ ...(ed ?? { email: "", message: "" }), email: e.target.value } as EmergencyContact))}
                placeholder="exemple@email.com"
                className="w-full rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
              />
              {!isValidEmail(editing?.email) && (
                <div className="text-[11px] text-rose-400">Adresse email invalide</div>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Message</span>
              <textarea
                value={editing?.message ?? DEFAULT_MSG}
                onChange={(e) => setEditing((ed) => ({ ...(ed ?? { email: "", message: "" }), message: e.target.value } as EmergencyContact))}
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
                onClick={() => {
                  setEditing({ email: "", message: DEFAULT_MSG });
                }}
                className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                Nouveau
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTestEmail}
                disabled={!emailOk}
                className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15 disabled:opacity-50"
              >
                Tester l’alerte email (contact sélectionné)
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-zinc-500">L'alerte envoie automatiquement un email avec ta position (si dispo).</div>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                className="rounded-xl border border-rose-700 bg-transparent px-3 py-1 text-xs text-rose-300 hover:bg-rose-900/10"
              >
                Supprimer tout
              </button>
            </div>
          </div>

          {status && <div className="text-xs text-zinc-300">{status}</div>}

          <div className="text-[11px] text-zinc-500">
            Position actuelle : <span className="text-zinc-300">{fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
