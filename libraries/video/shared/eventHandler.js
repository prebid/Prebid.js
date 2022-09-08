export function getEventHandler(type, callback, payload, getExtraPayload) {
  return event => {
    if (getExtraPayload) {
      const extraPayload = getExtraPayload(event);
      Object.assign(payload, extraPayload);
    }

    callback(type, payload);
  };
}
