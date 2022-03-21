import { logError } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

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
   * Function used to extract placement/adUnitCode (depending on prebid
   * version).
   *
   * The extracted value will be passed to the `getAdUnitName()` for mapping into
   * human friendly value.
   */
  getPlacementOrAdUnitCode: function(bid, version) {
    return version[0] === '0' ? bid.placementCode : bid.adUnitCode;
  },

  /**
   * Optional reference to Google Publisher Tag (gpt)
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
   * Map which keeps BID_WON events. Keyed by adId property.
   */
  prebidWinnersCache: {},

  /**
   * Map which keeps all BID_RESPONSE events. Keyed by adId property.
   */
  prebidBidResponsesCache: {},

  /**
   * Decides if the GPT slot contains prebid ad impression or not.
   *
   * When BID_WON event is emitted adid is added to prebidWinnersCache,
   * then we check if prebidWinnersCache contains slot.hb_adid.
   *
   * This function is optional and used only when googlePublisherTag is provided.
   *
   * Default implementation uses slot's `hb_adid` targeting parameter.
   *
   * @param slot the gpt slot
   */
  isPrebidAdImpression: function(slot) {
    const hbAdIdTargeting = slot.getTargeting('hb_adid');
    if (hbAdIdTargeting.length > 0) {
      const hbAdId = hbAdIdTargeting[0];
      return typeof this.prebidWinnersCache[hbAdId] !== 'undefined';
    }
    return false;
  },

  /**
   * If isPrebidAdImpression decides that slot contain prebid ad impression,
   * this function should return prebids highest ad impression partner for that
   * slot.
   *
   * Default implementation uses slot's `hb_adid` targeting value to find
   * highest bid response and when present then returns `bidder`.
   *
   * @param instanceConfig merged analytics adapter instance configuration
   * @param slot the gpt slot for which the name of the highest bidder shall be
   * returned
   * @param version the version of the prebid.js library
   */
  getHighestPrebidAdImpressionPartner: function(instanceConfig, slot, version) {
    const bid = getHighestPrebidBidResponseBySlotTargeting(
      instanceConfig,
      slot,
      version
    );

    // this is bid response event has `bidder` while bid won has bidderCode property
    return bid ? bid.bidderCode || bid.bidder : null;
  },

  /**
   * If isPrebidAdImpression decides that slot contain prebid ad impression,
   * this function should return prebids highest ad impression value for that
   * slot.
   *
   * Default implementation uses slot's `hb_adid` targeting value to find
   * highest bid response and when present then returns `cpm`.
   *
   * @param instanceConfig merged analytics adapter instance configuration
   * @param slot the gpt slot for which the highest ad impression value shall be
   * returned
   * @param version the version of the prebid.js library
   */
  getHighestPrebidAdImpressionValue: function(instanceConfig, slot, version) {
    const bid = getHighestPrebidBidResponseBySlotTargeting(
      instanceConfig,
      slot,
      version
    );

    return bid ? bid.cpm : null;
  },

  /**
   * This function should return proper ad unit name for slot given as a
   * parameter. Unit names returned by this function should be meaningful, for
   * example 'FOO_728x90_TOP'. The values returned shall be inline with
   * `getAdUnitName`.
   *
   * Required when googlePublisherTag is defined.
   *
   * @param slot the gpt slot to translate into friendly name
   * @param version the version of the prebid.js library
   */
  getAdUnitNameByGooglePublisherTagSlot: (slot, version) => {
    throw 'Required when googlePublisherTag is defined.';
  },

  /**
   * Function used to prepare and return parameters provided to rta.
   * More information will be in docs given by LiveYield team.
   *
   * When googlePublisherTag is not provided, second parameter(slot) will always
   * equal null.
   *
   * @param resolution the original ad impression details
   * @param slot gpt slot, will be empty in pure Prebid.js-case (when
   *             googlePublisherTag is not provided)
   * @param hbPartner the name of the highest bidding partner
   * @param hbValue the value of the highest bid
   * @param version version of the prebid.js library
   */
  postProcessResolution: (resolution, slot, hbPartner, hbValue, version) => {
    return resolution;
  }
};

const cpmToMicroUSD = v => (isNaN(v) ? 0 : Math.round(v * 1000));

const getHighestPrebidBidResponseBySlotTargeting = function(
  instanceConfig,
  slot,
  version
) {
  const hbAdIdTargeting = slot.getTargeting('hb_adid');
  if (hbAdIdTargeting.length > 0) {
    const hbAdId = hbAdIdTargeting[0];
    return (
      instanceConfig.prebidWinnersCache[hbAdId] ||
      instanceConfig.prebidBidResponsesCache[hbAdId]
    );
  }
  return null;
};

const liveyield = Object.assign(adapter({ analyticsType: 'bundle' }), {
  track({ eventType, args }) {
    switch (eventType) {
      case BID_REQUESTED:
        args.bids.forEach(function(b) {
          try {
            window[liveyield.instanceConfig.rtaFunctionName](
              'bidRequested',
              liveyield.instanceConfig.getAdUnitName(
                liveyield.instanceConfig.getPlacementOrAdUnitCode(
                  b,
                  prebidVersion
                )
              ),
              args.bidderCode
            );
          } catch (e) {
            logError(e);
          }
        });
        break;
      case BID_RESPONSE:
        liveyield.instanceConfig.prebidBidResponsesCache[args.adId] = args;
        var cpm = args.statusMessage === 'Bid available' ? args.cpm : null;
        try {
          window[liveyield.instanceConfig.rtaFunctionName](
            'addBid',
            liveyield.instanceConfig.getAdUnitName(
              liveyield.instanceConfig.getPlacementOrAdUnitCode(
                args,
                prebidVersion
              )
            ),
            args.bidder || 'unknown',
            cpmToMicroUSD(cpm),
            typeof args.bidder === 'undefined',
            args.statusMessage !== 'Bid available'
          );
        } catch (e) {
          logError(e);
        }
        break;
      case BID_TIMEOUT:
        window[liveyield.instanceConfig.rtaFunctionName](
          'biddersTimeout',
          args
        );
        break;
      case BID_WON:
        liveyield.instanceConfig.prebidWinnersCache[args.adId] = args;
        if (liveyield.instanceConfig.googlePublisherTag) {
          break;
        }

        try {
          const ad = liveyield.instanceConfig.getAdUnitName(
            liveyield.instanceConfig.getPlacementOrAdUnitCode(
              args,
              prebidVersion
            )
          );
          if (!ad) {
            logError(
              'Cannot find ad by unit name: ' +
                liveyield.instanceConfig.getAdUnitName(
                  liveyield.instanceConfig.getPlacementOrAdUnitCode(
                    args,
                    prebidVersion
                  )
                )
            );
            break;
          }
          if (!args.bidderCode || !args.cpm) {
            logError('Bidder code or cpm is not valid');
            break;
          }
          const resolution = { targetings: [] };
          resolution.prebidWon = true;
          resolution.prebidPartner = args.bidderCode;
          resolution.prebidValue = cpmToMicroUSD(parseFloat(args.cpm));
          const resolutionToUse = liveyield.instanceConfig.postProcessResolution(
            resolution,
            null,
            resolution.prebidPartner,
            resolution.prebidValue,
            prebidVersion
          );
          window[liveyield.instanceConfig.rtaFunctionName](
            'resolveSlot',
            liveyield.instanceConfig.getAdUnitName(
              liveyield.instanceConfig.getPlacementOrAdUnitCode(
                args,
                prebidVersion
              )
            ),
            resolutionToUse
          );
        } catch (e) {
          logError(e);
        }
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
    logError('expected config.provider to equal liveyield');
    return;
  }
  if (!config.options) {
    logError('options must be defined');
    return;
  }
  if (!config.options.customerId) {
    logError('options.customerId is required');
    return;
  }
  if (!config.options.customerName) {
    logError('options.customerName is required');
    return;
  }
  if (!config.options.customerSite) {
    logError('options.customerSite is required');
    return;
  }
  if (!config.options.sessionTimezoneOffset) {
    logError('options.sessionTimezoneOffset is required');
    return;
  }
  liveyield.instanceConfig = Object.assign(
    { prebidWinnersCache: {}, prebidBidResponsesCache: {} },
    adapterConfig,
    config.options
  );

  if (typeof window[liveyield.instanceConfig.rtaFunctionName] !== 'function') {
    logError(
      `Function ${liveyield.instanceConfig.rtaFunctionName} is not defined.` +
        `Make sure that LiveYield snippet in included before the Prebid Analytics configuration.`
    );
    return;
  }
  if (liveyield.instanceConfig.googlePublisherTag) {
    liveyield.instanceConfig.wireGooglePublisherTag(
      liveyield.instanceConfig.googlePublisherTag,
      onSlotRenderEnded(liveyield.instanceConfig)
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

  window[liveyield.instanceConfig.rtaFunctionName](
    'create',
    config.options.customerId,
    config.options.customerName,
    config.options.customerSite,
    config.options.sessionTimezoneOffset,
    additionalParams
  );
  liveyield.originEnableAnalytics(config);
};

const onSlotRenderEnded = function(instanceConfig) {
  const addDfpDetails = (resolution, slot) => {
    const responseInformation = slot.getResponseInformation();
    if (responseInformation) {
      resolution.dfpAdvertiserId = responseInformation.advertiserId;
      resolution.dfpLineItemId = responseInformation.sourceAgnosticLineItemId;
      resolution.dfpCreativeId = responseInformation.creativeId;
    }
  };

  const addPrebidDetails = (resolution, slot) => {
    if (instanceConfig.isPrebidAdImpression(slot)) {
      resolution.prebidWon = true;
    }
    const highestPrebidAdImpPartner = instanceConfig.getHighestPrebidAdImpressionPartner(
      instanceConfig,
      slot,
      prebidVersion
    );
    const highestPrebidAdImpValue = instanceConfig.getHighestPrebidAdImpressionValue(
      instanceConfig,
      slot,
      prebidVersion
    );
    if (highestPrebidAdImpPartner) {
      resolution.prebidPartner = highestPrebidAdImpPartner;
    }
    if (highestPrebidAdImpValue) {
      resolution.prebidValue = cpmToMicroUSD(
        parseFloat(highestPrebidAdImpValue)
      );
    }
  };
  return slot => {
    const resolution = { targetings: [] };

    addDfpDetails(resolution, slot);
    addPrebidDetails(resolution, slot);

    const resolutionToUse = instanceConfig.postProcessResolution(
      resolution,
      slot,
      resolution.highestPrebidAdImpPartner,
      resolution.highestPrebidAdImpValue,
      prebidVersion
    );
    window[instanceConfig.rtaFunctionName](
      'resolveSlot',
      instanceConfig.getAdUnitNameByGooglePublisherTagSlot(slot, prebidVersion),
      resolutionToUse
    );
  };
};

adapterManager.registerAnalyticsAdapter({
  adapter: liveyield,
  code: 'liveyield'
});

export default liveyield;
