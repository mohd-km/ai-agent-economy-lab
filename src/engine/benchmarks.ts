import { GameId, PersonaId, PersonaMeta, ScenarioPreset } from './types';

export const PERSONA_META: Record<PersonaId, PersonaMeta> = {
  rational: {
    id: 'rational',
    label: 'Rational Optimizer',
    shortLabel: 'Rational',
    color: '#1d4ed8',
    description:
      'Subgame-perfect utility maximizer. Computes Nash equilibria, backward-inducts defection, and converges on identical pricing heuristics.',
    behavioralRule:
      'Minimizes offers, exploits naive cooperators, and herds tightly on correlated signals.',
  },
  loss_averse: {
    id: 'loss_averse',
    label: 'Loss-Averse Human Baseline',
    shortLabel: 'Loss-Averse',
    color: '#0f766e',
    description:
      'Prospect Theory agent (lambda = 2.25). Treats unfairness as a salient loss, defends reciprocity cautiously, and shades bids to avoid regret.',
    behavioralRule:
      'Rejects offers below fairness anchor, avoids downside tail risk, and reacts sharply to scarcity framing.',
  },
  reciprocator: {
    id: 'reciprocator',
    label: 'Cooperative Reciprocator',
    shortLabel: 'Reciprocator',
    color: '#047857',
    description:
      'Conditional cooperator running Tit-for-Tat with mild forgiveness. Prioritizes joint surplus, fair 50/50 splits, and market discipline.',
    behavioralRule:
      'Starts fair and cooperative, mirrors partner behavior, and stabilizes market clearing prices.',
  },
  exploiter: {
    id: 'exploiter',
    label: 'Adversarial Exploiter',
    shortLabel: 'Exploiter',
    color: '#b91c1c',
    description:
      'Aggressive margin-extractor. Probes rejection floors, defects persistently in repeated games, and snipes/overbids in sealed auctions.',
    behavioralRule:
      'Always-Defect bias, extreme low-ball Ultimatum offers, and destabilizing auction overbidding.',
  },
};

export const PERSONA_ORDER: PersonaId[] = [
  'rational',
  'loss_averse',
  'reciprocator',
  'exploiter',
];

export const GAME_META: Record<
  GameId,
  {
    id: GameId;
    title: string;
    shortTitle: string;
    subtitle: string;
    mechanism: string;
    citation: string;
  }
> = {
  ultimatum: {
    id: 'ultimatum',
    title: 'Ultimatum Game',
    shortTitle: 'Ultimatum',
    subtitle: 'Fairness vs. Rational Selfishness',
    mechanism:
      'A Proposer splits a $100 endowment with a Responder. If the Responder rejects, both receive $0. Classical game theory predicts a $1 offer accepted 100% of the time; humans average 40.4% offers and punish unfair splits.',
    citation:
      'Human baseline: Oosterbeek, Sloof & van de Kuilen (2004) meta-analysis of 37 Ultimatum studies (mean offer 40.4%, acceptance 84.0%); Guth, Schmittberger & Schwarze (1982).',
  },
  ipd: {
    id: 'ipd',
    title: "Iterated Prisoner's Dilemma",
    shortTitle: 'Prisoner Dilemma',
    subtitle: 'Tit-for-Tat vs. Defect Cascades',
    mechanism:
      'Matched agents play 100 repeated rounds (R=3, T=5, P=1, S=0) with memory of partner defection and population trust. Homogeneous optimizers or adversarial shocks trigger sudden system-wide defect cascades.',
    citation:
      'Human baseline: Dal Bo & Frechette (2018) meta-analysis of infinitely repeated PD (58.0% cooperation, 69.0% Pareto surplus); Axelrod (1984) Tit-for-Tat tournaments.',
  },
  auction: {
    id: 'auction',
    title: 'Sealed-Bid Market Auction',
    shortTitle: 'Sealed Auction',
    subtitle: "Winner's Curse & Tail Fragility",
    mechanism:
      'Agents bid simultaneously on a common-value asset (true value V ~ $100) using noisy private signals. Failing to shade bids for adverse selection causes Winner\'s Curse; homogeneous models trigger synchronized liquidity crashes.',
    citation:
      'Human baseline: Kagel & Levin (1986, 2002) common-value first-price auction experiments (42.0% Winner\'s Curse frequency, 98.5% mean bid/value ratio, 74.0% surplus efficiency).',
  },
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'human-baseline',
    name: 'Human Behavioral Mix',
    tagline: 'Empirical population resembling lab cohorts',
    weights: { rational: 15, loss_averse: 45, reciprocator: 30, exploiter: 10 },
    framingBias: 0,
  },
  {
    id: 'homogeneous-rational',
    name: 'Homogeneous AI Optimizers',
    tagline: '90% Rational agents: high synchronization & flash-crash risk',
    weights: { rational: 90, loss_averse: 5, reciprocator: 5, exploiter: 0 },
    framingBias: -25,
  },
  {
    id: 'adversarial-shock',
    name: 'Adversarial Shock + Scarcity',
    tagline: 'Predatory exploiters under negative loss framing',
    weights: { rational: 20, loss_averse: 20, reciprocator: 10, exploiter: 50 },
    framingBias: -70,
  },
  {
    id: 'antifragile-diverse',
    name: 'Diverse Ecosystem',
    tagline: 'Balanced heterogeneous mix with cooperative framing',
    weights: { rational: 25, loss_averse: 25, reciprocator: 35, exploiter: 15 },
    framingBias: 35,
  },
];

// Published human empirical offer distribution (0-100% in 10% bins)
export const HUMAN_ULTIMATUM_BINS = [1, 3, 7, 14, 24, 38, 9, 2, 1, 1];

// Published human IPD surplus distribution (bins from 0% to 100% of Pareto optimum)
export const HUMAN_IPD_SURPLUS_BINS = [14, 8, 12, 16, 14, 36];

// Published human Auction Winner Profit distribution (bins from -$40 to +$40)
export const HUMAN_AUCTION_PROFIT_BINS = [5, 11, 26, 28, 19, 8, 3];
