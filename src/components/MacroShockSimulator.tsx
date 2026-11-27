import {
  BASELINE_SHOCK,
  SHOCK_PRESETS,
  type AggregateShockSummary,
  type ShockParams,
} from '../engine/macroShock';

interface MacroShockSimulatorProps {
  params: ShockParams;
  onChangeParams: (next: ShockParams) => void;
  summary: AggregateShockSummary;
  selectedSectorId: string;
  onSelectSector: (id: string) => void;
  onExportCsv: () => void;
}

export function MacroShockSimulator({
  params,
  onChangeParams,
  summary,
  selectedSectorId,
  onSelectSector,
  onExportCsv,
}: MacroShockSimulatorProps) {
  const sortedResults = [...summary.results].sort((a, b) => b.marginDeltaPp - a.marginDeltaPp);
  const maxAbsDelta = Math.max(4, ...sortedResults.map((r) => Math.abs(r.marginDeltaPp)));

  const isBaseline =
    params.oilPriceUsd === BASELINE_SHOCK.oilPriceUsd &&
    params.policyRatePct === BASELINE_SHOCK.policyRatePct &&
    params.shippingDelayDays === BASELINE_SHOCK.shippingDelayDays;

  return (
    <section className="panel shock-panel" aria-label="Live Macro Shock Simulator">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Live Macro Shock Simulator</h2>
          <p className="panel-subtitle">
            Dial crude oil, policy rates, or maritime chokepoint delays to stress-test margins and global profit pools live.
          </p>
        </div>
        <div className="shock-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChangeParams(BASELINE_SHOCK)}
            disabled={isBaseline}
          >
            Reset Baseline
          </button>
          <button type="button" className="btn-primary" onClick={onExportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Scenario Presets */}
      <div className="preset-row" role="group" aria-label="Macro shock presets">
        {SHOCK_PRESETS.map((preset) => {
          const active =
            preset.params.oilPriceUsd === params.oilPriceUsd &&
            preset.params.policyRatePct === params.policyRatePct &&
            preset.params.shippingDelayDays === params.shippingDelayDays;
          return (
            <button
              key={preset.id}
              type="button"
              className={active ? 'preset-btn active' : 'preset-btn'}
              onClick={() => onChangeParams(preset.params)}
            >
              <span className="preset-label">{preset.label}</span>
              <span className="preset-note">{preset.note}</span>
            </button>
          );
        })}
      </div>

      {/* 3 Interactive Sliders */}
      <div className="sliders-grid">
        <label className="slider-card">
          <div className="slider-top">
            <span className="slider-name">Crude Oil Price</span>
            <span className="slider-val mono">${params.oilPriceUsd}/bbl</span>
          </div>
          <input
            type="range"
            min={40}
            max={160}
            step={1}
            value={params.oilPriceUsd}
            onChange={(e) =>
              onChangeParams({ ...params, oilPriceUsd: Number(e.target.value) })
            }
          />
          <div className="slider-scale mono">
            <span>$40</span>
            <span>Base $75</span>
            <span>$160</span>
          </div>
        </label>

        <label className="slider-card">
          <div className="slider-top">
            <span className="slider-name">Policy Interest Rate</span>
            <span className="slider-val mono">{params.policyRatePct.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10.0}
            step={0.25}
            value={params.policyRatePct}
            onChange={(e) =>
              onChangeParams({ ...params, policyRatePct: Number(e.target.value) })
            }
          />
          <div className="slider-scale mono">
            <span>0.5%</span>
            <span>Base 4.5%</span>
            <span>10.0%</span>
          </div>
        </label>

        <label className="slider-card">
          <div className="slider-top">
            <span className="slider-name">Shipping Chokepoint Delay</span>
            <span className="slider-val mono">+{params.shippingDelayDays} days</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={params.shippingDelayDays}
            onChange={(e) =>
              onChangeParams({ ...params, shippingDelayDays: Number(e.target.value) })
            }
          />
          <div className="slider-scale mono">
            <span>0d</span>
            <span>Cape Detour +16d</span>
            <span>+30d</span>
          </div>
        </label>
      </div>

      {/* Two-Column Visual Simulation Outputs */}
      <div className="shock-visuals-grid">
        {/* Diverging Tornado Chart */}
        <div className="subpanel">
          <div className="subhead-row">
            <h3 className="subhead">Sector EBITDA Margin Shift (pp)</h3>
            <span className="caption-note">Click any bar to inspect sector</span>
          </div>

          <div className="tornado-list">
            {sortedResults.map((res) => {
              const pctWidth = (Math.abs(res.marginDeltaPp) / maxAbsDelta) * 50;
              const isPos = res.marginDeltaPp >= 0;
              const isSelected = res.sector.id === selectedSectorId;
              return (
                <button
                  key={res.sector.id}
                  type="button"
                  className={isSelected ? 'tornado-row selected' : 'tornado-row'}
                  onClick={() => onSelectSector(res.sector.id)}
                >
                  <span className="tornado-label">{res.sector.shortName}</span>
                  <div className="tornado-track" aria-hidden="true">
                    <div className="tornado-zero" />
                    <div
                      className={isPos ? 'tornado-bar pos' : 'tornado-bar neg'}
                      style={{
                        left: isPos ? '50%' : `${50 - pctWidth}%`,
                        width: `${Math.max(0.8, pctWidth)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`tornado-val mono ${
                      res.marginDeltaPp > 0.05
                        ? 'delta-pos'
                        : res.marginDeltaPp < -0.05
                          ? 'delta-neg'
                          : ''
                    }`}
                  >
                    {res.marginDeltaPp >= 0 ? '+' : ''}
                    {res.marginDeltaPp.toFixed(1)}pp
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Supply-Chain Markup Stack & Fleet Math */}
        <div className="subpanel">
          <div className="subhead-row">
            <h3 className="subhead">Supply-Chain Markup Stack ($10 &rarr; $100)</h3>
            <span className="caption-note mono">
              Live shelf index: ${summary.shelfPriceIndex.toFixed(1)} (base $100)
            </span>
          </div>

          <div className="markup-stack">
            {summary.markupStack.map((st) => {
              const barPct = Math.min(100, (st.shockedSell / Math.max(105, summary.shelfPriceIndex)) * 100);
              const basePct = Math.min(100, (st.baselineSell / Math.max(105, summary.shelfPriceIndex)) * 100);
              const diff = st.shockedSell - st.baselineSell;
              return (
                <div key={st.stage} className="markup-row">
                  <div className="markup-meta">
                    <span className="markup-stage">{st.stage}</span>
                    <span className="mono markup-price">
                      ${st.shockedSell.toFixed(1)}{' '}
                      <span className={diff > 0.3 ? 'delta-neg' : diff < -0.3 ? 'delta-pos' : 'muted'}>
                        ({diff >= 0 ? '+' : ''}
                        {diff.toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <div className="markup-bar-bg">
                    <div className="markup-bar-base" style={{ width: `${basePct}%` }} />
                    <div className="markup-bar-live" style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="markup-driver">{st.costDriver}</div>
                </div>
              );
            })}
          </div>

          <div className="fleet-kpi-strip">
            <div>
              <span className="metric-label">Avg Sea Haul (UNCTAD)</span>
              <strong className="mono">{summary.averageSeaHaulNm.toLocaleString()} nm</strong>
            </div>
            <div>
              <span className="metric-label">Fleet Capacity Squeeze</span>
              <strong className="mono">+{summary.fleetCapacitySqueezePct.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="metric-label">Global Profit Delta</span>
              <strong
                className={`mono ${
                  summary.profitPoolDeltaB > 5
                    ? 'delta-pos'
                    : summary.profitPoolDeltaB < -5
                      ? 'delta-neg'
                      : ''
                }`}
              >
                {summary.profitPoolDeltaB >= 0 ? '+' : ''}${summary.profitPoolDeltaB.toFixed(0)}B
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
