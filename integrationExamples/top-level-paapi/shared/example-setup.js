// intercept navigator.runAdAuction and print parameters to console
(() => {
  var originalRunAdAuction = navigator.runAdAuction;
  navigator.runAdAuction = function (...args) {
    console.log('%c runAdAuction', 'background: cyan; border: 2px; border-radius: 3px', ...args);
    return originalRunAdAuction.apply(navigator, args);
  };
})();
init();
setupContextualResponse();

function addExampleControls(requestBids) {
  const ctl = document.createElement('div');
  ctl.innerHTML = `
    <span style="border: 1px solid lightgray; border-radius: 5px; padding: 10px">
       Simulate contextual bid:
        <input class="cpm" type="number" style="width: 3.5em; text-align: right" value="1"/>
        CPM
        <button class="bid" style="margin-left: 0.5em">BID</button>
    </span>
  `;
  ctl.style = 'margin-top: 30px';
  document.body.appendChild(ctl);
  ctl.querySelector('.bid').addEventListener('click', function (ev) {
    const cpm = ctl.querySelector('.cpm').value;
    if (cpm) {
      setupContextualResponse(parseInt(cpm, 10));
    }
    requestBids();
  });
}

function init() {
  window.pbjs = window.pbjs || {que: []};
  window.pbjs.que.push(() => {
    pbjs.aliasBidder('optable', 'contextual');
    [
      'auctionInit',
      'auctionTimeout',
      'auctionEnd',
      'bidAdjustment',
      'bidTimeout',
      'bidRequested',
      'bidResponse',
      'bidRejected',
      'noBid',
      'seatNonBid',
      'bidWon',
      'bidderDone',
      'bidderError',
      'setTargeting',
      'beforeRequestBids',
      'beforeBidderHttp',
      'requestBids',
      'addAdUnits',
      'adRenderFailed',
      'adRenderSucceeded',
      'tcf2Enforcement',
      'auctionDebug',
      'bidViewable',
      'staleRender',
      'billableEvent',
      'bidAccepted',
      'paapiRunAuction',
      'paapiBid',
      'paapiNoBid',
      'paapiError',
    ].forEach(evt => {
      pbjs.onEvent(evt, (arg) => {
        console.log('Event:', evt, arg);
      })
    });
  });
}

function setupContextualResponse(cpm = 1) {
  pbjs.que.push(() => {
    pbjs.setConfig({
      debugging: {
        enabled: true,
        intercept: [
          {
            when: {
              bidder: 'contextual'
            },
            then: {
              cpm,
              currency: 'USD'
            }
          }
        ]
      }
    });
  });
}
