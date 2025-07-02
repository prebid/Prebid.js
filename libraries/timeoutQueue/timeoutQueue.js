export function timeoutQueue() {
    const queue = new Set();
    return {
        submit(timeout, onResume, onTimeout) {
            const item = {
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
