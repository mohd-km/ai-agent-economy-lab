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
  const height = 236;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 38;
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
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.primaryMetric).toFixed(1)}`
    )
    .join(' ');

  const secondaryPath = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.secondaryMetric).toFixed(1)}`
    )
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
            Crimson verticals mark cascade shocks across {points.length} rounds.
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
            Human ({humanLine})
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
          {yTicks.map((t) => {
            const y = toY(t);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e5e5e3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#555555"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {t}
                </text>
              </g>
            );
          })}

          {points.map((p, i) =>
            p.flashCrash ? (
              <line
                key={`fc-${p.round}`}
                x1={toX(i)}
                y1={padTop}
                x2={toX(i)}
                y2={padTop + plotH}
                stroke="#b91c1c"
                strokeOpacity="0.22"
                strokeWidth="3"
              />
            ) : null
          )}

          <line
            x1={padLeft}
            y1={humanY}
            x2={width - padRight}
            y2={humanY}
            stroke="#047857"
            strokeWidth="1.6"
            strokeDasharray="5 4"
          />

          <path
            d={secondaryPath}
            fill="none"
            stroke="#b45309"
            strokeWidth="1.8"
            strokeOpacity="0.82"
          />

          <path
            d={primaryPath}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="2.2"
          />

          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke="#d4d4d0"
            strokeWidth="1.2"
          />
          {xTickIndices.map((idx) => (
            <text
              key={`x-${idx}`}
              x={toX(idx)}
              y={padTop + plotH + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#555555"
              fontFamily='"JetBrains Mono", monospace'
            >
              R{points[idx]?.round ?? idx + 1}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
};
