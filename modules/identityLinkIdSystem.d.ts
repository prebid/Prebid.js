export type IdentityLinkIdSystemModuleName = 'identityLink';

declare module './userId/spec' {
  interface UserId {
    idl_env: string;
  }

  interface ProvidersToId {
    idl_env: 'idl_env';
  }

  interface ProviderParams {
    identityLink: {
      pid: string;
    }
  }
}

export {}
