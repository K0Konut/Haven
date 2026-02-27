import { useNavigate } from "react-router-dom";
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
  const { totalDistanceMeters, totalDurationSec, totalRides, lastRide } = useStatsStore();

  const totalKm = (totalDistanceMeters / 1000).toFixed(1);
  const totalMin = Math.round(totalDurationSec / 60);
  const lastRideLabel = formatLastRide(lastRide);
  const greeting = getGreeting();

  return (
    <section className="space-y-4">
      <header>
      <h2 className="text-2xl font-bold"> {greeting.text} !</h2>
        <p className="text-sm text-zinc-400">{getSubtitle()}</p>
      </header>

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

      {lastRideLabel && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(88, 28, 135, 0.15)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <div className="text-sm font-semibold text-purple-200">🕐 Dernière balade</div>
          <div className="text-sm text-zinc-300">{lastRideLabel}</div>
        </div>
      )}
    </section>
  );
}
