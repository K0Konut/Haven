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
        className="w-full rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-4 text-sm font-semibold text-sky-200 hover:bg-sky-500/15"
      >
        🚴 Nouvelle balade
      </button>
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
</div>

        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 text-center">
        <div className="text-lg font-bold text-zinc-100">12.5</div>
        <div className="text-xs text-zinc-400">km</div>
       </div>
        </div>

    </section>
  );
}
