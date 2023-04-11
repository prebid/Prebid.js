
export function objectGuard(accessRules) {
  const rules = {};
  Object.entries(accessRules).forEach(([path, rule]) => {
    let node = rules;
    path.split('.').forEach(el => {
      (node.children = node.children || {})[el] = {};
      node = node.children[el];
    })
    node.rule = rule;
  })

  function mkGuard(obj, rules) {
    return new Proxy(obj, {
      get(target, prop, receiver) {
        const getVal = () => Reflect.get(target, prop, receiver);
        if (rules.hasOwnProperty(prop)) {
          const {children, rule} = rules[prop]
          if (children) {
            return mkGuard(getVal(), children);
          } else if (rule?.read) {
            return rule.read(getVal);
          }
        }
        return getVal();
      },
      set(target, prop, val, receiver) {
        const setVal = Reflect.set(target, prop, val, receiver);

      }
    })
  }

  return function guard(obj) {
    return mkGuard(obj, rules.children);
  }
}
