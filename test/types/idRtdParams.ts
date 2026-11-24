/**
 * Compile-time expectations for the params of User ID and RTD submodules that declare their types.
 *
 * Not a unit test - `tsc` (`gulp ts`) compiles this along with the rest of the project, and fails
 * the build if any expectation below stops holding. The `@ts-expect-error` directives assert in
 * both directions: tsc reports an unused directive if the line under it stops being an error.
 */
import type {} from '../../modules/permutiveRtdProvider.d.ts';
import type {} from '../../modules/optimeraRtdProvider.d.ts';
import type {} from '../../modules/adagioRtdProvider.d.ts';
import type {} from '../../modules/connectIdSystem.d.ts';
import type {} from '../../modules/fabrickIdSystem.d.ts';
import type {} from '../../modules/amxIdSystem.d.ts';
import type {} from '../../modules/merkleIdSystem.d.ts';
import type { ProviderParams, UserIdConfig } from '../../modules/userId/spec.ts';
import type { ProviderConfig, RTDProviderConfig } from '../../modules/rtdModule/spec.ts';

type Assert<T extends true> = T;

// Guards: without a registration, params fall back to an open-ended shape and everything below
// would pass regardless.
export type RtdProvidersAreTyped = Assert<'permutive' | 'optimeraRTD' | 'adagio' extends keyof ProviderConfig ? true : false>;
export type IdProvidersAreTyped = Assert<'connectId' | 'fabrickId' | 'amxId' | 'merkleId' extends keyof ProviderParams ? true : false>;

// Permutive
export const permutive: RTDProviderConfig<'permutive'> = {
  name: 'permutive',
  waitForIt: true,
  params: {
    acBidders: ['appnexus', 'rubicon', 'ozone', 'trustx', 'smartadserver'],
    maxSegs: 500,
    enforceVendorConsent: true,
    bidders: { appnexus: { customCohorts: { source: 'ls', key: 'my_cohorts' } } },
  },
};
export const permutiveNoParams: RTDProviderConfig<'permutive'> = { name: 'permutive' };
// @ts-expect-error maxSegs is a number
export const permutiveBadMaxSegs: RTDProviderConfig<'permutive'> = { name: 'permutive', params: { maxSegs: '500' } };

// Optimera
export const optimera: RTDProviderConfig<'optimeraRTD'> = {
  name: 'optimeraRTD',
  waitForIt: true,
  params: { clientID: '9999', optimeraKeyName: 'optimera', device: 'de', apiVersion: 'v0' },
};
// @ts-expect-error clientID is required
export const optimeraNoClientId: RTDProviderConfig<'optimeraRTD'> = { name: 'optimeraRTD', params: { device: 'de' } };

// Adagio
export const adagio: RTDProviderConfig<'adagio'> = {
  name: 'adagio',
  params: { organizationId: '1000', site: 'my-site', placementSource: 'ortb' },
};
// @ts-expect-error organizationId must be a string
export const adagioNumericOrg: RTDProviderConfig<'adagio'> = { name: 'adagio', params: { organizationId: 1000, site: 'my-site' } };

// Yahoo ConnectID
export const connectId: UserIdConfig<'connectId'> = {
  name: 'connectId',
  params: {
    pixelId: '0000',
    he: 'ed8ddbf5a171981db8ef938596ca297d5e3f84bcc280041c5880dba3baf9c1d4',
    puid: 'ab9iibf5a231ii1db8ef911596ca297d5e3f84biii00041c580dba3baf9c1da',
  },
};
export const connectIdNumericPixel: UserIdConfig<'connectId'> = { name: 'connectId', params: { pixelId: 58776 } };
export const connectIdEndpoint: UserIdConfig<'connectId'> = { name: 'connectId', params: { endpoint: 'https://example.com/ups' } };
// @ts-expect-error pixelId or endpoint is required
export const connectIdNoPixel: UserIdConfig<'connectId'> = { name: 'connectId', params: { he: 'abc' } };

// Fabrick
export const fabrick: UserIdConfig<'fabrickId'> = {
  name: 'fabrickId',
  params: {
    apiKey: '123456789',
    e: '31c5543c1734d25c7206f5fd591525d0295bec6fe84ff82f946a34fe970a1e66',
  },
  storage: { name: 'pbjs_fabrickId', type: 'cookie', expires: 7 },
};
// the request query string takes numbers and mixed arrays as well as strings
export const fabrickNumericParams: UserIdConfig<'fabrickId'> = {
  name: 'fabrickId',
  params: { apiKey: '123456789', iab1: 1, iab2: [2, '3'] },
};
// @ts-expect-error apiKey is required
export const fabrickNoApiKey: UserIdConfig<'fabrickId'> = { name: 'fabrickId', params: { e: 'abc' } };

// AMX
export const amx: UserIdConfig<'amxId'> = {
  name: 'amxId',
  storage: { name: 'amxId', type: 'html5', expires: 14 },
  params: { tagId: 'cHJlYmlkLm9yZw' },
};
// @ts-expect-error tagId is a string
export const amxNumericTagId: UserIdConfig<'amxId'> = { name: 'amxId', params: { tagId: 123 } };

// Merkle
export const merkle: UserIdConfig<'merkleId'> = {
  name: 'merkleId',
  params: { sv_pubid: 'example_pubid', ssp_ids: ['example_sspid_1', 'example_sspid_2'] },
  storage: { type: 'html5', name: 'merkleId', expires: 30 },
};
// @ts-expect-error ssp_ids is required
export const merkleNoSspIds: UserIdConfig<'merkleId'> = { name: 'merkleId', params: { sv_pubid: 'example_pubid' } };
