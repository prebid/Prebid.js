export function timeoutQueue() {
  const queue = [];
  return {
    submit(timeout, onResume, onTimeout) {
      const item = [
        onResume,
        setTimeout(() => {
          queue.splice(queue.indexOf(item), 1);
          onTimeout();
        }, timeout)
      ];
      queue.push(item);
    },
    resume() {
      while (queue.length) {
        const [onResume, timerId] = queue.shift();
        clearTimeout(timerId);
        onResume();
      }
    }
  }
}
