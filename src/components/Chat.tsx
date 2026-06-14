"use client";
import { useRef, useState, useEffect } from "react";

interface Cita {
  fuente: string;
  articulo: string | null;
  pagina: number | null;
  capitulo: string | null;
  score: number;
  snippet: string;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
  citas?: Cita[];
  typing?: boolean;
  error?: boolean;
}

const SUGERENCIAS = [
  "¿Cuánto paga un taxi o remis para su licencia?",
  "¿Qué tributo rige para las antenas y estructuras?",
  "¿Cómo se calcula la contribución inmobiliaria por zona?",
  "¿Qué descuentos y planes de pago existen?",
  "¿Cuánto cuesta habilitar un comercio?",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Nivel de fundamentación según la mejor coincidencia del RAG. */
function grounding(citas: Cita[] | undefined) {
  if (!citas || citas.length === 0) return null;
  const top = Math.max(...citas.map((c) => c.score));
  const level = top >= 52 ? "alta" : top >= 42 ? "media" : "baja";
  return { top, n: citas.length, level };
}

export default function Chat({ onVerify }: { onVerify: (pagina: number, label?: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const history = [...msgs, { role: "user" as const, content: q }];
    setMsgs(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Error desconocido." }));
        setMsgs((m) => [...m, { role: "assistant", content: j.error ?? "Error.", error: true }]);
        return;
      }

      let citas: Cita[] = [];
      const header = res.headers.get("X-Citations");
      if (header) {
        try {
          const bytes = Uint8Array.from(atob(header), (ch) => ch.charCodeAt(0));
          citas = JSON.parse(new TextDecoder().decode(bytes));
        } catch {}
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
      }

      // efecto máquina de escribir
      setMsgs((m) => [...m, { role: "assistant", content: "", citas, typing: true }]);
      const step = Math.max(1, Math.round(full.length / 140));
      for (let i = 0; i <= full.length; i += step) {
        const slice = full.slice(0, i);
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { ...c[c.length - 1], content: slice, typing: true };
          return c;
        });
        await sleep(13);
      }
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], content: full, typing: false };
        return c;
      });
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: `Error de red: ${(e as Error).message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat">
      <div className="msgs" ref={scrollRef}>
        {msgs.length === 0 && (
          <div className="empty-chat">
            <div className="big">Asistente de la Ordenanza Tarifaria</div>
            <p>
              Preguntá en lenguaje natural sobre tributos, tasas, derechos y contribuciones. Cada respuesta
              se construye solo con la normativa cargada y muestra su <b>nivel de fundamentación</b> y las
              fuentes citadas (artículo y página).
            </p>
          </div>
        )}
        {msgs.map((m, i) => {
          const g = m.role === "assistant" && !m.error ? grounding(m.citas) : null;
          return (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
              <div className="av">{m.role === "user" ? "Vos" : "IA"}</div>
              <div style={{ minWidth: 0 }}>
                <div
                  className={`bubble ${m.typing ? "typing" : ""}`}
                  style={m.error ? { borderColor: "var(--rojo)", color: "var(--rojo)" } : undefined}
                >
                  {m.content ||
                    (loading && i === msgs.length - 1 && !m.error ? (
                      <span className="dots"><span>●</span><span>●</span><span>●</span></span>
                    ) : (
                      ""
                    ))}
                </div>

                {g && !m.typing && (
                  <div className={`grounding ${g.level}`}>
                    <span className="gdot" />
                    <b>Fundamentación {g.level}</b>
                    <span className="gsep">·</span>
                    {g.n} fuente{g.n === 1 ? "" : "s"}
                    <span className="gsep">·</span>
                    mejor coincidencia {g.top}%
                    {g.level === "baja" && (
                      <span className="gwarn">⚠ Coincidencia baja — verificá en el texto oficial.</span>
                    )}
                  </div>
                )}

                {m.citas && m.citas.length > 0 && !m.typing && (
                  <div className="cites">
                    <div className="cites-title">Fuentes — tocá para verificar en la norma</div>
                    {m.citas.slice(0, 4).map((c, j) => (
                      <button
                        key={j}
                        className={`cite ${c.pagina ? "clickable" : ""}`}
                        onClick={() => c.pagina && onVerify(c.pagina, c.articulo ?? undefined)}
                        disabled={!c.pagina}
                      >
                        <div className="cite-h">
                          <b>
                            {c.fuente}
                            {c.articulo ? ` · ${c.articulo}` : ""}
                            {c.pagina ? ` · pág. ${c.pagina}` : ""}
                          </b>
                          <span className="cite-score">
                            <span className="cite-bar"><span style={{ width: `${c.score}%` }} /></span>
                            {c.score}%
                          </span>
                        </div>
                        <div className="cite-snip">{c.snippet}…</div>
                        {c.pagina ? <div className="cite-go">⤓ Ver en la norma · pág. {c.pagina}</div> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {msgs.length === 0 && (
        <div className="suggest">
          {SUGERENCIAS.map((s) => (
            <button key={s} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="composer">
        <textarea
          rows={1}
          placeholder="Escribí tu consulta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button disabled={loading || !input.trim()} onClick={() => send(input)}>
          {loading ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
