import React, { useMemo, useState } from 'react';
import {
  GAME_META,
  PERSONA_META,
  PERSONA_ORDER,
  SCENARIO_PRESETS,
} from './engine/benchmarks';
import { runSimulation } from './engine/simulation';
import { GameId, PersonaId, PersonaWeights } from './engine/types';
import { DistributionChart } from './components/DistributionChart';
import { TrajectoryChart } from './components/TrajectoryChart';
import { FragilityPanel } from './components/FragilityPanel';

const GAME_ORDER: GameId[] = ['ultimatum', 'ipd', 'auction'];

export const App: React.FC = () => {
  const [game, setGame] = useState<GameId>('ultimatum');
  const [weights, setWeights] = useState<PersonaWeights>({
    rational: 15,
    loss_averse: 45,
    reciprocator: 30,
    exploiter: 10,
  });
  const [framingBias, setFramingBias] = useState<number>(0);
  const [rounds, setRounds] = useState<number>(100);
  const [seed, setSeed] = useState<number>(4201);
  const [onlyShockRounds, setOnlyShockRounds] = useState<boolean>(false);

  const result = useMemo(
    () =>
      runSimulation({
        game,
        weights,
        framingBias,
        rounds,
        seed,
      }),
    [game, weights, framingBias, rounds, seed]
  );

  const activeGameMeta = GAME_META[game];

  const handleWeightChange = (id: PersonaId, nextVal: number) => {
    setWeights((prev) => ({
      ...prev,
      [id]: nextVal,
    }));
  };

  const applyPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setWeights({ ...preset.weights });
    setFramingBias(preset.framingBias);
  };

  const handleReseed = () => {
    setSeed((prev) => ((prev * 1664525 + 1013904223) % 9000) + 1000);
  };

  const framingLabel =
    framingBias <= -40
      ? 'Severe Loss / Scarcity Frame'
      : framingBias < -10
        ? 'Mild Scarcity Frame'
        : framingBias <= 10
          ? 'Neutral Analytical Frame'
          : framingBias < 40
            ? 'Mild Gain / Cooperative Frame'
            : 'Strong Abundance / Joint-Surplus Frame';

  const visibleLedger = useMemo(() => {
    const filtered = onlyShockRounds
      ? result.trajectory.filter((r) => r.flashCrash)
      : result.trajectory;
    return filtered.slice(0, 25);
  }, [result.trajectory, onlyShockRounds]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="eyebrow">
              BEHAVIORAL ECONOMICS &amp; MULTI-AGENT SIMULATION LAB
            </div>
            <h1 className="site-title">AI Agent Economy Lab</h1>
            <p className="site-byline">
              By Mohammed KM — 100% deterministic client-side simulation engine
            </p>
          </div>
          <div className="header-telemetry" aria-label="Engine telemetry">
            <span className="pill pill-neutral">0 runtime tokens</span>
            <span className="pill pill-neutral">Seed #{seed}</span>
            <span className="pill pill-accent">
              {rounds} rounds in {result.computeTimeMs.toFixed(1)} ms
            </span>
          </div>
        </div>
      </header>

      {/* Experiment Selector Bar */}
      <nav className="game-nav" aria-label="Select economic experiment">
        <div className="game-nav-inner">
          {GAME_ORDER.map((id) => {
            const meta = GAME_META[id];
            const isActive = id === game;
            return (
              <button
                key={id}
                type="button"
                className={`game-tab ${isActive ? 'game-tab-active' : ''}`}
                onClick={() => setGame(id)}
                aria-pressed={isActive}
              >
                <span className="game-tab-title">{meta.title}</span>
                <span className="game-tab-sub">{meta.subtitle}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="workspace-grid">
        {/* Left Sidebar: Live Population Controls */}
        <aside className="controls-column" aria-label="Live population controls">
          <section className="card control-card">
            <h2 className="card-title">Scenario Presets</h2>
            <p className="card-subtitle">
              Load canonical behavioral mixes or monoculture stress tests
            </p>
            <div className="preset-grid">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-btn"
                  onClick={() => applyPreset(preset.id)}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-tagline">{preset.tagline}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card control-card">
            <div className="card-header-compact">
              <h2 className="card-title">Agent Population Mix</h2>
              <span className="mono-chip">Normalized 100%</span>
            </div>

            {/* Stacked Composition Bar */}
            <div className="composition-bar" aria-label="Normalized population share">
              {PERSONA_ORDER.map((id) => (
                <div
                  key={id}
                  className="composition-segment"
                  style={{
                    width: `${result.normalizedWeights[id]}%`,
                    backgroundColor: PERSONA_META[id].color,
                  }}
                  title={`${PERSONA_META[id].label}: ${result.normalizedWeights[id].toFixed(1)}%`}
                />
              ))}
            </div>

            <div className="sliders-stack">
              {PERSONA_ORDER.map((id) => {
                const meta = PERSONA_META[id];
                const pct = result.normalizedWeights[id];
                return (
                  <div key={id} className="slider-group">
                    <div className="slider-top">
                      <label htmlFor={`slider-${id}`} className="slider-label">
                        <span
                          className="persona-dot"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </label>
                      <span className="slider-value">{pct.toFixed(0)}%</span>
                    </div>
                    <input
                      id={`slider-${id}`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={weights[id]}
                      onChange={(e) =>
                        handleWeightChange(id, Number(e.target.value))
                      }
                      className="range-input"
                    />
                    <p className="slider-hint">{meta.behavioralRule}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card control-card">
            <div className="slider-top">
              <label htmlFor="framing-slider" className="card-title">
                Framing Bias
              </label>
              <span className="slider-value">
                {framingBias > 0 ? `+${framingBias}%` : `${framingBias}%`}
              </span>
            </div>
            <p className="framing-status">{framingLabel}</p>
            <input
              id="framing-slider"
              type="range"
              min={-100}
              max={100}
              step={5}
              value={framingBias}
              onChange={(e) => setFramingBias(Number(e.target.value))}
              className="range-input"
            />
            <div className="range-endpoints">
              <span>-100% Loss / Scarcity</span>
              <span>0% Neutral</span>
              <span>+100% Gain</span>
            </div>
          </section>

          <section className="card control-card">
            <h2 className="card-title">Run Parameters</h2>
            <div className="run-controls-row">
              <div className="rounds-selector" role="group" aria-label="Simulated rounds">
                {[100, 250, 500].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`seg-btn ${rounds === r ? 'seg-btn-active' : ''}`}
                    onClick={() => setRounds(r)}
                  >
                    {r} rds
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={handleReseed}
              >
                Re-run (New Seed)
              </button>
            </div>
          </section>
        </aside>

        {/* Right Main Stage: Analytics & Charts */}
        <div className="analytics-column">
          {/* Active Experiment Brief */}
          <section className="card mechanism-banner">
            <div className="mechanism-label">ACTIVE EXPERIMENT PROTOCOL</div>
            <p className="mechanism-text">{activeGameMeta.mechanism}</p>
          </section>

          {/* 4-Card KPI Summary Strip */}
          <section className="kpi-grid" aria-label="Key simulation metrics">
            <div className="kpi-card">
              <span className="kpi-label">{result.summary.primaryLabel}</span>
              <span className="kpi-value">
                {result.summary.primaryValue}
                {result.summary.primaryUnit}
              </span>
              <span className="kpi-compare">
                Human avg: {result.summary.humanPrimaryAvg}
                {result.summary.primaryUnit}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">{result.summary.secondaryLabel}</span>
              <span className="kpi-value">
                {result.summary.secondaryValue}
                {result.summary.secondaryUnit}
              </span>
              <span className="kpi-compare">
                Human avg: {result.summary.humanSecondaryAvg}
                {result.summary.secondaryUnit}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Surplus Efficiency</span>
              <span className="kpi-value">
                {result.summary.surplusEfficiency}%
              </span>
              <span className="kpi-compare">
                Human avg: {result.summary.humanSurplusAvg}%
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">
                {result.summary.inequalityOrTailLabel}
              </span>
              <span className="kpi-value">
                {result.summary.inequalityOrTailUnit === '$' ? '$' : ''}
                {result.summary.inequalityOrTailValue}
                {result.summary.inequalityOrTailUnit !== '$'
                  ? result.summary.inequalityOrTailUnit
                  : ''}
              </span>
              <span className="kpi-compare">
                Fragility: {result.fragility.fragilityScore} / 100
              </span>
            </div>
          </section>

          {/* Primary Distribution & Trajectory Charts */}
          <DistributionChart
            title={result.histogramTitle}
            xLabel={result.histogramXLabel}
            bins={result.histogram}
            citation={result.citation}
          />

          <TrajectoryChart
            title={`${activeGameMeta.title} — ${rounds}-Round Dynamics`}
            primaryLabel={result.trajectoryPrimaryLabel}
            secondaryLabel={result.trajectorySecondaryLabel}
            humanLine={result.trajectoryHumanLine}
            points={result.trajectory}
          />

          {/* Taleb Fragility & Systemic Risk Readout */}
          <FragilityPanel report={result.fragility} />

          {/* Behavioral Economics Benchmark Table */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  Published Behavioral-Economics Benchmark Comparison
                </h2>
                <p className="card-subtitle">
                  Simulated multi-agent outcome vs. empirical human lab averages and classical Nash predictions
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Simulated</th>
                    <th>Human Lab Avg</th>
                    <th>Nash Eq.</th>
                    <th>Delta vs. Human</th>
                    <th>Economic Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.benchmarks.map((b) => (
                    <tr key={b.label}>
                      <td className="td-strong">{b.label}</td>
                      <td className="td-mono">
                        {b.unit === '$' ? `$${b.simulated}` : `${b.simulated}${b.unit}`}
                      </td>
                      <td className="td-mono">
                        {b.unit === '$' ? `$${b.humanAvg}` : `${b.humanAvg}${b.unit}`}
                      </td>
                      <td className="td-mono">
                        {b.unit === '$' ? `$${b.nashEq}` : `${b.nashEq}${b.unit}`}
                      </td>
                      <td
                        className={`td-mono ${
                          Math.abs(b.deltaVsHuman) > 15 ? 'delta-strong' : 'delta-mild'
                        }`}
                      >
                        {b.deltaVsHuman > 0 ? '+' : ''}
                        {b.deltaVsHuman}
                        {b.unit === '$' ? '' : ' pp'}
                      </td>
                      <td className="td-note">{b.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Round-by-Round Micro-Ledger */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Round-by-Round Interaction Ledger</h2>
                <p className="card-subtitle">
                  Showing up to 25 deterministic rounds ({result.fragility.cascadeEvents} shock rounds detected)
                </p>
              </div>
              <button
                type="button"
                className={`toggle-btn ${onlyShockRounds ? 'toggle-btn-active' : ''}`}
                onClick={() => setOnlyShockRounds((v) => !v)}
              >
                {onlyShockRounds ? 'Showing Shock Rounds Only' : 'Filter Shock Rounds'}
              </button>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Actor A</th>
                    <th>Actor B</th>
                    <th>Surplus</th>
                    <th>Status</th>
                    <th>Event Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="td-empty">
                        No flash-crash shock rounds triggered under this population mix.
                      </td>
                    </tr>
                  ) : (
                    visibleLedger.map((row) => (
                      <tr
                        key={row.round}
                        className={row.flashCrash ? 'row-shock' : undefined}
                      >
                        <td className="td-mono">#{row.round}</td>
                        <td>{PERSONA_META[row.actorA].shortLabel}</td>
                        <td>{PERSONA_META[row.actorB].shortLabel}</td>
                        <td className="td-mono">{row.surplusPct}%</td>
                        <td>
                          <span
                            className={`status-tag ${
                              row.flashCrash ? 'status-shock' : 'status-ok'
                            }`}
                          >
                            {row.flashCrash ? 'Shock' : 'Normal'}
                          </span>
                        </td>
                        <td className="td-note">{row.detail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>AI Agent Economy Lab by Mohammed KM</span>
          <span>
            100% deterministic client-side engine — zero runtime APIs, zero telemetry tracking
          </span>
        </div>
      </footer>
    </div>
  );
};
