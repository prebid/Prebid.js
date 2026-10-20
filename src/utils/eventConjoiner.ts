export function eventConjoiner<T>(size: number) {
  const callbacks = [];
  const active = new Map();

  function fire(event: T) {
    active.delete(event);
    callbacks.forEach(cb => cb(event));
  }

  return {
    fire,
    collect(channel: number, event: T) {
      if (typeof channel !== 'number' || channel < 0 || channel >= size) throw new Error('invalid channel');
      const tally = active.get(event) ?? new Set();
      if (!active.has(event)) {
        active.set(event, tally);
      }
      tally.add(channel);
      if (tally.size === size) fire(event);
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

export function conjoinWithTimeout<T>(size: number, timeout: number) {
  const joiner = eventConjoiner(size);
  const timeouts = new Map();
  joiner.on((event) => {
    const timeout = timeouts.get(event);
    if (timeout) {
      clearTimeout(timeout);
    }
  });
  return {
    ...joiner,
    collect(channel: number, event: T) {
      if (!timeouts.has(event)) {
        timeouts.set(event, setTimeout(() => joiner.fire(event), timeout));
      }
      joiner.collect(channel, event);
    }
  };
}
