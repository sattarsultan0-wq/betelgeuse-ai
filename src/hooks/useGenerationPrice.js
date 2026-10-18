import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function useGenerationPrice(body, path = '/generations/estimate') {
  const { user } = useAuth();
  const key = body ? JSON.stringify(body) : null;
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('betelgeuse:pricing-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('betelgeuse:pricing-changed', refresh);
    };
  }, []);
  useEffect(() => {
    setError('');
    setQuote(null);
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api(path, {
        method: 'POST',
        body: JSON.parse(key),
        signal: controller.signal,
      })
        .then((value) => {
          if (!controller.signal.aborted) setQuote({ ...value, key });
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, path, revision, user?.id, user?.generationCredits, user?.isAdmin]);
  return { quote: key && quote?.key === key ? quote : null, error };
}
