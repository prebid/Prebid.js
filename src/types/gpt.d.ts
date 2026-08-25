/**
 * Prebid's public API refers to GPT ad slots, but the GPT type definitions declare a global that
 * is not valid for consumers who do not use GPT - so they cannot be a dependency.
 *
 * The pieces the public API refers to are declared here as empty. Declaration merging fills them
 * in for consumers that include `@types/google-publisher-tag` independently; for everyone else
 * the names resolve, but describe nothing.
 *
 * Cfr. `src/types/local/gpt.d.ts`, which gives Prebid's own build the real definitions.
 */
declare global {
  namespace googletag {
    // empty on purpose: this is the target the real definitions merge into
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Slot {}
  }
}

/**
 * A GPT ad slot: `googletag.Slot` for consumers that include the GPT type definitions, and an
 * empty interface for those that do not.
 */
export type GptSlot = googletag.Slot;

/**
 * The parts of the GPT API Prebid uses, named so that the public API does not have to refer to
 * `typeof googletag` - a value, which cannot be declared as empty the way the types above can.
 */
export interface GptApi {
  pubads(): {
    getTargetingKeys(): string[];
    getTargeting(key: string): string[];
    setTargeting(key: string, value: string | string[]): void;
  };
}
