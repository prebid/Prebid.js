export function CachedApiWrapper(getTarget, props, obj) {
  this._getTarget = getTarget;
  if (obj instanceof CachedApiWrapper) {
    this.obj = obj.obj;
    this.reset = obj.reset;
  } else {
    const wrapper = {};
    let data = {};
    const children = [];
    Object.entries(obj ?? {})
      .filter(([_, val]) => val instanceof CachedApiWrapper)
      .forEach(([key, {withParent}]) => {
        const {obj, reset} = withParent(getTarget);
        wrapper[key] = obj;
        children.push(reset);
      });
    Object.defineProperties(
      wrapper,
      Object.fromEntries(
        props.map(prop => [prop, {
          get: () => {
            if (!data.hasOwnProperty(prop)) {
              data[prop] = this._getTarget()?.[prop];
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
  this.withParent = function (getParent) {
    return new CachedApiWrapper(() => getTarget(getParent()), props, obj);
  }
}
