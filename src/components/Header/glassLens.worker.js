import { createGlassLens } from './glassLens';
const lens = createGlassLens();
self.onmessage = ({ data }) => {
  const result = lens.render(
    new Uint8ClampedArray(data.buffer),
    data.scene,
    data.bounds,
    data.strength,
  );
  self.postMessage({ ...result, id: data.id }, [result.pixels.buffer]);
};
