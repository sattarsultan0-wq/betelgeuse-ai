import { useState } from 'react';

const logos = {
  kling: 'kling-logo.png',
  seedance: 'seedance-logo.png',
  soul: 'higgs-logo.png',
};
export default function ModelIdentity({ model }) {
  const [failedSource, setFailedSource] = useState(null);
  const family = model.id.startsWith('kling')
    ? 'kling'
    : model.id.startsWith('seedance')
      ? 'seedance'
      : model.id.startsWith('soul')
        ? 'soul'
        : null;
  const source = logos[family] ? `${import.meta.env.BASE_URL}images/${logos[family]}` : null;
  return source && failedSource !== source ? (
    <img
      className="wf-model-logo"
      src={source}
      alt=""
      draggable="false"
      onError={() => setFailedSource(source)}
    />
  ) : (
    <span className="wf-model-initial" aria-hidden="true">
      {Array.from(model.name.trim())[0]?.toLocaleUpperCase() || '?'}
    </span>
  );
}
