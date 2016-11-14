import faker from 'faker';

var Slot = function Slot({ code, divId }) {
  code = code || `adunitcode-${randomFive()}`;
  divId = divId || `div-id-${randomFive()}`;
  console.log(' Slot constructor');
  console.log('divId: ', divId);
  console.log('code: ', code);

  var slot = {
    targeting: [],
    getSlotElementId: function getSlotElementId() {
      return divId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return code;
    },

    setTargeting: function setTargeting(key, value) {
      var obj = [];
      obj[key] = value;
      this.targeting.push(obj);
    },

    getTargeting: function getTargeting() {
      return this.targeting;
    },

    getTargetingKeys: function getTargetingKeys() {
      return [];
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

function randomFive() { return faker.random.number({ min: 10000, max: 99999 }); }

window.googletag = {
  _slots: [],
  pubads: function () {
    var self = this;
    return {
      getSlots: function () {
        return self._slots;
      },

      setSlots: function (slots) {
        self._slots = slots;
      }
    };
  }
};
