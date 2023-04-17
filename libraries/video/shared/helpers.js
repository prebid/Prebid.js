import { videoKey } from '../constants/constants.js'

export function getExternalVideoEventName(eventName) {
  return videoKey + eventName.replace(/^./, eventName[0].toUpperCase());
}
