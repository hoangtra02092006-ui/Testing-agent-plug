import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T };

/** Runs a loader on mount and on reload(); exposes loading / error / ready states. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    loader().then(
      (data) => active && setState({ status: 'ready', data }),
      (error: unknown) =>
        active &&
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      active = false;
    };
  }, [version, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { state, reload };
}
