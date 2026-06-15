"use client";
import { useState } from "react";
import { BLOQUES, pesos, semaforoClase, sensClase, type Concepto } from "@/lib/blocks";

function Sem({ nivel, tipo }: { nivel: string; tipo: "claridad" | "sensibilidad" | "confianza" }) {
  const cls = tipo === "sensibilidad" ? sensClase(nivel) : semaforoClase(nivel);
  return <span className={`sem ${cls}`}>{nivel}</span>;
}

function ConceptDetail({ c, onVerify }: { c: Concepto; onVerify: (p: number, label?: string) => void }) {
  const dud = c.confianza === "Dudosa" || c.confianza === "Media";
  const label = `${c.articulo}${c.inciso && c.inciso !== "—" ? " " + c.inciso : ""}`;
  const [open, setOpen] = useState(false);
  const rows: [string, string | null][] = [
    ["Hecho imponible", c.hecho],
    ["Sujeto obligado", c.sujeto],
    ["Base de cálculo", c.base_calculo],
    ["Periodicidad", c.periodicidad],
    ["Momento de pago", c.momento_pago],
    ["Área municipal", c.area],
    ["Trámite / documento", c.tramite],
  ].filter(([, v]) => v && v !== "—") as [string, string][];

  return (
    <div className={`concept ${dud ? "dudosa" : ""}`}>
      <div className="ch">
        <span className="at">{c.articulo}</span>
        {c.inciso && c.inciso !== "—" && <span className="chip">{c.inciso}</span>}
        <span className="rf">{c.referencia}</span>
      </div>
      <div className="ds" style={{ fontWeight: 600 }}>{c.actividad}</div>
      <div className="ds">{c.descripcion}</div>
      <div className="vals">
        {c.valor_urbanos != null && <span className="chip val">{c.valor_urbanos} U · {pesos(c.valor_pesos)}</span>}
        {c.alicuota && <span className="chip val">{c.alicuota}</span>}
        <Sem nivel={c.sensibilidad} tipo="sensibilidad" />
        {dud && <Sem nivel={c.confianza} tipo="confianza" />}
      </div>

      {open && (
        <>
          <table className="ctab">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.observaciones && <div className="obs">⚠ {c.observaciones}</div>}
        </>
      )}

      <div className="concept-acts">
        {rows.length > 0 && (
          <button className="more-btn" onClick={() => setOpen((o) => !o)}>
            {open ? "Ver menos ▴" : "Ver detalle completo ▾"}
          </button>
        )}
        {c.pagina != null && (
          <button className="verify-btn" onClick={() => onVerify(c.pagina!, label)}>
            <span className="vico">⤓</span> Ver en la norma · pág. {c.pagina}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Drawer({
  conceptos,
  concepto,
  bloqueId,
  onClose,
  onPick,
  onVerify,
}: {
  conceptos: Concepto[];
  concepto: Concepto | null;
  bloqueId: number | null;
  onClose: () => void;
  onPick: (c: Concepto | null) => void;
  onVerify: (pagina: number, label?: string) => void;
}) {
  const rows = bloqueId != null ? conceptos.filter((c) => c.bloque_id === bloqueId) : [];
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="dh">
          {concepto ? (
            <>
              <div className="bid">{concepto.bloque_id}</div>
              <div>
                <h3>{concepto.actividad}</h3>
                <div style={{ fontSize: 12, color: "var(--gris)" }}>
                  Cap. {concepto.capitulo} · {concepto.tributo}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bid">{bloqueId}</div>
              <div>
                <h3>{BLOQUES[bloqueId!]}</h3>
                <div style={{ fontSize: 12, color: "var(--gris)" }}>{rows.length} conceptos en este bloque</div>
              </div>
            </>
          )}
          {concepto && (
            <button className="x share" onClick={copyLink} title="Copiar enlace a este concepto" aria-label="Copiar enlace">
              {copied ? "✓" : "⎘"}
            </button>
          )}
          <button className="x" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="db">
          {concepto ? (
            <>
              {bloqueId != null && (
                <button className="fchip" style={{ marginBottom: 12 }} onClick={() => onPick(null)}>
                  ← Volver al bloque
                </button>
              )}
              <ConceptDetail c={concepto} onVerify={onVerify} />
            </>
          ) : (
            rows.map((c) => (
              <div
                key={c.id}
                className={`concept ${c.confianza === "Dudosa" || c.confianza === "Media" ? "dudosa" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => onPick(c)}
              >
                <div className="ch">
                  <span className="at">{c.articulo}</span>
                  <span className="rf">{c.referencia}</span>
                </div>
                <div className="ds" style={{ fontWeight: 600, margin: "4px 0 2px" }}>{c.actividad}</div>
                <div className="vals">
                  {c.valor_urbanos != null && <span className="chip val">{c.valor_urbanos} U</span>}
                  {c.alicuota && <span className="chip val">{c.alicuota}</span>}
                  <span className={`sem ${sensClase(c.sensibilidad)}`}>{c.sensibilidad}</span>
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
            ))
          )}
        </div>
      </div>
    </>
  );
}
