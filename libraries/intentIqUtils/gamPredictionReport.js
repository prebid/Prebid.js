import { getEvents } from '../../src/events.js';
import { logError } from '../../src/utils.js';

export function gamPredictionReport (gamObjectReference, sendData) {
  try {
    if (!gamObjectReference || !sendData) logError('Failed to get gamPredictionReport, required data is missed');
    const getSlotTargeting = (slot) => {
      const kvs = {};
      try {
        (slot.getTargetingKeys() || []).forEach((k) => {
          kvs[k] = slot.getTargeting(k);
        });
      } catch (e) {
        logError('Failed to get targeting keys: ' + e);
      }
      return kvs;
    };

    const extractWinData = (gamEvent) => {
      const slot = gamEvent.slot;
      const targeting = getSlotTargeting(slot);

      const dataToSend = {
        placementId: slot.getSlotElementId && slot.getSlotElementId(),
        adUnitPath: slot.getAdUnitPath && slot.getAdUnitPath(),
        bidderCode: targeting.hb_bidder ? targeting.hb_bidder[0] : null,
        biddingPlatformId: 5
      };

      if (dataToSend.placementId) {
        // TODO check auto subscription to prebid events
        const bidWonEvents = getEvents().filter((ev) => ev.eventType === 'bidWon');
        if (bidWonEvents.length) {
          for (let i = bidWonEvents.length - 1; i >= 0; i--) {
            const element = bidWonEvents[i];
            if (
              dataToSend.placementId === element.id &&
                            targeting.hb_adid &&
                            targeting.hb_adid[0] === element.args.adId
            ) {
              return; // don't send report if there was bidWon event earlier
            }
          }
        }
        const endEvents = getEvents().filter((ev) => ev.eventType === 'auctionEnd');
        if (endEvents.length) {
          for (let i = endEvents.length - 1; i >= 0; i--) {
            // starting from the last event
            const element = endEvents[i];
            if (element.args?.adUnitCodes?.includes(dataToSend.placementId)) {
              const defineRelevantData = (bid) => {
                dataToSend.cpm = bid.cpm + 0.01; // add one cent to the cpm
                dataToSend.currency = bid.currency;
                dataToSend.originalCpm = bid.originalCpm;
                dataToSend.originalCurrency = bid.originalCurrency;
                dataToSend.status = bid.status;
                dataToSend.prebidAuctionId = element.args?.auctionId;
              };
              if (dataToSend.bidderCode) {
                const relevantBid = element.args?.bidsReceived.find(
                  (item) =>
                    item.bidder === dataToSend.bidderCode &&
                                        item.adUnitCode === dataToSend.placementId
                );
                if (relevantBid) {
                  defineRelevantData(relevantBid);
                  break;
                }
              } else {
                let highestBid = 0;
                element.args?.bidsReceived.forEach((bid) => {
                  if (bid.adUnitCode === dataToSend.placementId && bid.cpm > highestBid) {
                    highestBid = bid.cpm;
                    defineRelevantData(bid);
                  }
                });
                break;
              }
            }
          }
        }
      }
      return dataToSend;
    };
    gamObjectReference.cmd.push(() => {
      gamObjectReference.pubads().addEventListener('slotRenderEnded', (event) => {
        if (event.isEmpty) return;
        const data = extractWinData(event);
        if (data?.cpm) {
          sendData(data);
        }
      });
    });
  } catch (error) {
    this.logger.error('Failed to subscribe to GAM: ' + error);
  }
};
