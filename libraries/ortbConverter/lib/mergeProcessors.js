import {PROCESSOR_TYPES} from '../../../src/pbjsORTB.js';

export function mergeProcessors(...processors) {
  const left = processors.shift();
  const right = processors.length > 1 ? mergeProcessors(...processors) : processors[0];
  return Object.fromEntries(
    PROCESSOR_TYPES.map(type => [type, Object.assign({}, left[type], right[type])])
  )
}
