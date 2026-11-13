import { Ext } from '../libraries/vidazooUtils/vidazooTypes.ts';

interface Copper6SSPCommonParams {
  bidFloor?: number;
  ext?: Ext;
  subDomain?: string;
}

/** Current documented params */
interface Copper6SSPModernParams extends Copper6SSPCommonParams {
  cId: string;
  pId: string;
  placementId?: never;
  endpointId?: never;
}

/** Previously documented legacy params */
interface Copper6SSPLegacyParams extends Copper6SSPCommonParams {
  placementId: string;
  endpointId: string;
  cId?: never;
  pId?: never;
}

export type Copper6SSPBidRequestParams =
  | Copper6SSPModernParams
  | Copper6SSPLegacyParams;

declare module '../src/adUnits' {
  interface BidderParams {
    copper6ssp: Copper6SSPBidRequestParams;
  }
}
