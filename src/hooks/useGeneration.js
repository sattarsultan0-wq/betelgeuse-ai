import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
export function useGeneration(userId) {
  const [generation, setGeneration] = useState(null),
    [phase, setPhase] = useState('idle'),
    [error, setError] = useState('');
  const submitting = useRef(false),
    identity = useRef(userId),
    pending = useRef(null);
  useEffect(() => {
    identity.current = userId;
    setGeneration(null);
    setPhase('idle');
    setError('');
    pending.current = null;
  }, [userId]);
  const active = generation && ['queued', 'processing'].includes(generation.status);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer;
    let stopped = false;
    async function poll() {
      try {
        const data = await api(`/generations/${generation.id}`, { signal: controller.signal });
        if (stopped) return;
        setGeneration(data.generation);
        setPhase(data.generation.status);
        setError(data.generation.errorMessage || '');
        if (['queued', 'processing'].includes(data.generation.status))
          timer = setTimeout(poll, 4000);
      } catch (err) {
        if (stopped) return;
        setError(err.message);
        timer = setTimeout(poll, 8000);
      }
    }
    timer = setTimeout(poll, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [generation?.id, active]);
  async function submit(values, file) {
    if (submitting.current) return;
    submitting.current = true;
    const owner = identity.current;
    setError('');
    setPhase(file ? 'uploading' : 'queued');
    try {
      const fingerprint =
        JSON.stringify(values) + `:${file?.name}:${file?.size}:${file?.lastModified}`;
      if (!pending.current || pending.current.fingerprint !== fingerprint)
        pending.current = { fingerprint, key: crypto.randomUUID(), body: null };
      if (!pending.current.body) {
        const body = { ...values };
        if (file) {
          const form = new FormData();
          form.append('image', file);
          const uploaded = await api('/uploads', { method: 'POST', body: form });
          body.sourceImageId = uploaded.image.id;
        }
        pending.current.body = body;
      }
      const data = await api('/generations', {
        method: 'POST',
        headers: { 'Idempotency-Key': pending.current.key },
        body: pending.current.body,
      });
      if (identity.current !== owner) return;
      pending.current = null;
      setGeneration(data.generation);
      setPhase(data.generation.status);
    } catch (err) {
      if (identity.current === owner) {
        setPhase('failed');
        setError(err.message);
      }
    } finally {
      submitting.current = false;
    }
  }
  return {
    generation,
    phase,
    error,
    submit,
    setError,
    busy: submitting.current || ['uploading', 'queued', 'processing'].includes(phase),
  };
}
