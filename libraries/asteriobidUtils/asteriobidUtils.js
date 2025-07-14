const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export function collectUtmTagData(storage, getParameterByName, logError, analyticsName) {
  let newUtm = false;
  const pmUtmTags = {};
  try {
    utmTags.forEach(function (utmKey) {
      const utmValue = getParameterByName(utmKey);
      if (utmValue !== '') {
        newUtm = true;
      }
      pmUtmTags[utmKey] = utmValue;
    });
    if (newUtm === false) {
      utmTags.forEach(function (utmKey) {
        const itemValue = storage.getDataFromLocalStorage(`pm_${utmKey}`);
        if (itemValue && itemValue.length !== 0) {
          pmUtmTags[utmKey] = itemValue;
        }
      });
    } else {
      utmTags.forEach(function (utmKey) {
        storage.setDataInLocalStorage(`pm_${utmKey}`, pmUtmTags[utmKey]);
      });
    }
  } catch (e) {
    logError(`${analyticsName} Error`, e);
    pmUtmTags['error_utm'] = 1;
  }
  return pmUtmTags;
}

export function trimAdUnit(adUnit) {
  if (!adUnit) return adUnit;
  const res = {};
  res.code = adUnit.code;
  res.sizes = adUnit.sizes;
  return res;
}

export function trimBid(bid) {
  if (!bid) return bid;
  const res = {};
  res.auctionId = bid.auctionId;
  res.bidder = bid.bidder;
  res.bidderRequestId = bid.bidderRequestId;
  res.bidId = bid.bidId;
  res.crumbs = bid.crumbs;
  res.cpm = bid.cpm;
  res.currency = bid.currency;
  res.mediaTypes = bid.mediaTypes;
  res.sizes = bid.sizes;
  res.transactionId = bid.transactionId;
  res.adUnitCode = bid.adUnitCode;
  res.bidRequestsCount = bid.bidRequestsCount;
  res.serverResponseTimeMs = bid.serverResponseTimeMs;
  return res;
}

export function trimBidderRequest(bidderRequest) {
  if (!bidderRequest) return bidderRequest;
  const res = {};
  res.auctionId = bidderRequest.auctionId;
  res.auctionStart = bidderRequest.auctionStart;
  res.bidderRequestId = bidderRequest.bidderRequestId;
  res.bidderCode = bidderRequest.bidderCode;
  res.bids = bidderRequest.bids && bidderRequest.bids.map(trimBid);
  return res;
}
