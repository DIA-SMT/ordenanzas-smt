"use client";
import { useState } from "react";
import type { Concepto } from "@/lib/blocks";
import Mapa from "./Mapa";
import Buscador from "./Buscador";
import Simulador from "./Simulador";
import Chat from "./Chat";
import NormativaPanel from "./NormativaPanel";
import Drawer from "./Drawer";
import SourceViewer from "./SourceViewer";

type Tab = "mapa" | "buscador" | "simulador" | "asistente" | "normativa";

export default function Shell({ conceptos }: { conceptos: Concepto[] }) {
  const [tab, setTab] = useState<Tab>("mapa");
  const [selected, setSelected] = useState<Concepto | null>(null);
  const [selectedBloque, setSelectedBloque] = useState<number | null>(null);
  const [source, setSource] = useState<{ pagina: number; label?: string } | null>(null);
  const verify = (pagina: number, label?: string) => setSource({ pagina, label });

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            setTab("mapa");
            setSelected(null);
            setSelectedBloque(null);
          }}
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
        <img className="logo-dia" src="/logo-dia.png" alt="Dirección IA" />
        <span className="u">1 U = $23,00</span>
      </header>

      <nav className="tabs">
        <button className={tab === "mapa" ? "active" : ""} onClick={() => setTab("mapa")}>
          Mapa de bloques
        </button>
        <button className={tab === "buscador" ? "active" : ""} onClick={() => setTab("buscador")}>
          Buscador<span className="badge">{conceptos.length}</span>
        </button>
        <button className={tab === "simulador" ? "active" : ""} onClick={() => setTab("simulador")}>
          Simulador
        </button>
        <button className={tab === "asistente" ? "active" : ""} onClick={() => setTab("asistente")}>
          Asistente IA
        </button>
        <button className={tab === "normativa" ? "active" : ""} onClick={() => setTab("normativa")}>
          Normativa
        </button>
      </nav>

      <main className="view">
        {tab === "mapa" && (
          <Mapa
            conceptos={conceptos}
            onOpenBloque={(b) => {
              setSelectedBloque(b);
              setSelected(null);
            }}
          />
        )}
        {tab === "buscador" && (
          <Buscador conceptos={conceptos} onOpen={(c) => setSelected(c)} onVerify={verify} />
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

      {source && (
        <SourceViewer pagina={source.pagina} label={source.label} onClose={() => setSource(null)} />
      )}
    </div>
  );
}
