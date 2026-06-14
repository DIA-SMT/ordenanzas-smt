"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BLOQUE_CORTO, type Concepto } from "@/lib/blocks";

type Tab = "mapa" | "buscador" | "simulador" | "asistente" | "normativa";
type Action =
  | { kind: "tab"; id: Tab; label: string; hint: string }
  | { kind: "concept"; c: Concepto };

const TABS: Action[] = [
  { kind: "tab", id: "mapa", label: "Mapa de bloques", hint: "Inicio" },
  { kind: "tab", id: "buscador", label: "Buscador", hint: "Sección" },
  { kind: "tab", id: "simulador", label: "Simulador", hint: "Sección" },
  { kind: "tab", id: "asistente", label: "Asistente IA", hint: "Sección" },
  { kind: "tab", id: "normativa", label: "Normativa", hint: "Sección" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CommandPalette({
  conceptos,
  onTab,
  onConcept,
  onClose,
}: {
  conceptos: Concepto[];
  onTab: (id: Tab) => void;
  onConcept: (c: Concepto) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const match = (hay: string) => terms.every((t) => norm(hay).includes(t));
    const tabs = TABS.filter((a) => terms.length === 0 || (a.kind === "tab" && match(a.label + " " + a.hint)));
    const concepts: Action[] =
      terms.length === 0
        ? []
        : conceptos
            .filter((x) => match([x.actividad, x.descripcion, x.rubro, x.articulo, x.tributo, x.titulo_capitulo].join(" ")))
            .slice(0, 14)
            .map((c) => ({ kind: "concept", c }));
    return [...tabs, ...concepts];
  }, [q, conceptos]);

  useEffect(() => setIdx(0), [q]);

  const choose = (a: Action | undefined) => {
    if (!a) return;
    if (a.kind === "tab") onTab(a.id);
    else onConcept(a.c);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(results[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, idx, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(".cmd-item.sel");
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          <span className="cmd-ic">⌘K</span>
          <input
            ref={inputRef}
            placeholder="Buscar concepto, tributo o ir a una sección…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="cmd-esc">ESC</span>
        </div>
        <div className="cmd-list" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">Sin resultados para “{q}”.</div>}
          {q.trim() === "" && <div className="cmd-section">Ir a una sección</div>}
          {results.map((a, i) => (
            <button
              key={i}
              className={`cmd-item ${i === idx ? "sel" : ""}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => choose(a)}
            >
              {a.kind === "tab" ? (
                <>
                  <span className="cmd-k">▸</span>
                  <span className="cmd-l">{a.label}</span>
                  <span className="cmd-h">{a.hint}</span>
                </>
              ) : (
                <>
                  <span className="cmd-k">{a.c.articulo}</span>
                  <span className="cmd-l">{a.c.actividad}</span>
                  <span className="cmd-h">
                    {BLOQUE_CORTO[a.c.bloque_id]}
                    {a.c.pagina ? ` · pág. ${a.c.pagina}` : ""}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
        <div className="cmd-foot">
          <span><b>↑↓</b> navegar</span>
          <span><b>↵</b> abrir</span>
          <span><b>esc</b> cerrar</span>
        </div>
      </div>
    </div>
  );
}
