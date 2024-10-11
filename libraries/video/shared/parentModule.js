/**
 * @typedef {Object} ParentModule
 * @summary abstraction for any module to store and reference its submodules
 * @param {SubmoduleBuilder} submoduleBuilder_
 * @returns {ParentModule}
 * @constructor
 */
export function ParentModule(submoduleBuilder_) {
  const submoduleBuilder = submoduleBuilder_;
  const submodules = {};

  /**
   * @function ParentModule#registerSubmodule
   * @summary Stores a submodule
   * @param {String} id - unique identifier of the submodule instance
   * @param {String} vendorCode - identifier to the submodule type that must be built
   * @param {Object} config - additional information necessary to instantiate the submodule
   */
  function registerSubmodule(id, vendorCode, config) {
    if (submodules[id]) {
      return;
    }

    let submodule;
    try {
      submodule = submoduleBuilder.build(vendorCode, config);
    } catch (e) {
      throw e;
    }
    submodules[id] = submodule;
  }

  /**
   * @function ParentModule#getSubmodule
   * @summary Stores a submodule
   * @param {String} id - unique identifier of the submodule instance
   * @returns {Object} - a submodule instance
   */
  function getSubmodule(id) {
    return submodules[id];
  }

  return {
    registerSubmodule,
    getSubmodule
  }
}

/**
 * @typedef {import('../../../modules/videoModule/coreVideo.js').vendorSubmoduleDirectory} vendorSubmoduleDirectory
 * @typedef {Object} SubmoduleBuilder
 * @summary Instantiates submodules
 * @param {vendorSubmoduleDirectory} submoduleDirectory_
 * @param {Object|null|undefined} sharedUtils_
 * @returns {SubmoduleBuilder}
 * @constructor
 */
export function SubmoduleBuilder(submoduleDirectory_, sharedUtils_) {
  const submoduleDirectory = submoduleDirectory_;
  const sharedUtils = sharedUtils_;

  /**
   * @function SubmoduleBuilder#build
   * @param vendorCode - identifier to the submodule type that must be instantiated
   * @param config - additional information necessary to instantiate the submodule
   * @throws
   * @returns {{init}|*} - a submodule instance
   */
  function build(vendorCode, config) {
    const submoduleFactory = submoduleDirectory[vendorCode];
    if (!submoduleFactory) {
      throw new Error('Unrecognized submodule vendor code: ' + vendorCode);
    }

    const submodule = submoduleFactory(config, sharedUtils);
    return submodule;
  }

  return {
    build
  };
}
