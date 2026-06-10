export type FtrackIdSystemModuleName = 'ftrack';

declare module './userId/spec' {
  interface UserId {
    ftrackId: {
      uid: string;
      ext: Record<string, string>;
    };
  }

  interface ProvidersToId {
    ftrack: 'ftrackId';
  }

  interface ProviderParams {
    ftrack: {
      url: string;
      ids?: {
        'device id'?: boolean;
        'single device id'?: boolean;
        'household id'?: boolean;
      };
    };
  }
}

export {};
