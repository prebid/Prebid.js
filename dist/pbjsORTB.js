"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getProcessors = exports.RESPONSE = exports.REQUEST = exports.PROCESSOR_TYPES = exports.PROCESSOR_DIALECTS = exports.PBS = exports.IMP = exports.DEFAULT = exports.BID_RESPONSE = void 0;
exports.processorRegistry = processorRegistry;
exports.registerOrtbProcessor = void 0;
const PROCESSOR_TYPES = exports.PROCESSOR_TYPES = ['request', 'imp', 'bidResponse', 'response'];
const PROCESSOR_DIALECTS = exports.PROCESSOR_DIALECTS = ['default', 'pbs'];
const [REQUEST, IMP, BID_RESPONSE, RESPONSE] = PROCESSOR_TYPES;
exports.RESPONSE = RESPONSE;
exports.BID_RESPONSE = BID_RESPONSE;
exports.IMP = IMP;
exports.REQUEST = REQUEST;
const [DEFAULT, PBS] = PROCESSOR_DIALECTS;
exports.PBS = PBS;
exports.DEFAULT = DEFAULT;
const types = new Set(PROCESSOR_TYPES);
function processorRegistry() {
  const processors = {};
  return {
    registerOrtbProcessor(_ref) {
      let {
        type,
        name,
        fn,
        priority = 0,
        dialects = [DEFAULT]
      } = _ref;
      if (!types.has(type)) {
        throw new Error("ORTB processor type must be one of: ".concat(PROCESSOR_TYPES.join(', ')));
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
        };
      });
    },
    getProcessors(dialect) {
      return processors[dialect] || {};
    }
  };
}
const {
  registerOrtbProcessor,
  getProcessors
} = processorRegistry();
exports.getProcessors = getProcessors;
exports.registerOrtbProcessor = registerOrtbProcessor;