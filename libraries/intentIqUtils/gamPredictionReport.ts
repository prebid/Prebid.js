import { getEvents } from '../../src/events.js';
import { logError } from '../../src/utils.js';
import { getSlotTargetingMap } from '../../src/utils/gptTargeting.js';

export function gamPredictionReport(
  gamObjectReference: any,
  sendData: (data: Record<string, any>) => void
): void {
  try {
    if (!gamObjectReference || !sendData) {
      logError('Failed to get gamPredictionReport, required data is missed');
      return;
    }

    const getSlotTargeting = (slot: any): Record<string, string[]> => {
      try {
        return getSlotTargetingMap(slot);
      } catch (e) {
        logError('Failed to get slot targeting: ' + e);
        return {};
      }
    };

    const extractWinData = (gamEvent: any): Record<string, any> | undefined => {
      const slot = gamEvent.slot;
      const targeting = getSlotTargeting(slot);

      const dataToSend: Record<string, any> = {
        placementId: slot.getSlotElementId && slot.getSlotElementId(),
        adUnitPath: slot.getAdUnitPath && slot.getAdUnitPath(),
        bidderCode: targeting.hb_bidder ? targeting.hb_bidder[0] : null,
        biddingPlatformId: 5
      };

      if (dataToSend.placementId) {
        // TODO check auto subscription to prebid events
        const bidWonEvents = getEvents().filter((ev: any) => ev.eventType === 'bidWon');
        if (bidWonEvents.length) {
          for (let i = bidWonEvents.length - 1; i >= 0; i--) {
            const element = bidWonEvents[i];
            if (
              dataToSend.placementId === element.id &&
              targeting.hb_adid &&
              targeting.hb_adid[0] === (element.args as any).adId
            ) {
              return;
            }
          }
        }

        const endEvents = getEvents().filter((ev: any) => ev.eventType === 'auctionEnd');

        if (endEvents.length) {
          for (let i = endEvents.length - 1; i >= 0; i--) {
            const element = endEvents[i];

            if ((element.args as any)?.adUnitCodes?.includes(dataToSend.placementId)) {
              const defineRelevantData = (bid: any): void => {
                dataToSend.cpm = bid.cpm + 0.01;
                dataToSend.currency = bid.currency;
                dataToSend.originalCpm = bid.originalCpm;
                dataToSend.originalCurrency = bid.originalCurrency;
                dataToSend.status = bid.status;
                dataToSend.prebidAuctionId = (element.args as any)?.auctionId;

                if (!dataToSend.bidderCode) {
                  dataToSend.bidderCode = 'GAM';
                }
              };

              if (dataToSend.bidderCode) {
                const relevantBid = (element.args as any)?.bidsReceived.find(
                  (item: any) =>
                    item.bidder === dataToSend.bidderCode &&
                    item.adUnitCode === dataToSend.placementId
                );

                if (relevantBid) {
                  defineRelevantData(relevantBid);
                  break;
                }
              } else {
                let highestBid = 0;

                (element.args as any)?.bidsReceived.forEach((bid: any) => {
                  if (
                    bid.adUnitCode === dataToSend.placementId &&
                    bid.cpm > highestBid
                  ) {
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
      gamObjectReference.pubads().addEventListener(
        'slotRenderEnded',
        (event: any) => {
          if (event.isEmpty) return;

          const data = extractWinData(event);
          if (data) {
            sendData(data);
          }
        }
      );
    });
  } catch (error) {
    logError('Failed to subscribe to GAM: ' + error);
  }
}
