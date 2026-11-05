import type { PanxoRtdProviderParams } from '../../modules/panxoRtdProvider.js';
import type { RTDProviderConfig } from '../../modules/rtdModule/index.js';
import type { ProviderConfig } from '../../modules/rtdModule/spec.js';
type Assert<T extends true> = T;
export type PanxoIsTyped = Assert<'panxo' extends keyof ProviderConfig ? true : false>;
export const minimal: RTDProviderConfig<'panxo'> = { name: 'panxo', params: { siteId: 'a1b2c3d4e5f67890' } };
export const full: RTDProviderConfig<'panxo'> = { name: 'panxo', waitForIt: true, params: { siteId: 'a1b2c3d4e5f67890', verbose: true } };
// @ts-expect-error - siteId is required
export const missing: RTDProviderConfig<'panxo'> = { name: 'panxo', params: {} };
// @ts-expect-error - siteId must be a string
export const wrongSite: RTDProviderConfig<'panxo'> = { name: 'panxo', params: { siteId: 42 } };
// @ts-expect-error - verbose must be boolean
export const wrongVerbose: RTDProviderConfig<'panxo'> = { name: 'panxo', params: { siteId: 'a1b2c3d4e5f67890', verbose: 'yes' } };
// @ts-expect-error - provider params do not define a user identifier
export const unknown: RTDProviderConfig<'panxo'> = { name: 'panxo', params: { siteId: 'a1b2c3d4e5f67890', userId: 'synthetic' } };
export const typedParams: PanxoRtdProviderParams = { siteId: 'a1b2c3d4e5f67890' };
// @ts-expect-error - the provider has no external-script test mode
export const unsupportedTest: RTDProviderConfig<'panxo'> = { name: 'panxo', params: { siteId: 'a1b2c3d4e5f67890', test: true } };
