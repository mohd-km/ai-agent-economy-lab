import React from 'react';
import { RoundPoint } from '../engine/types';

interface TrajectoryChartProps {
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
  humanLine: number;
  points: RoundPoint[];
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  title,
  primaryLabel,
  secondaryLabel,
  humanLine,
  points,
}) => {
  const width = 640;
  const height = 240;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allVals = points.flatMap((p) => [p.primaryMetric, p.secondaryMetric]);
  allVals.push(humanLine);
  const rawMax = Math.max(100, ...allVals);
  const rawMin = Math.min(0, ...allVals);
  const yMax = Math.ceil(rawMax / 20) * 20;
  const yMin = Math.floor(rawMin / 20) * 20;
  const ySpan = Math.max(1, yMax - yMin);

  const toX = (idx: number) =>
    padLeft + (idx / Math.max(1, points.length - 1)) * plotW;
  const toY = (val: number) =>
    padTop + plotH - ((val - yMin) / ySpan) * plotH;

  const primaryPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.primaryMetric).toFixed(1)}`)
    .join(' ');

  const secondaryPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.secondaryMetric).toFixed(1)}`)
    .join(' ');

  const yTicks = [yMin, Math.round(yMin + ySpan * 0.5), yMax];
  const xTickIndices = [
    0,
    Math.floor((points.length - 1) * 0.25),
    Math.floor((points.length - 1) * 0.5),
    Math.floor((points.length - 1) * 0.75),
    points.length - 1,
  ];

  const humanY = toY(humanLine);

  return (
    <section className="card chart-card" aria-label={title}>
      <div className="card-header">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">
            {points.length} deterministic rounds; vertical crimson markers indicate flash-crash or cascade shocks
          </p>
        </div>
        <div className="chart-legend" aria-label="Trajectory legend">
          <span className="legend-item">
            <span className="swatch swatch-sim" />
            {primaryLabel}
          </span>
          <span className="legend-item">
            <span className="swatch swatch-secondary" />
            {secondaryLabel}
          </span>
          <span className="legend-item">
            <span className="swatch swatch-human" />
            Human Ref ({humanLine})
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
          {/* Y grid */}
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
                  {t}
                </text>
              </g>
            );
          })}

          {/* Flash crash shock bars */}
          {points.map((p, i) =>
            p.flashCrash ? (
              <line
                key={`fc-${p.round}`}
                x1={toX(i)}
                y1={padTop}
                x2={toX(i)}
                y2={padTop + plotH}
                stroke="#dc2626"
                strokeOpacity="0.24"
                strokeWidth="3"
              />
            ) : null
          )}

          {/* Human reference line */}
          <line
            x1={padLeft}
            y1={humanY}
            x2={width - padRight}
            y2={humanY}
            stroke="#0f766e"
            strokeWidth="1.6"
            strokeDasharray="5 4"
          />

          {/* Secondary series */}
          <path
            d={secondaryPath}
            fill="none"
            stroke="#b45309"
            strokeWidth="1.8"
            strokeOpacity="0.8"
          />

          {/* Primary series */}
          <path
            d={primaryPath}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="2.2"
          />

          {/* X axis */}
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          {xTickIndices.map((idx) => (
            <text
              key={`x-${idx}`}
              x={toX(idx)}
              y={padTop + plotH + 18}
              textAnchor="middle"
              fontSize="10.5"
              fill="#475569"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              R{points[idx]?.round ?? idx + 1}
            </text>
          ))}
          <text
            x={padLeft + plotW / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            Simulation Round
          </text>
        </svg>
      </div>
    </section>
  );
};
