import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';

const {
  EVENTS: { BID_REQUESTED, BID_TIMEOUT, BID_RESPONSE, BID_WON }
} = CONSTANTS;

const prebidVersion = '$prebid.version$';

const adapterConfig = {
  /** Name of the `rta` function, override only when instructed. */
  rtaFunctionName: 'rta',

  /** This is optional but highly recommended. The value returned by the
   *  function will be used as ad impression ad unit attribute value.
   *
   *  As such if you have placement (10293845) or ad unit codes
   *  (div-gpt-ad-124984-0) but you want these to be translated to meaningful
   *  values like 'SIDEBAR-AD-01-MOBILE' then this function shall express this
   *  mapping.
   */
  getAdUnitName: function(placementOrAdUnitCode) {
    return placementOrAdUnitCode;
  },

  /**
   * Function used to extract placement/adUnitCode (depending on prebid version).
   *
   * The extracted value will be passed to the `getAdUnitName()` for mapping into
   * human friendly value.
   */
  getPlacementOrAdUnitCode: function(bid, version) {
    return version[0] === '0' ? bid.placementCode : bid.adUnitCode;
  },

  /**
   * Optional reference to Google Publisher Tag
   */
  googlePublisherTag: false,

  /**
   * Do not override unless instructed. Useful for testing. Allows to redefined
   * the event that triggers the ad impression event.
   */
  wireGooglePublisherTag: function(gpt, cb) {
    gpt.pubads().addEventListener('slotRenderEnded', function(event) {
      cb(event.slot);
    });
  },

  /**
   * Decides if the slot contains prebid ad impression or not.
   *
   * Required when when googlePublisherTag is defined.
   */
  isPrebidAdImpression: slot => {
    throw 'Required when googlePublisherTag is defined.';
  },

  getHighestPrebidAdImpressionPartner: (slot, version) => {
    throw 'Required when googlePublisherTag is defined.';
  },

  getHighestPrebidAdImpressionValue: (slot, version) => {
    throw 'Required when googlePublisherTag is defined.';
  },

  getAdUnitNameByGooglePublisherTagSlot: (slot, version) => {
    throw 'Required when googlePublisherTag is defined.';
  },

  postProcessResolution: (resolution, slot, hbPartner, hbValue, version) => {
    return resolution;
  }
};

const cpmToMicroUSD = v => (isNaN(v) ? 0 : Math.round(v * 1000));

const liveyield = Object.assign(adapter({ analyticsType: 'bundle' }), {
  track({ eventType, args }) {
    switch (eventType) {
      case BID_REQUESTED:
        args.bids.forEach(function(b) {
          window[adapterConfig.rtaFunctionName](
            'bidRequested',
            adapterConfig.getAdUnitName(
              adapterConfig.getPlacementOrAdUnitCode(b, prebidVersion)
            ),
            args.bidderCode
          );
        });
        break;
      case BID_RESPONSE:
        var cpm = args.statusMessage === 'Bid available' ? args.cpm : null;
        window[adapterConfig.rtaFunctionName](
          'addBid',
          adapterConfig.getAdUnitName(
            adapterConfig.getPlacementOrAdUnitCode(args, prebidVersion)
          ),
          args.bidder || 'unknown',
          cpmToMicroUSD(cpm),
          typeof args.bidder === 'undefined',
          args.statusMessage !== 'Bid available'
        );
        break;
      case BID_TIMEOUT:
        window[adapterConfig.rtaFunctionName]('biddersTimeout', args);
        break;
      case BID_WON:
        if (adapterConfig.googlePublisherTag) {
          break;
        }
        const ad = adapterConfig.getAdUnitName(
          adapterConfig.getPlacementOrAdUnitCode(args, prebidVersion)
        );
        if (!ad) {
          utils.logError(
            'Cannot find ad by unit name: ' +
              adapterConfig.getAdUnitName(
                adapterConfig.getPlacementOrAdUnitCode(args, prebidVersion)
              )
          );
          break;
        }
        if (!args.bidderCode || !args.cpm) {
          utils.logError('Bidder code or cpm is not valid');
          break;
        }
        window[adapterConfig.rtaFunctionName](
          'resolveSlot',
          adapterConfig.getAdUnitName(
            adapterConfig.getPlacementOrAdUnitCode(args, prebidVersion)
          ),
          {
            prebidWon: true,
            prebidPartner: args.bidderCode,
            prebidValue: cpmToMicroUSD(args.cpm)
          }
        );
        break;
    }
  }
});

liveyield.originEnableAnalytics = liveyield.enableAnalytics;

/**
 * Minimal valid config:
 *
 * ```
 * {
 *   provider: 'liveyield',
 *   options: {
 *      // will be provided by the LiveYield team
 *     customerId: 'UUID',
 *      // will be provided by the LiveYield team,
 *     customerName: 'Customer Name',
 *      // do NOT use window.location.host, use constant value
 *     customerSite: 'Fixed Site Name',
 *     // this is used to be inline with GA 'sessionizer' which closes the session on midnight (EST-time).
 *     sessionTimezoneOffset: '-300'
 *   }
 * }
 * ```
 */
liveyield.enableAnalytics = function(config) {
  if (!config || !config.provider || config.provider !== 'liveyield') {
    utils.logError('expected config.provider to equal liveyield');
    return;
  }
  if (!config.options) {
    utils.logError('options must be defined');
    return;
  }
  if (!config.options.customerId) {
    utils.logError('options.customerId is required');
    return;
  }
  if (!config.options.customerName) {
    utils.logError('options.customerName is required');
    return;
  }
  if (!config.options.customerSite) {
    utils.logError('options.customerSite is required');
    return;
  }
  if (!config.options.sessionTimezoneOffset) {
    utils.logError('options.sessionTimezoneOffset is required');
    return;
  }
  Object.assign(adapterConfig, config.options);
  if (typeof window[adapterConfig.rtaFunctionName] !== 'function') {
    utils.logError(
      `Function ${adapterConfig.rtaFunctionName} is not defined.` +
        `Make sure that LiveYield snippet in included before the Prebid Analytics configuration.`
    );
    return;
  }
  if (adapterConfig.googlePublisherTag) {
    adapterConfig.wireGooglePublisherTag(
      adapterConfig.googlePublisherTag,
      onSlotRenderEnded
    );
  }

  const additionalParams = {
    customerTimezone: config.options.customerTimezone,
    contentId: config.options.contentId,
    contentPart: config.options.contentPart,
    contentAuthor: config.options.contentAuthor,
    contentTitle: config.options.contentTitle,
    contentCategory: config.options.contentCategory,
    contentLayout: config.options.contentLayout,
    contentVariants: config.options.contentVariants,
    contentTimezone: config.options.contentTimezone,
    cstringDim1: config.options.cstringDim1,
    cstringDim2: config.options.cstringDim2,
    cintDim1: config.options.cintDim1,
    cintDim2: config.options.cintDim2,
    cintArrayDim1: config.options.cintArrayDim1,
    cintArrayDim2: config.options.cintArrayDim2,
    cuniqueStringMet1: config.options.cuniqueStringMet1,
    cuniqueStringMet2: config.options.cuniqueStringMet2,
    cavgIntMet1: config.options.cavgIntMet1,
    cavgIntMet2: config.options.cavgIntMet2,
    csumIntMet1: config.options.csumIntMet1,
    csumIntMet2: config.options.csumIntMet2
  };

  Object.keys(additionalParams).forEach(
    key => additionalParams[key] == null && delete additionalParams[key]
  );

  window[adapterConfig.rtaFunctionName](
    'create',
    config.options.customerId,
    config.options.customerName,
    config.options.customerSite,
    config.options.sessionTimezoneOffset,
    additionalParams
  );
  liveyield.originEnableAnalytics(config);
};

const addDfpDetails = (resolution, slot) => {
  const responseInformation = slot.getResponseInformation();
  if (responseInformation) {
    resolution.dfpAdvertiserId = responseInformation.advertiserId;
    resolution.dfpLineItemId = responseInformation.sourceAgnosticLineItemId;
    resolution.dfpCreativeId = responseInformation.creativeId;
  }
};

const addPrebidDetails = (resolution, slot) => {
  if (adapterConfig.isPrebidAdImpression(slot)) {
    resolution.prebidWon = true;
  }
  const highestPrebidAdImpPartner = adapterConfig.getHighestPrebidAdImpressionPartner(
    slot,
    prebidVersion
  );
  const highestPrebidAdImpValue = adapterConfig.getHighestPrebidAdImpressionPartner(
    slot,
    prebidVersion
  );
  if (highestPrebidAdImpPartner) {
    resolution.prebidPartner = highestPrebidAdImpPartner;
  }
  if (highestPrebidAdImpValue) {
    resolution.prebidValue = cpmToMicroUSD(highestPrebidAdImpValue);
  }
};

const onSlotRenderEnded = slot => {
  const resolution = { targetings: [] };

  addDfpDetails(resolution, slot);
  addPrebidDetails(resolution, slot);

  const resolutionToUse = adapterConfig.postProcessResolution(
    resolution,
    slot,
    resolution.highestPrebidAdImpPartner,
    resolution.highestPrebidAdImpValue,
    prebidVersion
  );

  window[adapterConfig.rtaFunctionName](
    'resolveSlot',
    adapterConfig.getAdUnitNameByGooglePublisherTagSlot(slot),
    resolutionToUse
  );
};

adaptermanager.registerAnalyticsAdapter({
  adapter: liveyield,
  code: 'liveyield'
});

export default liveyield;
