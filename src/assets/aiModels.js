// Presentation catalog. API IDs and availability always come from /api/models.
export const aiModels = [
  { id: 'kling', name: 'Kling AI', type: 'Video', apiId: 'kling', mark: '/public/images/kling-logo.png' },
  { id: 'seedance', name: 'Seedance', type: 'Video', apiId: 'higgsfield', mark: '/public/images/seedance-logo.png' },
  { id: 'higgsfield', name: 'Higgsfield', type: 'Video', mark: "/public/images/higgs-logo.png", provider: true },
  { id: 'nano-banana', name: 'Nano Banana', type: 'Image', mark: '/public/images/nanobanana-logo.png' },
  { id: 'gemini', name: 'Gemini', type: 'Image', mark: '/public/images/gemini-logo.png' }
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
