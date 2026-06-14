export interface TItem {
  value: number;
}
export interface TRect<T = TItem> {
  x: number;
  y: number;
  w: number;
  h: number;
  item: T;
}

/**
 * Treemap "squarified" (Bruls, Huizing, van Wijk).
 * Devuelve rectángulos en píxeles para un contenedor width×height.
 */
export function squarify<T extends TItem>(items: T[], width: number, height: number): TRect<T>[] {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0) || 1;
  const scale = (width * height) / total;
  const scaled = sorted.map((item) => ({ item, area: item.value * scale }));

  const rects: TRect<T>[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  const worst = (rowAreas: number[], side: number) => {
    if (rowAreas.length === 0) return Infinity;
    const sum = rowAreas.reduce((s, a) => s + a, 0);
    const max = Math.max(...rowAreas);
    const min = Math.min(...rowAreas);
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const layoutRow = (row: { item: T; area: number }[]) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      const dw = sum / h;
      let cy = y;
      for (const r of row) {
        const dh = r.area / dw;
        rects.push({ x, y: cy, w: dw, h: dh, item: r.item });
        cy += dh;
      }
      x += dw;
      w -= dw;
    } else {
      const dh = sum / w;
      let cx = x;
      for (const r of row) {
        const dw = r.area / dh;
        rects.push({ x: cx, y, w: dw, h: dh, item: r.item });
        cx += dw;
      }
      y += dh;
      h -= dh;
    }
  };

  let row: { item: T; area: number }[] = [];
  let i = 0;
  while (i < scaled.length) {
    const next = scaled[i];
    const side = Math.min(w, h);
    const cur = row.map((r) => r.area);
    if (row.length === 0 || worst([...cur, next.area], side) <= worst(cur, side)) {
      row.push(next);
      i += 1;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return rects;
}
