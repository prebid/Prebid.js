import type { Ext } from '../src/types/ortb/common';

export type UnifiedIdSystemModuleName = 'unifiedId';

export interface UnifiedIdObject {
  id: string;
  ext?: Ext;
}

export type UnifiedId = string | UnifiedIdObject;

export interface UnifiedIdConfig {
  partner?: string;
  url?: string;
}

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
