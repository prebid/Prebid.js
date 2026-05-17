export type Id5IdSystemModuleName = 'id5';

export interface Id5AbTestingConfig {
  enabled?: boolean;
  controlGroupPct?: number;
}

export interface Id5SubmoduleParams {
  partner: number;
  pd?: string;
  provider?: string;
  externalModuleUrl?: string;
  disableExtensions?: boolean;
  canCookieSync?: boolean;
  gamTargetingPrefix?: string;
  exposeTargeting?: boolean;
  abTesting?: Id5AbTestingConfig;
}

declare module './userId/spec' {
  interface UserId {
    id5Id: {
      uid?: string;
      ext?: Record<string, unknown>;
    };
  }

  interface ProvidersToId {
    id5Id: 'id5Id';
  }

  interface ProviderParams {
    id5: Id5SubmoduleParams;
  }
}

export {};
