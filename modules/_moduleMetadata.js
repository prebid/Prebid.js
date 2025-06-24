/**
 * This module is not intended for general use, but used by the build system to extract module metadata.
 * Cfr. `gulp extract-metadata`
 */

import {getGlobal} from '../src/prebidGlobal.js';
import adapterManager from '../src/adapterManager.js';
import {hook} from '../src/hook.js';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../src/consentHandler.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_RTD,
  MODULE_TYPE_UID
} from '../src/activities/modules.js';

const moduleRegistry = {};

Object.entries({
  [MODULE_TYPE_UID]: 'userId',
  [MODULE_TYPE_RTD]: 'realTimeData'
}).forEach(([moduleType, moduleName]) => {
  moduleRegistry[moduleType] = {};
  hook.get(moduleName).before((next, modules) => {
    modules.flatMap(mod => mod).forEach((module) => {
      moduleRegistry[moduleType][module.name] = module;
    })
    next(modules);
  }, -100)
})

function formatGvlid(gvlid) {
  return gvlid === VENDORLESS_GVLID ? null : gvlid;
}

function bidderMetadata() {
  return Object.fromEntries(
    Object.entries(adapterManager.bidderRegistry).map(([bidder, adapter]) => {
      const spec = adapter.getSpec?.() ?? {};
      return [
        bidder,
        {
          aliasOf: adapterManager.aliasRegistry.hasOwnProperty(bidder) ? adapterManager.aliasRegistry[bidder] : null,
          gvlid: formatGvlid(GDPR_GVLIDS.get(bidder).modules?.[MODULE_TYPE_BIDDER] ?? null),
          disclosureURL: spec.disclosureURL ?? null
        }
      ]
    })
  )
}

function rtdMetadata() {
  return Object.fromEntries(
    Object.entries(moduleRegistry[MODULE_TYPE_RTD])
      .map(([provider, module]) => {
        return [
          provider,
          {
            gvlid: formatGvlid(GDPR_GVLIDS.get(provider).modules?.[MODULE_TYPE_RTD] ?? null),
            disclosureURL: module.disclosureURL ?? null,
          }
        ]
      })
  )
}

function uidMetadata() {
  return Object.fromEntries(
    Object.entries(moduleRegistry[MODULE_TYPE_UID])
      .flatMap(([provider, module]) => {
        return [provider, module.aliasName]
          .filter(name => name != null)
          .map(name => [
            name,
            {
              gvlid: formatGvlid(GDPR_GVLIDS.get(provider).modules?.[MODULE_TYPE_UID] ?? null),
              disclosureURL: module.disclosureURL ?? null,
              aliasOf: name !== provider ? provider : null
            }]
          )
      })
  )
}

function analyticsMetadata() {
  return Object.fromEntries(
    Object.entries(adapterManager.analyticsRegistry)
      .map(([provider, {gvlid, adapter}]) => {
        return [
          provider,
          {
            gvlid: formatGvlid(GDPR_GVLIDS.get(name).modules?.[MODULE_TYPE_ANALYTICS] ?? null),
            disclosureURL: adapter.disclosureURL
          }
        ]
      })
  )
}

getGlobal()._getModuleMetadata = function () {
  return Object.entries({
    [MODULE_TYPE_BIDDER]: bidderMetadata(),
    [MODULE_TYPE_RTD]: rtdMetadata(),
    [MODULE_TYPE_UID]: uidMetadata(),
    [MODULE_TYPE_ANALYTICS]: analyticsMetadata(),
  }).flatMap(([componentType, modules]) => {
    return Object.entries(modules).map(([componentName, moduleMeta]) => ({
      componentType,
      componentName,
      ...moduleMeta,
    }))
  })
}
