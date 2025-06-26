import { isArrayOfNums, isInteger, isStr, isPlainObject, logWarn } from './utils.js';
import type {Size} from "./types/common.d.ts";
import type {ORTBImp} from "./types/ortb/request.d.ts";
import type {BaseMediaType} from "./mediaTypes.ts";

const ORTB_PARAMS = [
    [ 'format', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'object') ],
    [ 'w', isInteger ],
    [ 'h', isInteger ],
    [ 'btype', isArrayOfNums ],
    [ 'battr', isArrayOfNums ],
    [ 'pos', isInteger ],
    [ 'mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') ],
    [ 'topframe', value => [1, 0].includes(value) ],
    [ 'expdir', isArrayOfNums ],
    [ 'api', isArrayOfNums ],
    [ 'id', isStr ],
    [ 'vcm', value => [1, 0].includes(value) ]
] as const;

/**
 * List of OpenRTB 2.x banner object properties with simple validators.
 * Not included: `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_BANNER_PARAMS = new Map(ORTB_PARAMS);

/**
 * validateOrtbBannerFields mutates the `adUnit.mediaTypes.banner` object by removing invalid ortb properties (default).
 * The onInvalidParam callback can be used to handle invalid properties differently.
 * Other properties are ignored and kept as is.
 *
 * @param {Object} adUnit - The adUnit object.
 * @param {Function=} onInvalidParam - The callback function to be called with key, value, and adUnit.
 * @returns {void}
 */
export function validateOrtbBannerFields(adUnit, onInvalidParam?) {
  const bannerParams = adUnit?.mediaTypes?.banner;

  if (!isPlainObject(bannerParams)) {
    logWarn(`validateOrtbBannerFields: bannerParams must be an object.`);
    return;
  }

  if (bannerParams != null) {
    Object.entries(bannerParams)
      .forEach(([key, value]: any) => {
        if (!ORTB_BANNER_PARAMS.has(key)) {
          return
        }
        const isValid = ORTB_BANNER_PARAMS.get(key)(value);
        if (!isValid) {
          if (typeof onInvalidParam === 'function') {
            onInvalidParam(key, value, adUnit);
          } else {
            logWarn(`Invalid prop in adUnit "${adUnit.code}": Invalid value for mediaTypes.banner.${key} ORTB property. The property has been removed.`, adUnit);
            delete bannerParams[key];
          }
        }
      });
  }
}

export interface BannerMediaType extends BaseMediaType, Partial<Pick<ORTBImp['banner'], (typeof ORTB_PARAMS)[number][0]>> {
    /**
     * All sizes this ad unit can accept.
     * Examples: [400, 600], [[300, 250], [300, 600]].
     * Prebid recommends that the sizes auctioned by Prebid should be the same auctioned by AdX and GAM OpenBidding, which means AdUnit sizes should match the GPT sizes.
     */
    sizes?: Size | Size[]
}

declare module './bidfactory' {
    interface BannerBidResponseProperties {
        /**
         * Ad markup. Required unless adUrl is provided.
         */
        ad?: string;
        /**
         * Ad URL. Required unless ad is provided.
         */
        adUrl?: string;
    }
}
