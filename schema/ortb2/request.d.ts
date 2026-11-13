import type { ORTBRequest } from '../../src/types/ortb/request.d.ts'
import type { DeepPartial } from '../../src/types/objects.d.ts'

/** OpenRTB 2.6 request, as used for first party data (`ortb2`). */
export interface OpenRTBRequest extends DeepPartial<ORTBRequest> {}
export type { OpenRTBRequest as default }
