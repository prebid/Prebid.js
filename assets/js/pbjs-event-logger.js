var eventLogger = {};

var initTime = new Date().getTime();

var pbjsLog = {
    'loadPBJS': {
        displayName: 'Load Prebid.js'
    },
    'timer': {
        displayName: 'Adserver Timer'
    },
    'bids': [
    ],
    'loadGPT': {
        displayName: 'Load GPT(DFP)'
    },
    'targeting': {
        displayName: 'Set Targeting'
    }
}

eventLogger.logEventTime = function(eventCode, action) {
    if (!(eventCode in pbjsLog)) {
        alert('no event found');
        return;
    }
    var event = pbjsLog[eventCode];
    event[action] = new Date().getTime() - initTime;
};

eventLogger.logBidsLatency = function() {
    pbjs.que.push(function() {
        var bidRes = pbjs.getBidResponses();
        for (var code in bidRes) break;

        var bids = bidRes[code].bids;
        //alert(bids);
        for (var i in bids) {
            var bid = bids[i];
            //alert(JSON.stringify(bid));
            var bidEvent = {};
            var id = parseInt(i) + 1;
            bidEvent['displayName'] = 'Bid ' + id;
            bidEvent['start'] = bid.requestTimestamp - initTime;
            bidEvent['end'] = bid.responseTimestamp - initTime;
            bidEvent['cpm'] = bid.cpm;

            pbjsLog.bids.push(bidEvent);
        }
    });
};

eventLogger.submitLogToParent = function() {
    setTimeout(function() {
        eventLogger.logBidsLatency();
        window.top.drawLog(pbjsLog, (new Date().getTime() - initTime));
    }, 500);
};