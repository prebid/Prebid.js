import { isPlainObject } from '../../src/utils.js';
import {
  getHighEntropySUA,
  getLowEntropySUA,
  SUA_SOURCE_UNKNOWN,
  SUA_SOURCE_LOW_ENTROPY,
  SUA_SOURCE_HIGH_ENTROPY,
} from '../../src/fpd/sua.js';
import type { UserAgent, BrandVersion } from 'iab-openrtb/v26';

type SuaBrandVersion = Omit<BrandVersion, 'version'> & { version?: string[] };

export type OrtbUserAgent = Omit<UserAgent, 'browsers' | 'platform'> & {
  browsers?: SuaBrandVersion[];
  platform?: SuaBrandVersion;
};

export type MgidSUAEnricher = (existing?: OrtbUserAgent) => OrtbUserAgent;

function sourceOf(sua?: OrtbUserAgent): number {
  if (isPlainObject(sua) && typeof sua!.source === 'number') {
    return sua!.source as number;
  }
  return SUA_SOURCE_UNKNOWN;
}

function supplement(existing: OrtbUserAgent, cached: OrtbUserAgent): OrtbUserAgent {
  const merged: OrtbUserAgent = { ...cached, ...existing };
  if (existing.platform && cached.platform && existing.platform.brand === cached.platform.brand) {
    merged.platform = { ...cached.platform, ...existing.platform };
  }
  return merged;
}

export function getMgidSUAEnricher(): MgidSUAEnricher {
  let cachedSUA: OrtbUserAgent | null = null;

  function enrich(existing?: OrtbUserAgent): OrtbUserAgent {
    const ex = isPlainObject(existing) ? existing : undefined;
    const cacheIsHigh = isPlainObject(cachedSUA) && sourceOf(cachedSUA!) >= SUA_SOURCE_HIGH_ENTROPY;
    if (!ex) {
      const candidate = cachedSUA || getLowEntropySUA();
      return isPlainObject(candidate) ? candidate! : {};
    }
    if (sourceOf(ex) === SUA_SOURCE_LOW_ENTROPY && cacheIsHigh) {
      return cachedSUA!;
    }
    return cacheIsHigh ? supplement(ex, cachedSUA!) : ex;
  }

  getHighEntropySUA()
    .then((sua: OrtbUserAgent | null) => {
      if (isPlainObject(sua)) {
        cachedSUA = sua;
      }
    })
    .catch(() => {});

  return enrich;
}
