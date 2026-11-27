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
          <span className="metric-label">Capital Intensity</span>
          <strong className="mono">{sector.capitalIntensity}</strong>
        </div>
      </div>

      {/* 4 Core Financial Metrics */}
      <div className="metric-grid">
        <div className="metric-box">
          <span className="metric-label">Gross Revenue / GDP VA</span>
          <div className="metric-val mono">
            ${(sector.grossRevenueB / 1000).toFixed(2)}T
          </div>
          <span className="metric-note mono">
            ${sector.gdpValueAddedT.toFixed(1)}T GDP ({((sector.gdpValueAddedT / 110) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">EBITDA Margin</span>
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
            Base {sector.ebitdaPct.toFixed(1)}% | EBIT {sector.ebitPct.toFixed(1)}%
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Net Margin &amp; Profit Pool</span>
          <div className="metric-val mono">{result.shockedNetMarginPct.toFixed(1)}%</div>
          <span className="metric-note mono">
            ${(result.shockedProfitB / 1000).toFixed(2)}T{' '}
            {hasActiveShock && (
              <span className={deltaClass}>
                ({result.profitDeltaB >= 0 ? '+' : ''}${result.profitDeltaB.toFixed(0)}B)
              </span>
            )}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Pricing Power (Val - Vol)</span>
          <div className="metric-val mono">
            {pricingPowerPp >= 0 ? '+' : ''}
            {pricingPowerPp.toFixed(1)}pp
          </div>
          <span className="metric-note mono">
            Val +{sector.valueGrowthPct.toFixed(1)}% vs Vol +{sector.volumeGrowthPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Visual 5-Stage Value Chain */}
      <div className="value-chain-block">
        <div className="subhead-row">
          <h3 className="subhead">Major Value-Chain Stages</h3>
          <span className="caption-note">Share of final value &amp; typical stage margin</span>
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
                <span className="vc-margin mono">{stage.stageMarginPct}% net</span>
              </div>
              <div className="vc-stage-name">{stage.stage}</div>
              <div className="vc-stage-role">{stage.role}</div>
              <div className="vc-stage-bottleneck">Bottleneck: {stage.bottleneck}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Subsector Breakdown + Verified Top 3 Leaders */}
      <div className="subsector-section">
        <div className="subhead-row">
          <h3 className="subhead">Subsector Benchmarks ({sector.subsectors.length})</h3>
          <span className="caption-note">Select a subsector to inspect its Top 3 leaders</span>
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
                  COGS {activeSub.cogsPct}% | OpEx {activeSub.opexPct}% | Other {activeSub.otherPct}% | Net{' '}
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
                  title={`OpEx: ${activeSub.opexPct}%`}
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
                <span>Top 3 Leaders</span>
                <span>Revenue</span>
                <span>Gross %</span>
                <span>Net % vs Sector</span>
              </div>
              {activeSub.topLeaders.map((co) => {
                const spread = Number((co.netMarginPct - activeSub.netMarginPct).toFixed(1));
                return (
                  <div key={co.name} className="leader-row">
                    <span className="leader-name">
                      {co.name}
                      {co.verifiedFY25 && <span className="verified-tag">FY25</span>}
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
        <strong>Asset base:</strong> {sector.assetLifespanNote}. Financing &amp; capex drag:{' '}
        <span className="mono">{sector.financingCapexPct.toFixed(1)}%</span> of revenue.
      </p>
    </section>
  );
}
