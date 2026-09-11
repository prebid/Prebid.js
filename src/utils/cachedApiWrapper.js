// Marks a property as read live from the target on every access, never cached, unaffected by
// reset(). Use for properties that change continuously (e.g. scroll offsets) rather than on
// events the cache is invalidated for (e.g. resize) - caching them behind the same TTL/reset
// as the rest of the object lets callers unknowingly combine a live measurement with a stale
// one when they read the two together.
export const LIVE = 'live';

export function CachedApiWrapper(getTarget, props) {
  const wrapper = {};
  let data = {};
  const children = [];
  Object.entries(props).forEach(([key, value]) => {
    if (value != null && typeof value === 'object') {
      const child = new CachedApiWrapper(() => getTarget()?.[key], value);
      wrapper[key] = child.obj;
      children.push(child.reset);
    } else if (value === LIVE) {
      Object.defineProperty(wrapper, key, {
        get() {
          return getTarget()?.[key];
        }
      });
    } else if (value === true) {
      Object.defineProperty(wrapper, key, {
        get() {
          if (!data.hasOwnProperty(key)) {
            data[key] = getTarget()?.[key];
          }
          return data[key];
        }
      });
    }
  });
  this.obj = wrapper;
  this.reset = function () {
    children.forEach(reset => reset());
    data = {};
  };
}
