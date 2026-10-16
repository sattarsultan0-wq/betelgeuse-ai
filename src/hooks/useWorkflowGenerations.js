import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const activeStatuses = ['queued', 'processing'];
const generationIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const pendingKey = (userId) => `betelgeuse:workflow-request:${userId}`;
function remember(userId, value) {
  try {
    value
      ? sessionStorage.setItem(pendingKey(userId), JSON.stringify(value))
      : sessionStorage.removeItem(pendingKey(userId));
  } catch {
    /* Storage is optional. */
  }
}

export default function useWorkflowGenerations(userId, refresh, scope = '') {
  const requestOwner = scope ? `${userId}:${scope}` : userId;
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [submitting, setSubmitting] = useState(false),
    [pendingRequest, setPendingRequest] = useState(false);
  const pending = useRef(null),
    busy = useRef(false),
    epoch = useRef(0),
    refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const current = ++epoch.current;
    const controller = new AbortController();
    setItems([]);
    setError('');
    setLoading(true);
    pending.current = null;
    busy.current = false;
    setSubmitting(false);
    setPendingRequest(false);
    try {
      const cached = JSON.parse(sessionStorage.getItem(pendingKey(requestOwner)));
      if (cached?.key && cached?.body && cached?.nodeId) {
        pending.current = { ...cached, uncertain: true };
        setPendingRequest(true);
        setItems([
          {
            id: cached.nodeId,
            ...cached.body,
            status: 'failed',
            parentId: cached.parentId,
            requestPending: true,
            errorMessage: 'Ответ на запрос не получен. Повтори проверку с тем же идентификатором.',
            createdAt: cached.createdAt,
          },
        ]);
      }
    } catch {
      /* Ignore invalid or inaccessible storage. */
    }
    api('/users/me/generations?page=1', { signal: controller.signal })
      .then((data) => {
        if (epoch.current !== current) return;
        setItems((local) => [
          ...data.generations.slice().reverse(),
          ...local.filter((item) => !data.generations.some((row) => row.id === item.id)),
        ]);
        setError('');
      })
      .catch((err) => {
        if (epoch.current === current && err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (epoch.current === current) setLoading(false);
      });
    return () => {
      epoch.current++;
      controller.abort();
    };
  }, [userId, requestOwner]);

  const activeIds = items
    // Optimistic request-* cards can stay queued while POST is in flight.
    // Poll only accepted generations with a backend UUID.
    .filter(
      (item) =>
        activeStatuses.includes(item.status) &&
        !item.requestPending &&
        generationIdPattern.test(item.id),
    )
    .map((item) => item.id)
    .join(',');
  useEffect(() => {
    if (!activeIds) return;
    const ids = activeIds.split(','),
      controller = new AbortController();
    let stopped = false,
      timer;
    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, 8000);
        return;
      }
      const results = await Promise.allSettled(
        ids.map((id) => api(`/generations/${id}`, { signal: controller.signal })),
      );
      if (stopped) return;
      const updates = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value.generation);
      setItems((current) =>
        current.map((item) => {
          const update = updates.find((row) => row.id === item.id);
          return update ? { ...item, ...update } : item;
        }),
      );
      const failure = results.find((result) => result.status === 'rejected');
      setError(failure ? failure.reason.message : '');
      if (updates.some((row) => !activeStatuses.includes(row.status)))
        refreshRef.current().catch(() => {});
      timer = setTimeout(poll, failure ? 8000 : 4000);
    }
    timer = setTimeout(poll, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeIds]);

  async function sendPending(file) {
    if (busy.current || !pending.current) return null;
    const current = epoch.current,
      request = pending.current;
    busy.current = true;
    setSubmitting(true);
    setError('');
    setItems((rows) =>
      rows.map((row) =>
        row.id === request.nodeId
          ? {
              ...row,
              status: file ? 'uploading' : 'queued',
              errorMessage: '',
              requestPending: true,
            }
          : row,
      ),
    );
    try {
      if (file && !request.body.sourceImageId) {
        const form = new FormData();
        form.append('image', file);
        const { image } = await api('/uploads', { method: 'POST', body: form });
        if (epoch.current !== current) return null;
        request.body.sourceImageId = image.id;
      }
      // Persist the exact body/key before posting; ambiguous responses can be retried safely.
      remember(requestOwner, { ...request, file: undefined });
      const { generation } = await api('/generations', {
        method: 'POST',
        headers: { 'Idempotency-Key': request.key },
        body: request.body,
      });
      if (epoch.current !== current) return null;
      const result = { ...generation, parentId: request.parentId, replacesId: request.nodeId };
      setItems((rows) => {
        const previous = rows.filter((row) => row.id !== generation.id);
        return previous.some((row) => row.id === request.nodeId)
          ? previous.map((row) => (row.id === request.nodeId ? result : row))
          : [...previous, result];
      });
      pending.current = null;
      setPendingRequest(false);
      remember(requestOwner, null);
      refreshRef.current().catch(() => {});
      return result;
    } catch (err) {
      if (epoch.current !== current) return null;
      // A rejection of a retry (e.g. 429/403) says nothing about the original POST.
      // Retain the original key until the accepted task is positively confirmed.
      const uncertain = request.uncertain || !err.status || err.status >= 500;
      setItems((rows) =>
        rows.map((row) =>
          row.id === request.nodeId
            ? { ...row, status: 'failed', requestPending: uncertain, errorMessage: err.message }
            : row,
        ),
      );
      setError(err.message);
      setPendingRequest(uncertain);
      if (uncertain) {
        request.uncertain = true;
        remember(requestOwner, { ...request, file: undefined });
      } else {
        pending.current = null;
        remember(requestOwner, null);
      }
      return null;
    } finally {
      if (epoch.current === current) {
        busy.current = false;
        setSubmitting(false);
      }
    }
  }
  async function submit(body, file, parentId) {
    if (busy.current || pending.current) return null;
    const key = crypto.randomUUID(),
      nodeId = `request-${key}`,
      createdAt = new Date().toISOString();
    pending.current = {
      key,
      nodeId,
      body: { ...body },
      parentId: parentId || null,
      createdAt,
      file,
    };
    setItems((rows) => [
      ...rows,
      {
        ...body,
        id: nodeId,
        parentId,
        createdAt,
        status: file ? 'uploading' : 'queued',
        requestPending: true,
      },
    ]);
    return sendPending(file);
  }
  return {
    items,
    loading,
    error,
    submitting,
    pendingRequest,
    submit,
    retry: () => sendPending(pending.current?.file),
  };
}
