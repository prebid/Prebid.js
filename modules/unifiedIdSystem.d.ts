export type UnifiedIdSystemModuleName = 'unifiedId';

export interface UnifiedId {
  id: string;
}

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
