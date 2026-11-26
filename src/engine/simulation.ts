import {
  GAME_META,
  HUMAN_AUCTION_PROFIT_BINS,
  HUMAN_IPD_SURPLUS_BINS,
  HUMAN_ULTIMATUM_BINS,
  PERSONA_ORDER,
} from './benchmarks';
import { clamp, DeterministicRNG, roundTo } from './prng';
import {
  BenchmarkMetric,
  FragilityPoint,
  HistogramBin,
  PersonaId,
  PersonaWeights,
  RoundPoint,
  SimulationConfig,
  SimulationResult,
  TalebFragilityReport,
} from './types';

export function normalizeWeights(weights: PersonaWeights): PersonaWeights {
  const total =
    weights.rational +
    weights.loss_averse +
    weights.reciprocator +
    weights.exploiter;
  if (total <= 0) {
    return { rational: 25, loss_averse: 25, reciprocator: 25, exploiter: 25 };
  }
  return {
    rational: (weights.rational / total) * 100,
    loss_averse: (weights.loss_averse / total) * 100,
    reciprocator: (weights.reciprocator / total) * 100,
    exploiter: (weights.exploiter / total) * 100,
  };
}

function samplePersona(rng: DeterministicRNG, norm: PersonaWeights): PersonaId {
  const r = rng.next() * 100;
  let acc = 0;
  for (const id of PERSONA_ORDER) {
    acc += norm[id];
    if (r <= acc) return id;
  }
  return 'reciprocator';
}

function computeDiversityMetrics(norm: PersonaWeights): {
  hhi: number;
  shannonDiversityPct: number;
  dominantPersona: PersonaId;
  dominantSharePct: number;
} {
  let hhi = 0;
  let entropy = 0;
  let dominantPersona: PersonaId = 'rational';
  let dominantSharePct = -1;

  for (const id of PERSONA_ORDER) {
    const p = norm[id] / 100;
    hhi += p * p;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
    if (norm[id] > dominantSharePct) {
      dominantSharePct = norm[id];
      dominantPersona = id;
    }
  }

  const maxEntropy = Math.log(PERSONA_ORDER.length);
  const shannonDiversityPct = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

  return {
    hhi: roundTo(hhi, 3),
    shannonDiversityPct: roundTo(shannonDiversityPct, 1),
    dominantPersona,
    dominantSharePct: roundTo(dominantSharePct, 1),
  };
}

interface CoreRunOutput {
  primaryValue: number;
  secondaryValue: number;
  surplusEfficiency: number;
  inequalityOrTailValue: number;
  histogram: HistogramBin[];
  trajectory: RoundPoint[];
  tailLossCvar95: number;
  cascadeEvents: number;
  benchmarks: BenchmarkMetric[];
  flashCrashMechanism: string;
  flashCrashTriggered: boolean;
}

function runUltimatumCore(
  norm: PersonaWeights,
  framingBias: number,
  rounds: number,
  seed: number,
  hhi: number
): CoreRunOutput {
  const rng = new DeterministicRNG(seed ^ 0x1a2b3c4d);
  const frame = framingBias / 100; // -1 to +1
  const homogeneityStress = clamp((hhi - 0.35) / 0.65, 0, 1);

  const binCounts = new Array<number>(10).fill(0);
  const trajectory: RoundPoint[] = [];
  const roundSurpluses: number[] = [];

  let offerSum = 0;
  let acceptCount = 0;
  let surplusSum = 0;
  let proposerPayoffSum = 0;
  let responderPayoffSum = 0;
  let recentRejectionRate = 0.16;
  let cascadeEvents = 0;
  let consecutiveRejections = 0;

  for (let r = 1; r <= rounds; r++) {
    const proposer = samplePersona(rng, norm);
    const responder = samplePersona(rng, norm);

    // Determine offer (0-100)
    let offer = 40;
    if (proposer === 'rational') {
      // Rational optimizers push toward subgame-perfect floor, adapting slightly to rejection rate
      const strategicFloor = 8 + recentRejectionRate * 24 - homogeneityStress * 8;
      offer = strategicFloor + frame * 5 + rng.gaussian(0, 3.5);
    } else if (proposer === 'loss_averse') {
      // Prospect theory human: fears rejection loss (lambda ~ 2.25), offers near 42-48%
      offer = 43 + frame * 4 + recentRejectionRate * 12 + rng.gaussian(0, 6);
    } else if (proposer === 'reciprocator') {
      // Fair-minded split near 48-52%
      offer = 49 + frame * 5 + rng.gaussian(0, 4.5);
    } else {
      // Adversarial exploiter: aggressive low-balling
      offer = 14 + frame * 3 + rng.gaussian(0, 6.5);
    }

    // Homogeneous optimizer herd compression: synchronized race to minimum offer
    if (homogeneityStress > 0.45 && (proposer === 'rational' || proposer === 'exploiter')) {
      offer -= homogeneityStress * 7;
    }

    offer = clamp(Math.round(offer), 1, 99);

    // Determine responder acceptance threshold
    let threshold = 25;
    if (responder === 'rational') {
      // Accepts almost any positive offer unless scarcity framing triggers spiteful breakdown
      threshold = 2 + Math.max(0, -frame) * 6 + rng.gaussian(0, 2);
    } else if (responder === 'loss_averse') {
      // Strong fairness anchor; negative scarcity framing raises rejection floor sharply
      threshold = 32 - frame * 11 + rng.gaussian(0, 5.5);
    } else if (responder === 'reciprocator') {
      threshold = 28 - frame * 7 + rng.gaussian(0, 5);
    } else {
      // Exploiter resents low offers from peers, demands high share under scarcity
      threshold = 35 - frame * 9 + rng.gaussian(0, 6);
    }

    // Systemic freeze shock when homogeneous rational/exploiter mix collides with scarcity
    const freezeShock =
      homogeneityStress > 0.5 && frame < -0.15 && rng.next() < homogeneityStress * 0.25;
    if (freezeShock) {
      threshold += 22;
    }

    const accepted = offer >= threshold;
    if (accepted) {
      acceptCount++;
      surplusSum += 100;
      proposerPayoffSum += 100 - offer;
      responderPayoffSum += offer;
      roundSurpluses.push(100);
      consecutiveRejections = 0;
    } else {
      roundSurpluses.push(0);
      consecutiveRejections++;
    }

    const flashCrash = consecutiveRejections >= 3 || (!accepted && freezeShock);
    if (flashCrash) cascadeEvents++;

    recentRejectionRate = recentRejectionRate * 0.85 + (accepted ? 0 : 1) * 0.15;
    offerSum += offer;

    const binIdx = clamp(Math.floor(offer / 10), 0, 9);
    binCounts[binIdx]++;

    trajectory.push({
      round: r,
      primaryMetric: offer,
      secondaryMetric: roundTo((acceptCount / r) * 100, 1),
      surplusPct: accepted ? 100 : 0,
      flashCrash,
      actorA: proposer,
      actorB: responder,
      detail: accepted
        ? `Offer $${offer} accepted (threshold $${Math.max(1, Math.round(threshold))})`
        : `Offer $${offer} rejected (threshold $${Math.max(1, Math.round(threshold))}, $0 realized)`,
    });
  }

  const meanOffer = roundTo(offerSum / rounds, 1);
  const acceptRate = roundTo((acceptCount / rounds) * 100, 1);
  const surplusEfficiency = roundTo(surplusSum / rounds, 1);
  const totalRealized = proposerPayoffSum + responderPayoffSum;
  const proposerShare =
    totalRealized > 0 ? roundTo((proposerPayoffSum / totalRealized) * 100, 1) : 50;

  // CVaR 95% surplus loss (average shortfall in worst 5% of rounds)
  const sortedSurplus = [...roundSurpluses].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor(rounds * 0.05));
  const worstAvg =
    sortedSurplus.slice(0, tailCount).reduce((a, b) => a + b, 0) / tailCount;
  const tailLossCvar95 = roundTo(100 - worstAvg, 1);

  const histogram: HistogramBin[] = binCounts.map((count, i) => ({
    label: `${i * 10}-${(i + 1) * 10}%`,
    min: i * 10,
    max: (i + 1) * 10,
    simPct: roundTo((count / rounds) * 100, 1),
    humanPct: HUMAN_ULTIMATUM_BINS[i],
    isDanger: i <= 1,
  }));

  const flashCrashTriggered =
    (hhi >= 0.55 && (acceptRate < 65 || meanOffer < 18)) || cascadeEvents >= 6;

  let flashCrashMechanism =
    'Population heterogeneity buffers bargaining norms; fairness anchors and reciprocity sustain clearing surplus.';
  if (flashCrashTriggered) {
    if (meanOffer < 18) {
      flashCrashMechanism =
        'Homogeneous optimization drove offers toward the subgame-perfect floor (<18%). Any residual fairness anchor or framing shock triggers sudden bargaining gridlock and zero-surplus rejection cascades.';
    } else {
      flashCrashMechanism =
        'Synchronized scarcity framing and correlated persona thresholds triggered consecutive rejection cascades, freezing bilateral exchange.';
    }
  }

  const benchmarks: BenchmarkMetric[] = [
    {
      label: 'Mean Offer Share',
      simulated: meanOffer,
      humanAvg: 40.4,
      nashEq: 1.0,
      unit: '%',
      deltaVsHuman: roundTo(meanOffer - 40.4, 1),
      interpretation:
        meanOffer < 25
          ? 'Strongly below human fairness norm; approaches cold Nash extraction.'
          : meanOffer > 46
            ? 'Hyper-fair regime exceeding empirical human lab averages.'
            : 'Aligned with empirical human fairness norms (Oosterbeek et al.).',
    },
    {
      label: 'Acceptance Rate',
      simulated: acceptRate,
      humanAvg: 84.0,
      nashEq: 100.0,
      unit: '%',
      deltaVsHuman: roundTo(acceptRate - 84.0, 1),
      interpretation:
        acceptRate < 70
          ? 'High rejection friction; significant deadweight surplus destruction.'
          : 'Healthy clearing rate across bargaining pairs.',
    },
    {
      label: 'Realized Market Surplus',
      simulated: surplusEfficiency,
      humanAvg: 84.0,
      nashEq: 100.0,
      unit: '%',
      deltaVsHuman: roundTo(surplusEfficiency - 84.0, 1),
      interpretation:
        surplusEfficiency < 70
          ? 'Bargaining breakdown eroding total economic value.'
          : 'Efficient value capture with limited breakdown.',
    },
    {
      label: 'Proposer Payoff Share',
      simulated: proposerShare,
      humanAvg: 59.6,
      nashEq: 99.0,
      unit: '%',
      deltaVsHuman: roundTo(proposerShare - 59.6, 1),
      interpretation:
        proposerShare > 75
          ? 'Asymmetric rent capture skewed heavily toward first-mover proposers.'
          : 'Balanced division of surplus between proposers and responders.',
    },
  ];

  return {
    primaryValue: meanOffer,
    secondaryValue: acceptRate,
    surplusEfficiency,
    inequalityOrTailValue: proposerShare,
    histogram,
    trajectory,
    tailLossCvar95,
    cascadeEvents,
    benchmarks,
    flashCrashMechanism,
    flashCrashTriggered,
  };
}

function runIpdCore(
  norm: PersonaWeights,
  framingBias: number,
  rounds: number,
  seed: number,
  hhi: number
): CoreRunOutput {
  const rng = new DeterministicRNG(seed ^ 0x5f3759df);
  const frame = framingBias / 100;
  const homogeneityStress = clamp((hhi - 0.35) / 0.65, 0, 1);

  // Payoffs: T=5, R=3, P=1, S=0 (Max joint Pareto = 6 per round)
  const T = 5;
  const R = 3;
  const P = 1;
  const S = 0;

  let popTrust = clamp(0.62 + frame * 0.22 - (norm.exploiter / 100) * 0.45, 0.08, 0.95);
  let lastMoveA: 'C' | 'D' = 'C';
  let lastMoveB: 'C' | 'D' = 'C';

  let coopMoves = 0;
  let mutualCoop = 0;
  let mutualDefect = 0;
  let totalSurplus = 0;
  let cascadeEvents = 0;

  const trajectory: RoundPoint[] = [];
  const roundSurplusPcts: number[] = [];
  const rollingCoopWindow: number[] = [];
  const binCounts = new Array<number>(6).fill(0);

  const decideMove = (
    persona: PersonaId,
    opponentLast: 'C' | 'D',
    roundNum: number
  ): 'C' | 'D' => {
    const endGamePressure = roundNum > rounds * 0.85 ? 0.22 : 0;
    if (persona === 'rational') {
      // Backward induction & homogeneous synchronization collapse
      const coopProb =
        clamp(
          0.32 +
            frame * 0.18 -
            endGamePressure -
            homogeneityStress * 0.38 -
            (1 - popTrust) * 0.35,
          0.02,
          0.85
        );
      return rng.next() < coopProb ? 'C' : 'D';
    }
    if (persona === 'loss_averse') {
      // Cautious conditional cooperator: defects defensively when trust drops or under scarcity
      const base = opponentLast === 'C' ? 0.74 : 0.22;
      const coopProb = clamp(base + frame * 0.2 - (1 - popTrust) * 0.35, 0.05, 0.94);
      return rng.next() < coopProb ? 'C' : 'D';
    }
    if (persona === 'reciprocator') {
      // Tit-for-Tat with 12% forgiveness
      const base = opponentLast === 'C' ? 0.93 : 0.14 + Math.max(0, frame) * 0.12;
      return rng.next() < clamp(base, 0.05, 0.98) ? 'C' : 'D';
    }
    // Adversarial exploiter: Always-Defect with rare deceptive probing
    const coopProb = clamp(0.06 + Math.max(0, frame) * 0.06, 0.01, 0.15);
    return rng.next() < coopProb ? 'C' : 'D';
  };

  for (let r = 1; r <= rounds; r++) {
    const actorA = samplePersona(rng, norm);
    const actorB = samplePersona(rng, norm);

    // Synchronized defect shock in homogeneous populations when trust crosses tipping point
    const syncCollapse =
      homogeneityStress > 0.5 && popTrust < 0.42 && (actorA === 'rational' || actorB === 'rational');

    const moveA: 'C' | 'D' = syncCollapse ? 'D' : decideMove(actorA, lastMoveB, r);
    const moveB: 'C' | 'D' = syncCollapse ? 'D' : decideMove(actorB, lastMoveA, r);

    let payA = 0;
    let payB = 0;
    if (moveA === 'C' && moveB === 'C') {
      payA = R;
      payB = R;
      mutualCoop++;
      coopMoves += 2;
    } else if (moveA === 'C' && moveB === 'D') {
      payA = S;
      payB = T;
      coopMoves += 1;
    } else if (moveA === 'D' && moveB === 'C') {
      payA = T;
      payB = S;
      coopMoves += 1;
    } else {
      payA = P;
      payB = P;
      mutualDefect++;
    }

    const roundCoop = ((moveA === 'C' ? 1 : 0) + (moveB === 'C' ? 1 : 0)) / 2;
    const roundSurplusPct = roundTo(((payA + payB) / 6) * 100, 1);
    totalSurplus += payA + payB;
    roundSurplusPcts.push(roundSurplusPct);

    // Update trust & detect defect cascades
    const prevTrust = popTrust;
    popTrust = clamp(popTrust * 0.84 + roundCoop * 0.16, 0.02, 0.98);

    rollingCoopWindow.push(roundCoop * 100);
    if (rollingCoopWindow.length > 8) rollingCoopWindow.shift();
    const rollingCoopAvg =
      rollingCoopWindow.reduce((a, b) => a + b, 0) / rollingCoopWindow.length;

    const flashCrash =
      (moveA === 'D' && moveB === 'D' && prevTrust - popTrust > 0.05) ||
      syncCollapse;
    if (flashCrash) cascadeEvents++;

    // Bin round surplus into 6 buckets (0-100%)
    const binIdx =
      payA + payB <= 2 ? 0 : payA + payB === 3 ? 1 : payA + payB === 4 ? 2 : payA + payB === 5 ? 4 : 5;
    binCounts[binIdx]++;

    lastMoveA = moveA;
    lastMoveB = moveB;

    trajectory.push({
      round: r,
      primaryMetric: roundTo(rollingCoopAvg, 1),
      secondaryMetric: roundTo(popTrust * 100, 1),
      surplusPct: roundSurplusPct,
      flashCrash,
      actorA,
      actorB,
      detail: `${moveA}/${moveB} outcome (payoffs ${payA}, ${payB}; trust ${Math.round(popTrust * 100)}%)`,
    });
  }

  const coopRate = roundTo((coopMoves / (rounds * 2)) * 100, 1);
  const mutualDefectRate = roundTo((mutualDefect / rounds) * 100, 1);
  const surplusEfficiency = roundTo((totalSurplus / (rounds * 6)) * 100, 1);

  const sortedSurplus = [...roundSurplusPcts].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor(rounds * 0.05));
  const worstAvg =
    sortedSurplus.slice(0, tailCount).reduce((a, b) => a + b, 0) / tailCount;
  const tailLossCvar95 = roundTo(100 - worstAvg, 1);

  const binLabels = ['33% (DD)', '45%', '55%', '70%', '83% (CD)', '100% (CC)'];
  const histogram: HistogramBin[] = binCounts.map((count, i) => ({
    label: binLabels[i],
    min: i * 16,
    max: (i + 1) * 16,
    simPct: roundTo((count / rounds) * 100, 1),
    humanPct: HUMAN_IPD_SURPLUS_BINS[i],
    isDanger: i === 0,
  }));

  const flashCrashTriggered =
    (hhi >= 0.55 && coopRate < 35) || mutualDefectRate > 55 || cascadeEvents >= 10;

  let flashCrashMechanism =
    'Reciprocators and cautious human baselines maintain positive trust equilibrium without systemic collapse.';
  if (flashCrashTriggered) {
    flashCrashMechanism =
      'Synchronized defect cascade triggered: homogeneous optimizers or exploiter density drove population trust below the 42% tipping threshold, locking the system into low-surplus Mutual Defection (P=1).';
  }

  const benchmarks: BenchmarkMetric[] = [
    {
      label: 'Cooperation Rate',
      simulated: coopRate,
      humanAvg: 58.0,
      nashEq: 0.0,
      unit: '%',
      deltaVsHuman: roundTo(coopRate - 58.0, 1),
      interpretation:
        coopRate < 35
          ? 'Severe defection trap; trust has collapsed below human baseline.'
          : coopRate > 70
            ? 'High-trust cooperative equilibrium sustained by Tit-for-Tat discipline.'
            : 'Comparable to empirical human repeated-game cooperation.',
    },
    {
      label: 'Pareto Surplus Efficiency',
      simulated: surplusEfficiency,
      humanAvg: 69.0,
      nashEq: 33.3,
      unit: '%',
      deltaVsHuman: roundTo(surplusEfficiency - 69.0, 1),
      interpretation:
        surplusEfficiency < 50
          ? 'Near Nash Mutual-Defection floor (33.3% efficiency).'
          : 'Strong joint value generation above non-cooperative floor.',
    },
    {
      label: 'Mutual Defection (DD)',
      simulated: mutualDefectRate,
      humanAvg: 24.0,
      nashEq: 100.0,
      unit: '%',
      deltaVsHuman: roundTo(mutualDefectRate - 24.0, 1),
      interpretation:
        mutualDefectRate > 45
          ? 'Persistent retaliatory lock-in destroying collective welfare.'
          : 'Contained retaliatory cycles.',
    },
    {
      label: 'Mutual Cooperation (CC)',
      simulated: roundTo((mutualCoop / rounds) * 100, 1),
      humanAvg: 44.0,
      nashEq: 0.0,
      unit: '%',
      deltaVsHuman: roundTo((mutualCoop / rounds) * 100 - 44.0, 1),
      interpretation:
        (mutualCoop / rounds) * 100 > 50
          ? 'Dominant Pareto-optimal regime.'
          : 'Vulnerable to opportunistic defection.',
    },
  ];

  return {
    primaryValue: coopRate,
    secondaryValue: mutualDefectRate,
    surplusEfficiency,
    inequalityOrTailValue: cascadeEvents,
    histogram,
    trajectory,
    tailLossCvar95,
    cascadeEvents,
    benchmarks,
    flashCrashMechanism,
    flashCrashTriggered,
  };
}

function runAuctionCore(
  norm: PersonaWeights,
  framingBias: number,
  rounds: number,
  seed: number,
  hhi: number
): CoreRunOutput {
  const rng = new DeterministicRNG(seed ^ 0x243f6a88);
  const frame = framingBias / 100;
  const homogeneityStress = clamp((hhi - 0.35) / 0.65, 0, 1);

  const biddersPerRound = 5;
  let winnersCurseCount = 0;
  let bidToValueSum = 0;
  let profitSum = 0;
  let positiveSurplusRounds = 0;
  let cascadeEvents = 0;

  const winnerProfits: number[] = [];
  const trajectory: RoundPoint[] = [];
  // Profit bins: <-30, -30..-15, -15..0, 0..10, 10..20, 20..30, >30
  const binCounts = new Array<number>(7).fill(0);

  for (let r = 1; r <= rounds; r++) {
    // Common-value asset true value V around $100 with fat-tail regime shocks
    const tailProb = 0.04 + homogeneityStress * 0.14;
    const trueValue = clamp(100 + rng.fatTailShock(10, tailProb), 45, 165);

    // Correlated model error when population is homogeneous (agents share blind spots)
    const correlatedModelError =
      homogeneityStress > 0.35
        ? rng.fatTailShock(11 * homogeneityStress, 0.18 * homogeneityStress)
        : 0;

    let highestBid = -Infinity;
    let secondBid = -Infinity;
    let winnerPersona: PersonaId = 'rational';
    let runnerUpPersona: PersonaId = 'loss_averse';

    for (let b = 0; b < biddersPerRound; b++) {
      const persona = samplePersona(rng, norm);
      // Private noisy signal around true value + shared model bias for rational agents
      const sharedBias = persona === 'rational' ? correlatedModelError : correlatedModelError * 0.35;
      const privateSignal = trueValue + sharedBias + rng.gaussian(0, 9.5);

      let bid = privateSignal;
      if (persona === 'rational') {
        // Bayes-Nash shading, but homogeneous herding amplifies correlated over/under-bidding
        const shading = -10.5 + homogeneityStress * 9.5 + frame * 4;
        bid = privateSignal + shading;
      } else if (persona === 'loss_averse') {
        // Shades conservatively to avoid Winner's Curse regret; stronger under scarcity
        const shading = -12 + frame * 7;
        bid = privateSignal + shading;
      } else if (persona === 'reciprocator') {
        // Disciplined bidding near calibrated expected value
        const shading = -7.5 + frame * 4;
        bid = privateSignal + shading;
      } else {
        // Adversarial exploiter: aggressive sniping / overbidding to capture market share
        const aggressiveness = 5.5 + frame * 4 + rng.gaussian(0, 4);
        bid = privateSignal + aggressiveness;
      }

      bid = clamp(bid, 20, 210);
      if (bid > highestBid) {
        secondBid = highestBid;
        runnerUpPersona = winnerPersona;
        highestBid = bid;
        winnerPersona = persona;
      } else if (bid > secondBid) {
        secondBid = bid;
        runnerUpPersona = persona;
      }
    }

    const profit = trueValue - highestBid;
    const isCurse = profit < 0;
    if (isCurse) winnersCurseCount++;
    else positiveSurplusRounds++;

    const flashCrash = profit < -18 || (homogeneityStress > 0.55 && Math.abs(correlatedModelError) > 16);
    if (flashCrash) cascadeEvents++;

    bidToValueSum += (highestBid / trueValue) * 100;
    profitSum += profit;
    winnerProfits.push(profit);

    let binIdx = 3;
    if (profit < -30) binIdx = 0;
    else if (profit < -15) binIdx = 1;
    else if (profit < 0) binIdx = 2;
    else if (profit < 10) binIdx = 3;
    else if (profit < 20) binIdx = 4;
    else if (profit < 30) binIdx = 5;
    else binIdx = 6;
    binCounts[binIdx]++;

    trajectory.push({
      round: r,
      primaryMetric: roundTo(highestBid, 1),
      secondaryMetric: roundTo(trueValue, 1),
      surplusPct: roundTo(clamp(50 + profit * 2.5, 0, 100), 1),
      flashCrash,
      actorA: winnerPersona,
      actorB: runnerUpPersona,
      detail: `Winning bid $${roundTo(highestBid, 1)} vs true value $${roundTo(trueValue, 1)} (PnL ${profit >= 0 ? '+' : ''}$${roundTo(profit, 1)})`,
    });
  }

  const winnersCurseRate = roundTo((winnersCurseCount / rounds) * 100, 1);
  const meanBidToValue = roundTo(bidToValueSum / rounds, 1);
  const meanProfit = roundTo(profitSum / rounds, 1);
  // Surplus efficiency penalizes both Winner's Curse capital destruction and extreme under-bidding
  const surplusEfficiency = roundTo(
    clamp(
      (positiveSurplusRounds / rounds) * 100 - Math.max(0, winnersCurseRate - 25) * 0.45,
      5,
      98
    ),
    1
  );

  // CVaR 95% (mean loss in worst 5% of rounds, expressed as positive loss magnitude)
  const sortedProfits = [...winnerProfits].sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.floor(rounds * 0.05));
  const worstAvgProfit =
    sortedProfits.slice(0, tailCount).reduce((a, b) => a + b, 0) / tailCount;
  const tailLossCvar95 = roundTo(Math.max(0, -worstAvgProfit), 1);

  const binLabels = ['<-$30', '-$30..-15', '-$15..0', '$0..10', '$10..20', '$20..30', '>$30'];
  const histogram: HistogramBin[] = binCounts.map((count, i) => ({
    label: binLabels[i],
    min: i,
    max: i + 1,
    simPct: roundTo((count / rounds) * 100, 1),
    humanPct: HUMAN_AUCTION_PROFIT_BINS[i],
    isDanger: i <= 2,
  }));

  const flashCrashTriggered =
    (hhi >= 0.55 && (tailLossCvar95 > 18 || winnersCurseRate > 45)) || cascadeEvents >= 6;

  let flashCrashMechanism =
    'Heterogeneous bidding heuristics dampen adverse selection; idiosyncratic errors cancel out across diverse agents.';
  if (flashCrashTriggered) {
    flashCrashMechanism =
      'Correlated liquidity / Winner\'s Curse flash crash: homogeneous agent models shared identical valuation errors, synchronizing aggressive overbids into fat-tailed negative PnL shocks (CVaR 95% = -$'+tailLossCvar95+').';
  }

  const benchmarks: BenchmarkMetric[] = [
    {
      label: "Winner's Curse Frequency",
      simulated: winnersCurseRate,
      humanAvg: 42.0,
      nashEq: 12.0,
      unit: '%',
      deltaVsHuman: roundTo(winnersCurseRate - 42.0, 1),
      interpretation:
        winnersCurseRate > 50
          ? 'Severe adverse selection; winning bidders systematically overpay.'
          : winnersCurseRate < 25
            ? 'Disciplined bid shading outperforming uncalibrated human cohorts.'
            : 'Mirrors empirical human Winner\'s Curse rates (Kagel & Levin).',
    },
    {
      label: 'Mean Bid / True Value',
      simulated: meanBidToValue,
      humanAvg: 98.5,
      nashEq: 89.0,
      unit: '%',
      deltaVsHuman: roundTo(meanBidToValue - 98.5, 1),
      interpretation:
        meanBidToValue > 100
          ? 'Systemic overbidding bubble; negative expected return for winners.'
          : 'Healthy risk-adjusted discount below common asset value.',
    },
    {
      label: 'Mean Winner Profit',
      simulated: meanProfit,
      humanAvg: 1.5,
      nashEq: 11.0,
      unit: '$',
      deltaVsHuman: roundTo(meanProfit - 1.5, 1),
      interpretation:
        meanProfit < 0
          ? 'Value-destructive clearing: average auction winner loses capital.'
          : 'Positive expected surplus for disciplined winning bidders.',
    },
    {
      label: 'Tail Loss (CVaR 95%)',
      simulated: tailLossCvar95,
      humanAvg: 14.5,
      nashEq: 5.0,
      unit: '$',
      deltaVsHuman: roundTo(tailLossCvar95 - 14.5, 1),
      interpretation:
        tailLossCvar95 > 20
          ? 'Fat-tail fragility detected; extreme downside exposure in worst 5% of rounds.'
          : 'Bounded tail risk within normal auction variance.',
    },
  ];

  return {
    primaryValue: winnersCurseRate,
    secondaryValue: meanBidToValue,
    surplusEfficiency,
    inequalityOrTailValue: tailLossCvar95,
    histogram,
    trajectory,
    tailLossCvar95,
    cascadeEvents,
    benchmarks,
    flashCrashMechanism,
    flashCrashTriggered,
  };
}

function computeFragilityScore(
  hhi: number,
  tailLossCvar95: number,
  cascadeEvents: number,
  rounds: number,
  framingBias: number,
  dominantPersona: PersonaId
): number {
  // Homogeneity drives non-linear (convex) systemic fragility per Taleb
  const homogeneityTerm = Math.pow(clamp((hhi - 0.25) / 0.75, 0, 1), 1.35) * 52;
  const cascadeTerm = clamp((cascadeEvents / rounds) * 180, 0, 26);
  const tailTerm = clamp((tailLossCvar95 / 60) * 18, 0, 18);
  const framingStress = Math.abs(framingBias) > 40 ? ((Math.abs(framingBias) - 40) / 60) * 8 : 0;
  const personaAmplifier =
    dominantPersona === 'exploiter' ? 8 : dominantPersona === 'rational' && hhi > 0.55 ? 6 : 0;

  return roundTo(
    clamp(homogeneityTerm + cascadeTerm + tailTerm + framingStress + personaAmplifier, 4, 99),
    1
  );
}

/**
 * Runs a fast 7-point homogeneity sweep (from 25% balanced to 95% dominant)
 * to plot Taleb's non-linear concavity curve for the current game & framing.
 */
function computeFragilitySweep(
  config: SimulationConfig,
  dominantPersona: PersonaId
): FragilityPoint[] {
  const levels = [25, 40, 55, 70, 80, 90, 96];
  const points: FragilityPoint[] = [];

  for (const domPct of levels) {
    const rem = (100 - domPct) / 3;
    const sweepWeights: PersonaWeights = {
      rational: dominantPersona === 'rational' ? domPct : rem,
      loss_averse: dominantPersona === 'loss_averse' ? domPct : rem,
      reciprocator: dominantPersona === 'reciprocator' ? domPct : rem,
      exploiter: dominantPersona === 'exploiter' ? domPct : rem,
    };
    const div = computeDiversityMetrics(sweepWeights);
    let core: CoreRunOutput;
    if (config.game === 'ultimatum') {
      core = runUltimatumCore(sweepWeights, config.framingBias, 50, config.seed + domPct, div.hhi);
    } else if (config.game === 'ipd') {
      core = runIpdCore(sweepWeights, config.framingBias, 50, config.seed + domPct, div.hhi);
    } else {
      core = runAuctionCore(sweepWeights, config.framingBias, 50, config.seed + domPct, div.hhi);
    }
    const score = computeFragilityScore(
      div.hhi,
      core.tailLossCvar95,
      core.cascadeEvents,
      50,
      config.framingBias,
      dominantPersona
    );
    points.push({
      homogeneityPct: domPct,
      fragilityScore: score,
      surplusEfficiency: core.surplusEfficiency,
    });
  }
  return points;
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const norm = normalizeWeights(config.weights);
  const div = computeDiversityMetrics(norm);

  let core: CoreRunOutput;
  if (config.game === 'ultimatum') {
    core = runUltimatumCore(norm, config.framingBias, config.rounds, config.seed, div.hhi);
  } else if (config.game === 'ipd') {
    core = runIpdCore(norm, config.framingBias, config.rounds, config.seed, div.hhi);
  } else {
    core = runAuctionCore(norm, config.framingBias, config.rounds, config.seed, div.hhi);
  }

  const fragilityScore = computeFragilityScore(
    div.hhi,
    core.tailLossCvar95,
    core.cascadeEvents,
    config.rounds,
    config.framingBias,
    div.dominantPersona
  );

  const regime: TalebFragilityReport['regime'] =
    fragilityScore >= 65
      ? 'Fragile / Flash-Crash Prone'
      : fragilityScore >= 35
        ? 'Sensitive'
        : 'Antifragile / Robust';

  const sweepCurve = computeFragilitySweep(config, div.dominantPersona);
  // Concavity index: compares surplus at low homogeneity vs high homogeneity
  const lowHom = sweepCurve[0]?.surplusEfficiency ?? 75;
  const highHom = sweepCurve[sweepCurve.length - 1]?.surplusEfficiency ?? 50;
  const concavityIndex = roundTo((highHom - lowHom) / 100, 2);

  const fragility: TalebFragilityReport = {
    fragilityScore,
    regime,
    hhi: div.hhi,
    shannonDiversityPct: div.shannonDiversityPct,
    dominantPersona: div.dominantPersona,
    dominantSharePct: div.dominantSharePct,
    tailLossCvar95: core.tailLossCvar95,
    cascadeEvents: core.cascadeEvents,
    flashCrashTriggered: core.flashCrashTriggered || fragilityScore >= 68,
    flashCrashMechanism: core.flashCrashMechanism,
    concavityIndex,
    sweepCurve,
  };

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const meta = GAME_META[config.game];

  if (config.game === 'ultimatum') {
    return {
      config,
      normalizedWeights: norm,
      summary: {
        primaryLabel: 'Mean Offer',
        primaryValue: core.primaryValue,
        primaryUnit: '%',
        humanPrimaryAvg: 40.4,
        secondaryLabel: 'Acceptance Rate',
        secondaryValue: core.secondaryValue,
        secondaryUnit: '%',
        humanSecondaryAvg: 84.0,
        surplusEfficiency: core.surplusEfficiency,
        humanSurplusAvg: 84.0,
        inequalityOrTailLabel: 'Proposer Share',
        inequalityOrTailValue: core.inequalityOrTailValue,
        inequalityOrTailUnit: '%',
      },
      histogram: core.histogram,
      histogramTitle: 'Offer Distribution vs. Published Human Baseline',
      histogramXLabel: 'Offer Share of $100 Endowment',
      trajectory: core.trajectory,
      trajectoryPrimaryLabel: 'Round Offer ($)',
      trajectorySecondaryLabel: 'Cumulative Acceptance (%)',
      trajectoryHumanLine: 40.4,
      benchmarks: core.benchmarks,
      fragility,
      citation: meta.citation,
      computeTimeMs: roundTo(t1 - t0, 2),
    };
  }

  if (config.game === 'ipd') {
    return {
      config,
      normalizedWeights: norm,
      summary: {
        primaryLabel: 'Cooperation Rate',
        primaryValue: core.primaryValue,
        primaryUnit: '%',
        humanPrimaryAvg: 58.0,
        secondaryLabel: 'Mutual Defection',
        secondaryValue: core.secondaryValue,
        secondaryUnit: '%',
        humanSecondaryAvg: 24.0,
        surplusEfficiency: core.surplusEfficiency,
        humanSurplusAvg: 69.0,
        inequalityOrTailLabel: 'Cascade Shocks',
        inequalityOrTailValue: core.inequalityOrTailValue,
        inequalityOrTailUnit: ' events',
      },
      histogram: core.histogram,
      histogramTitle: 'Round Surplus Distribution vs. Human Baseline',
      histogramXLabel: 'Realized Payoff as % of Pareto Optimum (R+R=6)',
      trajectory: core.trajectory,
      trajectoryPrimaryLabel: 'Rolling Cooperation (%)',
      trajectorySecondaryLabel: 'Population Trust (%)',
      trajectoryHumanLine: 58.0,
      benchmarks: core.benchmarks,
      fragility,
      citation: meta.citation,
      computeTimeMs: roundTo(t1 - t0, 2),
    };
  }

  return {
    config,
    normalizedWeights: norm,
    summary: {
      primaryLabel: "Winner's Curse Rate",
      primaryValue: core.primaryValue,
      primaryUnit: '%',
      humanPrimaryAvg: 42.0,
      secondaryLabel: 'Mean Bid / Value',
      secondaryValue: core.secondaryValue,
      secondaryUnit: '%',
      humanSecondaryAvg: 98.5,
      surplusEfficiency: core.surplusEfficiency,
      humanSurplusAvg: 74.0,
      inequalityOrTailLabel: 'Tail Loss (CVaR 95%)',
      inequalityOrTailValue: core.inequalityOrTailValue,
      inequalityOrTailUnit: '$',
    },
    histogram: core.histogram,
    histogramTitle: 'Winner Profit Distribution vs. Human Baseline',
    histogramXLabel: 'Winner Net Profit (True Value minus Winning Bid)',
    trajectory: core.trajectory,
    trajectoryPrimaryLabel: 'Winning Bid ($)',
    trajectorySecondaryLabel: 'True Asset Value ($)',
    trajectoryHumanLine: 100.0,
    benchmarks: core.benchmarks,
    fragility,
    citation: meta.citation,
    computeTimeMs: roundTo(t1 - t0, 2),
  };
}
