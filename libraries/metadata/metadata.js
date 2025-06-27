export function metadataRepository() {
  const components = {};
  const disclosures = {};
  const componentsByModule = {};

  const repo = {
    register(moduleName, data) {
      if (Array.isArray(data.components)) {
        if (!componentsByModule.hasOwnProperty(moduleName)) {
          componentsByModule[moduleName] = [];
        }
        data.components.forEach(component => {
          if (!components.hasOwnProperty(component.componentType)) {
            components[component.componentType] = {};
          }
          components[component.componentType][component.componentName] = component;
          componentsByModule[moduleName].push([component.componentType, component.componentName]);
        })
      }
      if (data.disclosures) {
        Object.assign(disclosures, data.disclosures);
      }
    },
    getMetadata(componentType, componentName) {
      return components?.[componentType]?.[componentName];
    },
    getStorageDisclosure(disclosureURL) {
      return disclosures?.[disclosureURL];
    },
    getModuleMetadata(moduleName) {
      const components = (componentsByModule[moduleName] ?? [])
        .map(([componentType, componentName]) => repo.getMetadata(componentType, componentName));
      if (components.length === 0) return null;
      const disclosures = Object.fromEntries(
        components
          .filter(({disclosureURL}) => disclosureURL != null)
          .map(({disclosureURL}) => [disclosureURL, repo.getStorageDisclosure(disclosureURL)])
      )
      return {
        disclosures,
        components
      }
    },
  }
  return repo;
}

export const metadata = metadataRepository();
