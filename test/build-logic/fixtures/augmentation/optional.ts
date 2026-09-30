// the same violation as broken.ts, but declared to be conditional on purpose: the JSDoc tag says
// the augmentation is meant to apply only when a consumer imports the target independently.
// JSDoc is what carries it, because those are the comments that survive declaration emit.
import './inCore.js';

/**
 * @augmentationOptional
 */
declare module './orphan' {
  interface Orphan { addedByOptional?: number }
}
