export type GameId = 'ultimatum' | 'ipd' | 'auction';

export type PersonaId =
  | 'rational'
  | 'loss_averse'
  | 'reciprocator'
  | 'exploiter';

export interface PersonaWeights {
  rational: number;
  loss_averse: number;
  reciprocator: number;
  exploiter: number;
}

export interface PersonaMeta {
  id: PersonaId;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  behavioralRule: string;
}

export interface SimulationConfig {
  game: GameId;
  weights: PersonaWeights;
  /** Framing bias from -100 (Loss/Scarcity) to +100 (Gain/Abundance) */
  framingBias: number;
  rounds: number;
  seed: number;
}

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  simPct: number;
  humanPct: number;
  isDanger?: boolean;
}

export interface RoundPoint {
  round: number;
  primaryMetric: number;
  secondaryMetric: number;
  surplusPct: number;
  flashCrash: boolean;
  actorA: PersonaId;
  actorB: PersonaId;
  detail: string;
}

export interface BenchmarkMetric {
  label: string;
  simulated: number;
  humanAvg: number;
  nashEq: number;
  unit: string;
  deltaVsHuman: number;
  interpretation: string;
}

export interface FragilityPoint {
  homogeneityPct: number;
  fragilityScore: number;
  surplusEfficiency: number;
}

export interface TalebFragilityReport {
  fragilityScore: number; // 0 to 100
  regime: 'Antifragile / Robust' | 'Sensitive' | 'Fragile / Flash-Crash Prone';
  hhi: number; // 0.25 to 1.0
  shannonDiversityPct: number; // 0 to 100
  dominantPersona: PersonaId;
  dominantSharePct: number;
  tailLossCvar95: number; // Worst 5% round surplus/profit loss
  cascadeEvents: number;
  flashCrashTriggered: boolean;
  flashCrashMechanism: string;
  concavityIndex: number; // Negative = concave (fragile), Positive = convex
  sweepCurve: FragilityPoint[];
}

export interface SimulationResult {
  config: SimulationConfig;
  normalizedWeights: PersonaWeights;
  summary: {
    primaryLabel: string;
    primaryValue: number;
    primaryUnit: string;
    humanPrimaryAvg: number;
    secondaryLabel: string;
    secondaryValue: number;
    secondaryUnit: string;
    humanSecondaryAvg: number;
    surplusEfficiency: number;
    humanSurplusAvg: number;
    inequalityOrTailLabel: string;
    inequalityOrTailValue: number;
    inequalityOrTailUnit: string;
  };
  histogram: HistogramBin[];
  histogramTitle: string;
  histogramXLabel: string;
  trajectory: RoundPoint[];
  trajectoryPrimaryLabel: string;
  trajectorySecondaryLabel: string;
  trajectoryHumanLine: number;
  benchmarks: BenchmarkMetric[];
  fragility: TalebFragilityReport;
  citation: string;
  computeTimeMs: number;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  tagline: string;
  weights: PersonaWeights;
  framingBias: number;
}
