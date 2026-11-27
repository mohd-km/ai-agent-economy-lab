import { useMemo, useState } from 'react';
import { GLOBAL_GDP_BASELINE_T, MACRO_SECTORS } from './data/economyData';
import {
  BASELINE_SHOCK,
  runMacroShockSimulation,
  type ShockParams,
} from './engine/macroShock';
import { downloadEconomyCsv } from './engine/csvExport';
import {
  TreemapExplorer,
  type TreemapColorMode,
  type TreemapSizeMode,
} from './components/TreemapExplorer';
import { SectorInspector } from './components/SectorInspector';
import { MacroShockSimulator } from './components/MacroShockSimulator';
import { MethodologyDrawers } from './components/MethodologyDrawers';

export function App() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(MACRO_SECTORS[0].id);
  const [sizeMode, setSizeMode] = useState<TreemapSizeMode>('gdp');
  const [colorMode, setColorMode] = useState<TreemapColorMode>('shock');
  const [shockParams, setShockParams] = useState<ShockParams>(BASELINE_SHOCK);

  const summary = useMemo(() => runMacroShockSimulation(shockParams), [shockParams]);

  const hasActiveShock =
    shockParams.oilPriceUsd !== BASELINE_SHOCK.oilPriceUsd ||
    shockParams.policyRatePct !== BASELINE_SHOCK.policyRatePct ||
    shockParams.shippingDelayDays !== BASELINE_SHOCK.shippingDelayDays;

  const selectedResult = useMemo(
    () =>
      summary.results.find((r) => r.sector.id === selectedSectorId) ?? summary.results[0],
    [summary.results, selectedSectorId]
  );

  const handleExportCsv = () => {
    downloadEconomyCsv(summary, shockParams);
  };

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="header-main">
          <span className="kicker">Interactive Macro Atlas</span>
          <h1>World Economy &amp; Industry Value-Chain Explorer</h1>
          <p className="header-desc">
            Inspect the $110T global economy across 12 macro sectors and 50+ benchmarked subsectors, trace five-stage value chains, and stress-test live oil, interest-rate, and shipping shocks.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>
      </header>

      {/* Live Headline KPI Strip */}
      <section className="kpi-strip" aria-label="Global Economy Summary">
        <div className="kpi-card">
          <span className="metric-label">Global GDP (Value Added)</span>
          <strong className="kpi-num mono">${GLOBAL_GDP_BASELINE_T.toFixed(1)}T</strong>
          <span className="kpi-sub">64% Services &bull; 32% Industry &bull; 4% Primary</span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">Tracked Gross Revenue</span>
          <strong className="kpi-num mono">${(summary.totalRevenueB / 1000).toFixed(1)}T</strong>
          <span className="kpi-sub">Gross output across value-chain stages</span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">Live Global Profit Pool</span>
          <strong className="kpi-num mono">
            ${summary.shockedProfitPoolT.toFixed(2)}T
          </strong>
          <span className="kpi-sub mono">
            {hasActiveShock ? (
              <span className={summary.profitPoolDeltaB >= 0 ? 'delta-pos' : 'delta-neg'}>
                {summary.profitPoolDeltaB >= 0 ? '+' : ''}${summary.profitPoolDeltaB.toFixed(0)}B vs base
              </span>
            ) : (
              `Base $${summary.baselineProfitPoolT.toFixed(2)}T net earnings`
            )}
          </span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">Blended Net Margin</span>
          <strong className="kpi-num mono">{summary.shockedBlendedNetPct.toFixed(2)}%</strong>
          <span className="kpi-sub mono">
            {hasActiveShock
              ? `Top gain: ${summary.biggestWinner.sector.shortName}`
              : `Base ${summary.baselineBlendedNetPct.toFixed(2)}% across all sectors`}
          </span>
        </div>
      </section>

      {/* Module 1: Treemap + Sector Value-Chain Inspector */}
      <main className="main-content">
        <div className="explorer-grid">
          <TreemapExplorer
            results={summary.results}
            selectedSectorId={selectedSectorId}
            onSelectSector={setSelectedSectorId}
            sizeMode={sizeMode}
            onSizeModeChange={setSizeMode}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            hasActiveShock={hasActiveShock}
          />
          <SectorInspector result={selectedResult} hasActiveShock={hasActiveShock} />
        </div>

        {/* Module 2: Live Macro Shock Simulator */}
        <MacroShockSimulator
          params={shockParams}
          onChangeParams={setShockParams}
          summary={summary}
          selectedSectorId={selectedSectorId}
          onSelectSector={setSelectedSectorId}
          onExportCsv={handleExportCsv}
        />

        {/* Collapsible Reference Tables & Equations */}
        <MethodologyDrawers />
      </main>

      <footer className="site-footer">
        <span>World Economy &amp; Industry Value-Chain Explorer &mdash; Mohammed KM</span>
        <span>100% client-side simulation grounded in verified sector benchmarks &amp; UNCTAD freight math</span>
      </footer>
    </div>
  );
}

export default App;
