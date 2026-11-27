import { useMemo } from 'react';
import { computeSquarifiedTreemap } from '../engine/treemapLayout';
import type { SectorShockResult } from '../engine/macroShock';
import { GLOBAL_GDP_BASELINE_T } from '../data/economyData';

export type TreemapSizeMode = 'gdp' | 'revenue';
export type TreemapColorMode = 'shock' | 'ebitda' | 'category';

interface TreemapExplorerProps {
  results: SectorShockResult[];
  selectedSectorId: string;
  onSelectSector: (id: string) => void;
  sizeMode: TreemapSizeMode;
  onSizeModeChange: (mode: TreemapSizeMode) => void;
  colorMode: TreemapColorMode;
  onColorModeChange: (mode: TreemapColorMode) => void;
  hasActiveShock: boolean;
}

function getTileColors(
  res: SectorShockResult,
  colorMode: TreemapColorMode,
  isSelected: boolean
): { fill: string; ink: string; subInk: string } {
  if (colorMode === 'shock') {
    const d = res.marginDeltaPp;
    if (d >= 1.5) return { fill: '#0f5c5c', ink: '#ffffff', subInk: '#d5ecec' };
    if (d >= 0.35) return { fill: '#cde3e3', ink: '#111111', subInk: '#2f4f4f' };
    if (d <= -2.0) return { fill: '#9a3412', ink: '#ffffff', subInk: '#fde4dc' };
    if (d <= -0.6) return { fill: '#f6ddd4', ink: '#111111', subInk: '#6b2710' };
    return { fill: isSelected ? '#e8eeee' : '#f4f4f2', ink: '#111111', subInk: '#555555' };
  }

  if (colorMode === 'ebitda') {
    const e = res.shockedEbitdaPct;
    if (e >= 24) return { fill: '#0f5c5c', ink: '#ffffff', subInk: '#d5ecec' };
    if (e >= 18) return { fill: '#3b7e7e', ink: '#ffffff', subInk: '#e0f0f0' };
    if (e >= 14) return { fill: '#b9d6d6', ink: '#111111', subInk: '#2c4a4a' };
    return { fill: '#efefec', ink: '#111111', subInk: '#555555' };
  }

  // Macro category
  if (res.sector.category === 'Services') {
    return { fill: '#e6f0f0', ink: '#111111', subInk: '#2d4e4e' };
  }
  if (res.sector.category === 'Industry') {
    return { fill: '#f3f2ee', ink: '#111111', subInk: '#555555' };
  }
  return { fill: '#e4e8e1', ink: '#111111', subInk: '#3d4a36' };
}

export function TreemapExplorer({
  results,
  selectedSectorId,
  onSelectSector,
  sizeMode,
  onSizeModeChange,
  colorMode,
  onColorModeChange,
  hasActiveShock,
}: TreemapExplorerProps) {
  const SVG_W = 800;
  const SVG_H = 470;

  const rects = useMemo(() => {
    const items = results.map((r) => ({
      id: r.sector.id,
      value: sizeMode === 'gdp' ? r.sector.gdpValueAddedT : r.sector.grossRevenueB / 1000,
    }));
    return computeSquarifiedTreemap(items, SVG_W, SVG_H);
  }, [results, sizeMode]);

  const resultMap = useMemo(() => {
    const m = new Map<string, SectorShockResult>();
    for (const r of results) m.set(r.sector.id, r);
    return m;
  }, [results]);

  const totalRevenueT = useMemo(
    () => results.reduce((acc, r) => acc + r.sector.grossRevenueB, 0) / 1000,
    [results]
  );

  return (
    <section className="panel treemap-panel" aria-label="Global GDP and Sector Treemap">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            {sizeMode === 'gdp'
              ? `$${GLOBAL_GDP_BASELINE_T.toFixed(0)}T Global GDP Treemap`
              : `$${totalRevenueT.toFixed(1)}T Gross Industry Revenue Map`}
          </h2>
          <p className="panel-subtitle">
            Click any sector tile to inspect its margins, capital intensity, leaders, and value chain.
          </p>
        </div>
        <div className="control-bar">
          <div className="segmented-control" role="group" aria-label="Treemap sizing metric">
            <button
              type="button"
              className={sizeMode === 'gdp' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onSizeModeChange('gdp')}
            >
              GDP ($110T)
            </button>
            <button
              type="button"
              className={sizeMode === 'revenue' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onSizeModeChange('revenue')}
            >
              Revenue (${totalRevenueT.toFixed(0)}T)
            </button>
          </div>

          <div className="segmented-control" role="group" aria-label="Treemap color encoding">
            <button
              type="button"
              className={colorMode === 'shock' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onColorModeChange('shock')}
            >
              Shock Delta
            </button>
            <button
              type="button"
              className={colorMode === 'ebitda' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onColorModeChange('ebitda')}
            >
              EBITDA %
            </button>
            <button
              type="button"
              className={colorMode === 'category' ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onColorModeChange('category')}
            >
              Category
            </button>
          </div>
        </div>
      </div>

      <div className="treemap-svg-wrap">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="treemap-svg"
          role="img"
          aria-label="Interactive squarified treemap of 12 global economic sectors"
        >
          {rects.map((rect) => {
            const res = resultMap.get(rect.id);
            if (!res) return null;
            const isSelected = rect.id === selectedSectorId;
            const { fill, ink, subInk } = getTileColors(res, colorMode, isSelected);
            const pad = 2.5;
            const rx = rect.x + pad;
            const ry = rect.y + pad;
            const rw = Math.max(0, rect.w - pad * 2);
            const rh = Math.max(0, rect.h - pad * 2);
            const showDetailed = rw >= 118 && rh >= 68;
            const showCompact = !showDetailed && rw >= 72 && rh >= 42;
            const valueStr =
              sizeMode === 'gdp'
                ? `$${res.sector.gdpValueAddedT.toFixed(1)}T`
                : `$${(res.sector.grossRevenueB / 1000).toFixed(1)}T`;
            const deltaStr =
              res.marginDeltaPp > 0
                ? `+${res.marginDeltaPp.toFixed(1)}pp`
                : `${res.marginDeltaPp.toFixed(1)}pp`;

            return (
              <g
                key={rect.id}
                className="treemap-tile"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${res.sector.name}: ${valueStr}, EBITDA ${res.shockedEbitdaPct.toFixed(1)}%`}
                onClick={() => onSelectSector(rect.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSector(rect.id);
                  }
                }}
              >
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx={3}
                  fill={fill}
                  stroke={isSelected ? '#111111' : '#ffffff'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {showDetailed && (
                  <>
                    <text
                      x={rx + 10}
                      y={ry + 22}
                      fill={ink}
                      fontSize="13.5"
                      fontWeight="600"
                      fontFamily="Inter, sans-serif"
                    >
                      {res.sector.shortName}
                    </text>
                    <text
                      x={rx + 10}
                      y={ry + 42}
                      fill={ink}
                      fontSize="15"
                      fontWeight="500"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {valueStr}
                    </text>
                    <text
                      x={rx + 10}
                      y={ry + 59}
                      fill={subInk}
                      fontSize="11.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {hasActiveShock
                        ? `EBITDA ${res.shockedEbitdaPct.toFixed(1)}% (${deltaStr})`
                        : `EBITDA ${res.sector.ebitdaPct.toFixed(1)}% | Net ${res.sector.netMarginPct.toFixed(1)}%`}
                    </text>
                  </>
                )}
                {showCompact && (
                  <>
                    <text
                      x={rx + 7}
                      y={ry + 19}
                      fill={ink}
                      fontSize="11.5"
                      fontWeight="600"
                      fontFamily="Inter, sans-serif"
                    >
                      {res.sector.shortName.slice(0, 14)}
                    </text>
                    <text
                      x={rx + 7}
                      y={ry + 35}
                      fill={subInk}
                      fontSize="11.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {valueStr} {hasActiveShock ? deltaStr : ''}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible mobile & quick-jump sector pills */}
      <div className="sector-pill-strip" aria-label="Quick sector selector">
        {results.map((r) => {
          const active = r.sector.id === selectedSectorId;
          return (
            <button
              key={r.sector.id}
              type="button"
              className={active ? 'sector-pill active' : 'sector-pill'}
              onClick={() => onSelectSector(r.sector.id)}
            >
              <span>{r.sector.shortName}</span>
              <span className="mono pill-val">${r.sector.gdpValueAddedT.toFixed(1)}T</span>
            </button>
          );
        })}
      </div>

      <div className="legend-row">
        {colorMode === 'shock' && (
          <>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#0f5c5c' }} /> Margin Gain (&gt;+1.5pp)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#cde3e3' }} /> Mild Gain
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#f4f4f2' }} /> Neutral
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#f6ddd4' }} /> Margin Squeeze
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#9a3412' }} /> Severe Squeeze (&lt;-2.0pp)
            </span>
          </>
        )}
        {colorMode === 'ebitda' && (
          <>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#0f5c5c' }} /> High EBITDA (&ge;24%)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#3b7e7e' }} /> Strong (18–24%)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#b9d6d6' }} /> Moderate (14–18%)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#efefec' }} /> Thin (&lt;14%)
            </span>
          </>
        )}
        {colorMode === 'category' && (
          <>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#e6f0f0' }} /> Services (~64% GDP)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#f3f2ee' }} /> Industry &amp; Construction (~32%)
            </span>
            <span className="legend-item">
              <i className="swatch" style={{ background: '#e4e8e1' }} /> Primary &amp; Agriculture (~4%)
            </span>
          </>
        )}
      </div>
    </section>
  );
}
