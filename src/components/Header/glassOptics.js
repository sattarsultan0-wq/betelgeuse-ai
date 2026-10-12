// A neutral R/G displacement map. The rounded bevel bends background light;
// the middle keeps a much gentler, broad lens distortion. Generated on resize only.
export function createGlassDisplacement(width, height, radius = height / 2) {
  const density = Math.min(1, 1120 / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * density));
  canvas.height = Math.max(1, Math.round(height * density));
  const context = canvas.getContext('2d');
  if (!context) return null;

  const pixels = context.createImageData(canvas.width, canvas.height);
  const halfWidth = width / 2,
    halfHeight = height / 2;
  const cornerRadius = Math.min(radius, halfHeight);
  const bevel = Math.min(18, height * 0.26);
  const scale = 48;

  for (let py = 0; py < canvas.height; py += 1) {
    for (let px = 0; px < canvas.width; px += 1) {
      const x = ((px + 0.5) / canvas.width) * width - halfWidth;
      const y = ((py + 0.5) / canvas.height) * height - halfHeight;
      const qx = Math.abs(x) - halfWidth + cornerRadius;
      const qy = Math.abs(y) - halfHeight + cornerRadius;
      const outsideX = Math.max(qx, 0),
        outsideY = Math.max(qy, 0);
      const outsideLength = Math.hypot(outsideX, outsideY);
      const distance = outsideLength + Math.min(Math.max(qx, qy), 0) - cornerRadius;

      let nx = 0,
        ny = 0;
      if (outsideLength > 0) {
        nx = (outsideX / outsideLength) * Math.sign(x);
        ny = (outsideY / outsideLength) * Math.sign(y);
      } else if (qx > qy) nx = Math.sign(x);
      else ny = Math.sign(y);

      const depth = Math.max(0, -distance);
      const edge = Math.max(0, 1 - depth / bevel);
      // A smoothly rounded meniscus, rather than a noise/warp of the entire image.
      const bend = edge * edge * (3 - 2 * edge) * 17;
      const interior = Math.max(0, 1 - edge);
      const dx = -nx * bend + Math.sin((x / width) * Math.PI * 2) * interior * 1.8;
      const dy = -ny * bend + Math.sin((y / height) * Math.PI) * interior * 2.5;
      const index = (py * canvas.width + px) * 4;
      pixels.data[index] = Math.round(127.5 + (dx / scale) * 255);
      pixels.data[index + 1] = Math.round(127.5 + (dy / scale) * 255);
      pixels.data[index + 2] = 128;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return { image: canvas.toDataURL('image/png'), scale, width, height };
}

export function supportsGlassRefraction() {
  // CSS.supports alone only tests syntax. WebKit accepts url() but currently
  // does not render this SVG backdrop operation; use the media lens + CSS glass.
  return (
    typeof CSS !== 'undefined' &&
    CSS.supports('backdrop-filter', 'url("#glass-support-check")') &&
    /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent) &&
    !/(?:CriOS|EdgiOS|FxiOS)\//.test(navigator.userAgent)
  );
}
