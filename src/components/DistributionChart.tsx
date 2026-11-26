import React from 'react';
import { HistogramBin } from '../engine/types';

interface DistributionChartProps {
  title: string;
  xLabel: string;
  bins: HistogramBin[];
  citation: string;
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  title,
  xLabel,
  bins,
  citation,
}) => {
  const width = 640;
  const height = 268;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 26;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(
    40,
    ...bins.map((b) => Math.max(b.simPct, b.humanPct))
  );
  const yMax = Math.ceil(maxVal / 10) * 10;
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];

  const step = plotW / Math.max(1, bins.length);
  const barW = Math.min(44, step * 0.62);

  const toY = (val: number) => padTop + plotH - (val / yMax) * plotH;

  const humanPath = bins
    .map((b, i) => {
      const cx = padLeft + i * step + step / 2;
      const cy = toY(b.humanPct);
      return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(' ');

  return (
    <section className="card chart-card" aria-label={title}>
      <div className="card-header">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">{xLabel}</p>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span className="legend-item">
            <span className="swatch swatch-sim" />
            Simulated Agents
          </span>
          <span className="legend-item">
            <span className="swatch swatch-danger" />
            Tail / Loss Zone
          </span>
          <span className="legend-item">
            <span className="swatch swatch-human" />
            Human Lab Baseline
          </span>
        </div>
      </div>

      <div className="svg-frame">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="auto"
          role="img"
          aria-label={title}
        >
          {/* Horizontal grid lines */}
          {yTicks.map((t) => {
            const y = toY(t);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e5e3db"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#5a626a"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {t}%
                </text>
              </g>
            );
          })}

          {/* Simulated histogram bars */}
          {bins.map((b, i) => {
            const cx = padLeft + i * step + step / 2;
            const x = cx - barW / 2;
            const y = toY(b.simPct);
            const h = Math.max(1, padTop + plotH - y);
            const fill = b.isDanger ? '#dc2626' : '#1d4ed8';
            return (
              <g key={b.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="3"
                  fill={fill}
                  fillOpacity="0.84"
                />
                {b.simPct >= 3 && (
                  <text
                    x={cx}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#1f2937"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {Math.round(b.simPct)}%
                  </text>
                )}
                <text
                  x={cx}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="#475569"
                >
                  {b.label}
                </text>
              </g>
            );
          })}

          {/* Human baseline overlay line */}
          <path
            d={humanPath}
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
          {bins.map((b, i) => {
            const cx = padLeft + i * step + step / 2;
            const cy = toY(b.humanPct);
            return (
              <circle
                key={`h-${b.label}`}
                cx={cx}
                cy={cy}
                r="4"
                fill="#ffffff"
                stroke="#0f766e"
                strokeWidth="2.2"
              />
            );
          })}

          {/* Baseline axis */}
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          <text
            x={padLeft + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {xLabel}
          </text>
        </svg>
      </div>
      <p className="chart-footnote">{citation}</p>
    </section>
  );
};
