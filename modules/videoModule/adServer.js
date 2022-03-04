import { adServerDirectory } from './vendorDirectory.js';
import { ParentModule, SubmoduleBuilder } from './shared/parentModule.js';

/**
 * Ad Server Provider interface. All submodules of Ad Server Core must adhere to this.
 * @typedef {Object} AdServerProvider
 * @function getAdTagUrl - Builds an ad tag URL for a Bid.
 */

/**
 * @function AdServerProvider#getAdTagUrl
 * @param {Object} adUnit - the Ad Unit associated to the bid
 * @param {string} baseAdTagUrl - Ad Tag onto which the targeting params of the bid can be appended.
 * @returns {string}
 */

/**
 * Config used to indicate which Ad Server to use to obtain the video ad tag url.
 * @typedef {Object} AdServerConfig
 * @property {string} vendorCode - The identifier of the AdServer vendor (i.e. gam, adloox, etc).
 * @property {string} baseAdTagUrl - Ad Tag onto which the targeting params of the bid can be appended.
 * @property {Object|undefined} params: Optional configuration block specific to the Ad Server vendor.
 */

/**
 * Routes commands to the appropriate Ad Server Submodule
 * @typedef {Object} AdServerCore
 * @function registerAdServer
 * @function getAdTagUrl
 */

/**
 * @constructor
 * @param {ParentModule} parentModule_
 * @returns {AdServerCore}
 */
export function AdServerCore(parentModule_) {
  const parentModule = parentModule_;

  /**
   * @name AdServerCore#registerAdServer
   * @param {AdServerConfig} config
   */
  function registerAdServer(config) {
    const vendorCode = config.vendorCode;
    try {
      parentModule.registerSubmodule(vendorCode, vendorCode, config);
    } catch (e) {}
  }

  /**
   * Builds an ad tag URL for a Bid
   * @name AdServerCore#getAdTagUrl
   * @param {string} vendorCode - identifier of the Ad Server Provider type i.e. GAM
   * @param {Object} adUnit - the Ad Unit associated to the bid
   * @param {string} baseAdTagUrl - Ad Tag onto which the targeting params of a bid can be appended
   */
  function getAdTagUrl(vendorCode, adUnit, baseAdTagUrl) {
    const submodule = parentModule.getSubmodule(vendorCode);
    return submodule && submodule.getAdTagUrl(adUnit, baseAdTagUrl);
  }

  return {
    registerAdServer,
    getAdTagUrl
  }
}

/**
 * @function coreAdServerFactory
 * @summary Factory to create an instance of Core Ad Server
 * @returns {AdServerCore}
 */
export function coreAdServerFactory() {
  const adServerSubmoduleBuilder = SubmoduleBuilder(adServerDirectory);
  const parentModule = ParentModule(adServerSubmoduleBuilder);
  const adServerCore = AdServerCore(parentModule);
  return adServerCore;
}
