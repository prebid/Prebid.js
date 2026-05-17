import type { AllConsentData } from '../src/consentHandler.ts';
import type { IdProviderSpec, ProviderResponse, UserIdConfig } from './userId/spec.ts';

export interface uid2Id {
  id?: string;
  optout?: boolean;
}

export interface euidId {
  id?: string;
  optout?: boolean;
}

export type Uid2Submodule = IdProviderSpec<'uid2'>;
export type Uid2SubmoduleConfig = UserIdConfig<'uid2'>;
export type EuidSubmodule = IdProviderSpec<'euid'>;
export type EuidSubmoduleConfig = UserIdConfig<'euid'>;
export type ConsentData = AllConsentData;
export type IdResponse = ProviderResponse;
