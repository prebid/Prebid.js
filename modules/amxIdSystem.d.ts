// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export interface AmxIdParams {
  /**
   * AMX-provided tag ID, sent with the ID sync request. Defaults to an empty string.
   */
  tagId?: string;
}

declare module './userId/spec' {
  interface ProviderParams {
    amxId: AmxIdParams;
  }
}
