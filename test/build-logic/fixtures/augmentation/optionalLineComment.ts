// the tag in a line comment, which declaration emit drops - so it must not suppress anything,
// or the check would behave differently before and after emission
import './inCore.js';

// @augmentationOptional
declare module './orphan' {
  interface Orphan { addedByLineComment?: number }
}
