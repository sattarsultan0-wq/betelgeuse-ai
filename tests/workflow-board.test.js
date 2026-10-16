import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNode, restoreBoard } from '../src/services/workflow-board.js';

test('board restores legacy layout while validating new node types and viewport', () => {
  const legacy = {
    positions: { old: { x: 10, y: 20 }, invalid: { x: null } },
    connections: { child: 'old' },
  };
  const board = restoreBoard(legacy);
  assert.deepEqual(board.positions, { old: { x: 10, y: 20 } });
  assert.deepEqual(board.connections, legacy.connections);
  assert.deepEqual(board.nodes, []);
  const node = { id: 'node', type: 'prompt', position: { x: 1, y: 2 }, data: { text: 'A prompt' } };
  const restored = restoreBoard({
    ...board,
    nodes: [
      node,
      node,
      { ...node, id: 'bad', type: 'invalid' },
      { ...node, id: 'bad-model', type: 'model' },
    ],
    viewport: { x: 30, y: -70, zoom: 999 },
  });
  assert.equal(restored.nodes.length, 1);
  assert.deepEqual(restored.nodes[0].configuration, {});
  assert.equal(restored.viewport.zoom, 1.8);
});

test('node placement stays inside the visible area after pan and zoom, including mobile', () => {
  for (const bounds of [
    { width: 1192, height: 832 },
    { width: 320, height: 640 },
  ]) {
    for (const zoom of [0.35, 1, 1.8]) {
      for (const index of [0, 3, 17]) {
        const { viewport, position } = placeNode({ x: -800, y: 425, zoom }, bounds, index, {
          width: 280,
          height: 360,
        });
        const x = viewport.x + position.x * viewport.zoom,
          y = viewport.y + position.y * viewport.zoom;
        assert.ok(x >= 17.9 && x + 280 * viewport.zoom <= bounds.width - 17.9);
        assert.ok(y >= 67.9 && y + 360 * viewport.zoom <= bounds.height - 111.9);
      }
    }
  }
});

test('placement uses a free visible slot when the center is occupied', () => {
  const bounds = { width: 1200, height: 850 },
    initial = { x: 0, y: 0, zoom: 1 };
  const first = placeNode(initial, bounds, 0);
  const second = placeNode(first.viewport, bounds, 1, { width: 280, height: 340 }, [
    { left: first.position.x, top: first.position.y, width: 280, height: 340 },
  ]);
  assert.ok(
    Math.abs(first.position.x - second.position.x) >= 280 ||
      Math.abs(first.position.y - second.position.y) >= 340,
  );
});
