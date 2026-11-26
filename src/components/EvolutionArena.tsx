import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_STRATEGY_IDS,
  ARENA_GAME_META,
  ArenaGameMode,
  EVOLUTION_PRESETS,
  EVOLUTION_STRATEGIES,
  EvolutionStrategyId,
  simulateEvolutionArena,
} from '../engine/evolution';

const GAME_MODES: ArenaGameMode[] = ['ipd', 'ultimatum', 'trade'];
const SPEEDS = [1, 2, 4] as const;

export const EvolutionArena: React.FC = () => {
  const [strategies, setStrategies] = useState<
    [EvolutionStrategyId, EvolutionStrategyId, EvolutionStrategyId]
  >(['fair', 'greedy', 'tit_for_tat']);
  const [initialShares, setInitialShares] = useState<[number, number, number]>([
    34, 33, 33,
  ]);
  const [gameMode, setGameMode] = useState<ArenaGameMode>('ipd');
  const [selectionPressure, setSelectionPressure] = useState<number>(1.6);
  const [mutationRate, setMutationRate] = useState<number>(0.01);
  const [seed, setSeed] = useState<number>(2026);

  const [genIndex, setGenIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animProgressRef = useRef<number>(1);
  const prevGenRef = useRef<number>(0);

  const snapshots = useMemo(
    () =>
      simulateEvolutionArena({
        strategies,
        initialShares,
        gameMode,
        selectionPressure,
        mutationRate,
        seed,
      }),
    [strategies, initialShares, gameMode, selectionPressure, mutationRate, seed]
  );

  const currentSnap = snapshots[Math.min(genIndex, snapshots.length - 1)];
  const prevSnap = snapshots[Math.max(0, Math.min(prevGenRef.current, snapshots.length - 1))];
  const gameMeta = ARENA_GAME_META[gameMode];

  // Advance generations when playing
  useEffect(() => {
    if (!isPlaying) return;
    if (genIndex >= 50) {
      setIsPlaying(false);
      return;
    }
    const intervalMs = Math.round(420 / speed);
    const timer = window.setInterval(() => {
      setGenIndex((prev) => {
        if (prev >= 50) {
          setIsPlaying(false);
          return 50;
        }
        prevGenRef.current = prev;
        animProgressRef.current = 0;
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, genIndex]);

  // Smooth Canvas animation loop for the 100 agents
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const durationMs = Math.max(120, Math.round(360 / speed));
    let startTime: number | null = null;

    const drawFrame = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = animProgressRef.current >= 1 ? 1 : Math.min(1, elapsed / durationMs);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(300, Math.floor(rect.width));
      const cssH = Math.max(260, Math.floor(rect.height));

      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clean white editorial canvas surface
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cssW, cssH);

      // Subtle architectural hairline grid
      ctx.strokeStyle = '#f1f1ef';
      ctx.lineWidth = 1;
      const cols = 10;
      const rows = 6;
      for (let c = 1; c < cols; c++) {
        const gx = (cssW / cols) * c;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, cssH);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        const gy = (cssH / rows) * r;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cssW, gy);
        ctx.stroke();
      }

      // Compute interpolated agent coordinates
      const coords = currentSnap.agents.map((ag, idx) => {
        const pAg = prevSnap.agents[idx] || ag;
        const x = (pAg.x + (ag.x - pAg.x) * ease) * cssW;
        const y = (pAg.y + (ag.y - pAg.y) * ease) * cssH;
        return { x, y, ag };
      });

      // Draw live pairwise trade arcs
      for (const arc of currentSnap.arcs) {
        const a = coords[arc.fromId];
        const b = coords[arc.toId];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = arc.cooperative
          ? 'rgba(4, 120, 87, 0.22)'
          : 'rgba(185, 28, 28, 0.22)';
        ctx.lineWidth = arc.cooperative ? 1.2 : 1.1;
        ctx.stroke();
      }

      // Draw 100 agents
      for (const { x, y, ag } of coords) {
        const meta = EVOLUTION_STRATEGIES[ag.strategy];
        const radius = Math.max(4.5, Math.min(9.5, 4.2 + ag.wealth * 1.15));

        // Conversion pulse ring when an agent adopts a new strategy
        if (ag.converted && t < 1) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 3 + ease * 9, 0, Math.PI * 2);
          ctx.strokeStyle = meta.color;
          ctx.globalAlpha = Math.max(0, 0.65 * (1 - ease));
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Agent dot
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = meta.color;
        ctx.fill();

        // Crisp white ring so overlapping agents stay legible
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Corner watermark label inside figure
      ctx.fillStyle = '#555555';
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillText(`GEN ${String(currentSnap.generation).padStart(2, '0')} / 50`, 12, 22);
      ctx.fillText(`N = 100 AGENTS`, cssW - 116, 22);

      ctx.restore();

      if (t < 1) {
        rafId = window.requestAnimationFrame(drawFrame);
      } else {
        animProgressRef.current = 1;
      }
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [currentSnap, prevSnap, speed]);

  const handleStrategySelect = (slot: 0 | 1 | 2, nextStrat: EvolutionStrategyId) => {
    setStrategies((prev) => {
      const next: [EvolutionStrategyId, EvolutionStrategyId, EvolutionStrategyId] = [
        ...prev,
      ];
      // If another slot already has nextStrat, swap them so all 3 stay distinct
      const existingIdx = next.indexOf(nextStrat);
      if (existingIdx !== -1 && existingIdx !== slot) {
        next[existingIdx] = prev[slot];
      }
      next[slot] = nextStrat;
      return next;
    });
    setIsPlaying(false);
    setGenIndex(0);
    prevGenRef.current = 0;
  };

  const handleShareChange = (slot: 0 | 1 | 2, value: number) => {
    setInitialShares((prev) => {
      const next: [number, number, number] = [...prev];
      next[slot] = value;
      return next;
    });
    setIsPlaying(false);
    setGenIndex(0);
    prevGenRef.current = 0;
  };

  const applyPreset = (presetId: string) => {
    const p = EVOLUTION_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setStrategies([...p.strategies]);
    setInitialShares([...p.initialShares]);
    setGameMode(p.gameMode);
    setSelectionPressure(p.selectionPressure);
    setMutationRate(p.mutationRate);
    setIsPlaying(false);
    setGenIndex(0);
    prevGenRef.current = 0;
  };

  const handlePlayToggle = () => {
    if (genIndex >= 50) {
      prevGenRef.current = 0;
      setGenIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((v) => !v);
  };

  const handleStep = () => {
    setIsPlaying(false);
    setGenIndex((prev) => {
      if (prev >= 50) return 50;
      prevGenRef.current = prev;
      animProgressRef.current = 0;
      return prev + 1;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    prevGenRef.current = 0;
    animProgressRef.current = 1;
    setGenIndex(0);
  };

  const handleReseed = () => {
    setIsPlaying(false);
    prevGenRef.current = 0;
    animProgressRef.current = 1;
    setGenIndex(0);
    setSeed((prev) => ((prev * 1664525 + 1013904223) % 9000) + 1000);
  };

  // SVG 50-Generation Evolution Trajectory Chart geometry
  const chartW = 640;
  const chartH = 210;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const toX = (g: number) => padL + (g / 50) * plotW;
  const toY = (pct: number) => padT + plotH - (pct / 100) * plotH;

  const visibleSnaps = snapshots.slice(0, genIndex + 1);
  const strategyPaths = strategies.map((stratId) =>
    visibleSnaps
      .map(
        (s, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${toX(s.generation).toFixed(1)} ${toY(s.shares[stratId]).toFixed(1)}`
      )
      .join(' ')
  );

  const coopPath = visibleSnaps
    .map(
      (s, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${toX(s.generation).toFixed(1)} ${toY(s.coopRate).toFixed(1)}`
    )
    .join(' ');

  const shareTotal = initialShares[0] + initialShares[1] + initialShares[2] || 1;
  const dominantMeta = EVOLUTION_STRATEGIES[currentSnap.dominant];

  return (
    <div className="workspace-grid">
      {/* Left Column: Compact Controls */}
      <aside className="controls-column" aria-label="Evolution arena controls">
        <section className="card control-card">
          <div className="card-header-compact">
            <h2 className="card-title">3 Competing Strategies</h2>
            <span className="mono-chip">100 agents</span>
          </div>
          <p className="card-subtitle">
            Pick three strategies and set their starting mix.
          </p>

          <div className="arena-slot-stack">
            {([0, 1, 2] as const).map((slot) => {
              const stratId = strategies[slot];
              const meta = EVOLUTION_STRATEGIES[stratId];
              const normPct = Math.round((initialShares[slot] / shareTotal) * 100);
              return (
                <div key={slot} className="arena-slot-card">
                  <div className="arena-slot-row">
                    <span
                      className="persona-dot"
                      style={{ backgroundColor: meta.color }}
                    />
                    <select
                      aria-label={`Strategy ${slot + 1}`}
                      className="strategy-select"
                      value={stratId}
                      onChange={(e) =>
                        handleStrategySelect(slot, e.target.value as EvolutionStrategyId)
                      }
                    >
                      {ALL_STRATEGY_IDS.map((id) => (
                        <option key={id} value={id}>
                          {EVOLUTION_STRATEGIES[id].label}
                        </option>
                      ))}
                    </select>
                    <span className="slider-value">{normPct}%</span>
                  </div>
                  <input
                    aria-label={`${meta.label} starting share`}
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={initialShares[slot]}
                    onChange={(e) => handleShareChange(slot, Number(e.target.value))}
                    className="range-input range-compact"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="card control-card">
          <h2 className="card-title">Scenario Presets</h2>
          <div className="preset-grid-2col">
            {EVOLUTION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset-chip-btn"
                onClick={() => applyPreset(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card control-card">
          <h2 className="card-title">Arena Rules</h2>
          <div className="rounds-selector" role="group" aria-label="Trade game mode">
            {GAME_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`seg-btn ${gameMode === m ? 'seg-btn-active' : ''}`}
                onClick={() => {
                  setGameMode(m);
                  setIsPlaying(false);
                  setGenIndex(0);
                  prevGenRef.current = 0;
                }}
              >
                {ARENA_GAME_META[m].label.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="sliders-stack" style={{ marginTop: 12 }}>
            <div className="slider-group">
              <div className="slider-top">
                <label htmlFor="sel-pressure" className="slider-label">
                  Selection Pressure
                </label>
                <span className="slider-value">{selectionPressure.toFixed(1)}x</span>
              </div>
              <input
                id="sel-pressure"
                type="range"
                min={0.6}
                max={3.0}
                step={0.2}
                value={selectionPressure}
                onChange={(e) => {
                  setSelectionPressure(Number(e.target.value));
                  setIsPlaying(false);
                  setGenIndex(0);
                  prevGenRef.current = 0;
                }}
                className="range-input range-compact"
              />
            </div>

            <div className="slider-group">
              <div className="slider-top">
                <label htmlFor="mut-rate" className="slider-label">
                  Mutation Rate
                </label>
                <span className="slider-value">
                  {(mutationRate * 100).toFixed(0)}%
                </span>
              </div>
              <input
                id="mut-rate"
                type="range"
                min={0}
                max={0.06}
                step={0.01}
                value={mutationRate}
                onChange={(e) => {
                  setMutationRate(Number(e.target.value));
                  setIsPlaying(false);
                  setGenIndex(0);
                  prevGenRef.current = 0;
                }}
                className="range-input range-compact"
              />
            </div>
          </div>

          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', marginTop: 10 }}
            onClick={handleReseed}
          >
            New Seed (#{seed})
          </button>
        </section>
      </aside>

      {/* Right Main Stage: Live 100-Agent Canvas + 50-Gen Evolution Chart */}
      <div className="analytics-column">
        {/* Live Canvas Card */}
        <section className="card arena-stage-card" aria-label="Live 100-agent evolution canvas">
          <div className="card-header">
            <div>
              <h2 className="card-title">Live Multi-Generation Evolution Arena</h2>
              <p className="card-subtitle">
                100 agents trade in {gameMeta.label} across 50 generations; circle size tracks wealth, arcs show live trades.
              </p>
            </div>
            <div className="arena-status-pill">
              <span
                className="persona-dot"
                style={{ backgroundColor: dominantMeta.color }}
              />
              <span>
                Leader: {dominantMeta.shortLabel} ({currentSnap.counts[currentSnap.dominant]}%)
              </span>
            </div>
          </div>

          {/* Playback Transport Controls */}
          <div className="transport-bar">
            <div className="transport-buttons">
              <button
                type="button"
                className="primary-btn"
                onClick={handlePlayToggle}
              >
                {isPlaying ? 'Pause' : genIndex >= 50 ? 'Replay' : 'Play'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleStep}
                disabled={genIndex >= 50}
              >
                Step +1
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>

            <div className="speed-group" role="group" aria-label="Playback speed">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className={`speed-btn ${speed === sp ? 'speed-btn-active' : ''}`}
                  onClick={() => setSpeed(sp)}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          {/* Live HTML5 Canvas */}
          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              className="arena-canvas"
              aria-label="100 agents trading in real time"
            />
          </div>

          {/* Generation Scrubber */}
          <div className="scrubber-row">
            <span className="mono-label">Gen {currentSnap.generation} / 50</span>
            <input
              aria-label="Scrub generation"
              type="range"
              min={0}
              max={50}
              step={1}
              value={genIndex}
              onChange={(e) => {
                setIsPlaying(false);
                prevGenRef.current = genIndex;
                animProgressRef.current = 1;
                setGenIndex(Number(e.target.value));
              }}
              className="range-input range-compact scrubber-input"
            />
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setIsPlaying(false);
                prevGenRef.current = genIndex;
                animProgressRef.current = 1;
                setGenIndex(50);
              }}
            >
              Jump to 50
            </button>
          </div>

          {/* Live Stacked Share Bar */}
          <div className="composition-bar" style={{ marginTop: 10, marginBottom: 8 }}>
            {strategies.map((id) => (
              <div
                key={id}
                className="composition-segment"
                style={{
                  width: `${currentSnap.shares[id]}%`,
                  backgroundColor: EVOLUTION_STRATEGIES[id].color,
                }}
                title={`${EVOLUTION_STRATEGIES[id].label}: ${currentSnap.counts[id]} agents`}
              />
            ))}
          </div>

          <div className="arena-legend-row">
            {strategies.map((id) => {
              const meta = EVOLUTION_STRATEGIES[id];
              const count = currentSnap.counts[id];
              const isCollapsed = count <= 2 && currentSnap.generation > 0;
              return (
                <span key={id} className="legend-item">
                  <span
                    className="persona-dot"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span>{meta.shortLabel}:</span>
                  <strong className="mono-inline">{count}</strong>
                  {isCollapsed && <span className="collapsed-tag">collapsed</span>}
                </span>
              );
            })}
          </div>
        </section>

        {/* 4-Card Live KPI Strip */}
        <section className="kpi-grid" aria-label="Live evolution metrics">
          <div className="kpi-card">
            <span className="kpi-label">Generation</span>
            <span className="kpi-value">{currentSnap.generation} / 50</span>
            <span className="kpi-compare">{dominantMeta.shortLabel} leading</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Cooperation</span>
            <span className="kpi-value">{currentSnap.coopRate}%</span>
            <span className="kpi-compare">
              Human avg: {gameMeta.humanCoopBaseline}%
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Market Surplus</span>
            <span className="kpi-value">{currentSnap.surplusPct}%</span>
            <span className="kpi-compare">
              Payoff: {currentSnap.meanPayoff.toFixed(2)}
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Extinctions</span>
            <span className="kpi-value">{currentSnap.collapsed.length} / 3</span>
            <span className="kpi-compare">
              {currentSnap.collapsed.length === 0
                ? 'All active'
                : currentSnap.collapsed
                    .map((c) => EVOLUTION_STRATEGIES[c].shortLabel)
                    .join(', ')}
            </span>
          </div>
        </section>

        {/* Live 50-Generation Population & Baseline Chart */}
        <section className="card chart-card" aria-label="50-generation population trajectory">
          <div className="card-header">
            <div>
              <h2 className="card-title">Population Share vs. Human Baseline</h2>
              <p className="card-subtitle">
                Watch strategies dominate or collapse across 50 generations.
              </p>
            </div>
            <div className="chart-legend">
              {strategies.map((id) => (
                <span key={id} className="legend-item">
                  <span
                    className="swatch"
                    style={{ backgroundColor: EVOLUTION_STRATEGIES[id].color }}
                  />
                  {EVOLUTION_STRATEGIES[id].shortLabel}
                </span>
              ))}
              <span className="legend-item">
                <span className="swatch swatch-dashed" />
                Human ({gameMeta.humanCoopBaseline}%)
              </span>
            </div>
          </div>

          <div className="svg-frame">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              width="100%"
              height="auto"
              role="img"
              aria-label="Strategy share trajectories across 50 generations"
            >
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line
                    x1={padL}
                    y1={toY(v)}
                    x2={chartW - padR}
                    y2={toY(v)}
                    stroke="#e5e5e3"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={toY(v) + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#555555"
                    fontFamily='"JetBrains Mono", monospace'
                  >
                    {v}%
                  </text>
                </g>
              ))}

              {/* Human baseline dashed reference line */}
              <line
                x1={padL}
                y1={toY(gameMeta.humanCoopBaseline)}
                x2={chartW - padR}
                y2={toY(gameMeta.humanCoopBaseline)}
                stroke="#111111"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />

              {/* Cooperation rate subtle curve */}
              {visibleSnaps.length > 1 && (
                <path
                  d={coopPath}
                  fill="none"
                  stroke="#111111"
                  strokeOpacity="0.28"
                  strokeWidth="1.6"
                  strokeDasharray="2 3"
                />
              )}

              {/* 3 Strategy population curves */}
              {strategies.map((id, idx) =>
                visibleSnaps.length > 1 ? (
                  <path
                    key={id}
                    d={strategyPaths[idx]}
                    fill="none"
                    stroke={EVOLUTION_STRATEGIES[id].color}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <circle
                    key={id}
                    cx={toX(0)}
                    cy={toY(currentSnap.shares[id])}
                    r="4"
                    fill={EVOLUTION_STRATEGIES[id].color}
                  />
                )
              )}

              {/* Current generation vertical cursor */}
              <line
                x1={toX(currentSnap.generation)}
                y1={padT}
                x2={toX(currentSnap.generation)}
                y2={padT + plotH}
                stroke="#1d4ed8"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />

              {[0, 10, 20, 30, 40, 50].map((g) => (
                <text
                  key={g}
                  x={toX(g)}
                  y={padT + plotH + 18}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#555555"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  G{g}
                </text>
              ))}
            </svg>
          </div>
        </section>

        {/* Collapsible Theory & Strategy Rules Drawer */}
        <details className="editorial-drawer">
          <summary className="drawer-summary">
            Read more: Replicator dynamics, strategy rules &amp; human baselines
          </summary>
          <div className="drawer-body">
            <p>
              Each generation runs 250 pairwise 4-round matches across 100 agents
              using deterministic Mulberry32 sampling. Reproduction follows
              exponential replicator dynamics scaled by selection pressure (
              <code>w_i = n_i * exp((payoff_i - 2.0) * 0.24 * beta)</code>) with
              optional strategy mutation.
            </p>
            <ul className="drawer-list">
              {strategies.map((id) => (
                <li key={id}>
                  <strong>{EVOLUTION_STRATEGIES[id].label}:</strong>{' '}
                  {EVOLUTION_STRATEGIES[id].rule}
                </li>
              ))}
            </ul>
            <p className="drawer-citation">{gameMeta.citation}</p>
          </div>
        </details>
      </div>
    </div>
  );
};
