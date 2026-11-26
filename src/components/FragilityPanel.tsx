import React from 'react';
import { PERSONA_META } from '../engine/benchmarks';
import { TalebFragilityReport } from '../engine/types';

interface FragilityPanelProps {
  report: TalebFragilityReport;
}

export const FragilityPanel: React.FC<FragilityPanelProps> = ({ report }) => {
  const regimeClass =
    report.fragilityScore >= 65
      ? 'badge-fragile'
      : report.fragilityScore >= 35
        ? 'badge-sensitive'
        : 'badge-robust';

  const width = 560;
  const height = 186;
  const padLeft = 44;
  const padRight = 22;
  const padTop = 18;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minHom = 25;
  const maxHom = 96;
  const toX = (hom: number) =>
    padLeft + ((hom - minHom) / (maxHom - minHom)) * plotW;
  const toY = (val: number) => padTop + plotH - (val / 100) * plotH;

  const fragPath = report.sweepCurve
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${toX(pt.homogeneityPct).toFixed(1)} ${toY(pt.fragilityScore).toFixed(1)}`
    )
    .join(' ');

  const surplusPath = report.sweepCurve
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${toX(pt.homogeneityPct).toFixed(1)} ${toY(pt.surplusEfficiency).toFixed(1)}`
    )
    .join(' ');

  const currentX = toX(
    Math.max(minHom, Math.min(maxHom, report.dominantSharePct))
  );
  const currentY = toY(report.fragilityScore);

  return (
    <section className="card fragility-card" aria-label="Taleb Fragility and Systemic Risk">
      <div className="card-header">
        <div>
          <h2 className="card-title">Taleb Fragility &amp; Systemic Risk Readout</h2>
          <p className="card-subtitle">
            Concavity to volatility, population monoculture (HHI), and flash-crash trigger detection
          </p>
        </div>
        <span className={`regime-badge ${regimeClass}`}>{report.regime}</span>
      </div>

      {/* Fragility Score Bar */}
      <div className="fragility-meter-block">
        <div className="fragility-meter-top">
          <span className="meter-label">Systemic Fragility Index</span>
          <span className="meter-value">{report.fragilityScore} / 100</span>
        </div>
        <div className="meter-track" role="progressbar" aria-valuenow={report.fragilityScore} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`meter-fill ${regimeClass}`}
            style={{ width: `${report.fragilityScore}%` }}
          />
        </div>
        <div className="meter-scale">
          <span>0 Robust / Diverse</span>
          <span>35 Sensitive</span>
          <span>65 Flash-Crash Zone</span>
          <span>100 Systemic Ruin</span>
        </div>
      </div>

      {/* Flash Crash Alert Banner */}
      <div
        className={`flash-crash-box ${report.flashCrashTriggered ? 'flash-crash-active' : 'flash-crash-safe'}`}
      >
        <div className="flash-crash-heading">
          {report.flashCrashTriggered
            ? 'FLASH-CRASH CONDITION TRIGGERED'
            : 'SYSTEMIC BUFFER INTACT'}
        </div>
        <p className="flash-crash-text">{report.flashCrashMechanism}</p>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="fragility-metrics-grid">
        <div className="mini-metric">
          <span className="mini-metric-label">Homogeneity (HHI)</span>
          <span className="mini-metric-value">{report.hhi.toFixed(3)}</span>
          <span className="mini-metric-note">0.250 = balanced, 1.000 = monoculture</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Shannon Diversity</span>
          <span className="mini-metric-value">{report.shannonDiversityPct}%</span>
          <span className="mini-metric-note">
            Dominant: {PERSONA_META[report.dominantPersona].shortLabel} ({report.dominantSharePct}%)
          </span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Tail Loss (CVaR 95%)</span>
          <span className="mini-metric-value">{report.tailLossCvar95}</span>
          <span className="mini-metric-note">Worst 5% round downside</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Cascade Shocks</span>
          <span className="mini-metric-value">{report.cascadeEvents}</span>
          <span className="mini-metric-note">
            Concavity index: {report.concavityIndex >= 0 ? '+' : ''}
            {report.concavityIndex}
          </span>
        </div>
      </div>

      {/* Live Homogeneity Sweep SVG */}
      <div className="sweep-block">
        <div className="sweep-header">
          <span className="sweep-title">
            Monoculture Stress Sweep (Dominant Share of {PERSONA_META[report.dominantPersona].shortLabel} Agents)
          </span>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="swatch swatch-danger" />
              Fragility Score
            </span>
            <span className="legend-item">
              <span className="swatch swatch-human" />
              Surplus Efficiency
            </span>
          </div>
        </div>
        <div className="svg-frame">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="auto"
            role="img"
            aria-label="Homogeneity vs Fragility and Surplus Curve"
          >
            {/* Flash crash zone shading above y=65 */}
            <rect
              x={padLeft}
              y={padTop}
              width={plotW}
              height={toY(65) - padTop}
              fill="#dc2626"
              fillOpacity="0.07"
            />
            {[0, 35, 65, 100].map((v) => (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={toY(v)}
                  x2={width - padRight}
                  y2={toY(v)}
                  stroke={v === 65 ? '#dc2626' : '#e5e3db'}
                  strokeDasharray={v === 65 ? '4 4' : undefined}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={toY(v) + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#5a626a"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Surplus curve */}
            <path
              d={surplusPath}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            {/* Fragility curve */}
            <path d={fragPath} fill="none" stroke="#dc2626" strokeWidth="2.4" />

            {/* Current operating point marker */}
            <line
              x1={currentX}
              y1={padTop}
              x2={currentX}
              y2={padTop + plotH}
              stroke="#14171a"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <circle
              cx={currentX}
              cy={currentY}
              r="5.5"
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* X ticks */}
            {[25, 45, 65, 80, 95].map((h) => (
              <text
                key={h}
                x={toX(h)}
                y={padTop + plotH + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#475569"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {h}%
              </text>
            ))}
            <text
              x={padLeft + plotW / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize="10.5"
              fill="#64748b"
            >
              Dominant Agent Persona Share (%) — Current Position Marked
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
};
