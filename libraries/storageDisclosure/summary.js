export function getStorageDisclosureSummary(moduleNames, getModuleMetadata) {
  const summary = {};
  moduleNames.forEach(moduleName => {
    const disclosure = getModuleMetadata(moduleName)?.disclosures;
    if (!disclosure) return;
    Object.entries(disclosure).forEach(([url, identifiers]) => {
      if (summary.hasOwnProperty(url)) {
        summary[url].forEach(({disclosedBy}) => disclosedBy.push(moduleName));
      } else {
        summary[url] = identifiers.map(identifier => ({
          disclosedIn: url,
          disclosedBy: [moduleName],
          ...identifier
        }))
      }
    })
  });
  return [].concat(...Object.values(summary));
}
