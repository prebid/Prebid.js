const orig = {};
['resolve', 'reject', 'all', 'race', 'allSettled'].forEach((k) => orig[k] = Promise[k].bind(Promise))

// Callbacks attached through Promise.resolve(value).then(...) will usually
// not execute immediately even if `value` is immediately available. This
// breaks tests that were written before promises even though they are semantically still valid.
// They can be made to work by making promises quasi-synchronous.

export function SyncPromise(value, fail = false) {
  if (value instanceof SyncPromise) {
    return value;
  } else if (typeof value === 'object' && typeof value.then === 'function') {
    return orig.resolve(value);
  } else {
    Object.assign(this, {
      then: function (cb, err) {
        const handler = fail ? err : cb;
        if (handler != null) {
          return new SyncPromise(handler(value));
        } else {
          return this;
        }
      },
      catch: function (cb) {
        if (fail) {
          return new SyncPromise(cb(value))
        } else {
          return this;
        }
      },
      finally: function (cb) {
        cb();
        return this;
      },
      __value: fail ? {status: 'rejected', reason: value} : {status: 'fulfilled', value}
    })
  }
}

Object.assign(SyncPromise, {
  resolve: (val) => new SyncPromise(val),
  reject: (val) => new SyncPromise(val, true),
  race: (promises) => promises.find((p) => p instanceof SyncPromise) || orig.race(promises),
  allSettled: (promises) => {
    if (promises.every((p) => p instanceof SyncPromise)) {
      return new SyncPromise(promises.map((p) => p.__value))
    } else {
      return orig.allSettled(promises);
    }
  },
  all: (promises) => {
    if (promises.every((p) => p instanceof SyncPromise)) {
      return SyncPromise.allSettled(promises).then((result) => {
        const err = result.find((r) => r.status === 'rejected');
        if (err != null) {
          return new SyncPromise(err.reason, true);
        } else {
          return new SyncPromise(result.map((r) => r.value))
        }
      })
    } else {
      return orig.all(promises);
    }
  }
})

export function synchronizePromise(sandbox) {
  Object.keys(orig).forEach((k) => {
    sandbox.stub(window.Promise, k).callsFake(SyncPromise[k]);
  })
}
