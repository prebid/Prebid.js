export const PROCESSOR_TYPES = ['request', 'imp', 'bidResponse', 'response'];
export const PROCESSOR_DIALECTS = ['default', 'pbs'];
export const [REQUEST, IMP, BID_RESPONSE, RESPONSE] = PROCESSOR_TYPES;
export const [DEFAULT, PBS] = PROCESSOR_DIALECTS;

const types = new Set(PROCESSOR_TYPES);

export function processorRegistry() {
  const processors = {};

  return {
    registerOrtbProcessor({type, name, fn, priority = 0, dialects = [DEFAULT]}) {
      if (!types.has(type)) {
        throw new Error(`ORTB processor type must be one of: ${PROCESSOR_TYPES.join(', ')}`)
      }
      dialects.forEach(dialect => {
        if (!processors.hasOwnProperty(dialect)) {
          processors[dialect] = {};
        }
        if (!processors[dialect].hasOwnProperty(type)) {
          processors[dialect][type] = {};
        }
        processors[dialect][type][name] = {
          priority,
          fn
        }
      })
    },
    getProcessors(dialect) {
      return processors[dialect] || {};
    }
  }
}

export const {registerOrtbProcessor, getProcessors} = processorRegistry();
