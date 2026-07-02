import fs from 'node:fs/promises';
import path from 'node:path';

async function readMetadata() {
  return Object.fromEntries(
    await Promise.all(
      (await fs.readdir(path.resolve(import.meta.dirname, 'modules')))
        .map(async name => {
          const components = JSON.parse((await fs.readFile(path.resolve(import.meta.dirname, 'modules', name))).toString()).components;
          return [name.replace(/\.json$/, ''), components];
        })
    )
  );
}

function conflictDetector(metadata) {
  function getKey({ componentType, componentName }) {
    return componentType === 'bidder' ? `bidder.${componentName.substring(0, 6).toLowerCase()}` : `${componentType}.${componentName.toLowerCase()}`;
  }

  const conflictMap = Object.entries(metadata).reduce((memo, [moduleName, components]) => {
    components
      .forEach(({ componentType, componentName, aliasOf }) => {
        const key = getKey({ componentType, componentName });
        if (!memo.hasOwnProperty(key)) {
          memo[key] = [];
        }
        memo[key].push({
          moduleName: moduleName,
          componentType,
          componentName,
          aliasOf
        });
      });
    return memo;
  }, {});
  return function (moduleName, component) {
    return conflictMap[getKey(component)]?.filter((entry) => entry.moduleName !== moduleName) ?? [];
  };
}

function checkName({ componentType, componentName }) {
  if (componentType === 'bidder' && !/^[a-z0-9_]+$/.test(componentName)) {
    return 'contains uppercase or non-alphanumeric characters';
  }
}

export async function getViolationsSummary() {
  const meta = await readMetadata();
  const checkForConflicts = conflictDetector(meta);
  return Object.entries(meta)
    .reduce((memo, [moduleName, components]) => {
      components.forEach(cmp => {
        const conflicts = checkForConflicts(moduleName, cmp);
        const nameViolation = checkName(cmp);
        if (conflicts.length > 0 || nameViolation != null) {
          if (!memo.hasOwnProperty(moduleName)) {
            memo[moduleName] = [];
          }
          const entry = {
            component: {
              componentType: cmp.componentType,
              componentName: cmp.componentName,
              aliasOf: cmp.aliasOf
            }
          };
          if (conflicts.length > 0) {
            entry.conflicts = conflicts;
          }
          if (nameViolation != null) {
            entry.name = nameViolation;
          }
          memo[moduleName].push(entry);
        }
      });
      return memo;
    }, {});
}

export function formatViolationsSummary(violations) {
  const naming = [];
  const conflicting = [];

  function declaration(component) {
    return `${component.componentType} ${component.aliasOf ? 'alias' : 'code'} '${component.componentName}'`;
  }

  Object.entries(violations).forEach(([moduleName, entries]) => {
    entries.forEach(({ component, name, conflicts }) => {
      if (name) {
        naming.push(`Module '${moduleName}' defines ${declaration(component)}, which ${name}`);
      }
      if (conflicts) {
        conflicting.push(`* Module '${moduleName}' defines ${declaration(component)}, which conflicts with:`);
        conflicts.forEach(conflict => conflicting.push(`    * ${declaration(conflict)} defined in module ${conflict.moduleName}`));
      }
    });
  });

  return naming.concat(['']).concat(conflicting).join('\n');
}

export async function validateNaming() {
  const warn = formatViolationsSummary(await getViolationsSummary());
  if (warn != null) {
    console.warn(warn);
    throw new Error('Some adapters do not follow naming conventions');
  }
}
