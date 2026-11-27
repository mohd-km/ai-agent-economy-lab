import { MACRO_SECTORS, type MacroSector } from '../data/economyData';

export interface ShockParams {
  /** Crude oil price in USD/bbl (baseline $75) */
  oilPriceUsd: number;
  /** Global policy interest rate in % (baseline 4.5%) */
  policyRatePct: number;
  /** Maritime chokepoint delay in extra days (baseline 0 days; Red Sea/Cape ~ +14-18 days) */
  shippingDelayDays: number;
}

export const BASELINE_SHOCK: ShockParams = {
  oilPriceUsd: 75,
  policyRatePct: 4.5,
  shippingDelayDays: 0,
};

export interface ShockPreset {
  id: string;
  label: string;
  note: string;
  params: ShockParams;
}

export const SHOCK_PRESETS: ShockPreset[] = [
  {
    id: 'baseline',
    label: 'Normal times',
    note: '$75 oil, 4.5% rate, open sea routes',
    params: { oilPriceUsd: 75, policyRatePct: 4.5, shippingDelayDays: 0 },
  },
  {
    id: 'red-sea',
    label: 'Red Sea closed, ships go round Africa',
    note: '+16 days at sea, $92 oil',
    params: { oilPriceUsd: 92, policyRatePct: 4.75, shippingDelayDays: 16 },
  },
  {
    id: 'oil-rate-spike',
    label: '2022 energy and interest-rate spike',
    note: '$118 oil, 6.25% rate, +6 days at sea',
    params: { oilPriceUsd: 118, policyRatePct: 6.25, shippingDelayDays: 6 },
  },
  {
    id: 'stagflation',
    label: 'Stagflation: prices soar, growth stalls',
    note: '$145 oil, 8.0% rate, +22 days at sea',
    params: { oilPriceUsd: 145, policyRatePct: 8.0, shippingDelayDays: 22 },
  },
  {
    id: 'easing',
    label: 'Cheap energy and rate cuts',
    note: '$55 oil, 2.25% rate, no delays',
    params: { oilPriceUsd: 55, policyRatePct: 2.25, shippingDelayDays: 0 },
  },
];

export interface SectorShockResult {
  sector: MacroSector;
  oilDeltaPp: number;
  rateDeltaPp: number;
  shippingDeltaPp: number;
  marginDeltaPp: number;
  shockedEbitdaPct: number;
  shockedNetMarginPct: number;
  shockedRevenueB: number;
  baselineProfitB: number;
  shockedProfitB: number;
  profitDeltaB: number;
}

export interface MarkupStageShock {
  stage: string;
  baselineBuy: number;
  baselineSell: number;
  baselineMarkupPct: number;
  shockedBuy: number;
  shockedSell: number;
  shockedMarginCapture: number;
  baselineMarginCapture: number;
  costDriver: string;
}

export interface AggregateShockSummary {
  results: SectorShockResult[];
  totalRevenueB: number;
  totalShockedRevenueB: number;
  baselineProfitPoolT: number;
  shockedProfitPoolT: number;
  profitPoolDeltaB: number;
  baselineBlendedNetPct: number;
  shockedBlendedNetPct: number;
  fleetCapacitySqueezePct: number;
  averageSeaHaulNm: number;
  biggestWinner: SectorShockResult;
  biggestLoser: SectorShockResult;
  markupStack: MarkupStageShock[];
  shelfPriceIndex: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function evaluateSectorShock(sector: MacroSector, params: ShockParams): SectorShockResult {
  const oilSteps = (params.oilPriceUsd - BASELINE_SHOCK.oilPriceUsd) / 10;
  const rateSteps = params.policyRatePct - BASELINE_SHOCK.policyRatePct; // in percentage points (= 100 bps)
  const shipSteps = params.shippingDelayDays / 5;

  const oilDeltaPp = oilSteps * sector.sensitivities.oilPer10Usd;

  // Non-linear credit stress for financials when rates exceed 7.0%
  let rateDeltaPp = rateSteps * sector.sensitivities.ratePer100Bps;
  if (sector.id === 'financial-services' && params.policyRatePct > 7.0) {
    const excessRate = params.policyRatePct - 7.0;
    rateDeltaPp -= excessRate * 1.15; // Rising NPLs & bond mark-to-market drag
  }

  const shippingDeltaPp = shipSteps * sector.sensitivities.shippingPer5Days;

  const marginDeltaPp = Number((oilDeltaPp + rateDeltaPp + shippingDeltaPp).toFixed(2));
  const shockedEbitdaPct = Number(clamp(sector.ebitdaPct + marginDeltaPp, -8, 65).toFixed(2));
  const shockedNetMarginPct = Number(clamp(sector.netMarginPct + marginDeltaPp * 0.85, -12, 50).toFixed(2));

  // Revenue shift from rate demand elasticity + oil price pass-through for energy
  let revShiftPct = rateSteps * sector.sensitivities.revRateElasticity;
  if (sector.id === 'energy-utilities-mining') {
    revShiftPct += oilSteps * 3.8;
  } else if (sector.id === 'transport-logistics') {
    revShiftPct += shipSteps * 1.2;
  }
  const shockedRevenueB = sector.grossRevenueB * (1 + clamp(revShiftPct, -25, 45) / 100);

  const baselineProfitB = sector.grossRevenueB * (sector.netMarginPct / 100);
  const shockedProfitB = shockedRevenueB * (shockedNetMarginPct / 100);
  const profitDeltaB = shockedProfitB - baselineProfitB;

  return {
    sector,
    oilDeltaPp: Number(oilDeltaPp.toFixed(2)),
    rateDeltaPp: Number(rateDeltaPp.toFixed(2)),
    shippingDeltaPp: Number(shippingDeltaPp.toFixed(2)),
    marginDeltaPp,
    shockedEbitdaPct,
    shockedNetMarginPct,
    shockedRevenueB,
    baselineProfitB,
    shockedProfitB,
    profitDeltaB,
  };
}

/**
 * Grounded in logistics_freight_and_shipping.md Section 5:
 * $10 Raw -> $15 Factory -> $20 Brand -> $40 Distributor -> $50 Retailer -> $100 Shelf
 */
function computeMarkupStack(params: ShockParams): { stack: MarkupStageShock[]; shelfPrice: number } {
  const oilFactor = (params.oilPriceUsd - BASELINE_SHOCK.oilPriceUsd) / 75; // +100% oil = +1.0
  const rateFactor = (params.policyRatePct - BASELINE_SHOCK.policyRatePct) / 100; // +100 bps = 0.01
  const delayFactor = params.shippingDelayDays / 15; // +15 days Cape detour = 1.0

  // Stage 1: Raw material ($10 -> $15)
  const rawBuy = 10 * (1 + oilFactor * 0.22);
  const rawSell = rawBuy * (1.5 - clamp(oilFactor * 0.04, -0.05, 0.08));

  // Stage 2: Factory OEM ($15 -> $20)
  const facBuy = rawSell;
  const facSell = facBuy * (1.333 + delayFactor * 0.02 - rateFactor * 1.2);

  // Stage 3: Brand / Wholesaler ($20 -> $40) — absorbs ocean freight & customs
  const brandBuy = facSell + delayFactor * 2.4 + oilFactor * 1.1;
  const brandSell = brandBuy * (2.0 - delayFactor * 0.05 - oilFactor * 0.04);

  // Stage 4: Regional Distributor ($40 -> $50) — domestic haul & working capital
  const distBuy = brandSell;
  const distSell = distBuy * (1.25 + oilFactor * 0.03 + rateFactor * 1.5);

  // Stage 5: Retailer ($50 -> $100) — rent, staff, shrinkage, partial consumer pass-through
  const retBuy = distSell;
  const retSell = retBuy * (2.0 - clamp(delayFactor * 0.04 + oilFactor * 0.05 + rateFactor * 1.8, -0.1, 0.22));

  const stack: MarkupStageShock[] = [
    {
      stage: 'Raw Material',
      baselineBuy: 10,
      baselineSell: 15,
      baselineMarkupPct: 50,
      shockedBuy: rawBuy,
      shockedSell: rawSell,
      baselineMarginCapture: 5,
      shockedMarginCapture: rawSell - rawBuy,
      costDriver: 'Extraction, refining, energy',
    },
    {
      stage: 'Factory (OEM)',
      baselineBuy: 15,
      baselineSell: 20,
      baselineMarkupPct: 33,
      shockedBuy: facBuy,
      shockedSell: facSell,
      baselineMarginCapture: 5,
      shockedMarginCapture: facSell - facBuy,
      costDriver: 'Labour, tooling, process heat',
    },
    {
      stage: 'Brand & Ocean Freight',
      baselineBuy: 20,
      baselineSell: 40,
      baselineMarkupPct: 100,
      shockedBuy: brandBuy,
      shockedSell: brandSell,
      baselineMarginCapture: 20,
      shockedMarginCapture: brandSell - brandBuy,
      costDriver: 'R&D, ocean boxes, customs',
    },
    {
      stage: 'Regional Distributor',
      baselineBuy: 40,
      baselineSell: 50,
      baselineMarkupPct: 25,
      shockedBuy: distBuy,
      shockedSell: distSell,
      baselineMarginCapture: 10,
      shockedMarginCapture: distSell - distBuy,
      costDriver: 'Warehousing, diesel trucking',
    },
    {
      stage: 'Retail Shelf',
      baselineBuy: 50,
      baselineSell: 100,
      baselineMarkupPct: 100,
      shockedBuy: retBuy,
      shockedSell: retSell,
      baselineMarginCapture: 50,
      shockedMarginCapture: retSell - retBuy,
      costDriver: 'Rent, staff, shrinkage',
    },
  ];

  return { stack, shelfPrice: retSell };
}

export function runMacroShockSimulation(params: ShockParams): AggregateShockSummary {
  const results = MACRO_SECTORS.map((s) => evaluateSectorShock(s, params));

  const totalRevenueB = results.reduce((acc, r) => acc + r.sector.grossRevenueB, 0);
  const totalShockedRevenueB = results.reduce((acc, r) => acc + r.shockedRevenueB, 0);
  const baselineProfitB = results.reduce((acc, r) => acc + r.baselineProfitB, 0);
  const shockedProfitB = results.reduce((acc, r) => acc + r.shockedProfitB, 0);

  const sortedByDelta = [...results].sort((a, b) => b.marginDeltaPp - a.marginDeltaPp);

  // Grounded in UNCTAD 2025: Fleet = Voyages * RoundTripDays / 365; average baseline haul 4,831 nm, Red Sea pushed to 5,245 nm (+8.6%)
  // A typical Asia-Europe / intercontinental round trip averages ~58 days; adding delay days directly ties up global vessel capacity.
  const fleetCapacitySqueezePct = Number(((params.shippingDelayDays / 58) * 100).toFixed(1));
  const averageSeaHaulNm = Math.round(4831 + params.shippingDelayDays * 28.5);

  const { stack, shelfPrice } = computeMarkupStack(params);

  return {
    results,
    totalRevenueB,
    totalShockedRevenueB,
    baselineProfitPoolT: baselineProfitB / 1000,
    shockedProfitPoolT: shockedProfitB / 1000,
    profitPoolDeltaB: shockedProfitB - baselineProfitB,
    baselineBlendedNetPct: (baselineProfitB / totalRevenueB) * 100,
    shockedBlendedNetPct: (shockedProfitB / totalShockedRevenueB) * 100,
    fleetCapacitySqueezePct,
    averageSeaHaulNm,
    biggestWinner: sortedByDelta[0],
    biggestLoser: sortedByDelta[sortedByDelta.length - 1],
    markupStack: stack,
    shelfPriceIndex: shelfPrice,
  };
}
