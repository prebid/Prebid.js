export function CachedApiWrapper(target, props, obj) {
  const wrapper = obj ?? {};
  let data = {};
  const children = [];
  Object.entries(wrapper)
    .filter(([_, val]) => val instanceof CachedApiWrapper)
    .forEach(([key, {reset, obj}]) => {
      wrapper[key] = obj;
      children.push(reset);
    });
  Object.defineProperties(
    wrapper,
    Object.fromEntries(
      props.map(prop => [prop, {
        get() {
          if (!data.hasOwnProperty(prop)) {
            data[prop] = target?.[prop];
          }
          return data[prop];
        }
      }])
    )
  );
  this.obj = wrapper;
  this.reset = function () {
    children.forEach(reset => reset());
    data = {};
  };
}
