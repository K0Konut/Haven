import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  ensureLocationPermission,
  getCurrentPosition,
  watchPosition,
} from "../../services/permissions/location";
import { useLocationStore } from "../../store/location.slice";
import FallDetectionBackground from "../../features/fall/FallDetectionBackground";

const linkBase =
  "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs";
const active = "text-purple-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]";
const inactive = "text-zinc-500";

export default function AppShell() {
  const { pathname } = useLocation();
  const isMap = pathname === "/map";

  const navHeight = "calc(72px + env(safe-area-inset-bottom))";

  const navStyle: React.CSSProperties & Record<"--bottom-nav-h", string> = {
    height: navHeight,
    "--bottom-nav-h": navHeight,
  };

  // Global location acquisition: request permission and fetch a first fix
  // so pages like Home can read `useLocationStore().fix` even if Map wasn't opened.
  const setPermission = useLocationStore((s) => s.setPermission);
  const setFix = useLocationStore((s) => s.setFix);

  useEffect(() => {
    let stopWatch: (() => void) | null = null;
    (async () => {
      try {
        const perm = await ensureLocationPermission();
        setPermission(perm);
        try {
          const pos = await getCurrentPosition();
          setFix(pos);
        } catch (e) {
          // ignore initial getCurrentPosition failures
        }

        stopWatch = watchPosition((newFix) => {
          setFix(newFix);
        }, (_err) => {
          // ignore watch errors for now
          // console.error('watchPosition error', err);
        });
      } catch (e) {
        // no-op
      }
    })();

    return () => {
      if (stopWatch) stopWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-[100dvh] w-full text-zinc-100 overflow-hidden flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #2d0050 0%, #0d0015 60%), radial-gradient(ellipse at bottom right, #1a003a 0%, transparent 70%)' }}>
      {/* MAIN (scrollable only when NOT map) */}
      <main
        className={
          isMap
            ? "relative flex-1 overflow-hidden"
            : "relative flex-1 overflow-y-auto overscroll-contain"
        }
        style={
          isMap
            ? undefined
            : { paddingLeft: 16, paddingRight: 16, paddingTop: 24, paddingBottom: 24 }
        }
      >
        <Outlet />
      </main>

      <FallDetectionBackground />

      {/* NAV */}
      <nav
        className="shrink-0 border-t backdrop-blur"
        style={{ ...navStyle, backgroundColor: 'rgba(13, 0, 21, 0.95)', borderColor: 'rgba(168, 85, 247, 0.25)', boxShadow: '0 -4px 24px rgba(139, 0, 255, 0.15)' }}
      >
        <div className="mx-auto flex h-[72px] max-w-screen-sm items-stretch justify-around px-2 py-2">
          <NavLink to="/" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <span className="text-base">🏠</span>
            Accueil
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <span className="text-base">🗺️</span>
            Carte
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <span className="text-base">⚙️</span>
            Réglages
          </NavLink>
        </div>
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>
    </div>
  );
}
