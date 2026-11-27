import { COUNTRY_PROFILES, FREIGHT_MODES } from '../data/economyData';

export function MethodologyDrawers() {
  return (
    <section className="drawers-section" aria-label="Reference Tables and Methodology">
      <details className="editorial-drawer">
        <summary>How three economies differ: United States ($31.5T) vs. China ($19.5T) vs. India ($4.0T)</summary>
        <div className="drawer-body">
          <p className="drawer-lead">
            Each country&apos;s output is just units made times the value added to each one. The US is 83% services, China is 36% factories, and India is mostly services (55%) with 18% still in farming and mining.
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
                  <span>Services {c.tertiaryPct}%</span>
                  <span>Industry {c.secondaryPct}%</span>
                  <span>Farm &amp; mine {c.primaryPct}%</span>
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
        <summary>How goods move: ship, truck, train and plane compared (~$10.6T of sales)</summary>
        <div className="drawer-body">
          <p className="drawer-lead">
            A tonne-km (tkm) is one tonne carried one kilometre. Moving it by sea costs about $0.02, by air $0.50 to $2.31, roughly 100 times more. Trucks earn the most ($4.8T), while ships do most of the distance. UN shipping data (UNCTAD 2025) shows the average sea trip grew to 5,245 nautical miles when ships avoided the Red Sea.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Tonnes moved</th>
                  <th>Average trip</th>
                  <th>Tonne-km</th>
                  <th>Price per tkm</th>
                  <th>Yearly sales</th>
                  <th>Direct costs</th>
                  <th>Profit kept</th>
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
        <summary>The maths behind the numbers, and where the data comes from</summary>
        <div className="drawer-body">
          <div className="equations-grid">
            <div className="eq-box">
              <h4>1. World output (GDP) vs. total sales</h4>
              <code className="mono">GDP = Sum(Annual Units x Value Added per Unit)</code>
              <p>
                World output is set at $110.0T a year (the IMF puts 2024 to 2025 at $110T to $120T). Total sales add up to about $159.9T (about $129T across the 62 industries here) because a part is counted again each time it is sold on, so sales double-count while GDP does not.
              </p>
            </div>
            <div className="eq-box">
              <h4>2. Where each $100 of sales goes</h4>
              <code className="mono">EBIT % = Gross Margin % - OpEx %; EBITDA % = EBIT % + Sector D&amp;A %</code>
              <p>
                Cost of making it (COGS), running costs (OpEx), operating profit (EBIT) and final profit (net margin) come from a 62-industry benchmark map. EBITDA adds back wear on equipment (depreciation and amortisation, D&amp;A), sized to how equipment-heavy the industry is. Company figures checked against 2025 reports (NVIDIA, TSMC, Apple, Walmart, Saudi Aramco, ExxonMobil, Shell, Tesla, BYD, UNH, Deloitte/PwC/EY) are tagged FY25.
              </p>
            </div>
            <div className="eq-box">
              <h4>3. How shocks and shipping delays are worked out</h4>
              <code className="mono">Fleet Needed = Voyages x Round-Trip Days / 365</code>
              <p>
                Dearer oil hurts fuel-heavy transport, chemicals and farming and helps oil and gas producers. Higher rates widen what banks earn on loans (until unpaid loans rise above 7%) and squeeze loan-heavy property, utilities and telecom. Longer sea trips tie up ships, so more ships are needed for the same cargo, and each step from $10 raw material to $100 shop price gets dearer.
              </p>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
