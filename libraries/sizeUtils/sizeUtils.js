/**
 * Read an adUnit object and return the sizes used in an [[728, 90]] format (even if they had [728, 90] defined)
 * Preference is given to the `adUnit.mediaTypes.banner.sizes` object over the `adUnit.sizes`
 * @param {object} adUnit one adUnit object from the normal list of adUnits
 * @returns {Array.<number[]>} array of arrays containing numeric sizes
 */
export function getAdUnitSizes(adUnit) {
  if (!adUnit) {
    return;
  }

  let sizes = [];
  if (adUnit.mediaTypes && adUnit.mediaTypes.banner && Array.isArray(adUnit.mediaTypes.banner.sizes)) {
    const bannerSizes = adUnit.mediaTypes.banner.sizes;
    if (Array.isArray(bannerSizes[0])) {
      sizes = bannerSizes;
    } else {
      sizes.push(bannerSizes);
    }
    // TODO - remove this else block when we're ready to deprecate adUnit.sizes for bidders
  } else if (Array.isArray(adUnit.sizes)) {
    if (Array.isArray(adUnit.sizes[0])) {
      sizes = adUnit.sizes;
    } else {
      sizes.push(adUnit.sizes);
    }
  }
  return sizes;
}

/**
 * Normalize adUnit.mediaTypes.banner.sizes to Array.<Array.<number>>
 *
 * @param {Array.<number|string> | Array.<Array.<number|string>>} bidSizes - value of adUnit.mediaTypes.banner.sizes.
 * @returns {Array.<Array.<number>>} - Normalized value.
 */

export function normalizeBannerSizes(bidSizes) {
  const sizes = [];
  if (Array.isArray(bidSizes) && bidSizes.length === 2 && !Array.isArray(bidSizes[0])) {
    sizes.push({
      width: parseInt(bidSizes[0], 10),
      height: parseInt(bidSizes[1], 10),
    });
  } else if (Array.isArray(bidSizes) && Array.isArray(bidSizes[0])) {
    bidSizes.forEach((size) => {
      sizes.push({
        width: parseInt(size[0], 10),
        height: parseInt(size[1], 10),
      });
    });
  }
  return sizes;
}

export function getMinSize(sizes) {
  return sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min);
}
