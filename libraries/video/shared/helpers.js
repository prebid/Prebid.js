import { videoKey } from '../constants/constants.js'

export function getExternalVideoEventName(eventName) {
  if (!eventName) {
    return '';
  }
  return videoKey + eventName.replace(/^./, eventName[0].toUpperCase());
}

export function getExternalVideoEventPayload(eventName, payload) {
  if (!payload) {
    payload = {};
  }

  if (!payload.type) {
    payload.type = eventName;
  }
  return payload;
}
