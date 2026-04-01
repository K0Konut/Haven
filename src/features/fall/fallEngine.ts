export type FallEngineConfig = {
  g: number;

  // thresholds
  freefallG: number;           // e.g. 0.6g
  impactG: number;             // e.g. 2.7g
  impactGyroDps: number;       // e.g. 180 deg/s

  // timing
  freefallWindowMs: number;    // time to consider freefall "recent" before impact
  stillnessWindowMs: number;   // time to validate stillness
  maxImpactToStillnessMs: number;

  // stillness definition
  stillAccelTolG: number;      // around 1g magnitude tolerance (gravity)
  stillGyroMaxDps: number;     // max gyro mag for stillness
};

export type FallEvent =
  | { type: "POSSIBLE_FALL"; confidence: number }
  | { type: "FALL_CONFIRMED"; confidence: number };

type Sample = {
  t: number;
  ax?: number; ay?: number; az?: number; // accel m/s^2 (no gravity)
  gx?: number; gy?: number; gz?: number; // accel incl gravity m/s^2
  rAlpha?: number; rBeta?: number; rGamma?: number; // deg/s
};

type State = "IDLE" | "FREEFALL" | "IMPACT" | "STILLNESS_CHECK";

function mag3(x = 0, y = 0, z = 0) {
  return Math.sqrt(x * x + y * y + z * z);
}

export class FallEngine {
  private cfg: FallEngineConfig;

  private state: State = "IDLE";
  private lastFreefallAt: number | null = null;
  private impactAt: number | null = null;

  private stillStartAt: number | null = null;

  // Keep history of recent impacts for better confirmation
  private impactHistory: Array<{ t: number; gMag: number; gyroMag: number }> = [];
  private readonly maxHistorySize = 3;
  private prevSample: { t: number; linMag: number; gx: number; gy: number; gz: number } | null = null;

  constructor(cfg: Partial<FallEngineConfig> = {}) {
    this.cfg = {
      g: 9.80665,

      freefallG: 0.6,
      impactG: 1.1,
      impactGyroDps: 90,

      freefallWindowMs: 1200,
      stillnessWindowMs: 2000,
      maxImpactToStillnessMs: 9000,

      stillAccelTolG: 0.25,
      stillGyroMaxDps: 25,

      ...cfg,
    };
  }

  reset() {
    this.impactHistory = [];
    this.prevSample = null;
    this.state = "IDLE";
    this.lastFreefallAt = null;
    this.impactAt = null;
    this.stillStartAt = null;
  }

  push(s: Sample): FallEvent | null {
    const { g, freefallG, impactG, impactGyroDps } = this.cfg;

    // Use accelerationIncludingGravity magnitude as primary signal
    const gMag = mag3(s.gx, s.gy, s.gz) / g; // in "g"
    const linMag = mag3(s.ax, s.ay, s.az) / g; // linear accel in "g"
    const gyroMag = mag3(s.rAlpha, s.rBeta, s.rGamma); // deg/s magnitude

    // Derived signals: jerk + orientation shift
    let jerkGps = 0;
    let orientationDeltaDeg = 0;
    if (this.prevSample) {
      const dtSec = Math.max(0.001, (s.t - this.prevSample.t) / 1000);
      jerkGps = Math.abs(linMag - this.prevSample.linMag) / dtSec;

      const prevNorm = mag3(this.prevSample.gx, this.prevSample.gy, this.prevSample.gz);
      const currNorm = mag3(s.gx, s.gy, s.gz);
      if (prevNorm > 0.001 && currNorm > 0.001) {
        const dot =
          (this.prevSample.gx * (s.gx ?? 0) + this.prevSample.gy * (s.gy ?? 0) + this.prevSample.gz * (s.gz ?? 0)) /
          (prevNorm * currNorm);
        const clamped = Math.max(-1, Math.min(1, dot));
        orientationDeltaDeg = (Math.acos(clamped) * 180) / Math.PI;
      }
    }
    this.prevSample = {
      t: s.t,
      linMag,
      gx: s.gx ?? 0,
      gy: s.gy ?? 0,
      gz: s.gz ?? 0,
    };

    // 1) detect freefall
    if (gMag > 0 && gMag < freefallG) {
      this.lastFreefallAt = s.t;
      if (this.state === "IDLE") this.state = "FREEFALL";
    }

    // Clear old impact history (older than 5 seconds)
    if (this.impactHistory.length > 0 && s.t - this.impactHistory[this.impactHistory.length - 1].t > 5000) {
      this.impactHistory = [];
    }

    // 2) detect impact
    const recentFreefall =
      this.lastFreefallAt != null && (s.t - this.lastFreefallAt) <= this.cfg.freefallWindowMs;

    const impactByCombo = gMag >= impactG && gyroMag >= impactGyroDps;
    const impactByLinear = linMag >= 0.85 && (gyroMag >= impactGyroDps * 0.75 || gMag >= impactG * 0.9);
    const impactByJerk = jerkGps >= 2.2 && (gMag >= impactG * 0.85 || gyroMag >= impactGyroDps * 0.8);
    const impactByOrientation = orientationDeltaDeg >= 35 && (gMag >= impactG * 0.8 || linMag >= 0.7);
    const hardImpactOnly = gMag >= impactG + 0.25;
    const impact = impactByCombo || impactByLinear || impactByJerk || impactByOrientation || hardImpactOnly;

    if (impact) {
      this.impactAt = s.t;
      this.state = "IMPACT";

      // Track impact for history
      this.impactHistory.push({ t: s.t, gMag, gyroMag });
      if (this.impactHistory.length > this.maxHistorySize) {
        this.impactHistory.shift();
      }

      // Check if we have multiple impacts close together (typical of real falls)
      const hasRecentImpact = this.impactHistory.length > 1 && 
        (s.t - this.impactHistory[0].t) < 800;

      // confidence: freefall + strong impact + history bonus
      const confidence = Math.min(
        1,
        (recentFreefall ? 0.55 : 0.28)
          + Math.min(0.40, Math.max(0, gMag - impactG) * 0.30)
          + Math.min(0.20, linMag * 0.20)
          + Math.min(0.15, jerkGps * 0.06)
          + Math.min(0.10, orientationDeltaDeg / 180)
          + Math.min(0.18, gyroMag / 900)
          + (hardImpactOnly ? 0.15 : 0)
          + (hasRecentImpact ? 0.10 : 0)
      );

      return { type: "POSSIBLE_FALL", confidence };
    }

    // 3) stillness check after impact
    if (this.state === "IMPACT" && this.impactAt != null) {
      if (s.t - this.impactAt > this.cfg.maxImpactToStillnessMs) {
        this.reset();
        return null;
      }

      const isStill =
        Math.abs(gMag - 1) <= this.cfg.stillAccelTolG &&
        gyroMag <= this.cfg.stillGyroMaxDps &&
        linMag <= 0.18;

      if (isStill) {
        if (!this.stillStartAt) this.stillStartAt = s.t;
        this.state = "STILLNESS_CHECK";

        if (s.t - this.stillStartAt >= this.cfg.stillnessWindowMs) {
          const stillnessBonus = Math.max(0, 0.08 - linMag * 0.2);
          const confidence = Math.min(1, (recentFreefall ? 0.7 : 0.45) + 0.3 + stillnessBonus);
          this.reset();
          return { type: "FALL_CONFIRMED", confidence };
        }
      } else {
        // not still yet
        this.stillStartAt = null;
      }
    }

    return null;
  }
}
