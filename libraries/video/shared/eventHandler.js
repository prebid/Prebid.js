/**
 * Builds a standard event handler
 * @param {String} type Event name
 * @param {(function(String, Object): Object)} callback Callback defined by publisher to be executed when the event occurs
 * @param {Object} payload Base payload defined when the event is registered
 * @param {(function(*): Object)|null|undefined} getExtraPayload Parses the player's event payload to return a normalized payload
 * @returns {(function(*): void)|*} event handler
 */
export function getEventHandler(type, callback, payload, getExtraPayload) {
  return event => {
    if (getExtraPayload) {
      const extraPayload = getExtraPayload(event);
      Object.assign(payload, extraPayload);
    }

    callback(type, payload);
  };
}
