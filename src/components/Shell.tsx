"use client";
import { useState, useEffect, useRef } from "react";
import type { Concepto } from "@/lib/blocks";
import Mapa from "./Mapa";
import Buscador from "./Buscador";
import Simulador from "./Simulador";
import Chat from "./Chat";
import NormativaPanel from "./NormativaPanel";
import Drawer from "./Drawer";
import SourceViewer from "./SourceViewer";
import CommandPalette from "./CommandPalette";
import ChatWidget from "./ChatWidget";

type Tab = "mapa" | "buscador" | "simulador" | "asistente" | "normativa";
const TABS: Tab[] = ["mapa", "buscador", "simulador", "asistente", "normativa"];

export default function Shell({ conceptos }: { conceptos: Concepto[] }) {
  const [tab, setTab] = useState<Tab>("mapa");
  const [selected, setSelected] = useState<Concepto | null>(null);
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null);
  const [source, setSource] = useState<{ pagina: number; label?: string } | null>(null);
  const [palette, setPalette] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [light, setLight] = useState(true);
  const ready = useRef(false);

  // ── control centralizado: una sola cosa abierta a la vez ──
  const verify = (pagina: number, label?: string) => setSource({ pagina, label });
  const goTab = (t: Tab) => {
    setTab(t);
    setSelected(null);
    setSelectedBloque(null);
    setSource(null);
    setPalette(false);
    setWidgetOpen(false);
  };
  const openConcept = (c: Concepto) => {
    setSelected(c);
    setSelectedBloque(null);
    setPalette(false);
    setWidgetOpen(false);
  };
  const openBloque = (b: number) => {
    setSelectedBloque(b);
    setSelected(null);
    setWidgetOpen(false);
  };
  const changeWidget = (v: boolean) => {
    setWidgetOpen(v);
    if (v) {
      setSelected(null);
      setSelectedBloque(null);
      setPalette(false);
    }
  };

  // ── tema claro (por defecto) / oscuro ──
  useEffect(() => {
    setLight(document.documentElement.dataset.theme !== "dark");
  }, []);
  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {}
  };

  // ── estado desde URL (vistas compartibles) ──
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const t = h.get("t") as Tab | null;
    if (t && TABS.includes(t)) setTab(t);
    const c = h.get("c");
    if (c) {
      const found = conceptos.find((x) => x.id === c);
      if (found) setSelected(found);
    }
    const b = h.get("b");
    if (b && !c) setSelectedBloque(Number(b));
  }, [conceptos]);

  // ── reflejar estado en URL ──
  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      return;
    }
    const p = new URLSearchParams();
    p.set("t", tab);
    if (selected) p.set("c", selected.id);
    else if (selectedBloque != null) p.set("b", String(selectedBloque));
    window.history.replaceState(null, "", `#${p.toString()}`);
  }, [tab, selected, selectedBloque]);

  // ── atajo ⌘K ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => goTab("mapa")}
          aria-label="Volver al inicio"
          title="Volver al inicio"
        >
          <img src="/logo-smt.png" alt="Municipalidad de San Miguel de Tucumán" />
          <div className="t">
            Ordenanza Tarifaria 5487/2025
            <small>Tablero de gestión tributaria · San Miguel de Tucumán</small>
          </div>
        </button>
        <div className="spacer" />
        <button className="cmdk-btn" onClick={() => setPalette(true)} title="Buscar (⌘K)">
          <span className="cmdk-ic">⌘K</span>
          <span className="cmdk-tx">Buscar</span>
        </button>
        <button className="icon-btn" onClick={toggleTheme} title={light ? "Modo oscuro" : "Modo claro"} aria-label="Cambiar tema">
          {light ? "☾" : "☀"}
        </button>
        <img className="logo-dia" src="/logo-dia.png" alt="Dirección IA" />
        <span className="u">1 U = $23,00</span>
      </header>

      <nav className="tabs">
        <button className={tab === "mapa" ? "active" : ""} onClick={() => goTab("mapa")}>
          Mapa de bloques
        </button>
        <button className={tab === "buscador" ? "active" : ""} onClick={() => goTab("buscador")}>
          Buscador<span className="badge">{conceptos.length}</span>
        </button>
        <button className={tab === "simulador" ? "active" : ""} onClick={() => goTab("simulador")}>
          Simulador
        </button>
        <button className={tab === "asistente" ? "active" : ""} onClick={() => goTab("asistente")}>
          Asistente IA
        </button>
        <button className={tab === "normativa" ? "active" : ""} onClick={() => goTab("normativa")}>
          Normativa
        </button>
      </nav>

      <main className="view">
        {tab === "mapa" && (
          <Mapa conceptos={conceptos} onOpenBloque={openBloque} onOpenConcept={openConcept} />
        )}
        {tab === "buscador" && (
          <Buscador conceptos={conceptos} onOpen={openConcept} onVerify={verify} />
        )}
        {tab === "simulador" && <Simulador onVerify={verify} />}
        {tab === "asistente" && <Chat onVerify={verify} />}
        {tab === "normativa" && <NormativaPanel />}

        {(selected || selectedBloque !== null) && (
          <Drawer
            conceptos={conceptos}
            concepto={selected}
            bloqueId={selectedBloque}
            onClose={() => {
              setSelected(null);
              setSelectedBloque(null);
            }}
            onPick={(c) => setSelected(c)}
            onVerify={verify}
          />
        )}
      </main>

      <ChatWidget open={widgetOpen} onOpenChange={changeWidget} onVerify={verify} hide={tab === "asistente"} />

      <footer className="appfoot">
        <span>
          Desarrollado por la <b>Dirección de IA</b> · Municipalidad de San Miguel de Tucumán
        </span>
        <img src="/logo-dia.png" alt="Dirección de IA" />
      </footer>

      {source && (
        <SourceViewer pagina={source.pagina} label={source.label} onClose={() => setSource(null)} />
      )}

      {palette && (
        <CommandPalette
          conceptos={conceptos}
          onTab={(id) => goTab(id)}
          onConcept={(c) => openConcept(c)}
          onClose={() => setPalette(false)}
        />
      )}
    </div>
  );
}
