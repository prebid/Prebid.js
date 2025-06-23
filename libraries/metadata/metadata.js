export function metadataRepository() {
  const components = {};
  const disclosures = {};

  return {
    register(data) {
      if (Array.isArray(data.components)) {
        data.components.forEach(component => {
          if (!components.hasOwnProperty(component.componentType)) {
            components[component.componentType] = {};
          }
          components[component.componentType][component.componentName] = component;
        })
      }
      if (data.disclosures) {
        Object.assign(disclosures, data.disclosures);
      }
    },
    getMetadata(moduleType, moduleCode) {
      return components?.[moduleType]?.[moduleCode];
    },
    getStorageDisclosure(disclosureURL) {
      return disclosures?.[disclosureURL];
    }
  }
}

export const metadata = metadataRepository();
