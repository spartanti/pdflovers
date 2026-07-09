// Helpers de renderização de página PDF -> canvas -> bytes.
// Usa OffscreenCanvas quando disponível para não tocar no DOM.

export async function renderPageToCanvas(page, scale) {
  const viewport = page.getViewport({ scale });
  const w = Math.max(1, Math.ceil(viewport.width));
  const h = Math.max(1, Math.ceil(viewport.height));

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(w, h);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function canvasToBlob(canvas, type, quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type, quality }); // OffscreenCanvas
  return new Promise((res) => canvas.toBlob(res, type, quality));
}

export async function canvasToBytes(canvas, type, quality) {
  const blob = await canvasToBlob(canvas, type, quality);
  return new Uint8Array(await blob.arrayBuffer());
}

// Libera memória do canvas explicitamente.
export function releaseCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}
