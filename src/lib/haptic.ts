// Tiny vibrate on user actions. Android Chrome / Firefox support
// navigator.vibrate; iOS Safari does not. Silently no-ops elsewhere.
//
// Must be called synchronously from a user-gesture event handler — browsers
// will ignore navigator.vibrate calls that come from inside async work.

export function tap(ms = 35) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}

export function success() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([15, 60, 30]);
    }
  } catch {
    // ignore
  }
}

export function undo() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([20, 40, 20]);
    }
  } catch {
    // ignore
  }
}
