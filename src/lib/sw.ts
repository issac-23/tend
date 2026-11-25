// Service worker registration with update detection.

export type SwUpdate = { skip: () => void };

export function registerServiceWorker(onUpdate: (u: SwUpdate) => void) {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      // Check for a fresh sw.js every time the tab gains focus or on a long interval.
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
      setInterval(check, 15 * 60 * 1000);

      const notifyIfWaiting = () => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          onUpdate({
            skip: () => {
              reg.waiting?.postMessage('skip-waiting');
            },
          });
        }
      };

      notifyIfWaiting();
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') notifyIfWaiting();
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    })
    .catch(() => {});
}
