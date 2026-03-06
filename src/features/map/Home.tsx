import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadEmergencyContacts,
  type EmergencyContact,
} from "../../services/emergency/contact";
import { geocodeForward, type PlaceResult } from "../../services/mapbox/geocoding";
import MapView from "./MapView";
import {
  loadFavorites,
  addOrUpdateFavorite,
  removeFavorite,
  type Favorite,
} from "../../services/favorites";
import { saveNavSession, loadNavSession } from "../../services/navigation/persistence";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";
import { useStatsStore } from "../../store/stats.slice";

function formatLastRide(lastRide: { date: string; distanceMeters: number; durationSec: number } | null) {
  if (!lastRide) return null;
  const date = new Date(lastRide.date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let label = date.toLocaleDateString("fr-FR");
  if (date.toDateString() === today.toDateString()) label = "Aujourd'hui";
  else if (date.toDateString() === yesterday.toDateString()) label = "Hier";

  const km = (lastRide.distanceMeters / 1000).toFixed(1);
  const min = Math.round(lastRide.durationSec / 60);
  return `${label} • ${km} km • ${min} min`;
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Bonjour", emoji: "👋" };
  if (hour >= 12 && hour < 18) return { text: "Bonne après-midi", emoji: "☀️" };
  if (hour >= 18 && hour < 22) return { text: "Bonsoir", emoji: "🌆" };
  return { text: "Bonne nuit", emoji: "🌙" };
}

function getSubtitle(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Prêt pour une balade matinale ?";
  if (hour >= 12 && hour < 14) return "Une balade après le déjeuner ?";
  if (hour >= 14 && hour < 18) return "Prêt pour une balade ?";
  if (hour >= 18 && hour < 22) return "Une petite balade ce soir ?";
  return "Une balade nocturne ?";
}

export default function Home() {
  const navigate = useNavigate();
  const fix = useLocationStore((s) => s.fix);
  const { totalDistanceMeters, totalDurationSec, totalRides, lastRide } = useStatsStore();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showAddressPanel, setShowAddressPanel] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [favName, setFavName] = useState("");
  const [favStatus, setFavStatus] = useState<string | null>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionDest, setSessionDest] = useState<string | null>(null);

  const totalKm = (totalDistanceMeters / 1000).toFixed(1);
  const totalMin = Math.round(totalDurationSec / 60);
  const lastRideLabel = formatLastRide(lastRide);
  const greeting = getGreeting();

  useEffect(() => {
    (async () => {
      const c = await loadEmergencyContacts();
      setContacts(c);
      const fav = await loadFavorites();
      setFavorites(fav);
    })();
    const s = loadNavSession();
    if (s) setSessionDest(s.destination.label);
  }, []);

  async function refreshFavorites() {
    const fav = await loadFavorites();
    setFavorites(fav);
  }

  useEffect(() => {
    if (!showAddressPanel) return;
    if (!addressQuery || addressQuery.trim().length < 3) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await geocodeForward(addressQuery.trim(), fix ?? undefined);
        setSuggestions(res ?? []);
      } catch (e) {
        console.error("geocodeForward failed", e);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 420);
    return () => clearTimeout(t);
  }, [addressQuery, showAddressPanel, fix]);

  async function handleStartFavorite(f: Favorite) {
    saveNavSession({
      version: 1,
      savedAt: Date.now(),
      destination: { label: f.address ? f.address : f.label, center: f.center },
    });
    navigate("/map");
  }

  async function handleRemoveFavorite(id: string) {
    try {
      await removeFavorite(id);
      await refreshFavorites();
      setFavStatus("✅ Favori supprimé.");
    } catch (e) {
      console.error(e);
      setFavStatus("❌ Impossible de supprimer le favori.");
    }
  }

  async function handleSos() {
    setEmergencyStatus(null);
    if (!contacts || contacts.length === 0) {
      setEmergencyStatus("⚠️ Aucun contact d'urgence configuré. Définis-les dans Réglages.");
      return;
    }
    setLoading(true);
    try {
      let sent = 0;
      let failed = 0;
      for (const ct of contacts) {
        try {
          await sendEmergencyEmail({ contact: ct, currentLocation: fix ?? null });
          sent++;
        } catch (err) {
          console.error("sendEmergencyEmail failed for", ct, err);
          failed++;
        }
      }
      setEmergencyStatus(`✅ Envoyé: ${sent}, Échecs: ${failed}`);
    } catch (e) {
      console.error(e);
      setEmergencyStatus("❌ Erreur envoi SOS. Vérifie la configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">{greeting.emoji} {greeting.text} !</h2>
        <p className="text-sm text-zinc-400">{getSubtitle()}</p>
      </header>

      {sessionDest && (
        <button
          onClick={() => navigate("/map")}
          className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15"
        >
          🔁 Reprendre vers "{sessionDest}"
        </button>
      )}

      <button
        onClick={() => navigate("/map")}
        className="w-full rounded-2xl px-4 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c026d3)',
          boxShadow: '0 0 24px rgba(168, 85, 247, 0.5), 0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        🚴 Nouvelle balade
      </button>

      {/* Emergency card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">🆘 Contact d'urgence</div>
            <div className="text-xs text-zinc-400">Envoie un email d'alerte avec ta position</div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
          {contacts && contacts.length > 0 ? (
            <div className="space-y-1">
              {contacts.slice(0, 3).map((c, i) => (
                <div key={i} className="text-sm text-zinc-100">{c.name ? c.name : c.email}</div>
              ))}
              {contacts.length > 3 && <div className="text-xs text-zinc-400">+{contacts.length - 3} autres</div>}
            </div>
          ) : (
            <div className="text-xs text-zinc-400">Aucun contact enregistré — configure-les dans Réglages.</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSos}
            disabled={(!contacts || contacts.length === 0) || loading}
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

        {emergencyStatus && <div className="text-xs text-zinc-300">{emergencyStatus}</div>}

        <div className="text-[11px] text-zinc-500">
          Position actuelle : <span className="text-zinc-300">{fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : "—"}</span>
        </div>
      </div>

      {/* Favorites */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-100">⭐ Favoris</div>
          <button
            onClick={() => {
              setShowAddressPanel((s) => !s);
              setAddressQuery("");
              setSuggestions([]);
              setSelectedPlace(null);
              setFavName("");
              setFavStatus(null);
            }}
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/15"
          >
            + Par adresse
          </button>
        </div>

        {showAddressPanel && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-zinc-400">Adresse</label>
              <input
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Tape l'adresse ou le lieu"
                className="mt-1 w-full rounded-md bg-black/20 border border-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
              <div className="relative">
                {suggestionsLoading && <div className="text-xs text-zinc-400 mt-1">Recherche...</div>}
                {suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-1 text-sm">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          setSelectedPlace(s);
                          setAddressQuery(s.label);
                          setSuggestions([]);
                        }}
                        className="cursor-pointer px-2 py-1 hover:bg-zinc-800"
                      >
                        <div className="text-sm text-zinc-100">{s.label}</div>
                        <div className="text-xs text-zinc-400">{s.context ?? ""}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Nom du favori</label>
              <input
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
                placeholder="Ex: Maison, Travail"
                className="mt-1 w-full rounded-md bg-black/20 border border-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
            </div>

            <div className="h-40 rounded-md overflow-hidden border border-zinc-800">
              <MapView center={selectedPlace ? selectedPlace.center : fix ?? { lat: 48.8566, lng: 2.3522 }} zoom={14} destination={selectedPlace ? selectedPlace.center : null} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!selectedPlace) return setFavStatus("⚠️ Choisis d'abord une adresse dans la liste.");
                  if (!favName || !favName.trim()) return setFavStatus("⚠️ Donne un nom pour le favori.");
                  const fav = {
                    id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    label: favName.trim(),
                    address: selectedPlace.label,
                    center: selectedPlace.center,
                    category: "other",
                  } as Favorite;
                  try {
                    await addOrUpdateFavorite(fav);
                    await refreshFavorites();
                    setFavStatus("✅ Favori ajouté.");
                    setShowAddressPanel(false);
                    setAddressQuery("");
                    setSelectedPlace(null);
                    setFavName("");
                  } catch (e) {
                    console.error(e);
                    setFavStatus("❌ Impossible d'ajouter le favori.");
                  }
                }}
                className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/15"
              >
                Ajouter
              </button>

              <button
                onClick={() => {
                  setShowAddressPanel(false);
                  setAddressQuery("");
                  setSuggestions([]);
                  setSelectedPlace(null);
                  setFavName("");
                }}
                className="rounded-xl border border-zinc-800 bg-transparent px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {favorites.length === 0 && (
            <div className="col-span-3 text-xs text-zinc-400">Aucun favori — ajoute ta maison, travail ou autres.</div>
          )}
          {favorites.map((f) => (
            <div key={f.id} className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-center">
              <div className="text-base font-bold text-zinc-100">{f.label}</div>
              <div className="text-xs text-zinc-400 mt-1">{f.address ? f.address : `${f.center.lat.toFixed(4)}, ${f.center.lng.toFixed(4)}`}</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button onClick={() => handleStartFavorite(f)} className="rounded-md px-2 py-1 bg-sky-600/10 text-xs text-sky-200 border border-sky-700">Démarrer</button>
                <button onClick={() => handleRemoveFavorite(f.id)} className="rounded-md px-2 py-1 bg-rose-700/5 text-xs text-rose-300 border border-rose-700">Suppr</button>
              </div>
            </div>
          ))}
        </div>

        {favStatus && <div className="text-xs text-zinc-300">{favStatus}</div>}
      </div>

      {/* Stats persistantes (Zustand) */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(88, 28, 135, 0.15)', border: '1px solid rgba(168, 85, 247, 0.2)', boxShadow: '0 0 20px rgba(139, 0, 255, 0.08)' }}>
        <div className="text-sm font-semibold text-purple-200">📊 Vos statistiques</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(109, 40, 217, 0.2)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="text-lg font-bold text-white">{totalKm}</div>
            <div className="text-xs text-purple-300">km</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(109, 40, 217, 0.2)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="text-lg font-bold text-white">{totalMin}</div>
            <div className="text-xs text-purple-300">min</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(109, 40, 217, 0.2)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="text-lg font-bold text-white">{totalRides}</div>
            <div className="text-xs text-purple-300">balades</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(88, 28, 135, 0.15)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <div className="text-sm font-semibold text-purple-200">🕐 Dernière balade</div>
        <div className="text-sm text-zinc-300">
          {lastRideLabel ?? "Aucune balade enregistrée pour l'instant."}
        </div>
      </div>

      <footer className="mt-6 text-center text-[10px] text-zinc-500">
        Développé par l'équipe 🚴‍♂️🚴‍♀️ — projet d'une année scolaire.
      </footer>
    </section>
  );
}
