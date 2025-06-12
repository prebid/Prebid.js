/**
 * This module is not intented for general use, but used by the build system to extract module metadata.
 * Cfr. `gulp extract-metadata`
 */

import {getGlobal} from '../src/prebidGlobal.js';
import adapterManager from '../src/adapterManager.js';
import {hook} from '../src/hook.js';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../src/consentHandler.js';
import {MODULE_TYPE_BIDDER, MODULE_TYPE_RTD, MODULE_TYPE_UID} from '../src/activities/modules.js';

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
  })
})

function formatGvlid(gvlid) {
  return gvlid === VENDORLESS_GVLID ? '1stParty' : gvlid;
}

function bidderMetadata() {
  return Object.fromEntries(
    Object.entries(adapterManager.bidderRegistry).map(([bidder, adapter]) => {
      const spec = adapter.getSpec?.() ?? {};
      return [
        bidder,
        {
          aliasOf: adapterManager.aliasRegistry.hasOwnProperty(bidder) ? adapterManager.aliasRegistry[bidder] : null,
          gvlid: formatGvlid(GDPR_GVLIDS.get(bidder).modules?.bidder ?? null),
          disclosureURL: spec.disclosureURL ?? null
        }
      ]
    })
  )
}

getGlobal()._getModuleMetadata = function () {
  return {
    [MODULE_TYPE_BIDDER]: bidderMetadata()
  }
}
