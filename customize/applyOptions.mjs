export function applyOptions(defaultOptions, options) {
  const overrides = {};
  if (options.globalVarName != null) {
    overrides.pbGlobal = options.globalVarName;
  }
  ['defineGlobal', 'distUrlBase'].forEach((option) => {
    if (options[option] != null) {
      overrides[option] = options[option];
    }
  });
  return Object.assign(
    {},
    defaultOptions,
    overrides
  );
}
