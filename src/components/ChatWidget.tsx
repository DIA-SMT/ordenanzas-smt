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

const SUGS = [
  "¿Cuánto sale el carnet de conducir?",
  "¿Qué descuentos y planes de pago hay?",
  "¿Cuánto cuesta habilitar un comercio?",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function grounding(citas: Cita[] | undefined) {
  if (!citas || citas.length === 0) return null;
  const top = Math.max(...citas.map((c) => c.score));
  const level = top >= 52 ? "alta" : top >= 42 ? "media" : "baja";
  return { top, n: citas.length, level };
}

export default function ChatWidget({
  open,
  onOpenChange,
  onVerify,
  hide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerify: (pagina: number, label?: string) => void;
  hide?: boolean;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, open]);

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
        const j = await res.json().catch(() => ({ error: "Error." }));
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

  if (hide) return null;

  return (
    <>
      {!open && (
        <button className="cw-launch" onClick={() => onOpenChange(true)} aria-label="Abrir asistente">
          <span className="cw-launch-ic">IA</span>
          <span className="cw-launch-tx">Consultar la ordenanza</span>
        </button>
      )}

      {open && (
        <div className={`cw-panel ${expanded ? "expanded" : ""}`}>
          <div className="cw-head">
            <div className="cw-title">
              <span className="cw-dot" />
              Asistente · Ordenanza 5487
            </div>
            <div className="cw-actions">
              {msgs.length > 0 && (
                <button onClick={() => setMsgs([])} title="Nueva consulta">⟲</button>
              )}
              <button onClick={() => setExpanded((e) => !e)} title={expanded ? "Reducir" : "Expandir"} aria-label="Expandir">
                {expanded ? "⤡" : "⤢"}
              </button>
              <button onClick={() => onOpenChange(false)} title="Minimizar" aria-label="Cerrar">✕</button>
            </div>
          </div>

          <div className="chat cw-chat">
            <div className="msgs" ref={scrollRef}>
              {msgs.length === 0 && (
                <div className="cw-intro">
                  <b>Preguntame sobre la ordenanza.</b>
                  <br />
                  Respondo en lenguaje claro, con el artículo, la página y el enlace para verificar.
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
                          {g.level === "baja" && <span className="gwarn">⚠ Verificá en el texto oficial.</span>}
                        </div>
                      )}
                      {m.citas && m.citas.length > 0 && !m.typing && (
                        <div className="cites">
                          {m.citas.slice(0, 3).map((c, j) => (
                            <button
                              key={j}
                              className={`cite ${c.pagina ? "clickable" : ""}`}
                              onClick={() => c.pagina && onVerify(c.pagina, c.articulo ?? undefined)}
                              disabled={!c.pagina}
                            >
                              <div className="cite-h">
                                <b>
                                  {c.articulo ? c.articulo : c.fuente}
                                  {c.pagina ? ` · pág. ${c.pagina}` : ""}
                                </b>
                                <span className="cite-score">{c.score}%</span>
                              </div>
                              {c.pagina ? <div className="cite-go">⤓ Ver en la norma</div> : null}
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
              <div className="cw-suggest">
                {SUGS.map((s) => (
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
        </div>
      )}
    </>
  );
}
