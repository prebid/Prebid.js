import type { Activity } from '../src/activities/activities.ts';
import type { PublicActivityParams } from '../src/activities/params.ts';

export interface ActivityRule {
  /**
   * Condition function for this rule; the rule applies only if this returns true. A condition that throws denies the activity.
   * If omitted, the rule always applies.
   */
  condition?: (params: PublicActivityParams) => boolean;
  /**
   * Whether the activity should be allowed when this rule applies. If omitted, the rule denies the activity.
   */
  allow?: boolean;
  /**
   * Priority of this rule compared to other rules; a lower number means higher priority. Defaults to 1.
   * Rules set by modules (e.g. consent management) have priority 10.
   */
  priority?: number;
}

export interface ActivityConfig {
  /**
   * Whether the activity should be allowed if no other rule applies. Defaults to true.
   */
  default?: boolean;
  /**
   * Rules for this activity.
   */
  rules?: ActivityRule[];
}

export type AllowActivitiesConfig = {
  [A in Activity]?: ActivityConfig;
};

declare module '../src/config' {
  interface Config {
    /**
     * Activity controls: rules that allow or deny privacy-sensitive activities.
     * Cfr. https://docs.prebid.org/dev-docs/activity-controls.html
     */
    allowActivities?: AllowActivitiesConfig;
  }
}
