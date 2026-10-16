export const modeLabels = {
  TEXT_TO_IMAGE: 'Text to Image',
  IMAGE_TO_IMAGE: 'Image to Image',
  TEXT_TO_VIDEO: 'Text to Video',
  IMAGE_TO_VIDEO: 'Image to Video',
  VIDEO_TO_VIDEO: 'Video to Video',
  FIRST_LAST_FRAME: 'First / Last Frame',
  MOTION_CONTROL: 'Motion Control',
};

export function compatibleModels(models, type, mode) {
  return models.filter(
    (model) => model.enabled && model.generationType === type && model.modes[mode],
  );
}

export function modelOptions(caps, previous = {}) {
  const values = {};
  for (const [field, list] of [
    ['duration', caps?.durations],
    ['quality', caps?.qualities],
    ['aspectRatio', caps?.aspectRatios],
  ]) {
    if (list?.length)
      values[field] = list.includes(previous[field])
        ? previous[field]
        : (caps.defaults?.[field] ?? list[0]);
  }
  values.parameters = Object.fromEntries(
    Object.entries(caps?.parameters || {}).map(([key, rule]) => {
      const value = previous.parameters?.[key];
      const valid =
        rule.type === 'boolean' ? typeof value === 'boolean' : rule.values.includes(value);
      return [key, valid ? value : rule.default];
    }),
  );
  return values;
}

export function validateReferenceFiles(rule, files) {
  if (files.length > rule.max) return `Можно добавить не более ${rule.max} файлов.`;
  if (files.some((file) => !rule.mimeTypes.includes(file.type)))
    return 'Этот формат файла не поддерживается.';
  if (files.some((file) => file.size > rule.maxBytes))
    return `Максимальный размер — ${rule.maxBytes / 1024 / 1024} МБ.`;
  return '';
}
