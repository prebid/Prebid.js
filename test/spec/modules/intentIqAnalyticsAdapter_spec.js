import { expect } from "chai";
import iiqAnalyticsAnalyticsAdapter from "modules/intentIqAnalyticsAdapter.js";
import * as utils from "src/utils.js";
import { server } from "test/mocks/xhr.js";
import { config } from "src/config.js";
import { EVENTS } from "src/constants.js";
import * as events from "src/events.js";
import { getGlobal } from "../../../src/prebidGlobal.js";
import sinon from "sinon";
import {
  REPORTER_ID,
  preparePayload,
  restoreReportList,
} from "../../../modules/intentIqAnalyticsAdapter.js";
import {
  FIRST_PARTY_KEY,
  PREBID,
  VERSION,
  WITHOUT_IIQ,
  WITH_IIQ,
  AB_CONFIG_SOURCE,
} from "../../../libraries/intentIqConstants/intentIqConstants.js";
import * as detectBrowserUtils from "../../../libraries/intentIqUtils/detectBrowserUtils.js";
import {
  getCurrentUrl,
  appendVrrefAndFui,
} from "../../../libraries/intentIqUtils/getRefferer.js";
import {
  gppDataHandler,
  uspDataHandler,
  gdprDataHandler,
} from "../../../src/consentHandler.js";

let getConfigStub;
let userIdConfigForTest;
const partner = 10;
const identityName = `iiq_identity_${partner}`
const defaultIdentityObject = {
  firstPartyData: {
    pcid: "f961ffb1-a0e1-4696-a9d2-a21d815bd344",
    pcidDate: 1762527405808,
    uspString: "undefined",
    gppString: "undefined",
    gdprString: "",
    date: Date.now(),
    sCal: Date.now() - 36000,
    isOptedOut: false,
    pid: "profile",
    dbsaved: "true"
  },
  partnerData: {
    abTestUuid: "abTestUuid",
    adserverDeviceType: 1,
    clientType: 2,
    cttl: 43200000,
    date: Date.now(),
    profile: "profile",
    wsrvcll: true,
  },
  clientHints: JSON.stringify({
    0: '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    1: "?0",
    2: '"macOS"',
    3: '"arm"',
    4: '"64"',
    6: '"15.6.1"',
    7: "?0",
    8: '"Chromium";v="142.0.7444.60", "Google Chrome";v="142.0.7444.60", "Not_A Brand";v="99.0.0.0"',
  }),
};
const regionCases = [
  {
    name: 'default (no region)',
    region: undefined,
    expectedEndpoint: 'https://reports.intentiq.com/report'
  },
  {
    name: 'apac',
    region: 'apac',
    expectedEndpoint: 'https://reports-apac.intentiq.com/report'
  },
  {
    name: 'emea',
    region: 'emea',
    expectedEndpoint: 'https://reports-emea.intentiq.com/report'
  },
  {
    name: 'gdpr',
    region: 'gdpr',
    expectedEndpoint: 'https://reports-gdpr.intentiq.com/report'
  }
]
const version = VERSION;
const REPORT_ENDPOINT = "https://reports.intentiq.com/report";
const REPORT_ENDPOINT_GDPR = "https://reports-gdpr.intentiq.com/report";
const REPORT_SERVER_ADDRESS = "https://test-reports.intentiq.com/report";

const randomVal = () => Math.floor(Math.random() * 100000) + 1;

const getDefaultConfig = () => {
  return {
    partner,
    manualWinReportEnabled: false,
  }
}

const getUserConfigWithReportingServerAddress = () => [
  {
    'name': 'intentIqId',
    'params': {
      'partner': partner,
      'unpack': null,
    },
    'storage': {
      'type': 'html5',
      'name': 'intentIqId',
      'expires': 60,
      'refreshInSeconds': 14400
    }
  }
];

const getWonRequest = () => ({
  bidderCode: "pubmatic",
  width: 728,
  height: 90,
  statusMessage: "Bid available",
  adId: "23caeb34c55da51",
  requestId: "87615b45ca4973",
  transactionId: "5e69fd76-8c86-496a-85ce-41ae55787a50",
  auctionId: "0cbd3a43-ff45-47b8-b002-16d3946b23bf-" + randomVal(),
  mediaType: "banner",
  source: "client",
  cpm: 5,
  currency: "USD",
  ttl: 300,
  referrer: "",
  adapterCode: "pubmatic",
  originalCpm: 5,
  originalCurrency: "USD",
  responseTimestamp: 1669644710345,
  requestTimestamp: 1669644710109,
  bidder: "testbidder",
  timeToRespond: 236,
  pbLg: "5.00",
  pbMg: "5.00",
  pbHg: "5.00",
  pbAg: "5.00",
  pbDg: "5.00",
  pbCg: "",
  size: "728x90",
  status: "rendered",
});

const enableAnalyticWithSpecialOptions = (receivedOptions) => {
  iiqAnalyticsAnalyticsAdapter.disableAnalytics();
  iiqAnalyticsAnalyticsAdapter.enableAnalytics({
    provider: "iiqAnalytics",
    options: {
      ...getDefaultConfig(),
      ...receivedOptions
    },
  });
};

describe("IntentIQ tests all", function () {
  let logErrorStub;
  let getWindowSelfStub;
  let getWindowTopStub;
  let getWindowLocationStub;
  let detectBrowserStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, "logError");
    sinon.stub(events, "getEvents").returns([]);

    if (config.getConfig && config.getConfig.restore) {
      config.getConfig.restore();
    }

    iiqAnalyticsAnalyticsAdapter.initOptions = {
      lsValueInitialized: false,
      partner: null,
      fpid: null,
      userGroup: null,
      currentGroup: null,
      dataInLs: null,
      eidl: null,
      lsIdsInitialized: false,
      manualWinReportEnabled: false,
      domainName: null,
    };
    iiqAnalyticsAnalyticsAdapter.enableAnalytics({
      provider: "iiqAnalytics",
      options: getDefaultConfig()
    });
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
    sinon.spy(iiqAnalyticsAnalyticsAdapter, "track");
    window[identityName] = utils.deepClone(defaultIdentityObject);
  });

  afterEach(function () {
    logErrorStub.restore();
    if (getConfigStub && getConfigStub.restore) getConfigStub.restore();
    if (getWindowSelfStub) getWindowSelfStub.restore();
    if (getWindowTopStub) getWindowTopStub.restore();
    if (getWindowLocationStub) getWindowLocationStub.restore();
    if (detectBrowserStub) detectBrowserStub.restore();
    events.getEvents.restore();
    iiqAnalyticsAnalyticsAdapter.disableAnalytics();
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
    localStorage.clear();
    server.reset();
    delete window[`iiq_identity_${partner}`]
  });

  it("should send POST request with payload in request body if reportMethod is POST", function () {
    enableAnalyticWithSpecialOptions({
      reportMethod: "POST",
    });
    const wonRequest = getWonRequest();

    events.emit(EVENTS.BID_WON, wonRequest);

    const request = server.requests[0];
    restoreReportList();

    const expectedData = preparePayload(wonRequest);
    const expectedPayload = `["${btoa(JSON.stringify(expectedData))}"]`;

    expect(request.method).to.equal("POST");
    expect(request.requestBody).to.equal(expectedPayload);
  });

  it("should send GET request with payload in query string if reportMethod is NOT provided", function () {
    const wonRequest = getWonRequest();

    events.emit(EVENTS.BID_WON, wonRequest);

    const request = server.requests[0];

    expect(request.method).to.equal("GET");

    const url = new URL(request.url);
    const payloadEncoded = url.searchParams.get("payload");
    const decoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    restoreReportList();
    const expected = preparePayload(wonRequest);

    expect(decoded.partnerId).to.equal(expected.partnerId);
    expect(decoded.adType).to.equal(expected.adType);
    expect(decoded.prebidAuctionId).to.equal(expected.prebidAuctionId);
  });

  it("IIQ Analytical Adapter bid win report", function () {
    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876" });
    const expectedVrref = getWindowLocationStub().href;
    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    const parsedUrl = new URL(request.url);
    const vrref = parsedUrl.searchParams.get("vrref");
    expect(request.url).to.contain(
      REPORT_ENDPOINT + "?pid=" + partner + "&mct=1"
    );
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(`&vrref=${decodeURIComponent(vrref)}`).to.contain(
      `&vrref=${expectedVrref}`
    );
    expect(request.url).to.contain("&payload=");
    expect(request.url).to.contain(
      "iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344"
    );
  });

  it("should include adType in payload when present in BID_WON event", function () {
    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });
    const bidWonEvent = { ...getWonRequest(), mediaType: "video" };

    events.emit(EVENTS.BID_WON, bidWonEvent);

    const request = server.requests[0];
    const urlParams = new URL(request.url);
    const payloadEncoded = urlParams.searchParams.get("payload");
    const payloadDecoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    expect(server.requests.length).to.be.above(0);
    expect(payloadDecoded).to.have.property("adType", bidWonEvent.mediaType);
  });

  it("should include adType in payload when present in reportExternalWin event", function () {
    enableAnalyticWithSpecialOptions({ manualWinReportEnabled: true });
    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });
    const externalWinEvent = { cpm: 1, currency: "USD", adType: "banner" };

    events.emit(EVENTS.BID_REQUESTED);

    window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin(
      externalWinEvent
    );

    const request = server.requests[0];
    const urlParams = new URL(request.url);
    const payloadEncoded = urlParams.searchParams.get("payload");
    const payloadDecoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    expect(server.requests.length).to.be.above(0);
    expect(payloadDecoded).to.have.property("adType", externalWinEvent.adType);
  });

  it("should get pos from pbjs.adUnits when BID_WON has no pos", function () {
    const pbjs = getGlobal();
    const prevAdUnits = pbjs.adUnits;

    pbjs.adUnits = Array.isArray(pbjs.adUnits) ? pbjs.adUnits : [];
    pbjs.adUnits.push({ code: "myVideoAdUnit", mediaTypes: { video: { pos: 777 } } });

    enableAnalyticWithSpecialOptions({ manualWinReportEnabled: false });

    events.emit(EVENTS.BID_WON, {
      ...getWonRequest(),
      adUnitCode: "myVideoAdUnit",
      mediaType: "video"
    });

    const request = server.requests[0];
    const payloadEncoded = new URL(request.url).searchParams.get("payload");
    const payloadDecoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    expect(payloadDecoded.pos).to.equal(777);

    pbjs.adUnits = prevAdUnits;
  });

  it("should get pos from reportExternalWin when present", function () {
    enableAnalyticWithSpecialOptions({ manualWinReportEnabled: true });

    const winPos = 999;

    window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin({
      adUnitCode: "myVideoAdUnit",
      bidderCode: "appnexus",
      cpm: 1.5,
      currency: "USD",
      mediaType: "video",
      size: "300x250",
      status: "rendered",
      auctionId: "auc123",
      pos: winPos
    });

    const request = server.requests[0];
    const payloadEncoded = new URL(request.url).searchParams.get("payload");
    const payloadDecoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    expect(payloadDecoded.pos).to.equal(winPos);
  });

  it("should initialize with default configurations", function () {
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized).to.be
      .false;
  });

  it("should handle BID_WON event with group configuration from local storage", function () {
    window[`iiq_identity_${partner}`].firstPartyData = {
      ...window[`iiq_identity_${partner}`].firstPartyData,
      group: "B",
    };

    const expectedVrref = encodeURIComponent("http://localhost:9876/");

    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain(
      "https://reports.intentiq.com/report?pid=" + partner + "&mct=1"
    );
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(request.url).to.contain(`&vrref=${expectedVrref}`);
  });

  it("should handle BID_WON event with default group configuration", function () {
    const spdData = "server provided data";
    const expectedSpdEncoded = encodeURIComponent(spdData);
    window[identityName].partnerData.spd = spdData;
    const wonRequest = getWonRequest();

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    restoreReportList();
    const dataToSend = preparePayload(wonRequest);
    const base64String = btoa(JSON.stringify(dataToSend));
    const payload = encodeURIComponent(JSON.stringify([base64String]));
    const expectedUrl = appendVrrefAndFui(
      REPORT_ENDPOINT +
      `?pid=${partner}&mct=1&iiqid=${defaultIdentityObject.firstPartyData.pcid}&agid=${REPORTER_ID}&jsver=${version}&source=pbjs&uh=${encodeURIComponent(window[identityName].clientHints)}&gdpr=0&spd=${expectedSpdEncoded}`,
      iiqAnalyticsAnalyticsAdapter.initOptions.domainName
    );
    const urlWithPayload = expectedUrl + `&payload=${payload}`;

    expect(request.url).to.equal(urlWithPayload);
    expect(dataToSend.pcid).to.equal(defaultIdentityObject.firstPartyData.pcid);
  });

  it("should send CMP data in report if available", function () {
    const uspData = "1NYN";
    const gppData = { gppString: '{"key1":"value1","key2":"value2"}' };
    const gdprData = { consentString: "gdprConsent" };

    const gppStub = sinon
      .stub(gppDataHandler, "getConsentData")
      .returns(gppData);
    const uspStub = sinon
      .stub(uspDataHandler, "getConsentData")
      .returns(uspData);
    const gdprStub = sinon
      .stub(gdprDataHandler, "getConsentData")
      .returns(gdprData);

    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });

    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];

    expect(request.url).to.contain(
      `&us_privacy=${encodeURIComponent(uspData)}`
    );
    expect(request.url).to.contain(
      `&gpp=${encodeURIComponent(gppData.gppString)}`
    );
    expect(request.url).to.contain(
      `&gdpr_consent=${encodeURIComponent(gdprData.consentString)}`
    );
    expect(request.url).to.contain(`&gdpr=1`);
    gppStub.restore();
    uspStub.restore();
    gdprStub.restore();
  });

  regionCases.forEach(({ name, region, expectedEndpoint }) => {
    it(`should send request to region-specific report endpoint when region is "${name}"`, function () {
      userIdConfigForTest = getUserConfigWithReportingServerAddress();
      getConfigStub = sinon.stub(config, "getConfig");
      getConfigStub.withArgs("userSync.userIds").callsFake(() => userIdConfigForTest);

      enableAnalyticWithSpecialOptions({ region });

      events.emit(EVENTS.BID_WON, getWonRequest());

      expect(server.requests.length).to.be.above(0);
      const request = server.requests[0];
      expect(request.url).to.contain(expectedEndpoint);
    });
  });

  it("should not send request if manualWinReportEnabled is true", function () {
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = true;
    events.emit(EVENTS.BID_WON, getWonRequest());
    expect(server.requests.length).to.equal(0);
  });

  it("should handle initialization values from local storage", function () {
    window[`iiq_identity_${partner}`].actualABGroup = WITHOUT_IIQ;

    events.emit(EVENTS.BID_WON, getWonRequest());
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup).to.equal(
      WITHOUT_IIQ
    );
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.fpid).to.be.not.null;
  });

  it("should handle reportExternalWin", function () {
    events.emit(EVENTS.BID_REQUESTED);
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = false;
    expect(
      window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin
    ).to.be.a("function");
    expect(
      window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin({
        cpm: 1,
        currency: "USD",
      })
    ).to.equal(false);
  });

  it("should return window.location.href when window.self === window.top", function () {
    // Stub helper functions
    getWindowSelfStub = sinon.stub(utils, "getWindowSelf").returns(window);
    getWindowTopStub = sinon.stub(utils, "getWindowTop").returns(window);
    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });

    const referrer = getCurrentUrl();
    expect(referrer).to.equal("http://localhost:9876/");
  });

  it("should return window.top.location.href when window.self !== window.top and access is successful", function () {
    // Stub helper functions to simulate iframe
    getWindowSelfStub = sinon.stub(utils, "getWindowSelf").returns({});
    getWindowTopStub = sinon
      .stub(utils, "getWindowTop")
      .returns({ location: { href: "http://example.com/" } });

    const referrer = getCurrentUrl();

    expect(referrer).to.equal("http://example.com/");
  });

  it("should return an empty string and log an error when accessing window.top.location.href throws an error", function () {
    // Stub helper functions to simulate error
    getWindowSelfStub = sinon.stub(utils, "getWindowSelf").returns({});
    getWindowTopStub = sinon
      .stub(utils, "getWindowTop")
      .throws(new Error("Access denied"));

    const referrer = getCurrentUrl();
    expect(referrer).to.equal("");
    expect(logErrorStub.calledOnce).to.be.true;
    expect(logErrorStub.firstCall.args[0]).to.contain(
      "Error accessing location: Error: Access denied"
    );
  });

  it("should not send request if the browser is in blacklist (chrome)", function () {
    enableAnalyticWithSpecialOptions({
      browserBlackList: "ChrOmE"
    })
    detectBrowserStub = sinon
      .stub(detectBrowserUtils, "detectBrowser")
      .returns("chrome");

    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.equal(0);
  });

  it("should send request if the browser is not in blacklist (safari)", function () {
    enableAnalyticWithSpecialOptions({
      browserBlackList: "chrome,firefox"
    })

    detectBrowserStub = sinon
      .stub(detectBrowserUtils, "detectBrowser")
      .returns("safari");

    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain(
      `https://reports.intentiq.com/report?pid=${partner}&mct=1`
    );
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(request.url).to.contain(
      `&vrref=${encodeURIComponent("http://localhost:9876/")}`
    );
    expect(request.url).to.contain("&payload=");
    expect(request.url).to.contain(
      "iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344"
    );
  });

  it("should send request in reportingServerAddress no gdpr", function () {
    detectBrowserStub = sinon
      .stub(detectBrowserUtils, "detectBrowser")
      .returns("safari");
    enableAnalyticWithSpecialOptions({
      reportingServerAddress: REPORT_SERVER_ADDRESS,
      browserBlackList: "chrome,firefox"
    });

    events.emit(EVENTS.BID_WON, getWonRequest());

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain(REPORT_SERVER_ADDRESS);
  });

  it("should include source parameter in report URL", function () {
    events.emit(EVENTS.BID_WON, getWonRequest());
    const request = server.requests[0];

    expect(server.requests.length).to.be.above(0);
    expect(request.url).to.include(`&source=${PREBID}`);
  });

  it("should send additionalParams in report if valid and small enough", function () {
    enableAnalyticWithSpecialOptions({
      additionalParams: [
        {
          parameterName: "general",
          parameterValue: "Lee",
          destination: [0, 0, 1],
        },
      ]
    })

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];
    expect(request.url).to.include("general=Lee");
  });

  it("should include domainName in both query and payload when fullUrl is empty (cross-origin)", function () {
    const domainName = "mydomain-frame.com";

    enableAnalyticWithSpecialOptions({ domainName });

    getWindowTopStub = sinon.stub(utils, "getWindowTop").throws(new Error("cross-origin"));

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];

    // Query contain vrref=domainName
    const parsedUrl = new URL(request.url);
    const vrrefParam = parsedUrl.searchParams.get("vrref");

    // Payload contain vrref=domainName
    const payloadEncoded = parsedUrl.searchParams.get("payload");
    const payloadDecoded = JSON.parse(atob(JSON.parse(payloadEncoded)[0]));

    expect(server.requests.length).to.be.above(0);
    expect(vrrefParam).to.not.equal(null);
    expect(decodeURIComponent(vrrefParam)).to.equal(domainName);
    expect(parsedUrl.searchParams.get("fui")).to.equal("1");

    expect(payloadDecoded).to.have.property("vrref");
    expect(decodeURIComponent(payloadDecoded.vrref)).to.equal(domainName);

    restoreReportList();
  });

  it("should not send additionalParams in report if value is too large", function () {
    const longVal = "x".repeat(5000000);

    enableAnalyticWithSpecialOptions({
      additionalParams: [
        {
          parameterName: "general",
          parameterValue: longVal,
          destination: [0, 0, 1],
        },
      ]
    })

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];
    expect(request.url).not.to.include("general");
  });

  it("should include spd parameter from LS in report URL", function () {
    const spdObject = { foo: "bar", value: 42 };
    const expectedSpdEncoded = encodeURIComponent(JSON.stringify(spdObject));
    window[identityName].firstPartyData.spd =
      JSON.stringify(spdObject);
    window[identityName].partnerData.spd = spdObject;

    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];

    expect(server.requests.length).to.be.above(0);
    expect(request.url).to.include(`&spd=${expectedSpdEncoded}`);
  });

  it("should include spd parameter string from LS in report URL", function () {
    const spdData = "server provided data";
    const expectedSpdEncoded = encodeURIComponent(spdData);
    window[identityName].partnerData.spd = spdData;

    getWindowLocationStub = sinon
      .stub(utils, "getWindowLocation")
      .returns({ href: "http://localhost:9876/" });

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];

    expect(server.requests.length).to.be.above(0);
    expect(request.url).to.include(`&spd=${expectedSpdEncoded}`);
  });

  describe("GAM prediction reporting", function () {
    function createMockGAM() {
      const listeners = {};
      return {
        cmd: [],
        pubads: () => ({
          addEventListener: (name, cb) => {
            listeners[name] = cb;
          },
        }),
        _listeners: listeners,
      };
    }

    it("should subscribe to GAM and send report on slotRenderEnded without prior bidWon", function () {
      const gam = createMockGAM();

      enableAnalyticWithSpecialOptions({
        gamObjectReference: gam
      })

      // enable subscription by LS flag
      window[`iiq_identity_${partner}`].partnerData.gpr = true;

      // provide recent auctionEnd with matching bid to enrich payload
      events.getEvents.restore();
      sinon.stub(events, "getEvents").returns([
        {
          eventType: "auctionEnd",
          args: {
            auctionId: "auc-1",
            adUnitCodes: ["ad-unit-1"],
            bidsReceived: [
              {
                bidder: "pubmatic",
                adUnitCode: "ad-unit-1",
                cpm: 1,
                currency: "USD",
                originalCpm: 1,
                originalCurrency: "USD",
                status: "rendered",
              },
            ],
          },
        },
      ]);

      // trigger adapter to subscribe
      events.emit(EVENTS.BID_REQUESTED);

      // execute GAM cmd to register listener
      gam.cmd.forEach((fn) => fn());

      // simulate slotRenderEnded
      const slot = {
        getSlotElementId: () => "ad-unit-1",
        getAdUnitPath: () => "/123/foo",
        getTargetingKeys: () => ["hb_bidder", "hb_adid"],
        getTargeting: (k) =>
          k === "hb_bidder" ? ["pubmatic"] : k === "hb_adid" ? ["ad123"] : [],
      };
      if (gam._listeners["slotRenderEnded"]) {
        gam._listeners["slotRenderEnded"]({ isEmpty: false, slot });
      }

      expect(server.requests.length).to.be.above(0);
    });

    it("should NOT send report if a matching bidWon already exists", function () {
      const gam = createMockGAM();

      localStorage.setItem(
        FIRST_PARTY_KEY + "_" + partner,
        JSON.stringify({ gpr: true })
      );

      // provide prior bidWon matching placementId and hb_adid
      events.getEvents.restore();
      sinon
        .stub(events, "getEvents")
        .returns([
          { eventType: "bidWon", args: { adId: "ad123" }, id: "ad-unit-1" },
        ]);

      events.emit(EVENTS.BID_REQUESTED);
      gam.cmd.forEach((fn) => fn());

      const slot = {
        getSlotElementId: () => "ad-unit-1",
        getAdUnitPath: () => "/123/foo",
        getTargetingKeys: () => ["hb_bidder", "hb_adid"],
        getTargeting: (k) =>
          k === "hb_bidder" ? ["pubmatic"] : k === "hb_adid" ? ["ad123"] : [],
      };

      const initialRequests = server.requests.length;
      if (gam._listeners["slotRenderEnded"]) {
        gam._listeners["slotRenderEnded"]({ isEmpty: false, slot });
      }
      expect(server.requests.length).to.equal(initialRequests);
    });
  });

  const testCasesVrref = [
    {
      description: "domainName matches window.top.location.href",
      getWindowSelf: {},
      getWindowTop: { location: { href: "http://example.com/page" } },
      getWindowLocation: { href: "http://example.com/page" },
      domainName: "example.com",
      expectedVrref: encodeURIComponent("http://example.com/page"),
      shouldContainFui: false,
    },
    {
      description: "domainName does not match window.top.location.href",
      getWindowSelf: {},
      getWindowTop: { location: { href: "http://anotherdomain.com/page" } },
      getWindowLocation: { href: "http://anotherdomain.com/page" },
      domainName: "example.com",
      expectedVrref: encodeURIComponent("example.com"),
      shouldContainFui: false,
    },
    {
      description: "domainName is missing, only fui=1 is returned",
      getWindowSelf: {},
      getWindowTop: { location: { href: "" } },
      getWindowLocation: { href: "" },
      domainName: null,
      expectedVrref: "",
      shouldContainFui: true,
    },
    {
      description: "domainName is missing",
      getWindowSelf: {},
      getWindowTop: { location: { href: "http://example.com/page" } },
      getWindowLocation: { href: "http://example.com/page" },
      domainName: null,
      expectedVrref: encodeURIComponent("http://example.com/page"),
      shouldContainFui: false,
    },
  ];

  testCasesVrref.forEach(
    ({
      description,
      getWindowSelf,
      getWindowTop,
      getWindowLocation,
      domainName,
      expectedVrref,
      shouldContainFui,
    }) => {
      it(`should append correct vrref when ${description}`, function () {
        getWindowSelfStub = sinon
          .stub(utils, "getWindowSelf")
          .returns(getWindowSelf);
        getWindowTopStub = sinon
          .stub(utils, "getWindowTop")
          .returns(getWindowTop);
        getWindowLocationStub = sinon
          .stub(utils, "getWindowLocation")
          .returns(getWindowLocation);

        const url = "https://reports.intentiq.com/report?pid=10";
        const modifiedUrl = appendVrrefAndFui(url, domainName);
        const urlObj = new URL(modifiedUrl);

        const vrref = encodeURIComponent(
          urlObj.searchParams.get("vrref") || ""
        );
        const fui = urlObj.searchParams.get("fui");

        expect(vrref).to.equal(expectedVrref);
        expect(urlObj.searchParams.has("fui")).to.equal(shouldContainFui);
        if (shouldContainFui) {
          expect(fui).to.equal("1");
        }
      });
    }
  );

  const adUnitConfigTests = [
    {
      adUnitConfig: 1,
      description: "should extract adUnitCode first (adUnitConfig = 1)",
      event: { adUnitCode: "adUnitCode-123", placementId: "placementId-456" },
      expectedPlacementId: "adUnitCode-123",
    },
    {
      adUnitConfig: 1,
      description:
        "should extract placementId if there is no adUnitCode (adUnitConfig = 1)",
      event: { placementId: "placementId-456" },
      expectedPlacementId: "placementId-456",
    },
    {
      adUnitConfig: 2,
      description: "should extract placementId first (adUnitConfig = 2)",
      event: { adUnitCode: "adUnitCode-123", placementId: "placementId-456" },
      expectedPlacementId: "placementId-456",
    },
    {
      adUnitConfig: 2,
      description:
        "should extract adUnitCode if there is no placementId (adUnitConfig = 2)",
      event: { adUnitCode: "adUnitCode-123" },
      expectedPlacementId: "adUnitCode-123",
    },
    {
      adUnitConfig: 3,
      description: "should extract only adUnitCode (adUnitConfig = 3)",
      event: { adUnitCode: "adUnitCode-123", placementId: "placementId-456" },
      expectedPlacementId: "adUnitCode-123",
    },
    {
      adUnitConfig: 4,
      description: "should extract only placementId (adUnitConfig = 4)",
      event: { adUnitCode: "adUnitCode-123", placementId: "placementId-456" },
      expectedPlacementId: "placementId-456",
    },
    {
      adUnitConfig: 1,
      description:
        "should return empty placementId if neither adUnitCode or placementId exist",
      event: {},
      expectedPlacementId: "",
    },
    {
      adUnitConfig: 1,
      description:
        "should extract placementId from params array if no top-level adUnitCode or placementId exist (adUnitConfig = 1)",
      event: {
        params: [{ someKey: "value" }, { placementId: "nested-placementId" }],
      },
      expectedPlacementId: "nested-placementId",
    },
  ];

  adUnitConfigTests.forEach(
    ({ adUnitConfig, description, event, expectedPlacementId }) => {
      it(description, function () {
        enableAnalyticWithSpecialOptions({ adUnitConfig });

        const testEvent = { ...getWonRequest(), ...event };
        events.emit(EVENTS.BID_WON, testEvent);

        const request = server.requests[0];
        const urlParams = new URL(request.url);
        const encodedPayload = urlParams.searchParams.get("payload");
        const decodedPayload = JSON.parse(atob(JSON.parse(encodedPayload)[0]));

        expect(server.requests.length).to.be.above(0);
        expect(encodedPayload).to.exist;
        expect(decodedPayload).to.have.property(
          "placementId",
          expectedPlacementId
        );
      });
    }
  );

  it("should include ABTestingConfigurationSource in payload when provided", function () {
    const ABTestingConfigurationSource = "percentage";
    enableAnalyticWithSpecialOptions({ ABTestingConfigurationSource });

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];
    const urlParams = new URL(request.url);
    const encodedPayload = urlParams.searchParams.get("payload");
    const decodedPayload = JSON.parse(atob(JSON.parse(encodedPayload)[0]));

    expect(server.requests.length).to.be.above(0);
    expect(decodedPayload).to.have.property(
      "ABTestingConfigurationSource",
      ABTestingConfigurationSource
    );
  });

  it("should not include ABTestingConfigurationSource in payload when not provided", function () {
    enableAnalyticWithSpecialOptions({});

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];
    const urlParams = new URL(request.url);
    const encodedPayload = urlParams.searchParams.get("payload");
    const decodedPayload = JSON.parse(atob(JSON.parse(encodedPayload)[0]));

    expect(server.requests.length).to.be.above(0);
    expect(decodedPayload).to.not.have.property("ABTestingConfigurationSource");
  });

  it("should use group from provided options when ABTestingConfigurationSource is 'group'", function () {
    const providedGroup = WITHOUT_IIQ;
    // Ensure actualABGroup is not set so group from options is used
    delete window[`iiq_identity_${partner}`].actualABGroup;

    enableAnalyticWithSpecialOptions({
      group: providedGroup,
      ABTestingConfigurationSource: AB_CONFIG_SOURCE.GROUP,
    });

    events.emit(EVENTS.BID_WON, getWonRequest());

    const request = server.requests[0];
    const urlParams = new URL(request.url);
    const encodedPayload = urlParams.searchParams.get("payload");
    const decodedPayload = JSON.parse(atob(JSON.parse(encodedPayload)[0]));

    expect(server.requests.length).to.be.above(0);
    // Verify that the group from options is used in the payload
    expect(decodedPayload).to.have.property("abGroup", providedGroup);
  });
});
