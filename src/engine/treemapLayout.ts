export interface TreemapInput {
  id: string;
  value: number;
}

export interface TreemapRect {
  id: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstAspectRatio(row: number[], sideLength: number): number {
  if (row.length === 0 || sideLength <= 0) return Infinity;
  const sum = row.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(...row);
  const minVal = Math.min(...row);
  const s2 = sideLength * sideLength;
  const sum2 = sum * sum;
  if (minVal <= 0 || sum2 <= 0) return Infinity;
  return Math.max((s2 * maxVal) / sum2, sum2 / (s2 * minVal));
}

/**
 * Deterministic Squarified Treemap layout (Bruls, Huizing, van Wijk)
 * Produces well-proportioned rectangles within [0, width] x [0, height].
 */
export function computeSquarifiedTreemap(
  items: TreemapInput[],
  width: number,
  height: number
): TreemapRect[] {
  const valid = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = valid.reduce((acc, item) => acc + item.value, 0);
  if (totalValue <= 0 || width <= 0 || height <= 0) return [];

  const totalArea = width * height;
  const scaled = valid.map((item) => ({
    id: item.id,
    value: item.value,
    area: (item.value / totalValue) * totalArea,
  }));

  const rects: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  let i = 0;
  while (i < scaled.length) {
    const isHorizontalStrip = w >= h;
    const sideLength = isHorizontalStrip ? h : w;

    const row: typeof scaled = [scaled[i]];
    const rowAreas: number[] = [scaled[i].area];
    i++;

    while (i < scaled.length) {
      const next = scaled[i];
      const currentWorst = worstAspectRatio(rowAreas, sideLength);
      const nextWorst = worstAspectRatio([...rowAreas, next.area], sideLength);
      if (nextWorst <= currentWorst) {
        row.push(next);
        rowAreas.push(next.area);
        i++;
      } else {
        break;
      }
    }

    const rowSum = rowAreas.reduce((a, b) => a + b, 0);
    if (isHorizontalStrip) {
      const stripWidth = sideLength > 0 ? rowSum / sideLength : 0;
      let cursorY = y;
      for (const item of row) {
        const itemH = stripWidth > 0 ? item.area / stripWidth : 0;
        rects.push({
          id: item.id,
          value: item.value,
          x,
          y: cursorY,
          w: stripWidth,
          h: itemH,
        });
        cursorY += itemH;
      }
      x += stripWidth;
      w -= stripWidth;
    } else {
      const stripHeight = sideLength > 0 ? rowSum / sideLength : 0;
      let cursorX = x;
      for (const item of row) {
        const itemW = stripHeight > 0 ? item.area / stripHeight : 0;
        rects.push({
          id: item.id,
          value: item.value,
          x: cursorX,
          y,
          w: itemW,
          h: stripHeight,
        });
        cursorX += itemW;
      }
      y += stripHeight;
      h -= stripHeight;
    }
  }

  return rects;
}
