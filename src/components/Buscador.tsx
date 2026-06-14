"use client";
import { useMemo, useState } from "react";
import { BLOQUE_CORTO, pesos, sensClase, type Concepto } from "@/lib/blocks";

export default function Buscador({
  conceptos,
  onOpen,
  onVerify,
}: {
  conceptos: Concepto[];
  onOpen: (c: Concepto) => void;
  onVerify: (pagina: number, label?: string) => void;
}) {
  const [q, setQ] = useState("");
  const [bloque, setBloque] = useState<number | null>(null);
  const [sens, setSens] = useState<string | null>(null);
  const [soloVerificar, setSoloVerificar] = useState(false);

  const results = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return conceptos.filter((c) => {
      if (bloque != null && c.bloque_id !== bloque) return false;
      if (sens && c.sensibilidad !== sens) return false;
      if (soloVerificar && c.confianza !== "Dudosa" && c.confianza !== "Media") return false;
      if (terms.length === 0) return true;
      const hay = norm(
        [c.actividad, c.descripcion, c.rubro, c.tributo, c.articulo, c.titulo_capitulo, c.sujeto, c.hecho].join(" "),
      );
      return terms.every((t) => hay.includes(t));
    });
  }, [conceptos, q, bloque, sens, soloVerificar]);

  return (
    <div className="busc">
      <div className="controls">
        <div className="search-box">
          <span className="ic">🔍</span>
          <input
            autoFocus
            placeholder="Buscá por actividad, palabra o artículo: taxi, antena, cementerio, publicidad…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="filters" style={{ marginBottom: 10 }}>
        <button className={`fchip ${bloque == null ? "on" : ""}`} onClick={() => setBloque(null)}>
          Todos los bloques
        </button>
        {Object.keys(BLOQUE_CORTO)
          .map(Number)
          .map((b) => (
            <button key={b} className={`fchip ${bloque === b ? "on" : ""}`} onClick={() => setBloque(bloque === b ? null : b)}>
              {b}. {BLOQUE_CORTO[b]}
            </button>
          ))}
      </div>
      <div className="filters" style={{ marginBottom: 10 }}>
        {["Alta", "Media", "Baja"].map((s) => (
          <button key={s} className={`fchip ${sens === s ? "on" : ""}`} onClick={() => setSens(sens === s ? null : s)}>
            Sensibilidad {s}
          </button>
        ))}
        <button className={`fchip ${soloVerificar ? "on" : ""}`} onClick={() => setSoloVerificar(!soloVerificar)}>
          ⚠ Solo a verificar
        </button>
      </div>
      <div className="count">
        {results.length} resultado{results.length === 1 ? "" : "s"}
      </div>
      <div className="results">
        {results.map((c) => (
          <div
            key={c.id}
            className={`rcard ${c.confianza === "Dudosa" || c.confianza === "Media" ? "dudosa" : ""}`}
            onClick={() => onOpen(c)}
          >
            <div className="top">
              <span className="cap">Cap. {c.capitulo} · {c.articulo}</span>
              <span className={`sem ${sensClase(c.sensibilidad)}`} style={{ marginLeft: "auto" }}>
                {c.sensibilidad}
              </span>
            </div>
            <h4>{c.actividad}</h4>
            <div className="ds">{c.descripcion}</div>
            <div className="foot">
              {c.valor_urbanos != null && <span className="chip val">{c.valor_urbanos} U · {pesos(c.valor_pesos)}</span>}
              {c.alicuota && <span className="chip val">{c.alicuota}</span>}
              <span className="chip">{BLOQUE_CORTO[c.bloque_id]}</span>
              {c.pagina != null && (
                <button
                  className="verify-mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify(c.pagina!, c.articulo);
                  }}
                  title={`Ver en la norma · pág. ${c.pagina}`}
                >
                  ⤓ pág. {c.pagina}
                </button>
              )}
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div style={{ color: "var(--gris)", padding: 30 }}>Sin resultados. Probá con otra palabra.</div>
        )}
      </div>
    </div>
  );
}
