import {emitAdRenderFail, emitAdRenderSucceeded, handleRender} from '../../src/adRendering.js';
import {writeAd} from './writer.js';
import {auctionManager} from '../../src/auctionManager.js';
import CONSTANTS from '../../src/constants.json';
import {inIframe, insertElement} from '../../src/utils.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {EXCEPTION} from './constants.js';

export function renderAdDirect(doc, adId, options) {
  let bid;
  function cb(err) {
    if (err != null) {
      emitAdRenderFail(Object.assign({id: adId, bid}, err));
    } else {
      emitAdRenderSucceeded({doc, bid, adId})
    }
  }
  function renderFn(adData) {
    writeAd(adData, cb, doc);
    if (doc.defaultView && doc.defaultView.frameElement) {
      doc.defaultView.frameElement.width = adData.width;
      doc.defaultView.frameElement.height = adData.height;
    }
    // TODO: this is almost certainly the wrong way to do this
    const creativeComment = document.createComment(`Creative ${bid.creativeId} served by ${bid.bidder} Prebid.js Header Bidding`);
    insertElement(creativeComment, doc, 'html');
  }
  try {
    if (!adId || !doc) {
      // eslint-disable-next-line standard/no-callback-literal
      cb({
        reason: CONSTANTS.AD_RENDER_FAILED_REASON.MISSING_DOC_OR_ADID,
        message: `missing ${adId ? 'doc' : 'adId'}`
      });
    } else {
      bid = auctionManager.findBidByAdId(adId);

      if (FEATURES.VIDEO) {
        // TODO: could the video module implement this as a custom renderer, rather than a special case in here?
        const adUnit = bid && auctionManager.index.getAdUnit(bid);
        const videoModule = getGlobal().videoModule;
        if (adUnit?.video && videoModule) {
          videoModule.renderBid(adUnit.video.divId, bid);
          return;
        }
      }

      if ((doc === document && !inIframe())) {
        // eslint-disable-next-line standard/no-callback-literal
        cb({
          reason: CONSTANTS.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
          message: `renderAd was prevented from writing to the main document.`
        })
      } else {
        handleRender(renderFn, {adId, options: {clickUrl: options?.clickThrough}, bidResponse: bid, doc});
      }
    }
  } catch (e) {
    // eslint-disable-next-line standard/no-callback-literal
    cb({reason: EXCEPTION, message: e.message})
  }
}
