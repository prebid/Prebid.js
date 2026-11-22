// the same violation as broken.ts, under a directory the `ignore` option names - standing for the
// compiled test code that `gulp check-declarations` skips
import '../inCore.js';

declare module '../orphan' {
  interface Orphan { addedByIgnored?: number }
}
