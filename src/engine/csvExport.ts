import type { AggregateShockSummary, ShockParams } from './macroShock';

function csvCell(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildEconomyCsv(summary: AggregateShockSummary, params: ShockParams): string {
  const headers = [
    'Level',
    'Code',
    'Macro Sector',
    'Subsector',
    'Category',
    'GDP Value Added ($T)',
    'Gross Revenue ($B)',
    'Gross Margin (%)',
    'Baseline EBIT (%)',
    'Baseline EBITDA (%)',
    'Baseline Net Margin (%)',
    'Capital Intensity',
    'YoY Value Growth (%)',
    'YoY Volume Growth (%)',
    'Pricing Power (pp)',
    'Oil Shock ($/bbl)',
    'Policy Rate (%)',
    'Chokepoint Delay (days)',
    'Shocked EBITDA (%)',
    'Shocked Net Margin (%)',
    'Margin Delta (pp)',
    'Profit Pool Delta ($B)',
    'Top Sector Leaders',
  ];

  const rows: string[][] = [headers];

  for (const res of summary.results) {
    const s = res.sector;
    rows.push([
      'Macro Sector',
      s.id,
      s.name,
      'ALL SUBSECTORS',
      s.category,
      s.gdpValueAddedT.toFixed(2),
      s.grossRevenueB.toFixed(0),
      s.grossMarginPct.toFixed(1),
      s.ebitPct.toFixed(1),
      s.ebitdaPct.toFixed(1),
      s.netMarginPct.toFixed(1),
      s.capitalIntensity,
      s.valueGrowthPct.toFixed(1),
      s.volumeGrowthPct.toFixed(1),
      (s.valueGrowthPct - s.volumeGrowthPct).toFixed(1),
      params.oilPriceUsd.toFixed(0),
      params.policyRatePct.toFixed(2),
      params.shippingDelayDays.toFixed(0),
      res.shockedEbitdaPct.toFixed(2),
      res.shockedNetMarginPct.toFixed(2),
      res.marginDeltaPp.toFixed(2),
      res.profitDeltaB.toFixed(1),
      s.subsectors
        .slice(0, 3)
        .map((sub) => sub.topLeaders[0]?.name ?? '')
        .filter(Boolean)
        .join(' | '),
    ]);

    for (const sub of s.subsectors) {
      const subShockedNet = Math.max(-25, sub.netMarginPct + res.marginDeltaPp * 0.85);
      const subProfitDelta = (sub.revenueB * (subShockedNet - sub.netMarginPct)) / 100;
      rows.push([
        'Subsector',
        sub.code,
        s.name,
        sub.name,
        s.category,
        '',
        sub.revenueB.toFixed(0),
        sub.grossMarginPct.toFixed(1),
        sub.ebitPct.toFixed(1),
        (sub.ebitPct + (s.ebitdaPct - s.ebitPct)).toFixed(1),
        sub.netMarginPct.toFixed(1),
        s.capitalIntensity,
        sub.valGrowthPct.toFixed(1),
        sub.volGrowthPct.toFixed(1),
        (sub.valGrowthPct - sub.volGrowthPct).toFixed(1),
        params.oilPriceUsd.toFixed(0),
        params.policyRatePct.toFixed(2),
        params.shippingDelayDays.toFixed(0),
        (sub.ebitPct + (s.ebitdaPct - s.ebitPct) + res.marginDeltaPp).toFixed(2),
        subShockedNet.toFixed(2),
        res.marginDeltaPp.toFixed(2),
        subProfitDelta.toFixed(1),
        sub.topLeaders.map((l) => `${l.name} ($${l.revenueB}B, ${l.netMarginPct}% net)`).join(' | '),
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadEconomyCsv(summary: AggregateShockSummary, params: ShockParams): void {
  const csv = buildEconomyCsv(summary, params);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const tag = `oil${params.oilPriceUsd}_rate${params.policyRatePct.toFixed(1)}_delay${params.shippingDelayDays}d`;
  link.href = url;
  link.download = `world-economy-value-chain-${tag}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
