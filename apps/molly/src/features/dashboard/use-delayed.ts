import { useEffect, useState } from 'react';

/** Quicker than this and a wait needs no sign: the tap's own feedback covers it. */
const SHOW_AFTER_MS = 400;

/** `on`, once it has stayed on for `SHOW_AFTER_MS`; off again at once. */
export function useDelayed(on: boolean): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) return;
    const timeout = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(timeout);
      setShown(false);
    };
  }, [on]);
  return on && shown;
}
