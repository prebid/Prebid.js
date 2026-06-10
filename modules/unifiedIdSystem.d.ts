import type { Ext } from '../src/types/ortb/common';
import type { RequireAtLeastOne } from '../src/types/objects';

export type UnifiedIdSystemModuleName = 'unifiedId';

export interface UnifiedIdObject {
  id: string;
  ext?: Ext;
}

export type UnifiedId = string | UnifiedIdObject;

export type UnifiedIdConfig = RequireAtLeastOne<{
  /**
   * This is the partner ID value obtained from registering with The Trade Desk or working with a Prebid.js managed services provider.
   */
  partner?: string;
  /**
   * If specified for UnifiedId, overrides the default Trade Desk URL.
   */
  url?: string;
}, 'partner' | 'url'>;

declare module './userId/spec' {
  interface UserId {
    tdid: UnifiedId;
  }

  interface ProvidersToId {
    unifiedId: 'tdid';
  }

  interface ProviderParams {
    unifiedId: UnifiedIdConfig;
  }
}

export {};
