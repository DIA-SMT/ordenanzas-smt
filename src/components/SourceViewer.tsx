"use client";
import { useEffect, useMemo, useState } from "react";
import artCoords from "@/data/art_coords.json";

const TOTAL = 48;
const src = (n: number) => `/paginas/p-${String(n).padStart(2, "0")}.jpg`;
const COORDS = artCoords as Record<string, { art: string; top: number; bottom: number }[]>;

export default function SourceViewer({
  pagina,
  label,
  onClose,
}: {
  pagina: number;
  label?: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(Math.min(Math.max(pagina || 1, 1), TOTAL));
  const [zoom, setZoom] = useState(false);

  const targetArt = useMemo(() => (label ? label.match(/(\d+)/)?.[1] ?? null : null), [label]);
  const hl = useMemo(() => {
    if (!targetArt) return null;
    const arts = COORDS[String(page)] ?? [];
    return arts.find((a) => a.art === targetArt) ?? null;
  }, [page, targetArt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => Math.min(TOTAL, p + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="src-backdrop" onClick={onClose}>
      <div className="srcviewer" onClick={(e) => e.stopPropagation()}>
        <div className="src-head">
          <div className="src-title">
            <span className="src-doc">Ordenanza Tarifaria N° 5487/2025</span>
            <span className="src-ref">
              Página {page} de {TOTAL}
              {label ? ` · ${label}` : ""}
            </span>
          </div>
          <div className="src-actions">
            <a className="src-btn" href={src(page)} target="_blank" rel="noreferrer" title="Abrir imagen en pestaña nueva">
              Abrir ↗
            </a>
            <button className="src-btn" onClick={onClose} aria-label="Cerrar">
              Cerrar ✕
            </button>
          </div>
        </div>

        <div className="src-body">
          <button
            className="src-nav prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            ‹
          </button>
          <div className={`src-imgwrap ${zoom ? "zoom" : ""}`} onClick={() => setZoom((z) => !z)}>
            <div className="src-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(page)} alt={`Ordenanza 5487/2025 — página ${page}`} />
              {hl && (
                <div
                  className="src-hl"
                  style={{ top: `${hl.top * 100}%`, height: `${(hl.bottom - hl.top) * 100}%` }}
                >
                  <span className="src-hl-tag">Art. {hl.art}</span>
                </div>
              )}
            </div>
            <span className="src-zoomhint">
              {hl ? "Artículo resaltado · " : ""}
              {zoom ? "Clic para reducir" : "Clic para ampliar"}
            </span>
          </div>
          <button
            className="src-nav next"
            onClick={() => setPage((p) => Math.min(TOTAL, p + 1))}
            disabled={page >= TOTAL}
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="src-foot">
          Fuente oficial escaneada. Verificá el dato directamente sobre el texto de la norma.
        </div>
      </div>
    </div>
  );
}
