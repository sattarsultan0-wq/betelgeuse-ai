// Presentation catalog. API IDs and availability always come from /api/models.
export const aiModels = [
  { id: 'kling', name: 'Kling AI', type: 'Video', apiId: 'kling', mark: 'K' },
  { id: 'seedance', name: 'Seedance', type: 'Video', apiId: 'higgsfield', mark: 'S' },
  { id: 'higgsfield', name: 'Higgsfield', type: 'Video', mark: 'H', provider: true },
  { id: 'genjutsu', name: 'Genjutsu', type: 'Video', mark: 'G' },
  { id: 'nano-banana', name: 'Nano Banana', type: 'Image', mark: 'N' },
];

export function workspaceModels(apiModels) {
  const catalog = aiModels.map((item) => ({
    ...item,
    api: apiModels.find((model) => model.id === item.apiId),
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
