import { COUNTRY_PROFILES, FREIGHT_MODES } from '../data/economyData';

export function MethodologyDrawers() {
  return (
    <section className="drawers-section" aria-label="Reference Tables and Methodology">
      <details className="editorial-drawer">
        <summary>National Economy Shapes: United States ($31.5T) vs. China ($19.5T) vs. India ($4.0T)</summary>
        <div className="drawer-body">
          <p className="drawer-lead">
            Every sector decomposes into physical or economic units multiplied by value added per unit. The US is 83% services, China is 36% industrial manufacturing, and India is services-led (55%) with an 18% primary agricultural base.
          </p>
          <div className="country-grid">
            {COUNTRY_PROFILES.map((c) => (
              <div key={c.country} className="country-card">
                <div className="country-head">
                  <h4>{c.country}</h4>
                  <span className="mono">${c.gdpT.toFixed(1)}T GDP</span>
                </div>
                <div className="split-bar" aria-label={`${c.country} macro split`}>
                  <div style={{ width: `${c.tertiaryPct}%` }} className="split-svc" title={`Services ${c.tertiaryPct}%`} />
                  <div style={{ width: `${c.secondaryPct}%` }} className="split-ind" title={`Industry ${c.secondaryPct}%`} />
                  <div style={{ width: `${c.primaryPct}%` }} className="split-pri" title={`Primary ${c.primaryPct}%`} />
                </div>
                <div className="split-legend mono">
                  <span>Svc {c.tertiaryPct}%</span>
                  <span>Ind {c.secondaryPct}%</span>
                  <span>Pri {c.primaryPct}%</span>
                </div>
                <ul className="country-list">
                  {c.topSectors.map((s) => (
                    <li key={s.name}>
                      <span>{s.name}</span>
                      <span className="mono">
                        {s.sharePct}% (${s.valueT.toFixed(2)}T)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="editorial-drawer">
        <summary>Global Freight Modes &amp; Trade-Lane Economics (~$10.6T Gross Revenue)</summary>
        <div className="drawer-body">
          <p className="drawer-lead">
            Freight yield spans ~100x from ocean ($0.02/tkm) to air cargo ($0.50–$2.31/tkm). Road dominates tonnes and revenue ($4.8T), while sea carries ~90–120T tonne-km (UNCTAD 2025 average haul rose to 5,245 nm under Red Sea rerouting).
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Volume</th>
                  <th>Avg Haul</th>
                  <th>Tonne-km</th>
                  <th>Yield / tkm</th>
                  <th>Market</th>
                  <th>Direct Cost</th>
                  <th>Net %</th>
                </tr>
              </thead>
              <tbody>
                {FREIGHT_MODES.map((m) => (
                  <tr key={m.mode}>
                    <td>{m.mode}</td>
                    <td className="mono">{m.tonnes}</td>
                    <td className="mono">{m.avgHaulKm}</td>
                    <td className="mono">{m.tonneKmT}</td>
                    <td className="mono">{m.yieldPerTkm}</td>
                    <td className="mono">${m.marketT.toFixed(1)}T</td>
                    <td className="mono">{m.directCostPct}%</td>
                    <td className="mono">{m.netMarginPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="editorial-drawer">
        <summary>Governing Equations, Margin Definitions &amp; Research Provenance</summary>
        <div className="drawer-body">
          <div className="equations-grid">
            <div className="eq-box">
              <h4>1. GDP Value Added vs. Gross Revenue</h4>
              <code className="mono">GDP = Sum(Annual Units x Value Added per Unit)</code>
              <p>
                World GDP is modeled on a reconciled $110.0T value-added baseline (IMF 2024–2025 range $110–120T). Gross sector revenues sum to ~$159.9T (or ~$129T in the 62-sector map) because intermediate stages double-count across value chains.
              </p>
            </div>
            <div className="eq-box">
              <h4>2. Cost Stack, EBIT &amp; Implied EBITDA</h4>
              <code className="mono">EBIT % = Gross Margin % - OpEx %; EBITDA % = EBIT % + Sector D&amp;A %</code>
              <p>
                Benchmark COGS, Gross Margin, OpEx, EBIT, and Net Margin come directly from Mohammed KM&apos;s 62-sector map and value-chain dossiers. Implied EBITDA adds capital-intensity-calibrated D&amp;A to EBIT; FY2025/26 verified leader figures (NVIDIA, TSMC, Apple, Walmart, Saudi Aramco, ExxonMobil, Shell, Tesla, BYD, UNH, Deloitte/PwC/EY) are tagged FY25.
              </p>
            </div>
            <div className="eq-box">
              <h4>3. Macro Shock &amp; Fleet Capacity Math</h4>
              <code className="mono">Fleet Needed = Voyages x Round-Trip Days / 365</code>
              <p>
                Oil shocks pass through fuel-heavy transport, chemicals, agriculture, and upstream E&amp;P. Rate shocks shift net interest margins in banking (with non-linear credit stress above 7.0%) while compressing capital-heavy real estate, utilities, and telecom. Chokepoint delays tighten effective ocean fleet capacity and inflate the 5-stage $10-to-$100 supply-chain markup stack.
              </p>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
