/**
 * Deterministic PRNG (Mulberry32) so every simulation run is 100% reproducible
 * client-side with zero external calls and zero Math.random() usage.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 1;
  }

  /** Uniform float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Standard normal N(0, 1) via Box-Muller */
  gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-12, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /** Heavy-tailed shock (mixture of Gaussian + rare Cauchy-like jump) */
  fatTailShock(scale: number, tailProbability: number): number {
    if (this.next() < tailProbability) {
      const sign = this.next() < 0.5 ? -1 : 1;
      const magnitude = scale * (2.2 + Math.pow(this.next(), -0.45));
      return sign * Math.min(magnitude, scale * 6.5);
    }
    return this.gaussian(0, scale);
  }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function roundTo(val: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
