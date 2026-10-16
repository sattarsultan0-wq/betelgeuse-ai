import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compatibleModels,
  modelOptions,
  validateReferenceFiles,
} from '../src/services/workflow-options.js';

test('mode filtering depends only on catalog capabilities and enabled status', () => {
  const models = [
    { id: 'a', enabled: true, generationType: 'Image', modes: { TEXT_TO_IMAGE: {} } },
    { id: 'b', enabled: true, generationType: 'Video', modes: { IMAGE_TO_VIDEO: {} } },
    { id: 'c', enabled: false, generationType: 'Image', modes: { TEXT_TO_IMAGE: {} } },
  ];
  assert.deepEqual(
    compatibleModels(models, 'Image', 'TEXT_TO_IMAGE').map((m) => m.id),
    ['a'],
  );
  assert.equal(compatibleModels(models, 'Video', 'TEXT_TO_VIDEO').length, 0);
});
test('switching models removes unsupported parameters and keeps valid settings', () => {
  const caps = {
    durations: [5, 10],
    qualities: [],
    aspectRatios: ['source'],
    parameters: { sound: { type: 'boolean', default: false } },
  };
  assert.deepEqual(
    modelOptions(caps, {
      duration: 10,
      quality: '4k',
      aspectRatio: '16:9',
      parameters: { unknown: 'x', sound: true },
    }),
    {
      duration: 10,
      aspectRatio: 'source',
      parameters: { sound: true },
    },
  );
  assert.deepEqual(modelOptions(undefined), { parameters: {} });
});
test('reference files obey type, count and size limits', () => {
  const rule = { max: 2, mimeTypes: ['video/mp4'], maxBytes: 10 };
  const file = { type: 'video/mp4', size: 10 };
  assert.equal(validateReferenceFiles(rule, [file]), '');
  assert.ok(validateReferenceFiles(rule, [file, file, file]));
  assert.ok(validateReferenceFiles(rule, [{ type: 'image/png', size: 1 }]));
  assert.ok(validateReferenceFiles(rule, [{ ...file, size: 11 }]));
});
