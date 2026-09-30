import {
  WITH_IIQ,
  WITHOUT_IIQ,
  DEFAULT_PERCENTAGE,
  AB_CONFIG_SOURCE,
} from '../intentIqConstants/intentIqConstants.js';

/**
 * A/B testing configuration source — controls how the test group is assigned.
 * - `'percentage'`  — random assignment based on `abPercentage`
 * - `'group'`       — fixed group supplied via the `group` param
 * - `'IIQServer'`   — server-driven assignment (default)
 * - `'disabled'`    — A/B testing disabled; always use IIQ
 */
export type IntentIqABConfigSource = 'percentage' | 'group' | 'IIQServer' | 'disabled';

type ABGroup = typeof WITH_IIQ | typeof WITHOUT_IIQ;

interface ABTestingConfig {
  ABTestingConfigurationSource?: string;
  abPercentage?: number;
  group?: string;
}

/**
 * Fix percentage if provided some incorrect data
 * clampPct(150) => 100
 * clampPct(-5) => 0
 * clampPct('abc') => DEFAULT_PERCENTAGE
 */
function clampPct(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return DEFAULT_PERCENTAGE; // fallback = 95
  return Math.max(0, Math.min(100, n));
}

/**
 * Randomly assigns a user to group A or B based on the given percentage.
 * Generates a random number (1–100) and compares it with the percentage.
 *
 * @param {number} pct The percentage threshold (0–100).
 * @returns {string} Returns WITH_IIQ for Group A or WITHOUT_IIQ for Group B.
 */
function pickABByPercentage(pct?: number): ABGroup {
  const percentageToUse =
    typeof pct === 'number' ? pct : DEFAULT_PERCENTAGE;
  const percentage = clampPct(percentageToUse);
  const roll = Math.floor(Math.random() * 100) + 1;
  return roll <= percentage ? WITH_IIQ : WITHOUT_IIQ; // A : B
}

function configurationSourceGroupInitialization(group?: string): ABGroup {
  return typeof group === 'string' && group.toUpperCase() === WITHOUT_IIQ
    ? WITHOUT_IIQ
    : WITH_IIQ;
}

/**
 * Determines the runtime A/B testing group without saving it to Local Storage.
 * 1. If terminationCause (tc) exists:
 *      - tc = 41 → Group B (WITHOUT_IIQ)
 *      - any other value → Group A (WITH_IIQ)
 * 2. Otherwise, assigns the group randomly based on DEFAULT_PERCENTAGE (default 95% for A, 5% for B).
 *
 * @param {number} [tc] The termination cause value returned by the server.
 * @param {number} [abPercentage] A/B percentage provided by partner.
 * @returns {string} The determined group: WITH_IIQ (A) or WITHOUT_IIQ (B).
 */
function IIQServerConfigurationSource(tc?: number, abPercentage?: number): ABGroup {
  if (typeof tc === 'number' && Number.isFinite(tc)) {
    return tc === 41 ? WITHOUT_IIQ : WITH_IIQ;
  }

  return pickABByPercentage(abPercentage);
}

export function defineABTestingGroup(
  configObject: ABTestingConfig,
  tc?: number
): ABGroup {
  switch (configObject.ABTestingConfigurationSource) {
    case AB_CONFIG_SOURCE.GROUP:
      return configurationSourceGroupInitialization(
        configObject.group
      );

    case AB_CONFIG_SOURCE.PERCENTAGE:
      return pickABByPercentage(configObject.abPercentage);

    default: {
      if (!configObject.ABTestingConfigurationSource) {
        configObject.ABTestingConfigurationSource = AB_CONFIG_SOURCE.IIQ_SERVER;
      }
      return IIQServerConfigurationSource(tc, configObject.abPercentage);
    }
  }
}
