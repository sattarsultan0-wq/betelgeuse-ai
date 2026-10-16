const types = new Set(['prompt', 'image', 'video', 'model', 'audio']);
const point = (value) => Number.isFinite(value?.x) && Number.isFinite(value?.y);
export const boardKey = (userId) => `betelgeuse:board:${userId}`;
export function restoreBoard(value) {
  const positions = Object.fromEntries(
    Object.entries(value?.positions || {})
      .filter(([, p]) => point(p))
      .slice(-200),
  );
  const nodes = (Array.isArray(value?.nodes) ? value.nodes : [])
    .filter(
      (node) =>
        typeof node?.id === 'string' &&
        types.has(node.type) &&
        point(node.position) &&
        node.data &&
        typeof node.data === 'object' &&
        (node.type !== 'prompt' || typeof node.data.text === 'string') &&
        (node.type !== 'model' ||
          (typeof node.data.modelId === 'string' && typeof node.data.name === 'string')) &&
        (!['image', 'video'].includes(node.type) ||
          (typeof node.data.assetId === 'string' && typeof node.data.fileName === 'string')),
    )
    .slice(-200)
    .map((node) => ({ ...node, configuration: node.configuration || {} }));
  return {
    ...value,
    positions,
    connections:
      value?.connections && typeof value.connections === 'object' ? value.connections : {},
    nodes: nodes.filter(
      (node, index) => nodes.findIndex((other) => other.id === node.id) === index,
    ),
    hiddenGenerations: Array.isArray(value?.hiddenGenerations)
      ? value.hiddenGenerations.filter((id) => typeof id === 'string')
      : [],
    viewport: point(value?.viewport)
      ? { ...value.viewport, zoom: Math.max(0.35, Math.min(1.8, Number(value.viewport.zoom) || 1)) }
      : { x: 0, y: 0, zoom: 1 },
  };
}
export function readBoard(userId) {
  try {
    return restoreBoard(JSON.parse(localStorage.getItem(boardKey(userId))));
  } catch {
    return restoreBoard(null);
  }
}
export function writeBoard(userId, board) {
  try {
    localStorage.setItem(boardKey(userId), JSON.stringify(board));
    return true;
  } catch {
    return false;
  }
}

// Work in screen pixels first, then invert the existing pan/zoom transform.
export function placeNode(
  viewport,
  bounds,
  index = 0,
  size = { width: 280, height: 340 },
  occupied = [],
) {
  const margin = 18,
    top = 68,
    bottom = 112;
  const usableWidth = Math.max(1, bounds.width - margin * 2);
  const usableHeight = Math.max(1, bounds.height - top - bottom);
  const zoom = Math.max(
    0.35,
    Math.min(viewport.zoom, usableWidth / size.width, usableHeight / size.height),
  );
  const ratio = zoom / viewport.zoom;
  const next = {
    zoom,
    x: bounds.width / 2 - (bounds.width / 2 - viewport.x) * ratio,
    y: bounds.height / 2 - (bounds.height / 2 - viewport.y) * ratio,
  };
  const width = size.width * zoom,
    height = size.height * zoom;
  const offset = ((index % 5) - 2) * 20;
  let left = Math.max(
    margin,
    Math.min(bounds.width - margin - width, (bounds.width - width) / 2 + offset),
  );
  let y = Math.max(
    top,
    Math.min(bounds.height - bottom - height, top + (usableHeight - height) / 2 + offset),
  );
  // Prefer a free visible slot; stagger only when the visible area is already full.
  const right = bounds.width - margin - width,
    lower = bounds.height - bottom - height;
  const candidates = [
    { left, top: y },
    { left: margin, top },
    { left: right, top },
    { left: margin, top: lower },
    { left: right, top: lower },
  ];
  for (let cy = top; cy + height <= bounds.height - bottom + 1; cy += height + 18)
    for (let cx = margin; cx + width <= bounds.width - margin + 1; cx += width + 18)
      candidates.push({ left: cx, top: cy });
  const projected = occupied.map((rect) => ({
    left: (rect.left - viewport.x) * ratio + next.x,
    top: (rect.top - viewport.y) * ratio + next.y,
    width: rect.width * ratio,
    height: rect.height * ratio,
  }));
  const free = candidates.find((candidate) =>
    projected.every(
      (rect) =>
        candidate.left + width + 12 <= rect.left ||
        rect.left + rect.width + 12 <= candidate.left ||
        candidate.top + height + 12 <= rect.top ||
        rect.top + rect.height + 12 <= candidate.top,
    ),
  );
  if (free) {
    left = free.left;
    y = free.top;
  }
  return { viewport: next, position: { x: (left - next.x) / zoom, y: (y - next.y) / zoom } };
}
