import { GLASS_PADDING } from './glassScene';

// A small CPU lens works even when iOS disables WebGL. Sample positions and
// bilinear weights are calculated on resize, rather than for every frame.
export function createGlassLens() {
  let lookup,
    pixels,
    dimensions = '';
  return {
    render(source, scene, bounds, strength = 1) {
      const width = Math.round(bounds.width * scene.density),
        height = Math.round(bounds.height * scene.density);
      const key = `${width}:${height}:${scene.canvas.width}:${scene.canvas.height}:${strength}`;
      if (key !== dimensions) {
        dimensions = key;
        pixels = new Uint8ClampedArray(width * height * 4);
        lookup = {
          index: new Int32Array(width * height),
          x: new Float32Array(width * height),
          y: new Float32Array(width * height),
          gain: new Float32Array(width * height),
        };
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            const x = ((px + 0.5) / width) * bounds.width - bounds.width / 2;
            const y = ((py + 0.5) / height) * bounds.height - bounds.height / 2;
            const radius = bounds.height / 2;
            const qx = Math.abs(x) - bounds.width / 2 + radius,
              qy = Math.abs(y);
            const ox = Math.max(qx, 0),
              oy = Math.max(qy, 0),
              length = Math.hypot(ox, oy);
            const distance = length + Math.min(Math.max(qx, qy), 0) - radius;
            const nx = length ? (ox / length) * Math.sign(x) : Math.sign(x);
            const ny = length ? (oy / length) * Math.sign(y) : 0;
            const edge = Math.max(0, Math.min(1, 1 + distance / (bounds.height * 0.42)));
            const bend = edge * edge * (3 - 2 * edge) * 25;
            const interior = 1 - edge;
            const dx =
              (-nx * bend -
                x * 0.035 * interior +
                Math.sin((x / bounds.width) * Math.PI * 2) * 3 * interior) *
              strength;
            const dy =
              (-ny * bend -
                y * 0.13 * interior +
                Math.sin((y / bounds.height) * Math.PI) * 4 * interior) *
              strength;
            const sx = Math.max(
              0,
              Math.min(
                scene.canvas.width - 2,
                ((x + bounds.width / 2 + GLASS_PADDING + dx) / scene.region.width) *
                  scene.canvas.width -
                  0.5,
              ),
            );
            const sy = Math.max(
              0,
              Math.min(
                scene.canvas.height - 2,
                ((y + bounds.height / 2 + GLASS_PADDING + dy) / scene.region.height) *
                  scene.canvas.height -
                  0.5,
              ),
            );
            const i = py * width + px;
            lookup.index[i] = (Math.floor(sy) * scene.canvas.width + Math.floor(sx)) * 4;
            lookup.x[i] = sx - Math.floor(sx);
            lookup.y[i] = sy - Math.floor(sy);
            lookup.gain[i] = 1.1 + edge * 0.12;
          }
        }
      }
      if (!pixels.byteLength) pixels = new Uint8ClampedArray(width * height * 4);
      const row = scene.canvas.width * 4,
        output = pixels;
      for (let i = 0; i < lookup.index.length; i++) {
        const p = lookup.index[i],
          fx = lookup.x[i],
          fy = lookup.y[i],
          gain = lookup.gain[i];
        const a = (1 - fx) * (1 - fy),
          b = fx * (1 - fy),
          c = (1 - fx) * fy,
          d = fx * fy;
        const out = i * 4;
        for (let channel = 0; channel < 3; channel++) {
          const s = p + channel;
          output[out + channel] =
            (source[s] * a + source[s + 4] * b + source[s + row] * c + source[s + row + 4] * d) *
            gain;
        }
        output[out + 3] = 255;
      }
      return { pixels: output, width, height };
    },
    dispose() {
      lookup = null;
      pixels = null;
    },
  };
}
