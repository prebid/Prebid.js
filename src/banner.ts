import { isArrayOfNums, isInteger, isStr } from './utils.js';
import type {Size} from "./types/common.d.ts";
import type {PlacementPosition} from "./types/ortb/request.d.ts";
import type {BaseMediaType} from "./mediaTypes.ts";

export interface BannerMediaType extends BaseMediaType {
    /**
     * All sizes this ad unit can accept.
     * Examples: [400, 600], [[300, 250], [300, 600]].
     * Prebid recommends that the sizes auctioned by Prebid should be the same auctioned by AdX and GAM OpenBidding, which means AdUnit sizes should match the GPT sizes.
     */
    sizes: Size | Size[]
    /**
     * OpenRTB page position value.
     */
    pos?: PlacementPosition
}

/**
 * List of OpenRTB 2.x banner object properties with simple validators.
 * Not included: `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_BANNER_PARAMS = new Map([
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
]);
