// One shared budget prevents the duplicated marquee from opening dozens of decoders.
const entries = new Set();
let removeListeners;

export function updatePlayback() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modalOpen = [...entries].some((entry) => entry.group === 'dialog');
  const eligible = [...entries].filter(
    (entry) =>
      entry.visible &&
      !document.hidden &&
      !entry.failed &&
      !entry.blocked &&
      (entry.requested || (entry.autoplay && !reduced)) &&
      (!modalOpen || entry.group === 'dialog'),
  );
  const limit = window.matchMedia('(max-width: 800px), (pointer: coarse)').matches ? 2 : 6;
  const previews = eligible
    .filter((entry) => entry.group === 'preview')
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
  const wanted = new Set([...eligible.filter((entry) => entry.group !== 'preview'), ...previews]);
  for (const entry of entries) {
    const active = wanted.has(entry);
    if (active === entry.active) continue;
    entry.active = active;
    if (active) entry.play();
    else entry.video.pause();
  }
}

export function registerPlayback(entry) {
  entries.add(entry);
  if (!removeListeners) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const retry = () => {
      for (const current of entries) {
        if (current.visible && current.blocked) {
          current.blocked = false;
          current.active = false;
        }
      }
      // play() runs in this gesture handler, as required by iOS when autoplay is denied.
      updatePlayback();
    };
    document.addEventListener('visibilitychange', updatePlayback);
    document.addEventListener('pointerup', retry, { passive: true });
    document.addEventListener('keydown', retry);
    motion.addEventListener('change', updatePlayback);
    window.addEventListener('resize', updatePlayback, { passive: true });
    removeListeners = () => {
      document.removeEventListener('visibilitychange', updatePlayback);
      document.removeEventListener('pointerup', retry);
      document.removeEventListener('keydown', retry);
      motion.removeEventListener('change', updatePlayback);
      window.removeEventListener('resize', updatePlayback);
    };
  }
  updatePlayback();
  return () => {
    entries.delete(entry);
    entry.video.pause();
    if (!entries.size) {
      removeListeners();
      removeListeners = undefined;
    }
    updatePlayback();
  };
}
