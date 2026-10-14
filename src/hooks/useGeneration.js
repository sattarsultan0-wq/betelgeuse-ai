import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { uploadTrendPhotos } from '../services/trendUploads';
export function useGeneration(userId, scope = null) {
  const [generation, setGeneration] = useState(null),
    [phase, setPhase] = useState('idle'),
    [error, setError] = useState('');
  const submitting = useRef(false),
    identity = useRef(userId),
    pending = useRef(null),
    resumeId = useRef(null);
  const storageKey = userId && scope ? `betelgeuse:trend:${userId}:${scope}` : null;
  function remember(value) {
    if (!storageKey) return;
    try {
      value
        ? sessionStorage.setItem(storageKey, JSON.stringify(value))
        : sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage can be disabled. */
    }
  }
  useEffect(() => {
    identity.current = userId;
    setGeneration(null);
    setPhase('idle');
    setError('');
    pending.current = null;
    resumeId.current = null;
    let stopped = false;
    if (storageKey) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey));
        if (saved?.pending) {
          pending.current = saved.pending;
          setPhase('failed');
          setError('Запрос не подтверждён. Проверьте его тем же запросом.');
        }
        if (saved?.id) {
          resumeId.current = saved.id;
          setPhase('queued');
          api(`/generations/${saved.id}`)
            .then(({ generation }) => {
              if (stopped) return;
              setGeneration(generation);
              setPhase(generation.status);
              setError(generation.errorMessage || '');
            })
            .catch((err) => {
              if (!stopped) {
                setPhase('failed');
                setError(err.message);
              }
            });
        }
      } catch {
        /* Ignore invalid cached state. */
      }
    }
    return () => {
      stopped = true;
    };
  }, [userId, scope]);
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
  async function submitTrend(trendId, files) {
    if (submitting.current) return;
    submitting.current = true;
    const owner = identity.current;
    setError('');
    try {
      if (resumeId.current) {
        const { generation } = await api(`/generations/${resumeId.current}`);
        if (identity.current !== owner) return;
        setGeneration(generation);
        setPhase(generation.status);
        setError(generation.errorMessage || '');
        return;
      }
      // Keep the exact request/key across network errors, closing the modal and reloads.
      if (!pending.current?.body) {
        setPhase('uploading');
        const photoKeys = await uploadTrendPhotos(trendId, files);
        if (identity.current !== owner) return;
        pending.current = { key: crypto.randomUUID(), body: { trendId, photoKeys } };
        remember({ pending: pending.current });
      }
      setPhase('queued');
      const { generation } = await api('/trends/generations', {
        method: 'POST',
        headers: { 'Idempotency-Key': pending.current.key },
        body: pending.current.body,
      });
      if (identity.current !== owner) return;
      remember({ id: generation.id });
      resumeId.current = generation.id;
      pending.current = null;
      setGeneration(generation);
      setPhase(generation.status);
      setError(generation.errorMessage || '');
    } catch (err) {
      if (identity.current === owner) {
        setPhase('failed');
        setError(err.message);
      }
    } finally {
      submitting.current = false;
    }
  }
  function reset() {
    if (pending.current?.body || submitting.current) return;
    resumeId.current = null;
    remember(null);
    setGeneration(null);
    setPhase('idle');
    setError('');
  }
  return {
    generation,
    phase,
    error,
    submit,
    submitTrend,
    reset,
    pendingSubmission: !!pending.current?.body,
    recovering: !!resumeId.current && !generation,
    setError,
    busy: submitting.current || ['uploading', 'queued', 'processing'].includes(phase),
  };
}
