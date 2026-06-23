import path from 'path';
import fs from 'fs';
import helpers from '../gulpHelpers.js';
import moduleMetadata from './modules.json' with {type: 'json'};
import coreMetadata from './core.json' with {type: 'json'};

import overrides from './overrides.mjs';
import { fetchDisclosure, getDisclosureUrl, getPublicURL, logErrorSummary } from './storageDisclosure.mjs';
import { getPurposes, isValidGvlId } from './gvl.mjs';
import {validatePurposeDeclarations} from '../libraries/purposeDeclarations/validate.mjs';

const MAX_DISCLOSURE_AGE_DAYS = 14;

function matches(moduleName, moduleSuffix) {
  moduleSuffix = moduleSuffix.toLowerCase();
  const shortName = moduleName.toLowerCase().replace(moduleSuffix, '');
  return function ({componentName, aliasOf}) {
    const name = (aliasOf ?? componentName).toLowerCase();
    return name === shortName || (name.startsWith(shortName) && moduleSuffix.startsWith(name.slice(shortName.length)));
  };
}

const modules = {
  BidAdapter: 'bidder',
  AnalyticsAdapter: 'analytics',
  IdSystem: 'userId',
  RtdProvider: 'rtd'
};

function previousDisclosure(moduleName, {componentType, componentName, disclosureURL}) {
  return new Promise((resolve, reject) => {
    function noPreviousDisclosure() {
      console.info(`No previously fetched disclosure available for "${componentType}.${componentName}" (url: ${disclosureURL})`);
      resolve(null);
    }
    fs.readFile(moduleMetadataPath(moduleName), (err, data) => {
      if (err) {
        err.code === 'ENOENT' ? noPreviousDisclosure() : reject(err);
      } else {
        try {
          const disclosure = JSON.parse(data.toString()).disclosures?.[disclosureURL];
          if (disclosure == null || disclosure.disclosures == null) {
            noPreviousDisclosure();
          } else {
            const disclosureAgeDays = ((new Date()).getTime() - new Date(disclosure.timestamp).getTime()) /
              (1000 * 60  * 60 * 24);
            if (disclosureAgeDays <= MAX_DISCLOSURE_AGE_DAYS) {
              console.info(`Using previously fetched disclosure for ${componentType}.${componentName}" (url: ${disclosureURL}, disclosure is ${Math.floor(disclosureAgeDays)} days old)`);
              resolve(disclosure)
            } else {
              console.warn(`Previously fetched disclosure for ${componentType}.${componentName}" (url: ${disclosureURL}) is too old (${Math.floor(disclosureAgeDays)} days) and won't be reused`);
              resolve(null);
            }
          }
        } catch (e) {
          reject(e);
        }
      }
    })
  })
}

const EXPECTED_PURPOSES = {
  'userId': [1],
  'bidder': [2],
  'analytics': [7]
}

const RELEVANT_PURPOSES = [1, 2, 4, 7];

const purposeWarnings = [];
const purposeErrors = [];

function logPurposeMsg(dest, component, gvlid, purposes,  msg) {
  dest.push(`${component} (GVL ID ${gvlid}) ${msg} (${JSON.stringify(purposes)})`)
}

function checkPurpose({component, gvlid}, purpose, {legIntPurposes, purposes}) {
  if (!purposes.includes(purpose) && !legIntPurposes.includes(purpose)) {
    logPurposeMsg(purposeWarnings, component, gvlid, {legIntPurposes, purposes}, `does not declare consent or LI as legal basis for purpose ${purpose}`)
  }
}

export function validatePurposes({component, gvlid}, {legIntPurposes, purposes, flexiblePurposes, specialFeatures}) {
  RELEVANT_PURPOSES.forEach(purpose => {
    if (legIntPurposes.includes(purpose) && !flexiblePurposes.includes(purpose)) {
      logPurposeMsg(purposeWarnings, component, gvlid, {purposes, legIntPurposes, flexiblePurposes}, `declares LI only as legal basis for purpose ${purpose}`)
    }
  })
}

async function metadataFor(moduleName, metas, fetch = true) {
  const disclosures = {};
  const purposes = {};
  for (const meta of metas) {
    if (meta.disclosureURL == null && meta.gvlid != null) {
      meta.disclosureURL = await getDisclosureUrl(meta.gvlid);
    }
    if (meta.disclosureURL) {
      const disclosure = {
        timestamp: new Date().toISOString(),
        disclosures: fetch ? await fetchDisclosure(meta) : null
      };
      meta.disclosureURL = getPublicURL(meta.disclosureURL);
      if (disclosure.disclosures == null) {
        Object.assign(disclosure, await previousDisclosure(moduleName, meta));
      }
      disclosures[meta.disclosureURL] = disclosure;
    }
    if (meta.gvlid != null && !purposes.hasOwnProperty(meta.gvlid)) {
      purposes[meta.gvlid] = await getPurposes(meta.gvlid)
    }
  }
  metas.filter(({gvlid}) => gvlid != null).forEach(({componentType, componentName, gvlid}) => {
    (EXPECTED_PURPOSES[componentType] ?? []).forEach(purpose => {
      checkPurpose({component: `${componentType}.${componentName}`, gvlid}, purpose, purposes[gvlid]);
    });
    const validationError = validatePurposeDeclarations(purposes[gvlid]);
    if (validationError) {
      logPurposeMsg(purposeErrors, `${componentType}.${componentName}`, purposes[gvlid], validationError);
    }
    validatePurposes({component: `${componentType}.${componentName}`, gvlid}, purposes[gvlid]);

  })
  return {
    'NOTICE': 'do not edit - this file is autogenerated by `gulp update-metadata`',
    disclosures,
    purposes,
    components: metas
  };
}

async function compileCoreMetadata(fetch = true) {
  const modules = coreMetadata.components.reduce((byModule, item) => {
    if (!byModule.hasOwnProperty(item.moduleName)) {
      byModule[item.moduleName] = [];
    }
    byModule[item.moduleName].push(item);
    delete item.moduleName;
    return byModule;
  }, {});
  for (let [moduleName, metadata] of Object.entries(modules)) {
    await updateModuleMetadata(moduleName, metadata, fetch);
  }
  return Object.keys(modules);
}

function moduleMetadataPath(moduleName) {
  return path.resolve(`./metadata/modules/${moduleName}.json`);
}

async function updateModuleMetadata(moduleName, metadata, fetch = true) {
  fs.writeFileSync(
    moduleMetadataPath(moduleName),
    JSON.stringify(await metadataFor(moduleName, metadata, fetch), null, 2)
  );
}

async function validateGvlIds() {
  let invalid = false;
  (await Promise.all(
    moduleMetadata
      .components
      .filter(({gvlid}) => gvlid != null)
      .map(({componentName, componentType, gvlid}) => isValidGvlId(gvlid).then(valid => ({
        valid,
        componentName,
        componentType,
        gvlid
      })))
  )).filter(({valid}) => !valid)
    .forEach(({componentName, componentType, gvlid}) => {
      console.error(`"${componentType}.${componentName}" provides a GVL ID that is deleted or missing: ${gvlid}`)
      invalid = true;
    })
  if (invalid) {
    throw new Error('One or more GVL IDs are invalid')
  }
}

async function compileModuleMetadata(fetch = true) {
  const processed = [];
  const found = new WeakSet();
  let err = false;
  for (const moduleName of helpers.getModuleNames()) {
    let predicate;
    for (const [suffix, moduleType] of Object.entries(modules)) {
      if (moduleName.endsWith(suffix)) {
        predicate = overrides.hasOwnProperty(moduleName)
          ? ({componentName, aliasOf}) => componentName === overrides[moduleName] || aliasOf === overrides[moduleName]
          : matches(moduleName, suffix);
        predicate = ((orig) => (entry) => entry.componentType === moduleType && orig(entry))(predicate);
        break;
      }
    }
    if (predicate) {
      const meta = moduleMetadata.components.filter(predicate);
      meta.forEach((entry) => found.add(entry));
      const names = new Set(meta.map(({componentName, aliasOf}) => aliasOf ?? componentName));
      if (names.size === 0) {
        console.error('Cannot determine module name for module file: ', moduleName);
        err = true;
      } else if (names.size > 1) {
        console.error('More than one module name matches module file:', moduleName, names);
        err = true;
      } else {
        await updateModuleMetadata(moduleName, meta, fetch);
        processed.push(moduleName);
      }
    }
  }

  const notFound = moduleMetadata.components.filter(entry => !found.has(entry));
  if (notFound.length > 0) {
    console.error('Could not find module name for metadata', notFound);
    err = true;
  }

  if (err) {
    throw new Error('Could not compile module metadata');
  }
  return processed;
}


export default async function compileMetadata(fetch = true) {
  await validateGvlIds();
  const allModules = new Set((await compileCoreMetadata(fetch))
    .concat(await compileModuleMetadata(fetch)));
  if (purposeWarnings.length > 0) {
    console.warn("Some vendors have unexpected purpose declarations:");
    purposeWarnings.forEach(warn => console.warn(`  ${warn}`));
  }
  if (purposeErrors.length > 0) {
    console.error("Some vendors have invalid purpose declarations:");
    purposeErrors.forEach(err => console.error(`  ${err}`));
    throw new Error('Some purpose declarations are out of spec')
  }
  logErrorSummary();
  fs.readdirSync('./metadata/modules')
    .map(name => path.parse(name))
    .filter(({name}) => !allModules.has(name))
    .forEach(({name}) => {
      const fn = `./metadata/modules/${name}.json`;
      console.info(`Removing "${fn}"`);
      fs.rmSync(fn);
    })

  const extraOverrides = Object.keys(overrides).filter(module => !allModules.has(module));
  if (extraOverrides.length) {
    console.warn('The following modules are mentioned in `metadata/overrides.mjs`, but could not be found:', JSON.stringify(extraOverrides, null, 2));
  }
}
