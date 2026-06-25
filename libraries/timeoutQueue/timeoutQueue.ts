export interface TimeoutQueueItem {
  onResume: () => void;
  timerId: ReturnType<typeof setTimeout>;
}

export interface TimeoutQueue {
  submit(timeout: number, onResume: () => void, onTimeout: () => void): void;
  resume(): void;
}

export function timeoutQueue(): TimeoutQueue {
  const queue = new Set<TimeoutQueueItem>();
  return {
    submit(timeout: number, onResume: () => void, onTimeout: () => void) {
      const item: TimeoutQueueItem = {
        onResume,
        timerId: setTimeout(() => {
          queue.delete(item);
          onTimeout();
        }, timeout)
      };
      queue.add(item);
    },
    resume() {
      for (const item of queue) {
        queue.delete(item);
        clearTimeout(item.timerId);
        item.onResume();
      }
    }
  };
}
