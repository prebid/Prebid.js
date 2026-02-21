import faker from 'faker';
import { randomFive } from './fixtures.js';

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

    setTargeting: function setTargeting(key, value) {
      this.targeting[key] = Array.isArray(value) ? value : [value];
    },

    getTargeting: function getTargeting(key) {
      return this.targeting[key] || [];
    },

    getTargetingKeys: function getTargetingKeys() {
      return Object.keys(this.targeting);
    },

    getConfig: function getConfig(key) {
      if (key === 'targeting') {
        return {targeting: this.targeting};
      }
    },

    setConfig: function setConfig(config) {
      if (config?.targeting) {
        Object.assign(this.targeting, config.targeting);
      }
    },

    clearTargeting: function clearTargeting() {
      return window.googletag.pubads().getSlots();
    }
  };
  slot.spySetTargeting = sinon.spy(slot, 'setTargeting');
  return slot;
};

export function makeSlot() {
  const slot = new Slot(...arguments);
  window.googletag._slots.push(slot);
  return slot;
}

export function emitEvent(eventName, params) {
  (window.googletag._callbackMap[eventName] || []).forEach(eventCb => eventCb({...params, eventName}));
}

export function enable() {
  window.googletag = {
    _slots: [],
    _callbackMap: {},
    _ppid: undefined,
    _targeting: {},
    cmd: [],
    getConfig: function (key) {
      if (key === 'targeting') {
        return this._targeting;
      }
    },
    setConfig: function (config) {
      if (config?.targeting) {
        Object.assign(this._targeting, config.targeting);
      }
    },
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

        setTargeting: function(key, arrayOfValues) {
          self._targeting[key] = Array.isArray(arrayOfValues) ? arrayOfValues : [arrayOfValues];
        },

        getTargeting: function(key) {
          return self._targeting[key] || [];
        },

        getTargetingKeys: function() {
          return Object.getOwnPropertyNames(self._targeting);
        },

        clearTargeting: function() {
          self._targeting = {};
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
