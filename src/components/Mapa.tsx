"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BLOQUES, BLOQUE_CORTO, sensClase, type Concepto } from "@/lib/blocks";
import { squarify } from "@/lib/treemap";
import CountUp from "./CountUp";

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

interface Blk {
  b: number;
  rows: Concepto[];
  dom: string;
  value: number;
}

export default function Mapa({
  conceptos,
  onOpenBloque,
  onOpenConcept,
}: {
  conceptos: Concepto[];
  onOpenBloque: (bloque: number) => void;
  onOpenConcept?: (c: Concepto) => void;
}) {
  const [filterSens, setFilterSens] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const tmRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 820, h: 540 });
  const [hover, setHover] = useState<{ b: number; left: number; top: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = tmRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const blocks: Blk[] = Object.keys(BLOQUES)
    .map(Number)
    .map((b) => {
      const rows = stats.byBloque[b] ?? [];
      return { b, rows, dom: dominantSens(rows), value: rows.length };
    });

  const isNarrow = size.w < 560;
  const rects = useMemo(() => squarify(blocks, size.w, size.h), [blocks, size]);
  const totalArea = size.w * size.h;
  const isDim = (dom: string) => filterSens != null && dom !== filterSens;

  const total = conceptos.length;
  const sensData = [
    { k: "Alta", v: stats.sens.Alta, c: "var(--rojo)" },
    { k: "Media", v: stats.sens.Media, c: "var(--ambar)" },
    { k: "Baja", v: stats.sens.Baja, c: "var(--verde)" },
  ];

  const TileInner = ({ b, rows, dom, i, sm }: { b: number; rows: Concepto[]; dom: string; i: number; sm: boolean }) => {
    const pct = Math.round((rows.length / stats.maxBloque) * 100);
    return (
      <div
        className={`tile ${sm ? "sm" : ""} ${isDim(dom) ? "dim" : ""}`}
        style={{ "--i": i } as React.CSSProperties}
        onClick={() => onOpenBloque(b)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
        onMouseEnter={(e) => {
          if (isNarrow) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => {
            const W = 300;
            const left = r.right + 12 + W > window.innerWidth ? r.left - W - 12 : r.right + 12;
            const top = Math.min(r.top, window.innerHeight - 250);
            setHover({ b, left: Math.max(8, left), top: Math.max(8, top) });
          }, 170);
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => setHover(null), 160);
        }}
      >
        <span className="bar" style={{ background: SENS_COLOR[dom] }} />
        <span className="bid">{String(b).padStart(2, "0")}</span>
        <span className="nm">{BLOQUE_CORTO[b]}</span>
        <span className="ct">
          <span className="dot pulse" style={{ background: SENS_COLOR[dom] }} />
          <b><CountUp end={rows.length} /></b> <i>conceptos</i>
        </span>
        {!sm && (
          <span className="meter">
            <span style={{ width: mounted ? `${pct}%` : 0 }} />
          </span>
        )}
      </div>
    );
  };

  const hoverBlk = hover ? blocks.find((x) => x.b === hover.b) : null;

  return (
    <>
    <div className="mapa-wrap">
      <div className="mapa">
        <div className="mapa-head">
          <p className="lead">
            Cada bloque ocupa un área <b>proporcional a su cantidad de conceptos</b>. El color indica la
            <b> sensibilidad ciudadana</b>. Tocá un bloque para ver la ficha.
          </p>
          {filterSens && (
            <button className="clearfilter" onClick={() => setFilterSens(null)}>
              Filtrando sensibilidad <b>{filterSens}</b> ✕
            </button>
          )}
        </div>

        {/* Cinta de sensibilidad 100% */}
        <div className="ribbon">
          <div className="ribbon-bar">
            {sensData.map((s) => {
              const pct = Math.round((s.v / total) * 100);
              return (
                <button
                  key={s.k}
                  className={`ribbon-seg ${filterSens && filterSens !== s.k ? "dim" : ""}`}
                  style={{ flexGrow: mounted ? s.v : 0.0001, background: s.c }}
                  onClick={() => setFilterSens(filterSens === s.k ? null : s.k)}
                  title={`Sensibilidad ${s.k}: ${s.v} conceptos (${pct}%)`}
                >
                  <span className="rs-k">{s.k}</span>
                  <span className="rs-v">{pct}%</span>
                </button>
              );
            })}
          </div>
          <div className="ribbon-cap">
            <span className="info-wrap">
              Perfil de sensibilidad ciudadana
              <span className="info" tabIndex={0} role="note" aria-label="Qué mide la sensibilidad ciudadana">
                i
                <span className="tip">
                  <b>Clasificación analítica, no normativa.</b> Estima el impacto de cada concepto en la
                  ciudadanía —por su efecto en el bolsillo, su alcance y su carga social— en tres niveles:
                  <b> Alta</b>, <b>Media</b> y <b>Baja</b>. Orienta la comunicación y las prioridades de
                  gestión; <b>no surge del texto de la ordenanza</b> y es revisable.
                </span>
              </span>
            </span>
            <span>{total} conceptos · tocá un tramo para filtrar</span>
          </div>
        </div>

        {/* Treemap (desktop) / grilla (móvil) */}
        <div className={`treemap ${isNarrow ? "grid" : ""}`} ref={tmRef}>
          {isNarrow
            ? blocks.map(({ b, rows, dom }, i) => (
                <div className="tm-grid-cell" key={b}>
                  <TileInner b={b} rows={rows} dom={dom} i={i} sm={false} />
                </div>
              ))
            : rects.map((r, i) => {
                const sm = (r.w * r.h) / totalArea < 0.05 || (r.item.value as number) <= 2;
                return (
                  <div
                    className="tm-cell"
                    key={r.item.b as number}
                    style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                  >
                    <TileInner
                      b={r.item.b as number}
                      rows={r.item.rows as Concepto[]}
                      dom={r.item.dom as string}
                      i={i}
                      sm={sm}
                    />
                  </div>
                );
              })}
        </div>
      </div>

      <aside className="sidepanel">
        <div className="kpi-row">
          <div className="kpi">
            <div className="n"><CountUp end={conceptos.length} /></div>
            <div className="l">Conceptos relevados</div>
          </div>
          <div className="kpi">
            <div className="n"><CountUp end={stats.caps} /></div>
            <div className="l">Capítulos</div>
          </div>
          <div className="kpi" style={{ borderTopColor: "var(--rojo)" }}>
            <div className="n"><CountUp end={stats.sens.Alta} /></div>
            <div className="l">Alta sensibilidad</div>
          </div>
          <div className="kpi" style={{ borderTopColor: "var(--ambar)" }}>
            <div className="n"><CountUp end={stats.aVerificar} /></div>
            <div className="l">A verificar (OCR)</div>
          </div>
        </div>

        <div className="panel-card">
          <h4>Conceptos por bloque</h4>
          <div className="barchart">
            {blocks
              .slice()
              .sort((a, b) => b.rows.length - a.rows.length)
              .map(({ b, rows, dom }) => {
                const pct = Math.round((rows.length / total) * 100);
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
                          width: mounted ? `${(rows.length / stats.maxBloque) * 100}%` : 0,
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

    {hover && hoverBlk && (
      <div
        className="tile-pop"
        style={{ left: hover.left, top: hover.top }}
        onMouseEnter={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <div className="tp-h">
          <b>{BLOQUE_CORTO[hover.b]}</b>
          <span>{hoverBlk.rows.length} conceptos</span>
        </div>
        <div className="tp-sens">
          {(["Alta", "Media", "Baja"] as const).map((k) => {
            const n = hoverBlk.rows.filter((r) => r.sensibilidad === k).length;
            return (
              <span key={k} style={{ color: SENS_COLOR[k] }}>
                ● {n} {k.toLowerCase()}
              </span>
            );
          })}
        </div>
        <div className="tp-list">
          {[...hoverBlk.rows]
            .sort((a, b) => (b.valor_urbanos ?? 0) - (a.valor_urbanos ?? 0))
            .slice(0, 3)
            .map((c) => (
              <button key={c.id} className="tp-item" onClick={() => onOpenConcept?.(c)}>
                <span className="tp-art">{c.articulo}</span>
                <span className="tp-act">{c.actividad}</span>
                {c.valor_urbanos != null && <span className="chip val">{c.valor_urbanos} U</span>}
              </button>
            ))}
        </div>
        <div className="tp-foot">Clic para abrir · {hoverBlk.rows.length} conceptos en total</div>
      </div>
    )}
    </>
  );
}
