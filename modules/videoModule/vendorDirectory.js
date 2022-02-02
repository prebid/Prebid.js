/**
 * @typedef {Object} vendorSubmoduleDirectory
 * @summary Map that specifies which factory must be used to instantiate a Vendor's submodule.
 * @description The key is the vendor code and the value is the factory. Values are assigned at runtime when the submodule factories are loaded on the page.
 */

/**
 * @summary Maps a Video Provider factory to the video player's vendor code.
 * @type {vendorSubmoduleDirectory}
 */
export const videoVendorDirectory = {};

/**
 * @summary Maps an Ad Server Provider factory to the Ad Server's vendor code.
 * @type {vendorSubmoduleDirectory}
 */
export const adServerDirectory = {};
