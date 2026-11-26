import { clamp, DeterministicRNG, roundTo } from './prng';

export type EvolutionStrategyId =
  | 'fair'
  | 'greedy'
  | 'tit_for_tat'
  | 'loss_averse'
  | 'rational';

export type ArenaGameMode = 'ipd' | 'ultimatum' | 'trade';

export interface EvolutionStrategyMeta {
  id: EvolutionStrategyId;
  label: string;
  shortLabel: string;
  color: string;
  softBg: string;
  rule: string;
}

export const EVOLUTION_STRATEGIES: Record<EvolutionStrategyId, EvolutionStrategyMeta> = {
  fair: {
    id: 'fair',
    label: 'Fair (50/50)',
    shortLabel: 'Fair',
    color: '#047857',
    softBg: '#ecfdf5',
    rule: 'Splits surplus evenly and cooperates unconditionally unless exploited repeatedly.',
  },
  greedy: {
    id: 'greedy',
    label: 'Greedy (Exploiter)',
    shortLabel: 'Greedy',
    color: '#b91c1c',
    softBg: '#fef2f2',
    rule: 'Defects for maximum short-term rent extraction and makes low-ball offers.',
  },
  tit_for_tat: {
    id: 'tit_for_tat',
    label: 'Tit-for-Tat',
    shortLabel: 'Tit-for-Tat',
    color: '#1d4ed8',
    softBg: '#eff6ff',
    rule: 'Opens cooperatively, mirrors each partner’s last move, and punishes defection.',
  },
  loss_averse: {
    id: 'loss_averse',
    label: 'Loss-Averse',
    shortLabel: 'Loss-Averse',
    color: '#b45309',
    softBg: '#fffbeb',
    rule: 'Prospect-theory baseline (lambda = 2.25); rejects unfair splits and shades downside risk.',
  },
  rational: {
    id: 'rational',
    label: 'Rational (Nash)',
    shortLabel: 'Rational',
    color: '#475569',
    softBg: '#f1f5f9',
    rule: 'Subgame-perfect utility maximizer that shades toward Nash extraction under low trust.',
  },
};

export const ALL_STRATEGY_IDS: EvolutionStrategyId[] = [
  'fair',
  'greedy',
  'tit_for_tat',
  'loss_averse',
  'rational',
];

export interface ArenaGameMeta {
  id: ArenaGameMode;
  label: string;
  humanCoopBaseline: number;
  humanPayoffBaseline: number;
  citation: string;
}

export const ARENA_GAME_META: Record<ArenaGameMode, ArenaGameMeta> = {
  ipd: {
    id: 'ipd',
    label: "Prisoner's Dilemma",
    humanCoopBaseline: 58.0,
    humanPayoffBaseline: 4.14, // 69% of 6 max joint / 2 -> scaled to per-trade payoff (R=3, avg ~2.07 * 2)
    citation: 'Dal Bo & Frechette (2018): 58.0% human cooperation, 69.0% Pareto efficiency.',
  },
  ultimatum: {
    id: 'ultimatum',
    label: 'Ultimatum Split',
    humanCoopBaseline: 84.0,
    humanPayoffBaseline: 4.2, // 84% acceptance * $50 avg split normalized to 0-5 scale
    citation: 'Oosterbeek et al. (2004): 40.4% mean offer, 84.0% human acceptance rate.',
  },
  trade: {
    id: 'trade',
    label: 'Market Exchange',
    humanCoopBaseline: 74.0,
    humanPayoffBaseline: 3.7,
    citation: 'Kagel & Levin (2002): 74.0% human market surplus efficiency.',
  },
};

export interface ArenaAgent {
  id: number;
  strategy: EvolutionStrategyId;
  x: number; // normalized [0.06, 0.94]
  y: number; // normalized [0.08, 0.92]
  vx: number;
  vy: number;
  wealth: number;
  lastPayoff: number;
  converted: boolean;
}

export interface TradeArc {
  fromId: number;
  toId: number;
  cooperative: boolean;
}

export interface GenerationSnapshot {
  generation: number;
  counts: Record<EvolutionStrategyId, number>;
  shares: Record<EvolutionStrategyId, number>;
  meanPayoff: number;
  coopRate: number;
  surplusPct: number;
  dominant: EvolutionStrategyId;
  collapsed: EvolutionStrategyId[];
  agents: ArenaAgent[];
  arcs: TradeArc[];
}

export interface EvolutionConfig {
  strategies: [EvolutionStrategyId, EvolutionStrategyId, EvolutionStrategyId];
  initialShares: [number, number, number]; // sum to 100
  gameMode: ArenaGameMode;
  selectionPressure: number; // 0.5 to 3.0
  mutationRate: number; // 0 to 0.08
  seed: number;
}

export const EVOLUTION_PRESETS: {
  id: string;
  name: string;
  strategies: [EvolutionStrategyId, EvolutionStrategyId, EvolutionStrategyId];
  initialShares: [number, number, number];
  gameMode: ArenaGameMode;
  selectionPressure: number;
  mutationRate: number;
}[] = [
  {
    id: 'classic-triad',
    name: 'Classic Triad',
    strategies: ['fair', 'greedy', 'tit_for_tat'],
    initialShares: [34, 33, 33],
    gameMode: 'ipd',
    selectionPressure: 1.6,
    mutationRate: 0.01,
  },
  {
    id: 'greedy-invasion',
    name: 'Greedy Invasion',
    strategies: ['fair', 'greedy', 'tit_for_tat'],
    initialShares: [40, 50, 10],
    gameMode: 'ipd',
    selectionPressure: 2.0,
    mutationRate: 0.01,
  },
  {
    id: 'ultimatum-market',
    name: 'Ultimatum Fairness',
    strategies: ['fair', 'greedy', 'loss_averse'],
    initialShares: [30, 35, 35],
    gameMode: 'ultimatum',
    selectionPressure: 1.8,
    mutationRate: 0.01,
  },
  {
    id: 'nash-monoculture',
    name: 'Nash vs Reciprocity',
    strategies: ['rational', 'greedy', 'tit_for_tat'],
    initialShares: [45, 30, 25],
    gameMode: 'trade',
    selectionPressure: 1.7,
    mutationRate: 0.02,
  },
];

const AGENT_COUNT = 100;
const TOTAL_GENERATIONS = 50;

/**
 * Pairwise repeated encounter (4 rounds per match so Tit-for-Tat retaliation works faithfully).
 */
function resolveMatch(
  sA: EvolutionStrategyId,
  sB: EvolutionStrategyId,
  gameMode: ArenaGameMode,
  rng: DeterministicRNG
): { payA: number; payB: number; coopFraction: number; surplusPct: number } {
  const rounds = 4;
  let totalA = 0;
  let totalB = 0;
  let coopCount = 0;

  let lastA: 'C' | 'D' = 'C';
  let lastB: 'C' | 'D' = 'C';

  const pickMove = (
    strat: EvolutionStrategyId,
    oppLast: 'C' | 'D',
    roundIdx: number
  ): 'C' | 'D' => {
    if (strat === 'fair') {
      // Fair cooperates unless opponent defected twice in a row (forgiving)
      return roundIdx >= 2 && oppLast === 'D' && rng.next() < 0.35 ? 'D' : 'C';
    }
    if (strat === 'greedy') {
      return rng.next() < 0.05 ? 'C' : 'D';
    }
    if (strat === 'tit_for_tat') {
      if (roundIdx === 0) return 'C';
      // 8% generosity to break echo cycles
      return oppLast === 'C' ? 'C' : rng.next() < 0.08 ? 'C' : 'D';
    }
    if (strat === 'loss_averse') {
      if (roundIdx === 0) return rng.next() < 0.78 ? 'C' : 'D';
      return oppLast === 'C' ? (rng.next() < 0.86 ? 'C' : 'D') : (rng.next() < 0.15 ? 'C' : 'D');
    }
    // rational
    if (roundIdx === rounds - 1) return 'D';
    return oppLast === 'C' && rng.next() < 0.42 ? 'C' : 'D';
  };

  if (gameMode === 'ipd') {
    for (let r = 0; r < rounds; r++) {
      const mA = pickMove(sA, lastB, r);
      const mB = pickMove(sB, lastA, r);
      if (mA === 'C' && mB === 'C') {
        totalA += 3;
        totalB += 3;
        coopCount += 2;
      } else if (mA === 'C' && mB === 'D') {
        totalA += 0;
        totalB += 5;
        coopCount += 1;
      } else if (mA === 'D' && mB === 'C') {
        totalA += 5;
        totalB += 0;
        coopCount += 1;
      } else {
        totalA += 1;
        totalB += 1;
      }
      lastA = mA;
      lastB = mB;
    }
    const maxJoint = rounds * 6;
    return {
      payA: totalA / rounds,
      payB: totalB / rounds,
      coopFraction: coopCount / (rounds * 2),
      surplusPct: ((totalA + totalB) / maxJoint) * 100,
    };
  }

  if (gameMode === 'ultimatum') {
    // 2 rounds A proposes, 2 rounds B proposes; scale payoffs to 0-5 for comparability
    let acceptedTotal = 0;
    for (let r = 0; r < rounds; r++) {
      const prop = r % 2 === 0 ? sA : sB;
      const resp = r % 2 === 0 ? sB : sA;

      const offer =
        prop === 'fair'
          ? 48 + rng.gaussian(0, 3)
          : prop === 'tit_for_tat'
            ? 45 + rng.gaussian(0, 4)
            : prop === 'loss_averse'
              ? 42 + rng.gaussian(0, 5)
              : prop === 'rational'
                ? 22 + rng.gaussian(0, 5)
                : 15 + rng.gaussian(0, 5);

      const threshold =
        resp === 'fair'
          ? 34 + rng.gaussian(0, 4)
          : resp === 'tit_for_tat'
            ? 32 + rng.gaussian(0, 4)
            : resp === 'loss_averse'
              ? 36 + rng.gaussian(0, 5)
              : resp === 'rational'
                ? 8 + rng.gaussian(0, 3)
                : 28 + rng.gaussian(0, 5);

      const accepted = offer >= threshold;
      if (accepted) {
        acceptedTotal++;
        const pShare = ((100 - clamp(offer, 1, 99)) / 100) * 5;
        const rShare = (clamp(offer, 1, 99) / 100) * 5;
        if (r % 2 === 0) {
          totalA += pShare;
          totalB += rShare;
        } else {
          totalB += pShare;
          totalA += rShare;
        }
      }
    }
    return {
      payA: totalA / rounds,
      payB: totalB / rounds,
      coopFraction: acceptedTotal / rounds,
      surplusPct: (acceptedTotal / rounds) * 100,
    };
  }

  // Market exchange: cooperative discipline avoids Winner's Curse / liquidity freeze
  for (let r = 0; r < rounds; r++) {
    const mA = pickMove(sA, lastB, r);
    const mB = pickMove(sB, lastA, r);
    if (mA === 'C' && mB === 'C') {
      totalA += 3.4;
      totalB += 3.4;
      coopCount += 2;
    } else if (mA === 'C' && mB === 'D') {
      totalA += 0.8;
      totalB += 4.3;
      coopCount += 1;
    } else if (mA === 'D' && mB === 'C') {
      totalA += 4.3;
      totalB += 0.8;
      coopCount += 1;
    } else {
      // Mutual overbidding / predatory freeze destroys surplus
      totalA += 0.9;
      totalB += 0.9;
    }
    lastA = mA;
    lastB = mB;
  }
  const maxJoint = rounds * 6.8;
  return {
    payA: totalA / rounds,
    payB: totalB / rounds,
    coopFraction: coopCount / (rounds * 2),
    surplusPct: ((totalA + totalB) / maxJoint) * 100,
  };
}

function emptyCounts(): Record<EvolutionStrategyId, number> {
  return {
    fair: 0,
    greedy: 0,
    tit_for_tat: 0,
    loss_averse: 0,
    rational: 0,
  };
}

/**
 * Deterministically precomputes all 51 snapshots (Gen 0 through Gen 50)
 * for 100 agents trading in real time. Instant (<15ms) and 100% reproducible.
 */
export function simulateEvolutionArena(config: EvolutionConfig): GenerationSnapshot[] {
  const rng = new DeterministicRNG(config.seed ^ 0x7f4a7c15);
  const [s0, s1, s2] = config.strategies;
  const activeSet = [s0, s1, s2];

  // Normalize initial shares to exact 100 agents
  const sumShare =
    config.initialShares[0] + config.initialShares[1] + config.initialShares[2];
  const norm0 = sumShare > 0 ? Math.round((config.initialShares[0] / sumShare) * AGENT_COUNT) : 34;
  const norm1 = sumShare > 0 ? Math.round((config.initialShares[1] / sumShare) * AGENT_COUNT) : 33;
  const norm2 = Math.max(0, AGENT_COUNT - norm0 - norm1);

  const initialList: EvolutionStrategyId[] = [
    ...Array<EvolutionStrategyId>(norm0).fill(s0),
    ...Array<EvolutionStrategyId>(norm1).fill(s1),
    ...Array<EvolutionStrategyId>(norm2).fill(s2),
  ];
  while (initialList.length < AGENT_COUNT) initialList.push(s0);
  while (initialList.length > AGENT_COUNT) initialList.pop();

  // Deterministic Fisher-Yates shuffle so spatial distribution is mixed
  for (let i = initialList.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = initialList[i];
    initialList[i] = initialList[j];
    initialList[j] = tmp;
  }

  // Place 100 agents in a soft 10x10 jittered lattice inside [0.06, 0.94] x [0.08, 0.92]
  let currentAgents: ArenaAgent[] = initialList.map((strategy, idx) => {
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    const x = clamp(0.08 + col * 0.092 + (rng.next() - 0.5) * 0.04, 0.05, 0.95);
    const y = clamp(0.1 + row * 0.088 + (rng.next() - 0.5) * 0.04, 0.06, 0.94);
    return {
      id: idx,
      strategy,
      x,
      y,
      vx: (rng.next() - 0.5) * 0.018,
      vy: (rng.next() - 0.5) * 0.018,
      wealth: 3.0,
      lastPayoff: 3.0,
      converted: false,
    };
  });

  const snapshots: GenerationSnapshot[] = [];

  for (let gen = 0; gen <= TOTAL_GENERATIONS; gen++) {
    const payoffs = new Array<number>(AGENT_COUNT).fill(0);
    const matchesPlayed = new Array<number>(AGENT_COUNT).fill(0);
    let totalCoop = 0;
    let totalSurplus = 0;
    let totalMatches = 0;
    const arcs: TradeArc[] = [];

    // Pair agents across 5 waves of random + local matching (250 trades per generation)
    const waves = 5;
    for (let w = 0; w < waves; w++) {
      const order = Array.from({ length: AGENT_COUNT }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
      }
      for (let k = 0; k < AGENT_COUNT; k += 2) {
        const aIdx = order[k];
        const bIdx = order[k + 1];
        const res = resolveMatch(
          currentAgents[aIdx].strategy,
          currentAgents[bIdx].strategy,
          config.gameMode,
          rng
        );
        payoffs[aIdx] += res.payA;
        payoffs[bIdx] += res.payB;
        matchesPlayed[aIdx]++;
        matchesPlayed[bIdx]++;
        totalCoop += res.coopFraction;
        totalSurplus += res.surplusPct;
        totalMatches++;

        // Keep 26 representative trade arcs for visual animation on the canvas
        if (w === 0 && arcs.length < 26) {
          arcs.push({
            fromId: aIdx,
            toId: bIdx,
            cooperative: res.coopFraction >= 0.5,
          });
        }
      }
    }

    // Update agent stats for snapshot
    const counts = emptyCounts();
    let payoffSum = 0;
    const snapAgents: ArenaAgent[] = currentAgents.map((ag, idx) => {
      const avgPay = matchesPlayed[idx] > 0 ? payoffs[idx] / matchesPlayed[idx] : 0;
      payoffSum += avgPay;
      counts[ag.strategy]++;
      return {
        ...ag,
        lastPayoff: roundTo(avgPay, 2),
        wealth: roundTo(ag.wealth * 0.7 + avgPay * 0.3, 2),
      };
    });

    const shares = emptyCounts();
    let dominant: EvolutionStrategyId = activeSet[0];
    let bestCount = -1;
    const collapsed: EvolutionStrategyId[] = [];

    for (const s of activeSet) {
      shares[s] = roundTo((counts[s] / AGENT_COUNT) * 100, 1);
      if (counts[s] > bestCount) {
        bestCount = counts[s];
        dominant = s;
      }
      if (counts[s] <= 2) {
        collapsed.push(s);
      }
    }

    snapshots.push({
      generation: gen,
      counts,
      shares,
      meanPayoff: roundTo(payoffSum / AGENT_COUNT, 2),
      coopRate: roundTo((totalCoop / Math.max(1, totalMatches)) * 100, 1),
      surplusPct: roundTo(totalSurplus / Math.max(1, totalMatches), 1),
      dominant,
      collapsed,
      agents: snapAgents,
      arcs,
    });

    if (gen === TOTAL_GENERATIONS) break;

    // Replicator dynamics: compute fitness-weighted reproduction shares among active strategies
    const stratPaySum = emptyCounts();
    const stratCount = emptyCounts();
    for (let i = 0; i < AGENT_COUNT; i++) {
      const st = snapAgents[i].strategy;
      stratPaySum[st] += snapAgents[i].lastPayoff;
      stratCount[st]++;
    }

    const fitnessWeights: Record<EvolutionStrategyId, number> = emptyCounts();
    let totalFitness = 0;
    for (const s of activeSet) {
      if (stratCount[s] === 0) {
        fitnessWeights[s] = 0;
        continue;
      }
      const meanFit = stratPaySum[s] / stratCount[s];
      // Exponential replicator weighting scaled by selectionPressure
      const weight = stratCount[s] * Math.exp((meanFit - 2.0) * 0.24 * config.selectionPressure);
      fitnessWeights[s] = weight;
      totalFitness += weight;
    }

    // Target counts for next generation
    const nextTargets: Record<EvolutionStrategyId, number> = emptyCounts();
    let assigned = 0;
    for (let i = 0; i < activeSet.length; i++) {
      const s = activeSet[i];
      if (i === activeSet.length - 1) {
        nextTargets[s] = Math.max(0, AGENT_COUNT - assigned);
      } else {
        const share = totalFitness > 0 ? fitnessWeights[s] / totalFitness : 1 / 3;
        const c = Math.round(share * AGENT_COUNT);
        nextTargets[s] = clamp(c, 0, AGENT_COUNT - assigned);
        assigned += nextTargets[s];
      }
    }

    // Evolve individual agents smoothly: lowest-payoff agents of shrinking strategies convert
    const nextAgents = snapAgents.map((a) => ({
      ...a,
      converted: false,
      x: clamp(a.x + a.vx, 0.05, 0.95),
      y: clamp(a.y + a.vy, 0.06, 0.94),
      vx:
        a.x + a.vx <= 0.05 || a.x + a.vx >= 0.95
          ? -a.vx
          : clamp(a.vx + (rng.next() - 0.5) * 0.008, -0.022, 0.022),
      vy:
        a.y + a.vy <= 0.06 || a.y + a.vy >= 0.94
          ? -a.vy
          : clamp(a.vy + (rng.next() - 0.5) * 0.008, -0.022, 0.022),
    }));

    const deficits: EvolutionStrategyId[] = [];
    const surpluses: { strategy: EvolutionStrategyId; excess: number }[] = [];

    for (const s of activeSet) {
      const diff = nextTargets[s] - counts[s];
      if (diff > 0) {
        for (let k = 0; k < diff; k++) deficits.push(s);
      } else if (diff < 0) {
        surpluses.push({ strategy: s, excess: -diff });
      }
    }

    let defCursor = 0;
    for (const { strategy, excess } of surpluses) {
      // Pick lowest-payoff agents of the shrinking strategy to convert
      const candidates = nextAgents
        .filter((a) => a.strategy === strategy)
        .sort((a, b) => a.lastPayoff - b.lastPayoff);
      for (let k = 0; k < Math.min(excess, candidates.length); k++) {
        if (defCursor >= deficits.length) break;
        candidates[k].strategy = deficits[defCursor++];
        candidates[k].converted = true;
      }
    }

    // Small exploration / mutation rate
    if (config.mutationRate > 0) {
      for (let i = 0; i < AGENT_COUNT; i++) {
        if (rng.next() < config.mutationRate) {
          const nextStrat = activeSet[Math.floor(rng.next() * activeSet.length)];
          if (nextStrat !== nextAgents[i].strategy) {
            nextAgents[i].strategy = nextStrat;
            nextAgents[i].converted = true;
          }
        }
      }
    }

    currentAgents = nextAgents;
  }

  return snapshots;
}
