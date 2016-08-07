export const pbjsTestOnly = {

  getAdUnits() {
    return $$PREBID_GLOBAL$$.adUnits;
  },

  clearAllAdUnits() {
    $$PREBID_GLOBAL$$.adUnits = [];
  },

  clearLastTimeout(){
    for(var i=$$PREBID_GLOBAL$$._bidsReceived.length-1;i>=0;i--){
      if($$PREBID_GLOBAL$$._bidsReceived[i].getStatusCode && $$PREBID_GLOBAL$$._bidsReceived[i].getStatusCode() == 3){
        $$PREBID_GLOBAL$$._bidsReceived.splice(i,1);
      }else{
        break;
      }
    }
  },
  popLastReceivedBid(){
    this.clearLastTimeout();
    return $$PREBID_GLOBAL$$._bidsReceived.pop();
  }
};
