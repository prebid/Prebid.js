import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'docereeadmanager';
const END_POINT = 'https://dai.doceree.com/drs/quest';

export const spec = {
  code: BIDDER_CODE,
  url: '',
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    const { placementId } = bid.params;
    return !!placementId;
  },
  isGdprConsentPresent: (bid) => {
    const { gdpr, gdprconsent } = bid.params;
    if (gdpr == '1') {
      return !!gdprconsent;
    }
    return true;
  },
  buildRequests: (validBidRequests) => {
    const serverRequests = [];
    const { data } = config.getConfig('docereeadmanager.user') || {};

    validBidRequests.forEach(function (validBidRequest) {
      const payload = getPayload(validBidRequest, data);

      if (!payload) {
        return;
      }

      serverRequests.push({
        method: 'POST',
        url: END_POINT,
        data: JSON.stringify(payload.data),
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
      });
    });

    return serverRequests;
  },
  interpretResponse: (serverResponse) => {
    const responseJson = serverResponse ? serverResponse.body : {};
    const bidResponse = {
      ad: responseJson.ad,
      width: Number(responseJson.width),
      height: Number(responseJson.height),
      requestId: responseJson.requestId,
      netRevenue: true,
      ttl: 30,
      cpm: responseJson.cpm,
      currency: responseJson.currency,
      mediaType: BANNER,
      creativeId: responseJson.creativeId,
      meta: {
        advertiserDomains:
          Array.isArray(responseJson.meta.advertiserDomains) &&
          responseJson.meta.advertiserDomains.length > 0
            ? responseJson.meta.advertiserDomains
            : [],
      },
    };

    return [bidResponse];
  },
};

function getPayload(bid, userData) {
  if (!userData || !bid) {
    return false;
  }

  const { bidId, params } = bid;
  const { placementId } = params;
  const {
    userid,
    email,
    firstname,
    lastname,
    specialization,
    hcpid,
    gender,
    city,
    state,
    zipcode,
    hashedNPI,
    hashedhcpid,
    hashedemail,
    hashedmobile,
    country,
    organization,
    dob,
  } = userData;

  const data = {
    userid: userid || '',
    email: email || '',
    firstname: firstname || '',
    lastname: lastname || '',
    specialization: specialization || '',
    hcpid: hcpid || '',
    gender: gender || '',
    city: city || '',
    state: state || '',
    zipcode: zipcode || '',
    hashedNPI: hashedNPI || '',
    pb: 1,
    adunit: placementId || '',
    requestId: bidId || '',
    hashedhcpid: hashedhcpid || '',
    hashedemail: hashedemail || '',
    hashedmobile: hashedmobile || '',
    country: country || '',
    organization: organization || '',
    dob: dob || '',
    userconsent: 1,
  };
  return {
    data,
  };
}

registerBidder(spec);
