import { createGlassLens } from './glassLens';

// The small pixel pass runs off the UI thread. Canvas 2D remains the fallback
// when module workers are unavailable/blocked; there is no WebGL dependency.
export function createMediaGlassRenderer(canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const fallback = createGlassLens(),
    pending = new Map();
  let worker,
    sequence = 0,
    disposed = false;
  function stopWorker() {
    worker?.terminate();
    worker = undefined;
    for (const { resolve, timeout } of pending.values()) {
      clearTimeout(timeout);
      resolve(null);
    }
    pending.clear();
  }
  try {
    worker = new Worker(new URL('./glassLens.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      clearTimeout(job.timeout);
      pending.delete(data.id);
      job.resolve(data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      stopWorker();
    };
  } catch {
    /* Synchronous Canvas 2D fallback. */
  }
  return {
    async draw(scene, bounds, strength = 1) {
      if (disposed) return false;
      const input = scene.context.getImageData(0, 0, scene.canvas.width, scene.canvas.height);
      const spec = {
        canvas: { width: scene.canvas.width, height: scene.canvas.height },
        region: { width: scene.region.width, height: scene.region.height },
        density: scene.density,
      };
      const rect = { width: bounds.width, height: bounds.height };
      let result;
      if (worker) {
        const id = ++sequence;
        result = await new Promise((resolve) => {
          pending.set(id, { resolve, timeout: setTimeout(stopWorker, 1500) });
          try {
            worker.postMessage(
              { id, buffer: input.data.buffer, scene: spec, bounds: rect, strength },
              [input.data.buffer],
            );
          } catch {
            stopWorker();
          }
        });
        if (!result && !disposed) {
          const retry = scene.context.getImageData(0, 0, scene.canvas.width, scene.canvas.height);
          result = fallback.render(retry.data, spec, rect, strength);
        }
      } else result = fallback.render(input.data, spec, rect, strength);
      if (disposed || !result) return false;
      if (canvas.width !== result.width || canvas.height !== result.height) {
        canvas.width = result.width;
        canvas.height = result.height;
      }
      context.putImageData(new ImageData(result.pixels, result.width, result.height), 0, 0);
      return true;
    },
    dispose() {
      disposed = true;
      stopWorker();
      fallback.dispose();
    },
  };
}
