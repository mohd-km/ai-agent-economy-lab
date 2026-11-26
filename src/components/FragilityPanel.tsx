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
  const padBottom = 34;
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
          <h2 className="card-title">Taleb Fragility &amp; Monoculture Sweep</h2>
          <p className="card-subtitle">
            Non-linear fragility as {PERSONA_META[report.dominantPersona].shortLabel} share increases.
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
        <div
          className="meter-track"
          role="progressbar"
          aria-valuenow={report.fragilityScore}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`meter-fill ${regimeClass}`}
            style={{ width: `${report.fragilityScore}%` }}
          />
        </div>
        <div className="meter-scale">
          <span>0 Robust</span>
          <span>35 Sensitive</span>
          <span>65 Flash-Crash</span>
          <span>100 Ruin</span>
        </div>
      </div>

      {/* Compact Telemetry Grid */}
      <div className="fragility-metrics-grid">
        <div className="mini-metric">
          <span className="mini-metric-label">Homogeneity (HHI)</span>
          <span className="mini-metric-value">{report.hhi.toFixed(3)}</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Diversity</span>
          <span className="mini-metric-value">{report.shannonDiversityPct}%</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Tail Loss (CVaR 95%)</span>
          <span className="mini-metric-value">{report.tailLossCvar95}</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-label">Cascade Shocks</span>
          <span className="mini-metric-value">{report.cascadeEvents}</span>
        </div>
      </div>

      {/* Live Homogeneity Sweep SVG */}
      <div className="sweep-block">
        <div className="sweep-header">
          <span className="sweep-title">
            Monoculture Stress Sweep ({PERSONA_META[report.dominantPersona].shortLabel} Share)
          </span>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="swatch swatch-danger" />
              Fragility
            </span>
            <span className="legend-item">
              <span className="swatch swatch-human" />
              Surplus
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
            <rect
              x={padLeft}
              y={padTop}
              width={plotW}
              height={toY(65) - padTop}
              fill="#b91c1c"
              fillOpacity="0.06"
            />
            {[0, 35, 65, 100].map((v) => (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={toY(v)}
                  x2={width - padRight}
                  y2={toY(v)}
                  stroke={v === 65 ? '#b91c1c' : '#e5e5e3'}
                  strokeDasharray={v === 65 ? '4 4' : undefined}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={toY(v) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#555555"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {v}
                </text>
              </g>
            ))}

            <path
              d={surplusPath}
              fill="none"
              stroke="#047857"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            <path d={fragPath} fill="none" stroke="#b91c1c" strokeWidth="2.4" />

            <line
              x1={currentX}
              y1={padTop}
              x2={currentX}
              y2={padTop + plotH}
              stroke="#111111"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <circle
              cx={currentX}
              cy={currentY}
              r="5.5"
              fill="#b91c1c"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {[25, 45, 65, 80, 95].map((h) => (
              <text
                key={h}
                x={toX(h)}
                y={padTop + plotH + 18}
                textAnchor="middle"
                fontSize="12"
                fill="#555555"
                fontFamily='"JetBrains Mono", monospace'
              >
                {h}%
              </text>
            ))}
          </svg>
        </div>
      </div>

      <details className="editorial-drawer" style={{ marginTop: 12 }}>
        <summary className="drawer-summary">
          {report.flashCrashTriggered
            ? 'Read diagnosis: Flash-crash mechanism triggered'
            : 'Read diagnosis: Systemic buffer intact'}
        </summary>
        <div className="drawer-body">
          <p>{report.flashCrashMechanism}</p>
          <p>
            Dominant share: <code>{report.dominantSharePct}%</code> · Concavity index:{' '}
            <code>
              {report.concavityIndex >= 0 ? '+' : ''}
              {report.concavityIndex}
            </code>{' '}
            (negative = concave/fragile).
          </p>
        </div>
      </details>
    </section>
  );
};
