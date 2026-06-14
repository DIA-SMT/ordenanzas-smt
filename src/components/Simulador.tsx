"use client";
import { useState, createContext, useContext } from "react";
import { VALOR_URBANO } from "@/lib/blocks";

const ARS = (n: number) => "$" + (isFinite(n) ? n : 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

const VerifyCtx = createContext<(pagina: number, label?: string) => void>(() => {});

function Out({ big, sub, refTxt, page, label }: { big: string; sub: string; refTxt: string; page: number; label: string }) {
  const onVerify = useContext(VerifyCtx);
  return (
    <div className="simout">
      <div className="big">{big}</div>
      <div className="sub">{sub}</div>
      <div className="ref">{refTxt}</div>
      <button className="verify-btn" style={{ marginTop: 10 }} onClick={() => onVerify(page, label)}>
        <span className="vico">⤓</span> Ver en la norma · pág. {page}
      </button>
    </div>
  );
}

function Inmobiliario() {
  const [val, setVal] = useState(8000000);
  const [zona, setZona] = useState("I");
  const [baldio, setBaldio] = useState(false);
  const alic: Record<string, number> = { I: 1.1, II: 1.0, III: 0.9, IV: 0.8 };
  const min: Record<string, number> = { I: 125, II: 100, III: 70, IV: 45 };
  const a = alic[zona] * (baldio ? 1.5 : 1);
  const anual = (val * a) / 100;
  const minMensual = min[zona] * VALOR_URBANO;
  const mensual = Math.max(anual / 12, minMensual);
  return (
    <div className="simcard">
      <h3>Contribución sobre inmuebles</h3>
      <div className="hint">Cap. II, Arts. 3° y 4°. Alícuota por zona sobre la valuación fiscal, con mínimo mensual.</div>
      <div className="field">
        <label>Valuación fiscal del inmueble ($)</label>
        <input type="number" value={val} onChange={(e) => setVal(+e.target.value)} />
      </div>
      <div className="field">
        <label>Zona</label>
        <select value={zona} onChange={(e) => setZona(e.target.value)}>
          <option value="I">Zona I — 1,10%</option>
          <option value="II">Zona II — 1,00%</option>
          <option value="III">Zona III — 0,90%</option>
          <option value="IV">Zona IV — 0,80%</option>
        </select>
      </div>
      <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={baldio} onChange={(e) => setBaldio(e.target.checked)} /> Inmueble baldío (+50%)
      </label>
      <Out
        big={ARS(mensual) + "/mes"}
        sub={`Anual: ${ARS(anual)} · alícuota ${a.toFixed(2)}% · mínimo zona ${zona}: ${ARS(minMensual)}/mes`}
        refTxt={mensual === minMensual ? "Rige el mínimo mensual (Art. 4°)." : "Rige el cálculo por valuación (Art. 3°)."}
        page={1}
        label="Arts. 3° y 4°"
      />
    </div>
  );
}

function TEM() {
  const [ing, setIng] = useState(3000000);
  const [alic, setAlic] = useState(1.25);
  const [cat, setCat] = useState(270);
  const calc = (ing * alic) / 100;
  const min = cat * VALOR_URBANO;
  const pagar = Math.max(calc, min);
  return (
    <div className="simcard">
      <h3>Tributo Económico Municipal (TEM)</h3>
      <div className="hint">Cap. III, Arts. 6° a 8°. Alícuota sobre ingresos brutos, con mínimo por categoría.</div>
      <div className="field">
        <label>Ingresos brutos mensuales ($)</label>
        <input type="number" value={ing} onChange={(e) => setIng(+e.target.value)} />
      </div>
      <div className="field">
        <label>Alícuota según actividad</label>
        <select value={alic} onChange={(e) => setAlic(+e.target.value)}>
          <option value={1.25}>General — 1,25%</option>
          <option value={0.6}>Agropecuario / comestibles / salud / educación — 0,60%</option>
          <option value={0.8}>Petróleo / 0 km / transporte de carga — 0,80%</option>
          <option value={1.0}>Fabricantes / constructoras — 1,00%</option>
          <option value={1.5}>Cervezas y gaseosas — 1,50%</option>
          <option value={1.65}>Expendio de combustibles — 1,65%</option>
          <option value={2.0}>Telecomunicaciones — 2,00%</option>
          <option value={3.7}>Comisiones / intermediación / tabaco — 3,70%</option>
          <option value={5.0}>Seguros / financieras / bolsa — 5,00%</option>
          <option value={6.6}>Boites / hoteles alojamiento / juegos — 6,60%</option>
        </select>
      </div>
      <div className="field">
        <label>Categoría de contribuyente (mínimo mensual)</label>
        <select value={cat} onChange={(e) => setCat(+e.target.value)}>
          <option value={270}>A — 270 U</option>
          <option value={436}>B — 436 U</option>
          <option value={638}>C — 638 U</option>
          <option value={826}>D — 826 U</option>
          <option value={1170}>E — 1.170 U</option>
          <option value={2926}>Grandes Contribuyentes — 2.926 U</option>
        </select>
      </div>
      <Out
        big={ARS(pagar) + "/mes"}
        sub={`Por alícuota: ${ARS(calc)} · mínimo categoría: ${ARS(min)}`}
        refTxt={pagar === min ? "Rige el mínimo de la categoría (Art. 8°)." : "Rige el cálculo por alícuota (Arts. 6°/7°)."}
        page={3}
        label="Arts. 6° a 8°"
      />
    </div>
  );
}

function Publicidad() {
  const [m2, setM2] = useState(2);
  const [base, setBase] = useState(300);
  const [led, setLed] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [animada, setAnimada] = useState(false);
  const [ilum, setIlum] = useState(false);
  let factor = 1;
  if (led) factor += 1.5;
  if (alcohol) factor += 1.5;
  if (animada) factor += 0.75;
  if (ilum) factor += 0.75;
  const u = base * m2 * factor;
  return (
    <div className="simcard">
      <h3>Tributo a la publicidad</h3>
      <div className="hint">Cap. V, Arts. 15 y 16. Tarifa por m²/unidad con recargos por tipo de aviso.</div>
      <div className="field">
        <label>Cantidad (m² o unidades)</label>
        <input type="number" value={m2} onChange={(e) => setM2(+e.target.value)} />
      </div>
      <div className="field">
        <label>Tipo de soporte (tarifa base en U)</label>
        <select value={base} onChange={(e) => setBase(+e.target.value)}>
          <option value={300}>Fachada / vidriera / transversal — 300 U</option>
          <option value={180}>Columnas / balcones — 180 U</option>
          <option value={120}>Elementos volumétricos (m³) — 120 U</option>
          <option value={200}>Otros / no contemplados — 200 U</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12.5 }}>
        <label><input type="checkbox" checked={led} onChange={(e) => setLed(e.target.checked)} /> Pantalla LED (+150%)</label>
        <label><input type="checkbox" checked={alcohol} onChange={(e) => setAlcohol(e.target.checked)} /> Alcohol/tabaco (+150%)</label>
        <label><input type="checkbox" checked={animada} onChange={(e) => setAnimada(e.target.checked)} /> Animada (+75%)</label>
        <label><input type="checkbox" checked={ilum} onChange={(e) => setIlum(e.target.checked)} /> Iluminada (+75%)</label>
      </div>
      <Out
        big={ARS(u * VALOR_URBANO) + "/mes"}
        sub={`${u.toLocaleString("es-AR")} U · factor de recargo ×${factor.toFixed(2)}`}
        refTxt="Tarifa base por mes (Art. 15) más recargos del Art. 16."
        page={9}
        label="Arts. 15 y 16"
      />
    </div>
  );
}

function Construccion() {
  const [monto, setMonto] = useState(15000000);
  return (
    <div className="simcard">
      <h3>Construcción de obra privada</h3>
      <div className="hint">Cap. XIV, Art. 29. 1% del monto de obra (valor del m² fijado por Catastro).</div>
      <div className="field">
        <label>Monto de obra ($)</label>
        <input type="number" value={monto} onChange={(e) => setMonto(+e.target.value)} />
      </div>
      <Out big={ARS(monto * 0.01)} sub="1% del monto de obra" refTxt="Edificios en general (Art. 29 inc. a). Cementerios: 1,5% / 1%." page={24} label="Art. 29" />
    </div>
  );
}

function Conversor() {
  const [u, setU] = useState(1000);
  return (
    <div className="simcard">
      <h3>Conversor Urbanos ↔ Pesos</h3>
      <div className="hint">Art. 1°. 1 Urbano (U) = $23,00.</div>
      <div className="field">
        <label>Urbanos (U)</label>
        <input type="number" value={u} onChange={(e) => setU(+e.target.value)} />
      </div>
      <Out big={ARS(u * VALOR_URBANO)} sub={`${u.toLocaleString("es-AR")} U × $23,00`} refTxt="Valor de referencia del Art. 1° de la Ordenanza 5487/2025." page={1} label="Art. 1°" />
    </div>
  );
}

export default function Simulador({ onVerify }: { onVerify: (pagina: number, label?: string) => void }) {
  return (
    <VerifyCtx.Provider value={onVerify}>
      <div className="scroll">
        <div className="sim">
          <p style={{ color: "var(--gris)", fontSize: 13, margin: "0 0 14px" }}>
            Calculadoras orientativas basadas en las alícuotas y mínimos de la ordenanza. Los montos son estimativos:
            el texto oficial y la liquidación municipal prevalecen. Cada resultado enlaza a la página de la norma.
          </p>
          <div className="grid">
            <Inmobiliario />
            <TEM />
            <Publicidad />
            <Construccion />
            <Conversor />
          </div>
        </div>
      </div>
    </VerifyCtx.Provider>
  );
}
