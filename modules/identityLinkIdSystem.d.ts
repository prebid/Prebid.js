export type IdentityLinkIdSystemModuleName = 'identityLink';

declare module './userId/spec' {
  interface UserId {
    idl_env: string;
  }

  interface ProvidersToId {
    identityLink: 'idl_env';
  }

  interface ProviderParams {
    identityLink: {
      pid: string;
      notUse3P?: boolean;
    }
  }
}

export {};
