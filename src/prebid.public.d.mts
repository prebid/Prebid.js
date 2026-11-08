// Entry point for ESM consumers. The other declarations are CommonJS, whose default export ESM sees as
// the whole module object, so the default cannot be re-exported from prebid.ts.
import type { PrebidJS } from './prebidGlobal.js';
declare const pbjs: PrebidJS;
export default pbjs;
export type * from './types/summary/public.d.ts';
