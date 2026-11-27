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
          <span className="kicker">Interactive world economy map</span>
          <h1>World Economy &amp; Industry Value-Chain Explorer</h1>
          <p className="header-desc">
            See where the world&apos;s $110 trillion a year of output comes from, which industries keep the most profit, and what happens to those profits when oil, interest rates or shipping routes suddenly change.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <section className="story-card" aria-label="How to read this page">
        <div className="story-beat">
          <span className="story-tag">The problem</span>
          <p>
            News says &quot;oil is up&quot; or &quot;rates are up&quot;, but it is hard to see who actually wins or loses money. This page makes that visible, industry by industry.
          </p>
        </div>
        <div className="story-beat">
          <span className="story-tag">How it works</span>
          <p>
            Each of 12 industries carries real profit benchmarks plus a sensitivity: how many points of profit margin it gains or loses per $10 of oil, per 1% of interest rate and per 5 days of shipping delay. Move a slider and every number is recalculated in your browser.
          </p>
        </div>
        <div className="story-beat">
          <span className="story-tag">Try this first</span>
          <p>
            In the shock simulator below, drag <strong>Crude oil price</strong> to $120. Energy &amp; Mining gains about 11 points of margin, Transport &amp; Freight loses about 6, and the world&apos;s yearly profit pool falls by about $1 trillion.
          </p>
        </div>
      </section>

      {/* Live Headline KPI Strip */}
      <section className="kpi-strip" aria-label="Global Economy Summary">
        <div className="kpi-card">
          <span className="metric-label">World output a year (GDP)</span>
          <strong className="kpi-num mono">${GLOBAL_GDP_BASELINE_T.toFixed(1)}T</strong>
          <span className="kpi-sub">64% services, 32% industry, 4% farming and mining</span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">Total sales, all industries</span>
          <strong className="kpi-num mono">${(summary.totalRevenueB / 1000).toFixed(1)}T</strong>
          <span className="kpi-sub">Bigger than GDP because parts are sold several times on the way to you</span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">World profit pool (after all costs and tax)</span>
          <strong className="kpi-num mono">
            ${summary.shockedProfitPoolT.toFixed(2)}T
          </strong>
          <span className="kpi-sub mono">
            {hasActiveShock ? (
              <span className={summary.profitPoolDeltaB >= 0 ? 'delta-pos' : 'delta-neg'}>
                {summary.profitPoolDeltaB >= 0 ? '+' : '-'}${Math.abs(summary.profitPoolDeltaB).toFixed(0)}B vs normal
              </span>
            ) : (
              `Normal conditions, per year`
            )}
          </span>
        </div>
        <div className="kpi-card">
          <span className="metric-label">Profit kept per $100 of sales (net margin)</span>
          <strong className="kpi-num mono">{summary.shockedBlendedNetPct.toFixed(2)}%</strong>
          <span className="kpi-sub mono">
            {hasActiveShock
              ? `Biggest winner: ${summary.biggestWinner.sector.shortName}`
              : `Normal: ${summary.baselineBlendedNetPct.toFixed(2)}%, all industries`}
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
        <span>Runs entirely in your browser, using published industry benchmarks and UN shipping data (UNCTAD)</span>
      </footer>
    </div>
  );
}

export default App;
