import { create } from "zustand";

type FallStatus = "idle" | "listening" | "possible" | "countdown";

export type FallConfig = {
  countdownSeconds: number;
  warmupMs: number;
  cooldownMs: number;
  minSampleHz: number;
  // Engine thresholds for advanced users
  impactG: number;
  impactGyroDps: number;
  freefallG: number;
  // whether to confirm on first impact (no stillness required)
  confirmOnImpact: boolean;
};

type FallState = {
  enabled: boolean;
  status: FallStatus;

  lastConfidence: number | null;

  // Countdown
  countdownSec: number;
  countdownActive: boolean;

  // Cooldown after sending alert
  lastAlertAt: number | null;

  // Tunables
  config: FallConfig;

  // developer helpers
  debug: boolean;

  setEnabled: (v: boolean) => void;
  setStatus: (s: FallStatus) => void;
  setConfidence: (c: number | null) => void;

  startCountdown: (sec: number) => void;
  tick: () => void;
  cancelCountdown: () => void;

  forceSendNow: () => void;

  setLastAlertAt: (t: number | null) => void;
  setConfig: (patch: Partial<FallConfig>) => void;

  setDebug: (v: boolean) => void;

  reset: () => void;
};

export const useFallStore = create<FallState>((set) => {
  // read persisted state from localStorage (synchronous during init)
  let persistedEnabled = false;
  let persistedDebug = false;
  let persistedConfig: Partial<FallConfig> | null = null;
  try {
    const e = localStorage.getItem("fall:enabled");
    if (e != null) persistedEnabled = JSON.parse(e) as boolean;
    const d = localStorage.getItem("fall:debug");
    if (d != null) persistedDebug = JSON.parse(d) as boolean;
    const c = localStorage.getItem("fall:config");
    if (c) persistedConfig = JSON.parse(c);
  } catch {
    /* ignore */
  }

  const safeImpactG = Math.max(1.8, persistedConfig?.impactG ?? 1.8);
  const safeImpactGyroDps = Math.max(120, persistedConfig?.impactGyroDps ?? 120);

  return {
    enabled: persistedEnabled,
    status: "idle",
    lastConfidence: null,

    countdownSec: 0,
    countdownActive: false,

    lastAlertAt: null,

    config: {
      countdownSeconds: 15,
      warmupMs: 2500,
      cooldownMs: 20000,
      minSampleHz: 10,
      impactG: safeImpactG,
      impactGyroDps: safeImpactGyroDps,
      freefallG: 0.6,
      confirmOnImpact: false,
      ...persistedConfig,
      impactG: safeImpactG,
      impactGyroDps: safeImpactGyroDps,
      confirmOnImpact: false,
    },
    debug: persistedDebug,

    setEnabled: (v) => {
      try { localStorage.setItem("fall:enabled", JSON.stringify(v)); } catch {
        // noop (localStorage not available)
      }
      set({ enabled: v });
    },

    setDebug: (v) => {
      try { localStorage.setItem("fall:debug", JSON.stringify(v)); } catch {
        // noop
      }
      set({ debug: v });
    },

    setStatus: (s) => set({ status: s }),

    setConfidence: (c) => set({ lastConfidence: c }),

    startCountdown: (sec) =>
      set({ countdownSec: sec, countdownActive: true, status: "countdown" }),

    tick: () =>
      set((s) => ({ countdownSec: Math.max(0, s.countdownSec - 1) })),

    cancelCountdown: () =>
      set({ countdownActive: false, countdownSec: 0, status: "listening" }),

    forceSendNow: () =>
      set({ countdownSec: 0, countdownActive: true, status: "countdown" }),

    setLastAlertAt: (t) => set({ lastAlertAt: t }),

    setConfig: (patch) =>
      set((s) => {
        const cfg = { ...s.config, ...patch };
        try { localStorage.setItem("fall:config", JSON.stringify(cfg)); } catch {
          // noop (localStorage not available)
        }
        return { config: cfg };
      }),

    reset: () =>
      set({
        status: "idle",
        lastConfidence: null,
        countdownActive: false,
        countdownSec: 0,
      }),
  };
});
