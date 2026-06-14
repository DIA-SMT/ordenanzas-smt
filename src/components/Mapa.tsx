"use client";
import { useMemo, useState } from "react";
import { BLOQUES, BLOQUE_CORTO, sensClase, type Concepto } from "@/lib/blocks";

const SENS_COLOR: Record<string, string> = {
  Alta: "var(--rojo)",
  Media: "var(--ambar)",
  Baja: "var(--verde)",
};

function dominantSens(rows: Concepto[]) {
  const c = { Alta: 0, Media: 0, Baja: 0 } as Record<string, number>;
  rows.forEach((r) => (c[r.sensibilidad] = (c[r.sensibilidad] ?? 0) + 1));
  if (c.Alta >= c.Media && c.Alta >= c.Baja) return "Alta";
  if (c.Media >= c.Baja) return "Media";
  return "Baja";
}

/** Dona SVG interactiva: hover resalta, clic filtra. */
function Donut({
  data,
  selected,
  onSelect,
}: {
  data: { key: string; value: number; color: string }[];
  selected: string | null;
  onSelect: (k: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const active = hover ?? selected;
  const activeSeg = data.find((d) => d.key === active);

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        {data.map((d) => {
          const frac = d.value / total;
          const len = frac * C;
          const dash = `${len} ${C - len}`;
          const seg = (
            <circle
              key={d.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={active === d.key ? 20 : 16}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              style={{
                cursor: "pointer",
                opacity: active && active !== d.key ? 0.32 : 1,
                transition: "opacity .18s, stroke-width .18s",
                filter: active === d.key ? `drop-shadow(0 0 6px ${d.color})` : "none",
              }}
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(selected === d.key ? null : d.key)}
            />
          );
          offset += len;
          return seg;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-num">
          {activeSeg ? activeSeg.value : total}
        </text>
        <text x="70" y="82" textAnchor="middle" className="donut-lab">
          {activeSeg ? `${Math.round((activeSeg.value / total) * 100)}%` : "TOTAL"}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <button
            key={d.key}
            className={`dl ${selected === d.key ? "on" : ""}`}
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(selected === d.key ? null : d.key)}
          >
            <span className="dl-dot" style={{ background: d.color }} />
            <span className="dl-k">{d.key}</span>
            <span className="dl-v">{d.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Mapa({
  conceptos,
  onOpenBloque,
}: {
  conceptos: Concepto[];
  onOpenBloque: (bloque: number) => void;
}) {
  const [filterSens, setFilterSens] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byBloque: Record<number, Concepto[]> = {};
    for (const c of conceptos) (byBloque[c.bloque_id] ??= []).push(c);
    const sens = { Alta: 0, Media: 0, Baja: 0 } as Record<string, number>;
    conceptos.forEach((c) => (sens[c.sensibilidad] = (sens[c.sensibilidad] ?? 0) + 1));
    const caps = new Set(conceptos.map((c) => c.capitulo)).size;
    const aVerificar = conceptos.filter((c) => c.confianza === "Dudosa" || c.confianza === "Media").length;
    const maxBloque = Math.max(...Object.values(byBloque).map((a) => a.length));
    return { byBloque, sens, caps, aVerificar, maxBloque };
  }, [conceptos]);

  const ordered = Object.keys(BLOQUES)
    .map(Number)
    .map((b) => ({ b, rows: stats.byBloque[b] ?? [], dom: dominantSens(stats.byBloque[b] ?? []) }));

  const donutData = [
    { key: "Alta", value: stats.sens.Alta, color: "var(--rojo)" },
    { key: "Media", value: stats.sens.Media, color: "var(--ambar)" },
    { key: "Baja", value: stats.sens.Baja, color: "var(--verde)" },
  ];

  const isDim = (dom: string) => filterSens != null && dom !== filterSens;

  return (
    <div className="mapa-wrap">
      <div className="mapa">
        <div className="mapa-head">
          <p className="lead">
            Cada mosaico es un <b>bloque tributario</b>. El punto indica la <b>sensibilidad ciudadana</b>;
            la barra, su peso relativo. Tocá un bloque para ver la ficha.
          </p>
          {filterSens && (
            <button className="clearfilter" onClick={() => setFilterSens(null)}>
              Filtrando sensibilidad <b>{filterSens}</b> ✕
            </button>
          )}
        </div>
        <div className="tiles">
          {ordered.map(({ b, rows, dom }, i) => {
            const pct = Math.round((rows.length / stats.maxBloque) * 100);
            const cls = sensClase(dom);
            return (
              <div
                key={b}
                className={`tile ${isDim(dom) ? "dim" : ""}`}
                style={{ "--i": i, "--pct": `${pct}%` } as React.CSSProperties}
                onClick={() => onOpenBloque(b)}
              >
                <span className="bar" style={{ background: SENS_COLOR[dom] }} />
                <span className="bid">{String(b).padStart(2, "0")}</span>
                <span className="nm">{BLOQUE_CORTO[b]}</span>
                <span className="ct">
                  <span className="dot pulse" style={{ background: SENS_COLOR[dom] }} />
                  <b>{rows.length}</b> conceptos
                </span>
                <span className="meter"><span /></span>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="sidepanel">
        <div className="kpi-row">
          <div className="kpi">
            <div className="n">{conceptos.length}</div>
            <div className="l">Conceptos relevados</div>
          </div>
          <div className="kpi">
            <div className="n">{stats.caps}</div>
            <div className="l">Capítulos</div>
          </div>
          <div className="kpi" style={{ borderTopColor: "var(--rojo)" }}>
            <div className="n">{stats.sens.Alta}</div>
            <div className="l">Alta sensibilidad</div>
          </div>
          <div className="kpi" style={{ borderTopColor: "var(--ambar)" }}>
            <div className="n">{stats.aVerificar}</div>
            <div className="l">A verificar (OCR)</div>
          </div>
        </div>

        <div className="panel-card">
          <h4>Sensibilidad ciudadana · tocá para filtrar</h4>
          <Donut data={donutData} selected={filterSens} onSelect={setFilterSens} />
        </div>

        <div className="panel-card">
          <h4>Conceptos por bloque</h4>
          <div className="barchart">
            {ordered
              .slice()
              .sort((a, b) => b.rows.length - a.rows.length)
              .map(({ b, rows, dom }) => {
                const pct = Math.round((rows.length / conceptos.length) * 100);
                return (
                  <div
                    key={b}
                    className={`b ${isDim(dom) ? "dim" : ""}`}
                    onClick={() => onOpenBloque(b)}
                    title={`${BLOQUE_CORTO[b]} — ${rows.length} conceptos (${pct}%) · sensibilidad ${dom}`}
                  >
                    <span className="lab">
                      {b}. {BLOQUE_CORTO[b]}
                    </span>
                    <span className="track">
                      <span
                        className="fill"
                        style={{
                          width: `${(rows.length / stats.maxBloque) * 100}%`,
                          background: `linear-gradient(90deg, ${SENS_COLOR[dom]}66, ${SENS_COLOR[dom]})`,
                        }}
                      />
                    </span>
                    <span className="v">{rows.length}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </aside>
    </div>
  );
}
