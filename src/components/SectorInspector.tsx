import { useEffect, useState } from 'react';
import type { SectorShockResult } from '../engine/macroShock';

interface SectorInspectorProps {
  result: SectorShockResult;
  hasActiveShock: boolean;
}

export function SectorInspector({ result, hasActiveShock }: SectorInspectorProps) {
  const { sector } = result;
  const [selectedSubCode, setSelectedSubCode] = useState<string>(sector.subsectors[0]?.code ?? '');

  useEffect(() => {
    setSelectedSubCode(sector.subsectors[0]?.code ?? '');
  }, [sector.id, sector.subsectors]);

  const activeSub =
    sector.subsectors.find((sub) => sub.code === selectedSubCode) ?? sector.subsectors[0];

  const pricingPowerPp = Number((sector.valueGrowthPct - sector.volumeGrowthPct).toFixed(1));
  const deltaClass =
    result.marginDeltaPp > 0.1
      ? 'delta-pos'
      : result.marginDeltaPp < -0.1
        ? 'delta-neg'
        : 'delta-flat';

  return (
    <section className="panel inspector-panel" aria-label="Selected Sector Inspector">
      <div className="inspector-head">
        <div>
          <span className="eyebrow">{sector.category} Sector</span>
          <h2 className="panel-title">{sector.name}</h2>
          <p className="panel-subtitle">{sector.summary}</p>
        </div>
        <div className="capital-badge">
          <span className="metric-label">Equipment needed (capital intensity)</span>
          <strong className="mono">{sector.capitalIntensity}</strong>
        </div>
      </div>
      <p className="plain-note">
        <strong>Capital intensity</strong> means how much must be spent on equipment, buildings, mines or data centres for every dollar of sales. &quot;Very High&quot; industries (power, mining, shipping, property) must keep spending heavily before they earn anything.
      </p>

      {/* 4 Core Financial Metrics */}
      <div className="metric-grid">
        <div className="metric-box">
          <span className="metric-label">Yearly sales / share of world output</span>
          <div className="metric-val mono">
            ${(sector.grossRevenueB / 1000).toFixed(2)}T
          </div>
          <span className="metric-note mono">
            ${sector.gdpValueAddedT.toFixed(1)}T of GDP ({((sector.gdpValueAddedT / 110) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Operating profit (EBITDA margin)</span>
          <div className="metric-val mono">
            {result.shockedEbitdaPct.toFixed(1)}%
            {hasActiveShock && (
              <span className={`delta-chip ${deltaClass}`}>
                {result.marginDeltaPp >= 0 ? '+' : ''}
                {result.marginDeltaPp.toFixed(1)}pp
              </span>
            )}
          </div>
          <span className="metric-note mono">
            Normal {sector.ebitdaPct.toFixed(1)}% | after equipment wear (EBIT) {sector.ebitPct.toFixed(1)}%
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Final profit (net margin) &amp; total profit</span>
          <div className="metric-val mono">{result.shockedNetMarginPct.toFixed(1)}%</div>
          <span className="metric-note mono">
            ${(result.shockedProfitB / 1000).toFixed(2)}T{' '}
            {hasActiveShock && (
              <span className={deltaClass}>
                ({result.profitDeltaB >= 0 ? '+' : '-'}${Math.abs(result.profitDeltaB).toFixed(0)}B)
              </span>
            )}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Pricing power (sales growth minus volume growth)</span>
          <div className="metric-val mono">
            {pricingPowerPp >= 0 ? '+' : ''}
            {pricingPowerPp.toFixed(1)}pp
          </div>
          <span className="metric-note mono">
            Sales +{sector.valueGrowthPct.toFixed(1)}% vs units sold +{sector.volumeGrowthPct.toFixed(1)}% a year. A bigger gap means it can raise prices.
          </span>
        </div>
      </div>

      {/* Visual 5-Stage Value Chain */}
      <div className="value-chain-block">
        <div className="subhead-row">
          <h3 className="subhead">From raw material to customer (value chain)</h3>
          <span className="caption-note">Each step&apos;s share of the final price, and the profit it keeps</span>
        </div>

        {/* Stacked proportional bar */}
        <div className="vc-bar" role="img" aria-label="Proportional value-chain share bar">
          {sector.valueChain.map((stage, idx) => {
            const shades = ['#e6eeee', '#c7dddd', '#9bc2c2', '#5b9696', '#0f5c5c'];
            const textLight = idx >= 3;
            return (
              <div
                key={stage.stage}
                className="vc-bar-seg"
                style={{
                  width: `${stage.shareOfPricePct}%`,
                  backgroundColor: shades[idx % shades.length],
                  color: textLight ? '#ffffff' : '#111111',
                }}
                title={`${stage.stage}: ${stage.shareOfPricePct}% share, ~${stage.stageMarginPct}% margin`}
              >
                <span className="mono">{stage.shareOfPricePct}%</span>
              </div>
            );
          })}
        </div>

        {/* Stage cards */}
        <div className="vc-stages-grid">
          {sector.valueChain.map((stage, idx) => (
            <div key={stage.stage} className="vc-stage-card">
              <div className="vc-stage-top">
                <span className="vc-step mono">0{idx + 1}</span>
                <span className="vc-margin mono">{stage.stageMarginPct}% profit</span>
              </div>
              <div className="vc-stage-name">{stage.stage}</div>
              <div className="vc-stage-role">{stage.role}</div>
              <div className="vc-stage-bottleneck">Weak point: {stage.bottleneck}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Subsector Breakdown + Verified Top 3 Leaders */}
      <div className="subsector-section">
        <div className="subhead-row">
          <h3 className="subhead">Industries inside this sector ({sector.subsectors.length})</h3>
          <span className="caption-note">Pick one to see where each $100 of sales goes and its 3 biggest companies</span>
        </div>

        <div className="subsector-pills">
          {sector.subsectors.map((sub) => (
            <button
              key={sub.code}
              type="button"
              className={sub.code === activeSub?.code ? 'sub-btn active' : 'sub-btn'}
              onClick={() => setSelectedSubCode(sub.code)}
            >
              <span>{sub.name}</span>
              <span className="mono">
                ${sub.revenueB >= 1000 ? `${(sub.revenueB / 1000).toFixed(1)}T` : `${sub.revenueB}B`}
              </span>
            </button>
          ))}
        </div>

        {activeSub && (
          <div className="subsector-detail-card">
            <div className="cost-stack-row">
              <div className="cost-stack-header">
                <strong>
                  {activeSub.code} {activeSub.name}
                </strong>
                <span className="mono">
                  Making it (COGS) {activeSub.cogsPct}% | Running costs (OpEx) {activeSub.opexPct}% | Interest, tax &amp; equipment {activeSub.otherPct}% | Kept as profit{' '}
                  {activeSub.netMarginPct}%
                </span>
              </div>
              <div className="cost-bar" aria-label="Subsector cost stack">
                <div
                  className="cost-seg cogs"
                  style={{ width: `${activeSub.cogsPct}%` }}
                  title={`Direct Costs (COGS): ${activeSub.cogsPct}%`}
                />
                <div
                  className="cost-seg opex"
                  style={{ width: `${activeSub.opexPct}%` }}
                  title={`Running costs (OpEx): ${activeSub.opexPct}%`}
                />
                <div
                  className="cost-seg other"
                  style={{ width: `${activeSub.otherPct}%` }}
                  title={`Financing, Tax & CapEx: ${activeSub.otherPct}%`}
                />
                <div
                  className="cost-seg net"
                  style={{ width: `${Math.max(2, activeSub.netMarginPct)}%` }}
                  title={`Net Margin: ${activeSub.netMarginPct}%`}
                />
              </div>
            </div>

            <div className="leaders-list">
              <div className="leaders-head">
                <span>3 biggest companies</span>
                <span>Yearly sales</span>
                <span>Left after making it (gross %)</span>
                <span>Final profit % vs industry</span>
              </div>
              {activeSub.topLeaders.map((co) => {
                const spread = Number((co.netMarginPct - activeSub.netMarginPct).toFixed(1));
                return (
                  <div key={co.name} className="leader-row">
                    <span className="leader-name">
                      {co.name}
                      {co.verifiedFY25 && <span className="verified-tag" title="Checked against the company's 2025 financial year report">FY25</span>}
                    </span>
                    <span className="mono">${co.revenueB.toFixed(1)}B</span>
                    <span className="mono">{co.grossMarginPct.toFixed(1)}%</span>
                    <span className="mono">
                      {co.netMarginPct.toFixed(1)}%{' '}
                      <span className={spread >= 0 ? 'delta-pos' : 'delta-neg'}>
                        ({spread >= 0 ? '+' : ''}
                        {spread}pp)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="asset-note">
        <strong>What it owns:</strong> {sector.assetLifespanNote}. Interest, leases and new equipment eat{' '}
        <span className="mono">{sector.financingCapexPct.toFixed(1)}%</span> of sales.
      </p>
    </section>
  );
}
