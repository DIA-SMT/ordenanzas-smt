export interface Concepto {
  id: string;
  pagina: number | null;
  capitulo: string;
  titulo_capitulo: string;
  articulo: string;
  inciso: string;
  tributo: string;
  rubro: string;
  actividad: string;
  descripcion: string;
  sujeto: string;
  hecho: string;
  base_calculo: string;
  valor_pesos: number | null;
  valor_urbanos: number | null;
  alicuota: string;
  periodicidad: string;
  momento_pago: string;
  area: string;
  tramite: string;
  claridad: string;
  sensibilidad: string;
  observaciones: string;
  referencia: string;
  confianza: string;
  bloque_id: number;
  bloque: string;
}

export const BLOQUES: Record<number, string> = {
  1: "Inmuebles, servicios urbanos y contribuciones vinculadas",
  2: "Actividad comercial, industrial y de servicios",
  3: "Habilitaciones, permisos e inspecciones",
  4: "Construcción, obras privadas, urbanismo y catastro",
  5: "Uso del espacio público y vía pública",
  6: "Publicidad, cartelería, marquesinas y anuncios",
  7: "Transporte, vehículos, cargas, taxis y vinculadas",
  8: "Bromatología, sanidad, salud ambiental y control sanitario",
  9: "Espectáculos públicos, eventos y actividades recreativas",
  10: "Cementerio, sepelios y servicios funerarios",
  11: "Multas, infracciones, derechos administrativos y actuaciones",
  12: "Rentas especiales y otros conceptos tributarios",
};

export const BLOQUE_CORTO: Record<number, string> = {
  1: "Inmuebles y servicios urbanos",
  2: "Actividad comercial (TEM)",
  3: "Habilitaciones e inspecciones",
  4: "Construcción y catastro",
  5: "Espacio público y vía pública",
  6: "Publicidad y cartelería",
  7: "Transporte y vehículos",
  8: "Bromatología y sanidad",
  9: "Espectáculos y eventos",
  10: "Cementerios y servicios funerarios",
  11: "Multas y actuaciones",
  12: "Rentas especiales y otros",
};

export const VALOR_URBANO = 23.0;

export function semaforoClase(nivel: string): string {
  if (nivel === "Alta") return "verde";
  if (nivel === "Media") return "ambar";
  if (nivel === "Baja") return "rojo";
  if (nivel === "Dudosa") return "rojo";
  return "gris";
}

export function sensClase(nivel: string): string {
  if (nivel === "Alta") return "rojo";
  if (nivel === "Media") return "ambar";
  if (nivel === "Baja") return "verde";
  return "gris";
}

export function pesos(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
