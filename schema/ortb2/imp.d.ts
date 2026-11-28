import type { ORTBImp } from '../../src/types/ortb/request.d.ts'
import type { DeepPartial } from '../../src/types/objects.d.ts'

/** OpenRTB 2.6 impression, as used for ad unit first party data (`ortb2Imp`). */
export interface OpenRTBImp extends DeepPartial<ORTBImp> {}
export type { OpenRTBImp as default }
