import {setConsentConfig} from 'modules/consentManagementTcf.js';
import {server} from 'test/mocks/xhr.js';
import {coreStorage, startAuctionHook} from 'modules/userId/index.js';

const msIn12Hours = 60 * 60 * 12 * 1000;
const expireCookieDate = 'Thu, 01 Jan 1970 00:00:01 GMT';

export const cookieHelpers = {
  getFutureCookieExpiry: () => new Date(Date.now() + msIn12Hours).toUTCString(),
  setPublisherCookie: (cookieName, token) => coreStorage.setCookie(cookieName, JSON.stringify(token), cookieHelpers.getFutureCookieExpiry()),
  clearCookies: (...cookieNames) => cookieNames.forEach(cookieName => coreStorage.setCookie(cookieName, '', expireCookieDate)),
}

export const runAuction = async () => {
  const adUnits = [{
    code: 'adUnit-code',
    mediaTypes: {banner: {}, native: {}},
    sizes: [[300, 200], [300, 600]],
    bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
  }];
  return new Promise(function(resolve) {
    startAuctionHook(function() {
      resolve(adUnits[0].bids[0]);
    }, {adUnits});
  });
}

export const apiHelpers = {
  makeTokenResponse: (token, shouldRefresh = false, expired = false, refreshExpired = false) => ({
    advertising_token: token,
    refresh_token: 'fake-refresh-token',
    identity_expires: expired ? Date.now() - 1000 : Date.now() + 60 * 60 * 1000,
    refresh_from: shouldRefresh ? Date.now() - 1000 : Date.now() + 60 * 1000,
    refresh_expires: refreshExpired ? Date.now() - 1000 : Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    refresh_response_key: 'wR5t6HKMfJ2r4J7fEGX9Gw==', // Fake data
  }),
  respondAfterDelay: (delay, srv = server) => new Promise((resolve) => setTimeout(() => {
    srv.respond();
    setTimeout(() => resolve());
  }, delay)),
}

export const setGdprApplies = (consent = false) => {
  const consentDetails = consent ? {
    tcString: 'CPhJRpMPhJRpMABAMBFRACBoALAAAEJAAIYgAKwAQAKgArABAAqAAA',
    purpose: {
      consents: {
        '1': true,
      },
    },
    vendor: {
      consents: {
        '21': true,
      },
    }

  } : {
    tcString: 'CPhJRpMPhJRpMABAMBFRACBoALAAAEJAAIYgAKwAQAKgArABAAqAAA'
  };
  const staticConfig = {
    cmpApi: 'static',
    timeout: 7500,
    consentData: {
      gdprApplies: true,
      ...consentDetails
    }
  }
  setConsentConfig(staticConfig);
  return staticConfig;
}
