"use client";
import { useEffect, useState } from "react";

interface Doc {
  id: string;
  titulo: string;
  tipo: string;
  numero: string | null;
  fecha: string | null;
  estado: string;
  metadata: { chunk_count?: number };
  created_at: string;
}

export default function NormativaPanel() {
  const [items, setItems] = useState<Doc[]>([]);
  const [configured, setConfigured] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("ordenanza");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/normativa");
    const j = await res.json();
    setConfigured(j.configured);
    setItems(j.items ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setStatus("Procesando y generando embeddings… puede tardar según el tamaño.");
    const fd = new FormData();
    fd.append("file", file);
    if (titulo) fd.append("titulo", titulo);
    fd.append("tipo", tipo);
    try {
      const res = await fetch("/api/normativa/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) setStatus("⚠ " + (j.error ?? "Error al subir."));
      else {
        setStatus(`✓ "${j.titulo}" indexada (${j.chunkCount} fragmentos).`);
        setTitulo("");
        setFile(null);
        await load();
      }
    } catch (e) {
      setStatus("⚠ " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scroll">
      <div className="norm">
        <h2>Normativa cargada</h2>
        <p className="lead">
          Acá viven todas las normas indexadas para el asistente. Subí ordenanzas, decretos, leyes o
          reglamentos (PDF con texto, DOCX o TXT) y quedarán disponibles para consulta semántica con el mismo
          motor de RAG que usa la Dirección IA.
        </p>

        {!configured && (
          <div className="banner" style={{ borderRadius: 10, marginBottom: 16 }}>
            La carga y el asistente requieren configurar <b>SUPABASE_SERVICE_ROLE_KEY</b> y{" "}
            <b>OPENROUTER_API_KEY</b>. La consulta del tablero (mapa, buscador, simulador) funciona igual.
          </div>
        )}

        <div className="upload">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Título (opcional)</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Ordenanza de Contabilidad 570/80" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="ordenanza">Ordenanza</option>
                <option value="decreto">Decreto</option>
                <option value="ley">Ley</option>
                <option value="reglamento">Reglamento</option>
                <option value="resolucion">Resolución</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button className="fchip on" style={{ marginLeft: 12, padding: "9px 18px" }} disabled={!file || busy} onClick={upload}>
            {busy ? "Indexando…" : "Subir e indexar"}
          </button>
          {status && <div style={{ marginTop: 10, fontSize: 13, color: "var(--gris)" }}>{status}</div>}
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--gris)" }}>
            Nota: los PDF escaneados sin texto deben OCRizarse antes (como se hizo con la Ord. 5487).
          </div>
        </div>

        <div className="norm-list">
          {items.length === 0 && (
            <div style={{ color: "var(--gris)", fontSize: 13 }}>
              Todavía no hay normativa indexada visible.
            </div>
          )}
          {items.map((d) => (
            <div key={d.id} className="norm-item">
              <span className="ty">{d.tipo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{d.titulo}</div>
                <div style={{ fontSize: 12, color: "var(--gris)" }}>
                  N° {d.numero ?? "s/n"} · {d.metadata?.chunk_count ?? 0} fragmentos · {d.estado}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
