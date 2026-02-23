import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">👋 Bonjour !</h2>
        <p className="text-sm text-zinc-400">Prêt pour une balade ?</p>
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
            <div className="text-lg font-bold text-white">12.5</div>
            <div className="text-xs text-purple-300">km</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(109, 40, 217, 0.2)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="text-lg font-bold text-white">45</div>
            <div className="text-xs text-purple-300">min</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(109, 40, 217, 0.2)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="text-lg font-bold text-white">3</div>
            <div className="text-xs text-purple-300">balades</div>
          </div>
        </div>
      </div>
    </section>
  );
}
