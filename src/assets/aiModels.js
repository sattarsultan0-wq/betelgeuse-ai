// Presentation catalog. API IDs and availability always come from /api/models.
export const aiModels = [
  { id: 'qwen-image-3', name: 'Qwen Image 3', type: 'Image' },
  { id: 'soul-v2', name: 'SOUL V2', type: 'Image', mark: '/images/higgs-logo.png' },
  { id: 'ideogram-4', name: 'Ideogram 4.0', type: 'Image' },
  { id: 'recraft-v4-1', name: 'Recraft V4.1', type: 'Image' },
  { id: 'grok-image-2', name: 'Grok Image 2.0', type: 'Image' },
  { id: 'kling-2-5-turbo', name: 'Kling 2.5 Turbo', type: 'Video', mark: '/images/kling-logo.png' },
  { id: 'kling', name: 'Kling 3.0 Standard', type: 'Video', mark: '/images/kling-logo.png' },
  { id: 'wan-3', name: 'Wan 3.0', type: 'Video' },
  { id: 'kling-o3', name: 'Kling O3', type: 'Video', mark: '/images/kling-logo.png' },
  { id: 'seedance-2-5', name: 'Seedance 2.5', type: 'Video', mark: '/images/seedance-logo.png' },
  {
    id: 'kling-3-motion',
    name: 'Kling 3.0 Motion Control',
    type: 'Video',
    mark: '/images/kling-logo.png',
  },
];

export function workspaceModels(apiModels) {
  const catalog = aiModels.map((item) => ({
    ...item,
    apiId: item.id,
    api: apiModels.find((model) => model.id === item.id),
  }));
  for (const model of apiModels) {
    if (!catalog.some((item) => item.apiId === model.id))
      catalog.push({
        id: model.id,
        name: model.name,
        type: model.generationType || 'Video',
        mark: '✦',
        apiId: model.id,
        api: model,
      });
  }
  return catalog;
}
