const additionalData = new WeakMap();

export function getCurrencyFromBidderRequest(bidderRequest) {
  return (bidderRequest?.ortb2?.ext?.cur || [])[0];
}

export function setAdditionalData(obj, key, value) {
  const prevValue = additionalData.get(obj) || {};
  additionalData.set(obj, { ...prevValue, [key]: value });
}

export function getAdditionalData(obj, key) {
  const data = additionalData.get(obj) || {};
  return data[key];
}
