import { useFallStore } from "../../store/fall.slice";
import FallDebugPanel from "../fall/FallDebugPanel";

export default function Settings() {
  const config = useFallStore((s) => s.config);
  const setConfig = useFallStore((s) => s.setConfig);
  const debug = useFallStore((s) => s.debug);
  const setDebug = useFallStore((s) => s.setDebug);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Réglages</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debug}
            onChange={(e) => setDebug(e.target.checked)}
            className="accent-red-500"
          />
          <span className="text-xs text-zinc-400">Debug</span>
        </label>
      </div>

      {/* Debug Panel - always show at top if debug enabled */}
      {debug && <FallDebugPanel />}

      {/* Fall Detection Settings */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-semibold text-zinc-100">
            🚨 Détection de chute
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Plus bas = plus sensible. Les paramètres sont sauvegardés automatiquement.
          </p>
        </div>

        {/* Impact G Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="impact-g" className="text-sm font-medium text-zinc-300">
              Seuil d'impact (G)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.impactG.toFixed(2)}g
            </span>
          </div>
          <input
            id="impact-g"
            type="range"
            min="1.0"
            max="3.5"
            step="0.1"
            value={config.impactG}
            onChange={(e) => setConfig({ impactG: parseFloat(e.target.value) })}
            className="w-full accent-sky-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 1.8g (abaissé de 2.7g pour plus de sensibilité)
          </p>
        </div>

        {/* Gyro Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="gyro-dps" className="text-sm font-medium text-zinc-300">
              Seuil de rotation (°/s)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.impactGyroDps.toFixed(0)}°/s
            </span>
          </div>
          <input
            id="gyro-dps"
            type="range"
            min="50"
            max="250"
            step="10"
            value={config.impactGyroDps}
            onChange={(e) => setConfig({ impactGyroDps: parseFloat(e.target.value) })}
            className="w-full accent-sky-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 100°/s (abaissé de 180°/s pour plus de sensibilité)
          </p>
        </div>

        {/* Freefall G Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="freefall-g" className="text-sm font-medium text-zinc-300">
              Seuil de chute libre (G)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.freefallG.toFixed(2)}g
            </span>
          </div>
          <input
            id="freefall-g"
            type="range"
            min="0.3"
            max="1.0"
            step="0.05"
            value={config.freefallG}
            onChange={(e) => setConfig({ freefallG: parseFloat(e.target.value) })}
            className="w-full accent-sky-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 0.6g • Perte de gravité avant impact
          </p>
        </div>

        {/* Countdown Seconds */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="countdown" className="text-sm font-medium text-zinc-300">
              Délai avant alerte (sec)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.countdownSeconds}s
            </span>
          </div>
          <input
            id="countdown"
            type="range"
            min="5"
            max="30"
            step="1"
            value={config.countdownSeconds}
            onChange={(e) => setConfig({ countdownSeconds: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 15s • Temps pour annuler avant envoi d'alerte
          </p>
        </div>

        {/* Warmup Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="warmup" className="text-sm font-medium text-zinc-300">
              Échauffement (ms)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.warmupMs}ms
            </span>
          </div>
          <input
            id="warmup"
            type="range"
            min="1000"
            max="5000"
            step="250"
            value={config.warmupMs}
            onChange={(e) => setConfig({ warmupMs: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 2500ms • Temps avant de commencer à écouter après activation
          </p>
        </div>

        {/* Cooldown Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cooldown" className="text-sm font-medium text-zinc-300">
              Refroidissement (ms)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.cooldownMs}ms
            </span>
          </div>
          <input
            id="cooldown"
            type="range"
            min="10000"
            max="60000"
            step="5000"
            value={config.cooldownMs}
            onChange={(e) => setConfig({ cooldownMs: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 20000ms • Délai avant de re-détecter une nouvelle chute
          </p>
        </div>

        {/* Confirmation immédiate */}
        <div className="flex items-center gap-2">
          <input
            id="confirm-on-impact"
            type="checkbox"
            checked={config.confirmOnImpact}
            onChange={(e) => setConfig({ confirmOnImpact: e.target.checked })}
            className="accent-emerald-500"
          />
          <label htmlFor="confirm-on-impact" className="text-sm text-zinc-300">
            Alerte instantanée sur impact
          </label>
        </div>

        {/* Min Sample Hz */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="sample-hz" className="text-sm font-medium text-zinc-300">
              Fréquence min (Hz)
            </label>
            <span className="text-sm font-bold text-sky-300">
              {config.minSampleHz}Hz
            </span>
          </div>
          <input
            id="sample-hz"
            type="range"
            min="5"
            max="50"
            step="1"
            value={config.minSampleHz}
            onChange={(e) => setConfig({ minSampleHz: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
          <p className="text-xs text-zinc-500">
            Par défaut: 10Hz • Sanity check (basse fréquence = signaux manqués)
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-4 text-sm text-amber-200">
        <p className="text-xs leading-relaxed">
          💡 <strong>Conseil:</strong> Si la détection est trop sensible (fausses alertes),
          augmente les seuils d'impact (G) et de rotation. Si elle n'est pas assez sensible,
          diminue-les. L'option "alerte instantanée" force la notification dès le premier choc.
          Tous les changements sont sauvegardés automatiquement.
        </p>
      </div>

      {/* Placeholder for other settings */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
        Contact d'urgence, routes "sécurisées" et préférences de route (pistes cyclables / zones calmes)
        — à venir
      </div>
    </section>
  );
}
