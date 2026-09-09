// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export type AnonymisedIdSystemModuleName = 'anonymisedId';

declare module './userId/spec' {
  interface UserId {
    anonymisedId: string;
  }

  interface ProvidersToId {
    anonymisedId: 'anonymisedId';
  }

  interface ProviderParams {
    anonymisedId: never;
  }
}

export {};
