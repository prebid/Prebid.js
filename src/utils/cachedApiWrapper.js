export function CachedApiWrapper(getTarget, props) {
  const wrapper = {};
  let data = {};
  const children = [];
  Object.entries(props).forEach(([key, value]) => {
    if (value != null && typeof value === 'object') {
      const child = new CachedApiWrapper(() => getTarget()?.[key], value)
      wrapper[key] = child.obj;
      children.push(child.reset);
    } else if (value === true) {
      Object.defineProperty(wrapper, key, {
        get() {
          if (!data.hasOwnProperty(key)) {
            data[key] = getTarget()?.[key];
          }
          return data[key];
        }
      })
    }
  })
  this.obj = wrapper;
  this.reset = function () {
    children.forEach(reset => reset());
    data = {};
  };
}
