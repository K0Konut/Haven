import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadEmergencyContacts,
  type EmergencyContact,
} from "../../services/emergency/contact";
import { geocodeForward } from "../../services/mapbox/geocoding";
import MapView from "./MapView";
import {
  loadFavorites,
  addOrUpdateFavorite,
  removeFavorite,
  type Favorite,
} from "../../services/favorites";
import { saveNavSession } from "../../services/navigation/persistence";
import { sendEmergencyEmail } from "../../services/emergency/email";
import { useLocationStore } from "../../store/location.slice";

export default function Home() {
  const navigate = useNavigate();
  const fix = useLocationStore((s) => s.fix);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showAddressPanel, setShowAddressPanel] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [favName, setFavName] = useState("");
  const [favStatus, setFavStatus] = useState<string | null>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadEmergencyContacts();
      setContacts(c);
      const fav = await loadFavorites();
      setFavorites(fav);
    })();
  }, []);

  async function refreshFavorites() {
    const fav = await loadFavorites();
    setFavorites(fav);
  }
  // address autocomplete (debounced)
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
    // persist a nav session and navigate to map where MapScreen restores it
    // use the stored address as the searchable label if available
    saveNavSession({
      version: 1,
      savedAt: Date.now(),
      destination: { label: f.address ? f.address : f.label, center: f.center },
    });
    navigate("/map");
  }

  // removed: adding favorite by current position is no longer supported

  async function handleRemoveFavorite(id: string) {
    // delete without browser confirm popup (immediate)
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
            disabled={( !contacts || contacts.length === 0 ) || loading}
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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-100">⭐ Favoris</div>
          <div className="flex gap-2">
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
                          // do NOT auto-fill the favorite name; let the user enter a custom name
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
                    id: `fav_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
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

        <hr className="border-zinc-800/40" />

        {favStatus && <div className="text-xs text-zinc-300">{favStatus}</div>}

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
