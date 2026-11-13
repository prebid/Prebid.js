/** Compile-time regressions for #14895; checked by `gulp ts`. */
import type { PrebidJS } from '../../src/prebidGlobal.ts';
import type { Config } from '../../src/config.ts';
import type { UserIdConfig, ProviderParams } from '../../modules/userId/spec.ts';
import type { ProviderConfig } from '../../modules/rtdModule/spec.ts';

type Assert<T extends true> = T;
export type SharedIdIsTyped = Assert<'sharedId' extends keyof ProviderParams ? true : false>;
export type GeolocationIsTyped = Assert<'geolocation' extends keyof ProviderConfig ? true : false>;
export type Scope3IsTyped = Assert<'scope3' extends keyof ProviderConfig ? true : false>;

export function checkProviderConfig(pbjs: PrebidJS, dynamicName: string, existing: Partial<Config>) {
  pbjs.setConfig({ userSync: { userIds: [{ name: 'sharedId', params: { create: false, inserter: 'example' } }] } });
  pbjs.mergeConfig({ userSync: { userIds: [{ name: 'pubCommonId', params: { extend: true } }] } });
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'geolocation', waitForIt: true, params: { requestPermission: false } }] } });
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'scope3', params: { orgId: 'example' } }, { name: 'geolocation' }] } });
  pbjs.setConfig({ userSync: { userIds: [{ name: 'sharedId', params: { create: true } }, { name: 'pubProvidedId', params: { eids: [] } }] } });
  pbjs.setConfig({
    userSync: { userIds: [{ name: 'sharedId', params: { create: false } }, { name: 'customId', params: { anything: 1 } }] },
    realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: true } }, { name: 'customRtd', params: { anything: 2 } }] }
  });
  pbjs.setConfig({ userSync: { userIds: [{ name: dynamicName, params: { anything: true } }] } });
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: dynamicName, customOption: true }] } });
  pbjs.setConfig(existing);
  pbjs.setConfig({ debug: true, customSetting: { anything: true } });
  pbjs.setConfig({});
  pbjs.setBidderConfig({ bidders: [dynamicName], config: { userSync: { userIds: [{ name: 'sharedId', params: { create: false } }] } } });
  pbjs.mergeBidderConfig({ bidders: ['appnexus'], config: { realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: false } }] } } });

  const explicit: UserIdConfig<'sharedId'> = { name: 'sharedId', params: { create: true } };
  pbjs.setConfig({ userSync: { userIds: [explicit] } });

  // @ts-expect-error - a known ID provider cannot fall back to untyped params
  pbjs.setConfig({ userSync: { userIds: [{ name: 'sharedId', params: { create: 'invalid' } }] } });
  // @ts-expect-error - unknown keys on a known provider are rejected
  pbjs.setConfig({ userSync: { userIds: [{ name: 'sharedId', params: { create: false, foo: true } }] } });
  // @ts-expect-error - one provider's params cannot be used for another known provider
  pbjs.setConfig({ userSync: { userIds: [{ name: 'sharedId', params: { eids: [] } }, { name: 'pubProvidedId', params: { eids: [] } }] } });
  // @ts-expect-error - an unknown provider in the same array must not weaken a known one
  pbjs.setConfig({ userSync: { userIds: [{ name: 'customId', params: { foo: true } }, { name: 'sharedId', params: { create: 'invalid' } }] } });
  // @ts-expect-error - mergeConfig validates the same parameters as setConfig
  pbjs.mergeConfig({ userSync: { userIds: [{ name: 'sharedId', params: { create: 'invalid' } }] } });
  // @ts-expect-error - ID aliases retain the provider's parameter types
  pbjs.setConfig({ userSync: { userIds: [{ name: 'pubCommonId', params: { create: 'invalid' } }] } });
  // @ts-expect-error - known RTD providers cannot fall back to untyped params
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: 'invalid' } }] } });
  // @ts-expect-error - unknown RTD parameter keys are rejected
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'geolocation', params: { foo: true } }] } });
  // @ts-expect-error - mixing typed and untyped RTD providers preserves validation
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'customRtd', params: { foo: true } }, { name: 'geolocation', params: { requestPermission: 'invalid' } }] } });
  // @ts-expect-error - mergeConfig also validates RTD providers
  pbjs.mergeConfig({ realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: 'invalid' } }] } });
  // @ts-expect-error - a provider's required configuration remains required
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'scope3' }] } });
  // @ts-expect-error - required params cannot be supplied by a different provider in the array
  pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: false } }, { name: 'scope3', params: {} }] } });
  // @ts-expect-error - unrelated core configuration keeps its existing checks
  pbjs.setConfig({ debug: 'invalid' });
  // @ts-expect-error - bidder-scoped configuration infers ID provider names too
  pbjs.setBidderConfig({ bidders: [dynamicName], config: { userSync: { userIds: [{ name: 'sharedId', params: { create: 'invalid' } }] } } });
  // @ts-expect-error - merging bidder configuration preserves provider validation
  pbjs.mergeBidderConfig({ bidders: ['appnexus'], config: { realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: 'invalid' } }] } } });

  // Configuration built before the call: naming its providers in the type checks it as if it were inline (README)
  const prebuilt = {
    userSync: { userIds: [{ name: 'sharedId', params: { create: true } }, { name: 'customId', params: { anything: 1 } }] },
    realTimeData: { dataProviders: [{ name: 'geolocation', params: { requestPermission: false } }] }
  } satisfies Partial<Config<'sharedId' | 'customId' | 'geolocation'>>;
  pbjs.setConfig(prebuilt);
  const annotated: Partial<Config<'sharedId'>> = { userSync: { userIds: [{ name: 'sharedId', params: { create: false } }] } };
  pbjs.setConfig(annotated);
  // @ts-expect-error - a prebuilt configuration that names its providers is checked
  const invalidPrebuilt = { userSync: { userIds: [{ name: 'sharedId', params: { create: 'invalid' } }] } } satisfies Partial<Config<'sharedId'>>;
  // @ts-expect-error - an annotated configuration is checked too
  const invalidAnnotated: Partial<Config<'sharedId'>> = { userSync: { userIds: [{ name: 'sharedId', params: { foo: true } }] } };
  // @ts-expect-error - a provider that isn't named in the type is rejected, rather than going unchecked
  const unnamedProvider = { userSync: { userIds: [{ name: 'customId', params: {} }] } } satisfies Partial<Config<'sharedId'>>;
  return [invalidPrebuilt, invalidAnnotated, unnamedProvider];
}
