import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ensureLocationPermission,
  getCurrentPosition,
  watchPosition,
} from "../../services/permissions/location";
import { useLocationStore } from "../../store/location.slice";
import { useRoutingStore } from "../../store/routing.slice";
import { useNavigationStore } from "../../store/navigation.slice";
import MapView from "./MapView";
import NavBanner from "./components/NavBanner";
import { formatDistance, formatDuration } from "../../services/routing/format";
import { geocodeForward, type PlaceResult } from "../../services/mapbox/geocoding";
import type { LatLng } from "../../types/routing";
import type { Hazard, ParkingSpot } from "../../types/map";
import { fetchHazards } from "../../services/map/hazards";
import { fetchParkingSpots } from "../../services/map/parking";
import { useOverlayStore } from "../../store/overlay.slice";
import {
  distanceToRouteMeters,
  remainingRouteDistanceMeters,
} from "../../services/routing/geo";

import { Haptics, NotificationType, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { loadNavSession, saveNavSession } from "../../services/navigation/persistence";
import { useStatsStore } from "../../store/stats.slice";

type SelectedDestination = { label: string; center: LatLng };

type GpsQuality = "good" | "medium" | "poor";

function gpsQualityFromAccuracy(acc: number | null | undefined): GpsQuality {
  const a = acc ?? 999;
  if (a <= 25) return "good";
  if (a <= 50) return "medium";
  return "poor";
}

function gpsLabel(q: GpsQuality) {
  if (q === "good") return "bon";
  if (q === "medium") return "moyen";
  return "faible";
}

function gpsPillClass(q: GpsQuality) {
  if (q === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (q === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-red-500/30 bg-red-500/10 text-red-200";
}

export default function MapScreen() {
  const { permission, fix, setPermission, setFix } = useLocationStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const routing = useRoutingStore();
  const selected = useRoutingStore((s) => s.selected());

  const nav = useNavigationStore();
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const navFollowUser = useNavigationStore((s) => s.followUser);

  const [destination, setDestination] = useState<SelectedDestination | null>(null);

  // Search UI
  const [q, setQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // UX toggles
  const [autoRouting] = useState(true); // always auto-start when selecting destination
  const [avoidHighways, setAvoidHighways] = useState(false);

  // extras visibility (global store)
  const showHazards = useOverlayStore((s) => s.showHazards);
  const showParkings = useOverlayStore((s) => s.showParkings);

  // Live metrics
  const [distanceToRoute, setDistanceToRoute] = useState<number | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const [remainingDuration, setRemainingDuration] = useState<number | null>(null);

  // extras: real‑time hazards & parking spots
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [parkings, setParkings] = useState<ParkingSpot[]>([]);

  const routeAbortRef = useRef<AbortController | null>(null);
  const stopWatchRef = useRef<null | (() => void)>(null);

  // reroute logic
  const offRouteStreakRef = useRef(0);
  const lastRerouteAtRef = useRef(0);

  // --- feedback guards (avoid spam)
  const offRouteRef = useRef(false);
  const lastOffRouteBuzzAtRef = useRef(0);
  const lastOffRouteNotifAtRef = useRef(0);
  const lastInstrRef = useRef<string | null>(null);
  const lastInstrBuzzAtRef = useRef(0);

  // perf guards (reduce high-frequency UI updates)
  const lastFixUpdateAtRef = useRef(0);
  const lastMetricsUpdateAtRef = useRef(0);

  // restore guard
  const hasRestoredSessionRef = useRef(false);

  // track remaining distance for stats on manual stop
  const remainingDistanceRef = useRef<number | null>(null);

  // UX: toast "navigation reprise"
  const [resumeBannerLabel, setResumeBannerLabel] = useState<string | null>(null);

  // UX: toast "nouvel itinéraire calculé"
  const [rerouteBannerLabel, setRerouteBannerLabel] = useState<string | null>(null);

  // UX: arrivée
  const [hasArrived, setHasArrived] = useState(false);
  const [navActualDurationSec, setNavActualDurationSec] = useState<number | null>(null);
  const navStartAtRef = useRef<number | null>(null);

  // 🧭 Dynamic map zoom
  const [mapZoom, setMapZoom] = useState<number>(16);

  // seuils GPS
  const GPS_MAX_ACC_FOR_SNAP = 55; // au-delà, on limite le snap
  const GPS_MAX_ACC_FOR_OFFROUTE = 60; // au-delà, on ne change pas l'état offRoute
  const GPS_MAX_ACC_FOR_REROUTE = 35; // reroute seulement si assez précis

  // ✅ stable gesture callback (anti-flash)
  const handleUserGesture = useCallback(() => {
    const s = useNavigationStore.getState();
    if (s.isNavigating) s.setFollowUser(false);
  }, []);

  // fetch hazards & parking every minute
  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        const [h, p] = await Promise.all([fetchHazards(), fetchParkingSpots()]);
        if (!mounted) return;
        setHazards(h);
        setParkings(p);
      } catch (e) {
        console.warn("failed to load map extras", e);
      }
    }
    loadAll();
    const id = window.setInterval(loadAll, 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  // ✅ request notifications permission once (Android 13+ needs it)
  useEffect(() => {
    (async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  // Init permission + first fix
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const perm = await ensureLocationPermission();
        setPermission(perm);

        const pos = await getCurrentPosition();
        setFix(pos);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    })();
  }, [setPermission, setFix]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchRef.current?.();
      routeAbortRef.current?.abort();
    };
  }, []);

  // Ghost routes
  const altRoutes = useMemo(() => {
    return routing.candidates
      .filter((c) => c.id !== routing.selectedId)
      .map((c) => c.geometry);
  }, [routing.candidates, routing.selectedId]);

  async function runSearch() {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setSearchError(null);
      return;
    }
    try {
      setSearchError(null);
      setSearchLoading(true);
      const r = await geocodeForward(query, fix ? { lat: fix.lat, lng: fix.lng } : undefined);
      setResults(r);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Erreur recherche");
    } finally {
      setSearchLoading(false);
    }
  }

  // Debounced autocomplete
  useEffect(() => {
    const t = setTimeout(() => void runSearch(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fix]);

  const calculateTo = useCallback(
    async (dest: SelectedDestination) => {
      if (!fix) return;

      routeAbortRef.current?.abort();
      const ac = new AbortController();
      routeAbortRef.current = ac;

      await routing.calculate(
        {
          origin: fix,
          destination: dest.center,
          preference: {
            preferBikeLanes: 1,
            preferQuietStreets: 0.8,
            avoidHighways: avoidHighways,
          },
        },
        { signal: ac.signal }
      );
    },
    [fix, routing, avoidHighways]
  );

    function setAsDestination(r: PlaceResult) {
    const dest = { label: r.label, center: r.center };
    setDestination(dest);
    setResults([]);
    setQ(r.label);

    if (autoRouting) {
      void calculateTo(dest);
    } else {
      routing.clear();
    }
  }


  const stopNavigation = useCallback(() => {
    stopWatchRef.current?.();
    stopWatchRef.current = null;

    nav.stop();

    // reset feedback guards
    offRouteRef.current = false;
    lastInstrRef.current = null;

    offRouteStreakRef.current = 0;
    setDistanceToRoute(null);
    setRemainingDistance(null);
    setRemainingDuration(null);

    // save stats on manual stop
    if (navStartAtRef.current != null) {
      const elapsedSec = (Date.now() - navStartAtRef.current) / 1000;
      const sel = useRoutingStore.getState().selected();
      if (sel) {
        const traveled = Math.max(0, sel.summary.distanceMeters - (remainingDistanceRef.current ?? sel.summary.distanceMeters));
        useStatsStore.getState().addRide(traveled, elapsedSec);
      }
    }

    navStartAtRef.current = null;
    setHasArrived(false);
    setNavActualDurationSec(null);

    // on ne garde pas de session "inactive"
    saveNavSession(null);
    setResumeBannerLabel(null);
    setRerouteBannerLabel(null);

    // reset zoom doux
    setMapZoom(16);

    // revenir à l'accueil après arrêt
    navigate("/");
  }, [nav, navigate]);

  function clearDestination() {
    stopNavigation();
    setDestination(null);
    routing.clear();

    setDistanceToRoute(null);
    setRemainingDistance(null);
    setRemainingDuration(null);

    nav.reset();

    setQ("");
    setResults([]);

    // efface toute session nav persistée
    saveNavSession(null);
    setResumeBannerLabel(null);
    setRerouteBannerLabel(null);
  }

  const startNavigation = useCallback(() => {
    if (!destination || !selected || !fix) return;

    nav.start(); // followUser = true dans le store

    // départ de session nav
    navStartAtRef.current = Date.now();
    setHasArrived(false);
    setNavActualDurationSec(null);

    // persiste la session de nav
    saveNavSession({
      version: 1,
      savedAt: Date.now(),
      destination,
    });

    // reset feedback guards
    offRouteRef.current = false;
    lastInstrRef.current = null;

    offRouteStreakRef.current = 0;
    lastRerouteAtRef.current = 0;

    stopWatchRef.current?.();
    stopWatchRef.current = watchPosition(async (newFix) => {
      const nowTs = Date.now();

      // --- Gating simple pour l'update du store location (setFix)
      const FIX_MIN_INTERVAL_MS = 220;
      const shouldUpdateFix =
        lastFixUpdateAtRef.current === 0 ||
        nowTs - lastFixUpdateAtRef.current >= FIX_MIN_INTERVAL_MS;

      if (shouldUpdateFix) {
        lastFixUpdateAtRef.current = nowTs;
        setFix(newFix);
      }

      if (!selected) return;

      const accGps = newFix.accuracy ?? 999;

      const { routeSegIndex } = useNavigationStore.getState();

      const snap = distanceToRouteMeters(newFix, selected.geometry, {
        hintSegmentIndex: routeSegIndex ?? undefined,
        searchWindow: accGps > GPS_MAX_ACC_FOR_SNAP ? 6 : 18,
        fallbackToFullScan: accGps > GPS_MAX_ACC_FOR_SNAP ? false : true,
      });

      // store progress for next tick (seulement si GPS correct)
      if (accGps <= GPS_MAX_ACC_FOR_SNAP) {
        nav.setRouteProgress(snap.segmentIndex, snap.t);
      }

      const distance = snap.distance;
      const segmentIndex = snap.segmentIndex;
      const t = snap.t;

      // OFF-ROUTE hystérésis + garde-fou accuracy
      const OFF_ROUTE_ENTER = 40;
      const OFF_ROUTE_EXIT = 28;

      const wasOff = offRouteRef.current;

      let isOff = wasOff;
      if (accGps <= GPS_MAX_ACC_FOR_OFFROUTE) {
        isOff = wasOff ? distance > OFF_ROUTE_EXIT : distance > OFF_ROUTE_ENTER;
      }

      nav.setOffRoute(isOff);

      const rem = remainingRouteDistanceMeters(selected.geometry, segmentIndex, t);

      const speed = newFix.speed ?? null;
      const totalDist = selected.summary.distanceMeters;
      const totalDur = selected.summary.durationSeconds;

      let etaSec: number;
      if (typeof speed === "number" && speed > 0.6 && speed < 15) etaSec = rem / speed;
      else etaSec = (totalDist > 1 ? rem / totalDist : 1) * totalDur;

      etaSec = Math.max(0, etaSec);

      // Next instruction + distance to next maneuver
      const traveled = Math.max(0, totalDist - rem);
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < selected.steps.length; i++) {
        acc += selected.steps[i].distanceMeters;
        if (acc >= traveled) {
          idx = i;
          break;
        }
      }
      const distToNext = Math.max(0, acc - traveled);
      const instr = selected.steps[idx]?.instruction ?? null;

      // --- Gating pour les métriques UI + nav.update
      const METRICS_MIN_INTERVAL_MS = 350;
      const shouldUpdateMetrics =
        lastMetricsUpdateAtRef.current === 0 ||
        nowTs - lastMetricsUpdateAtRef.current >= METRICS_MIN_INTERVAL_MS;

      if (shouldUpdateMetrics) {
        lastMetricsUpdateAtRef.current = nowTs;

        setDistanceToRoute(distance);
        setRemainingDistance(rem);
        remainingDistanceRef.current = rem;
        setRemainingDuration(etaSec);

        nav.update({
          remainingDistance: rem,
          distanceToRoute: distance,
          remainingDurationSec: etaSec,
          stepIndex: idx,
          nextInstruction: instr,
          distanceToNextManeuver: distToNext,
        });

        // 🔍 Dynamic zoom calculé à partir de la vitesse + contexte
        let targetZoom = 16;

        if (typeof speed === "number" && speed > 0.5 && speed < 20) {
          const kmh = speed * 3.6;

          if (kmh < 8) targetZoom = 17.2; // très lent / pause -> zoom fort
          else if (kmh < 15) targetZoom = 16.6; // balade tranquille
          else if (kmh < 25) targetZoom = 15.8; // rythme soutenu
          else targetZoom = 15.2; // très rapide -> on dézoome un peu
        } else {
          // no speed: départ / GPS poor
          targetZoom = 16.8;
        }

        // contexte manœuvre : on zoome un peu plus proche du prochain virage
        if (distToNext < 60) targetZoom += 0.6;
        else if (distToNext < 120) targetZoom += 0.3;

        // bornes hard pour éviter les trucs extrêmes
        targetZoom = Math.max(13.5, Math.min(18, targetZoom));

        // lissage (interpolation) pour éviter les sauts
        const SMOOTH = 0.25;
        setMapZoom((prev) => prev + (targetZoom - prev) * SMOOTH);
      }

      // Off-route entered => vibrate + notif (throttled)
      if (isOff && !wasOff) {
        offRouteRef.current = true;

        const now = Date.now();
        if (now - lastOffRouteBuzzAtRef.current > 6000) {
          lastOffRouteBuzzAtRef.current = now;
          try {
            await Haptics.notification({ type: NotificationType.Warning });
          } catch {
            /* noop */
          }
        }

        if (now - lastOffRouteNotifAtRef.current > 15000) {
          lastOffRouteNotifAtRef.current = now;
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: 101,
                  title: "SoftRide",
                  body: "⚠️ Hors itinéraire — on recalcule si besoin",
                  schedule: { at: new Date(Date.now() + 250) },
                },
              ],
            });
          } catch {
            /* noop */
          }
        }
      }

      // Off-route resolved
      if (!isOff && wasOff) {
        offRouteRef.current = false;
      }

      // Instruction changed => small haptic (throttled)
      if (instr && instr !== lastInstrRef.current && distToNext <= 250) {
        const now = Date.now();
        if (now - lastInstrBuzzAtRef.current > 3500) {
          lastInstrBuzzAtRef.current = now;
          lastInstrRef.current = instr;
          try {
            await Haptics.impact({ style: ImpactStyle.Light });
          } catch {
            /* noop */
          }
        }
      }

      // Arrivé
      if (rem < 25) {
        if (navStartAtRef.current != null) {
          const elapsedSec = (Date.now() - navStartAtRef.current) / 1000;
          setNavActualDurationSec(elapsedSec);
          if (selected) {
            useStatsStore.getState().addRide(selected.summary.distanceMeters, elapsedSec);
          }
          navStartAtRef.current = null; // évite double-comptage dans stopNavigation
        }
        setHasArrived(true);

        stopNavigation();
        return;
      }

      // Reroute (stable + accuracy)
      const ACC_OK = accGps < GPS_MAX_ACC_FOR_REROUTE;
      const COOLDOWN_MS = 12000;

      if (ACC_OK && isOff) offRouteStreakRef.current += 1;
      else offRouteStreakRef.current = 0;

      const now = Date.now();
      const canReroute = now - lastRerouteAtRef.current > COOLDOWN_MS;

      if (offRouteStreakRef.current >= 2 && canReroute && destination) {
        lastRerouteAtRef.current = now;
        offRouteStreakRef.current = 0;

        // 👉 toast UX: nouvel itinéraire calculé
        setRerouteBannerLabel(destination.label);

        await calculateTo(destination);
      }
    });
  }, [destination, selected, fix, nav, setFix, calculateTo, stopNavigation]);

  // 🔁 Restauration d'une session de nav persistée
  useEffect(() => {
    if (hasRestoredSessionRef.current) return;
    if (!fix) return;

    const session = loadNavSession();
    if (!session) return;

    hasRestoredSessionRef.current = true;

    const dest: SelectedDestination = session.destination;
    setDestination(dest);
    setQ(dest.label);

    void (async () => {
      await calculateTo(dest);
      if (useRoutingStore.getState().selected()) {
        setResumeBannerLabel(dest.label);
      }
    })();
  }, [fix, calculateTo]);

  // Auto-hide du toast "navigation reprise"
  useEffect(() => {
    if (!resumeBannerLabel) return;
    const t = window.setTimeout(() => setResumeBannerLabel(null), 7000);
    return () => window.clearTimeout(t);
  }, [resumeBannerLabel]);

  // Auto-hide du toast "nouvel itinéraire"
  useEffect(() => {
    if (!rerouteBannerLabel) return;
    const t = window.setTimeout(() => setRerouteBannerLabel(null), 6000);
    return () => window.clearTimeout(t);
  }, [rerouteBannerLabel]);

  // Si on sort de la nav, on ramène doucement le zoom vers un niveau neutre
  useEffect(() => {
    if (isNavigating) return;
    setMapZoom((prev) => {
      const target = 16;
      const SMOOTH = 0.3;
      return prev + (target - prev) * SMOOTH;
    });
  }, [isNavigating]);

  const showResults = results.length > 0 && !isNavigating;

  const BOTTOM_EXTRA_PX = -60;

  // GPS quality pill
  const gpsQuality = gpsQualityFromAccuracy(fix?.accuracy);
  const gpsAccMeters =
    typeof fix?.accuracy === "number" && Number.isFinite(fix.accuracy)
      ? Math.round(fix.accuracy)
      : null;

  // durée réelle formatée (si dispo)
  const actualDurationLabel =
    navActualDurationSec != null ? formatDuration(navActualDurationSec) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black touch-none">
      {/* MAP */}
      <div className="absolute inset-0">
        {fix ? (
          <MapView
            center={fix}
            heading={fix.heading ?? null}
            followUser={isNavigating && navFollowUser}
            onUserGesture={handleUserGesture}
            destination={destination?.center ?? null}
            selectedRoute={selected?.geometry ?? null}
            alternativeRoutes={altRoutes}
            zoom={mapZoom}

            hazards={hazards}
            parkings={parkings}
            hazardsVisible={showHazards}
            parkingsVisible={showParkings}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-sm text-zinc-400">Chargement de la localisation…</p>
          </div>
        )}
      </div>

      {/* TOP OVERLAY */}
<div className="absolute left-0 right-0 top-0 z-40 p-3 pt-4 space-y-2">
        <div className="mx-auto max-w-xl space-y-2">
          {/* Toast de reprise de navigation */}
          {resumeBannerLabel && (
            <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-100 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span>🧭</span>
                <span className="truncate">
                  Navigation reprise vers{" "}
                  <span className="font-semibold">{resumeBannerLabel}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setResumeBannerLabel(null)}
                className="text-[11px] text-sky-100/80 hover:text-sky-50 shrink-0"
              >
                OK
              </button>
            </div>
          )}

          {/* Home button when navigating (pause) */}
          {isNavigating && (
            <button
              onClick={() => navigate("/")}
              className="absolute top-3 right-3 z-20 rounded-full bg-black/50 p-2 text-white"
              title="Accueil (pause)"
            >
              🏠
            </button>
          )}

          {/* Toast reroute automatique */}
          {rerouteBannerLabel && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span>🔄</span>
                <span className="truncate">
                  Nouvel itinéraire calculé vers{" "}
                  <span className="font-semibold">{rerouteBannerLabel}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRerouteBannerLabel(null)}
                className="text-[11px] text-amber-100/80 hover:text-amber-50 shrink-0"
              >
                OK
              </button>
            </div>
          )}

          <NavBanner />

          {/* 🧼 En mode navigation, on masque le panneau de recherche pour libérer la carte */}
          {!isNavigating && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-zinc-400 shrink-0">Destination</div>

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runSearch();
                      }
                    }}
                    disabled={isNavigating}
                    placeholder="Où on va ? (adresse, lieu, POI)"
                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                  />

                  {searchLoading ? (
                    <div className="text-xs text-zinc-400">…</div>
                  ) : (
                    <button
                      onClick={() => void runSearch()}
                      disabled={!q.trim() || isNavigating}
                      className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40 disabled:opacity-50"
                    >
                      Chercher
                    </button>
                  )}

                  {destination && (
                    <button
                      onClick={clearDestination}
                      className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {/* Ligne infos: destination + GPS */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-zinc-300 min-w-0">
                    {destination ? (
                      <>
                        <span className="text-zinc-400">Sélectionné :</span>{" "}
                        <span className="font-semibold text-zinc-100 truncate inline-block max-w-[12rem]">
                          {destination.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500">Choisis une adresse pour commencer</span>
                    )}
                  </div>

                  {/* Pastille GPS */}
                  <div
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      gpsPillClass(gpsQuality),
                    ].join(" ")}
                  >
                    <span className="uppercase tracking-wide">GPS</span>
                    <span>{gpsLabel(gpsQuality)}</span>
                    {gpsAccMeters != null && <span className="opacity-70">(~{gpsAccMeters} m)</span>}
                  </div>
                </div>

                {searchError && <div className="mt-2 text-xs text-red-300">{searchError}</div>}
                {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
                {permission !== "granted" && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Permission localisation: <span className="text-zinc-200">{permission}</span>
                  </div>
                )}
              </div>

              {showResults && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur shadow-lg overflow-hidden max-h-64 overflow-y-auto touch-pan-y">
                  {results.slice(0, 6).map((r) => (
                    <div key={r.id} className="px-3 py-2 border-b border-zinc-900 last:border-b-0">
                      <div className="text-sm text-zinc-100">{r.label}</div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setAsDestination(r)}
                          className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40"
                        >
                          Utiliser comme destination
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOTTOM SHEET */}
      <div
        className="absolute left-0 right-0 z-30 p-3"
        style={{
          bottom: `calc(var(--bottom-nav-h, 72px) + 12px + ${BOTTOM_EXTRA_PX}px)`,
        }}
      >
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur shadow-lg p-3 space-y-3">
            {/* Panneau d'arrivée */}
            {hasArrived && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-50 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-sm font-semibold">Arrivé à destination</span>
                  </div>
                  <div className="text-[11px] text-emerald-100/90 truncate">
                    {destination?.label ?? "Destination atteinte"}
                  </div>
                  <div className="text-[11px] text-emerald-100/90">
                    Itinéraire:{" "}
                    <span className="font-semibold">
                      {selected
                        ? `${formatDistance(selected.summary.distanceMeters)} • ${formatDuration(
                          selected.summary.durationSeconds
                        )}`
                        : "—"}
                    </span>
                  </div>
                  {actualDurationLabel && (
                    <div className="text-[11px] text-emerald-100/90">
                      Temps réel approximatif:{" "}
                      <span className="font-semibold">{actualDurationLabel}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHasArrived(false)}
                    className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-3 py-1.5 text-[11px] hover:bg-emerald-500/30"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={clearDestination}
                    className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-100 hover:bg-zinc-800"
                  >
                    Nouvelle destination
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-200">
                {isNavigating ? "Navigation active" : hasArrived ? "Arrivé" : "Prêt"}
              </div>
            </div>

{/* Floating controls to mimic previous minimal UI */}
              <div className="absolute bottom-28 right-4 flex flex-col gap-2 z-20">
                <button
                  type="button"
                  onClick={() => nav.setFollowUser(!navFollowUser)}
                  disabled={!isNavigating}
                  title="Caméra suivante"
                  className={[
                    "h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition",
                    !isNavigating
                      ? "opacity-50 cursor-not-allowed bg-zinc-900"
                      : navFollowUser
                        ? "bg-emerald-500"
                        : "bg-zinc-800",
                  ].join(" ")}
                >
                  🎯
                </button>
                <button
                  type="button"
                  onClick={() => setAvoidHighways((v) => !v)}
                  title="Éviter autoroutes"
                  className={[
                    "h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition",
                    avoidHighways ? "bg-amber-500" : "bg-zinc-800",
                  ].join(" ")}
                >
                  ⛔
                </button>
              </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={isNavigating ? stopNavigation : startNavigation}
                disabled={!fix || !destination || routing.loading || !selected}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {isNavigating ? "Arrêter" : "Démarrer"}
              </button>

              <button
                onClick={() => destination && void calculateTo(destination)}
                disabled={!fix || !destination || routing.loading}
                className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
              >
                {routing.loading ? "Calcul…" : "Recalculer"}
              </button>
            </div>

            {/* SUMMARY */}
            {selected ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-100 font-semibold">
                    {isNavigating
                      ? "Itinéraire sélectionné"
                      : `${formatDistance(selected.summary.distanceMeters)} • ${formatDuration(
                        selected.summary.durationSeconds
                      )}`}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Score{" "}
                    <span className="text-zinc-100 font-semibold">
                      {selected.safetyScore}
                    </span>
                    /100
                  </div>
                </div>

                {isNavigating ? (
                  // 🔎 En nav: on montre seulement l’écart (distance/ETA sont déjà dans NavBanner)
                  <div className="text-xs text-zinc-400">
                    Écart par rapport à l’itinéraire :{" "}
                    <span
                      className={
                        distanceToRoute != null && distanceToRoute > 35
                          ? "text-red-300"
                          : "text-zinc-200"
                      }
                    >
                      {distanceToRoute != null
                        ? `${Math.round(distanceToRoute)} m`
                        : "—"}
                    </span>
                  </div>
                ) : (
                  // 🧷 En preview: on montre tout
                  <div className="text-xs text-zinc-400">
                    Restant:{" "}
                    <span className="text-zinc-100 font-semibold">
                      {remainingDistance != null
                        ? formatDistance(remainingDistance)
                        : "—"}
                    </span>
                    {" • "}
                    ETA:{" "}
                    <span className="text-zinc-100 font-semibold">
                      {remainingDuration != null
                        ? formatDuration(remainingDuration)
                        : "—"}
                    </span>
                    {" • "}
                    Écart:{" "}
                    <span
                      className={
                        distanceToRoute != null && distanceToRoute > 35
                          ? "text-red-300"
                          : "text-zinc-200"
                      }
                    >
                      {distanceToRoute != null
                        ? `${Math.round(distanceToRoute)} m`
                        : "—"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-400">
                {destination
                  ? "Sélectionne une destination puis calcule l’itinéraire."
                  : "Choisis une destination."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
