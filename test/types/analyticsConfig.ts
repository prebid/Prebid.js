/**
 * Compile-time expectations for `AnalyticsConfig`.
 *
 * Not a unit test - `tsc` (`gulp ts`) compiles this along with the rest of the project, and fails
 * the build if any expectation below stops holding. The `@ts-expect-error` directives assert in
 * both directions: tsc reports an unused directive if the line under it stops being an error.
 */
import type { AnalyticsConfig, AnalyticsProviderConfig } from '../../libraries/analyticsAdapter/AnalyticsAdapter.ts';

type Assert<T extends true> = T;

/**
 * Guards everything below: the `generic` expectations only mean something while
 * genericAnalyticsAdapter declares that provider. Without it they would be checked against the
 * open-ended shape that providers with no declared types get, and would all pass regardless.
 */
export type GenericIsTyped = Assert<'generic' extends keyof AnalyticsProviderConfig ? true : false>;

/**
 * A provider's declared `options` type is applied once, as `options`. Applying it at the top level
 * and again underneath itself would demand `options.options`, leaving the type unsatisfiable.
 */
export type OptionsNotNestedUnderThemselves = Assert<
  'options' extends keyof NonNullable<AnalyticsConfig<'generic'>['options']> ? false : true
>;

export const urlOptions: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  options: { url: 'https://example.com', batchSize: 5 }
};

export const handlerOptions: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  options: { handler: () => {} }
};

/**
 * Guards the expectation below. It is stated against tercept rather than generic because generic
 * declares `DefaultOptions` in its own entry, so generic would hold either way.
 */
export type TerceptIsTyped = Assert<'tercept' extends keyof AnalyticsProviderConfig ? true : false>;

/**
 * `sampling` is read by the base adapter for every provider, so it belongs to the options of a
 * provider that declares its own just as much as to one that declares none.
 */
export const sharedOptions: AnalyticsConfig<'tercept'> = {
  provider: 'tercept',
  options: { pubId: 1, pubKey: 2, sampling: 0.5 }
};

export const eventFilters: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  options: { url: 'https://example.com' },
  includeEvents: ['auctionEnd'],
  excludeEvents: ['bidWon']
};

/** Providers with no declared types take arbitrary options and top-level keys. */
export const untypedProvider: AnalyticsConfig<'someUntypedAdapter'> = {
  provider: 'someUntypedAdapter',
  options: { anything: 1 },
  topLevelKey: 2
};

// @ts-expect-error - `options` is required, because the generic adapter declares it that way
export const missingOptions: AnalyticsConfig<'generic'> = { provider: 'generic' };

export const wrongOptionType: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  // @ts-expect-error - `url` is a string
  options: { url: 42 }
};

export const unknownOption: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  // @ts-expect-error - `bogus` is not one of the generic adapter's options
  options: { url: 'https://example.com', bogus: true }
};

export const unknownTopLevelKey: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  options: { url: 'https://example.com' },
  // @ts-expect-error - not part of an analytics config, and not declared by the generic adapter
  bogus: true
};

export const badEventName: AnalyticsConfig<'generic'> = {
  provider: 'generic',
  options: { url: 'https://example.com' },
  // @ts-expect-error - not a Prebid event
  includeEvents: ['notAnEvent']
};
