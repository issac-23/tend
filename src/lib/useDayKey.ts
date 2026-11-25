import { useEffect, useState } from 'react';
import { todayKey } from './dates';

// Returns the current local-date key (yyyy-MM-dd). Schedules a single timeout
// at the next local midnight + a small buffer; on fire, updates state and
// reschedules. Survives tab sleep via a visibilitychange listener that
// re-checks the date when the tab becomes visible.
export function useDayKey(): string {
  const [key, setKey] = useState(todayKey());

  useEffect(() => {
    let timer: number | undefined;

    function scheduleNext() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 500); // 500ms after midnight to avoid edge timing
      const wait = tomorrow.getTime() - now.getTime();
      timer = window.setTimeout(() => {
        setKey(todayKey());
        scheduleNext();
      }, wait);
    }

    function onVisible() {
      if (!document.hidden) {
        const fresh = todayKey();
        setKey((k) => (k === fresh ? k : fresh));
      }
    }

    scheduleNext();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return key;
}
