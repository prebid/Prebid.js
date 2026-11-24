import { randomFive } from './fixtures.js';
import { targetingConfigApi } from '../../../mocks/gpt.js';

var Slot = function Slot({ code, divId }) {
  code = code || `ad-slot-code-${randomFive()}`;
  divId = divId || `div-id-${randomFive()}`;

  var slot = {
    targeting: {},
    getSlotElementId: function getSlotElementId() {
      return divId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return code;
    },
  };
  Object.assign(slot, targetingConfigApi(slot.targeting));
  return slot;
};

export function makeSlot() {
  const slot = new Slot(...arguments);
  window.googletag._slots.push(slot);
  return slot;
}

export function emitEvent(eventName, params) {
  (window.googletag._callbackMap[eventName] || []).forEach(eventCb => eventCb({ ...params, eventName }));
}

export function enable() {
  const targeting = {};
  window.googletag = {
    _slots: [],
    _callbackMap: {},
    _ppid: undefined,
    _targeting: targeting,
    cmd: [],
    ...targetingConfigApi(targeting),
    pubads: function () {
      var self = this;
      return {
        setPublisherProvidedId: function (ppid) {
          self._ppid = ppid;
        },

        getSlots: function () {
          return self._slots;
        },

        setSlots: function (slots) {
          self._slots = slots;
        },

        addEventListener: function (eventName, cb) {
          self._callbackMap[eventName] = self._callbackMap[eventName] || [];
          self._callbackMap[eventName].push(cb);
        }
      };
    }
  };
}

export function disable() {
  window.googletag = undefined;
}

export function reset() {
  disable();
  enable();
}

enable();
