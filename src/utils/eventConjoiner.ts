/**
 * Runs callbacks registered with `on` after `.collect(i, event)` was called with the same `event` for each 0 <= i < size.
 * @param size
 */
export function eventConjoiner<T>(size: number) {
  const callbacks = [];
  const active = new Map();
  const timers = new Map();

  function clearTimer(event) {
    if (timers.has(event)) {
      clearTimeout(timers.get(event));
      timers.delete(event);
    }
  }

  function cancel(event: T) {
    clearTimer(event);
    active.delete(event);
  }

  function fire(event: T) {
    cancel(event);
    callbacks.forEach(cb => cb(event));
  }

  function collect(channel: number, event: T) {
    if (typeof channel !== 'number' || channel < 0 || channel >= size) throw new Error('invalid channel');
    const tally = active.get(event) ?? new Set();
    if (!active.has(event)) {
      active.set(event, tally);
    }
    tally.add(channel);
    if (tally.size === size) fire(event);
  }

  return {
    fire,
    cancel,
    collect,
    collectWithin(timeout: number, channel: number, event: T) {
      clearTimer(event);
      timers.set(event, setTimeout(() => fire(event), timeout));
      collect(channel, event);
    },
    on(handler: (event: T) => void) {
      callbacks.push(handler);
    },
    off(handler: (event: T) => void) {
      const index = callbacks.indexOf(handler);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  };
}
