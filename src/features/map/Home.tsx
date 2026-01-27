import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <section className="space-y-4">
     <header>
        <h2 className="text-2xl font-bold">👋 Bonjour !</h2>
        <p className="text-sm text-zinc-400">Prêt pour une balade ?</p>
      </header>
      
    </section>
  );
}
