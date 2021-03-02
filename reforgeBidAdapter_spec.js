import {
  expect
} from 'chai';
import {
  spec
} from 'modules/reforgeAdapterPrebid.js';

describe('The reforge adapter', function () {
  function getValidBidObject() {
    return {
      bidId: '2a23281f1dffa7',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      params: {
        {
           "id":"c33d3e84b93d4e2a44b4f22434ef99441678",
           "at":2,
           "tmax":410,
           "cur":[
              "USD"
           ],
           "bcat":[
              "IAB26",
              "IAB25",
              "IAB24"
           ],
           "imp":[
              {
                 "id":"1",
                 "instl":0,
                 "bidfloor":0,
                 "bidfloorcur":"USD",
                 "banner":{
                    "w":300,
                    "h":50,
                    "id":"1",
                    "btype":[
                       4
                    ],
                    "battr":[
                       8,
                       10
                    ],
                    "topframe":0,
                    "api":[
                       3,
                       5
                    ],
                    "pos":0
                 },
                 "banner1":{
                    "w":300,
                    "h":480,
                    "id":"1",
                    "btype":[
                       4
                    ],
                    "battr":[
                       8,
                       10
                    ],
                    "topframe":0,
                    "api":[
                       3,
                       5
                    ],
                    "pos":0
                 },
                 "secure":1
              }
           ],
           "site":{
              "id":"80862",
              "cat":[
                 "IAB15",
                 "IAB15-10"
              ],
              "publisher":{
                 "id":"80862"
              },
              "storeurl":"https://itunes.apple.com/app/id295646461"
           },
           "user":{
              "id":"3c098d88-3b09-42c2-86c2-954236d26a87"
           },
           "ext":{
              "udi":{
                 "idfa":"3c098d88-3b09-42c2-86c2-954236d26a86"
              },
              "fd":0,
              "utctimestamp":"1561101479962",
              "utcdatetime":"2019-06-21 07:17:59"
           }
        }

      }

    };
  };

  describe('isBidRequestValid', function () {
    var bid;

    beforeEach(function () {
      bid = getValidBidObject();
    });

    it('should succeed validation with all the right parameters', function () {
      expect(spec.isBidRequestValid(getValidBidObject())).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    var bid,
      bidRequestObj;

    beforeEach(function () {
      bid = getValidBidObject();
      bidRequestObj = {
        refererInfo: {
          referer: 'prebid.js'
        }
      };
    });

  describe('interpretResponse', function () {
    var serverResponse, bidderRequestObj;

    beforeEach(function () {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250]
                ]
              }
            },
            bidId: '2a23281f1dffa7',
            params: {
              {
                 "id":"c33d3e84b93d4e2a44b4f22434ef99441678",
                 "at":2,
                 "tmax":410,
                 "cur":[
                    "USD"
                 ],
                 "bcat":[
                    "IAB26",
                    "IAB25",
                    "IAB24"
                 ],
                 "imp":[
                    {
                       "id":"1",
                       "instl":0,
                       "bidfloor":0,
                       "bidfloorcur":"USD",
                       "banner":{
                          "w":300,
                          "h":50,
                          "id":"1",
                          "btype":[
                             4
                          ],
                          "battr":[
                             8,
                             10
                          ],
                          "topframe":0,
                          "api":[
                             3,
                             5
                          ],
                          "pos":0
                       },
                       "banner1":{
                          "w":300,
                          "h":480,
                          "id":"1",
                          "btype":[
                             4
                          ],
                          "battr":[
                             8,
                             10
                          ],
                          "topframe":0,
                          "api":[
                             3,
                             5
                          ],
                          "pos":0
                       },
                       "secure":1
                    }
                 ],
                 "site":{
                    "id":"80862",
                    "cat":[
                       "IAB15",
                       "IAB15-10"
                    ],
                    "publisher":{
                       "id":"80862"
                    },
                    "storeurl":"https://itunes.apple.com/app/id295646461"
                 },
                 "user":{
                    "id":"3c098d88-3b09-42c2-86c2-954236d26a87"
                 },
                 "ext":{
                    "udi":{
                       "idfa":"3c098d88-3b09-42c2-86c2-954236d26a86"
                    },
                    "fd":0,
                    "utctimestamp":"1561101479962",
                    "utcdatetime":"2019-06-21 07:17:59"
                 }
              }

            }
          }]
        }
      };

      serverResponse = {
        body: {
          "id": "c33d3e84b93d4e2a44b4f22434ef99441678",
          "seatbid": [
              {
                  "bid": [
                      {
                          "id": "1bced1bd81abe5653a9ca417d3b85ecc",
                          "impid": "1",
                          "price": 1.63,
                          "nurl": "https://usei.reforge.in/delivery/impress?zoneid=25742&buyerid=0011&type=banner&didmd5=&brand=&model=&tagid=40&ua=TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzcuMC4zODY1Ljc1IFNhZmFyaS81MzcuMzY=&os=linux&osv=&pubid=40&pubip=122.185.14.161&gaid=&pub_pack=chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop&pub_pub_id=&pub_pub_name=&imp_id=1&request_id=c33d3e84b93d4e2a44b4f22434ef99441678&extra3=99c0a5643275b4e80565e1595a1357ed&extra4=300&extra5=50&internal=1&winbid=${AUCTION_PRICE}&ap=2.00&BidFloor=0.00&imptime=1614152038&country=ind&city=ZGVsaGk=&region=ZGVsaGk=&payouttype=nurl",
                          "adm": "<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body><a href='https://usei.reforge.in/delivery/impress?zoneid=25742&buyerid=0011&type=banner&didmd5=&brand=&model=&tagid=40&ua=TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzcuMC4zODY1Ljc1IFNhZmFyaS81MzcuMzY=&os=linux&osv=&pubid=40&pubip=122.185.14.161&gaid=&pub_pack=chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop&pub_pub_id=&pub_pub_name=&imp_id=1&request_id=c33d3e84b93d4e2a44b4f22434ef99441678&extra3=99c0a5643275b4e80565e1595a1357ed&extra4=300&extra5=50&internal=1&winbid=0&ap=2.00&BidFloor=0.00&imptime=1614152038&country=ind&city=ZGVsaGk=&region=ZGVsaGk=&eventtype=click&tpt=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbQ==' target='_blank'><img border='0' src='https://rtbcdn.reforge.in/608/ce36cd51297e119cb0878897905fadf0.png'></a><img class='impression_trackers' src='' height='0' width='0' /><img class=\"impression_trackers\" src=\"https://usei.reforge.in/delivery/impress?zoneid=25742&buyerid=0011&type=banner&didmd5=&brand=&model=&tagid=40&ua=TW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzcuMC4zODY1Ljc1IFNhZmFyaS81MzcuMzY=&os=linux&osv=&pubid=40&pubip=122.185.14.161&gaid=&pub_pack=chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop&pub_pub_id=&pub_pub_name=&imp_id=1&request_id=c33d3e84b93d4e2a44b4f22434ef99441678&extra3=99c0a5643275b4e80565e1595a1357ed&extra4=300&extra5=50&internal=1&winbid=${AUCTION_PRICE}&ap=2.00&BidFloor=0.00&imptime=1614152038&country=ind&city=ZGVsaGk=&region=ZGVsaGk=\" height=\"0\" width=\"0\" /></body></html>",
                          "adid": "1bced1bd81abe5653a9ca417d3b85ecc",
                          "adomain": [
                              "reforge.in"
                          ],
                          "cid": "reforge_23477",
                          "crid": "reforge_25742",
                          "w": 300,
                          "h": 50,
                          "ext": {
                              "crtype": "HTML"
                          }
                      }
                  ],
                  "seat": "33"
              }
          ],
          "cur": "USD"
        }
      };
    });
  });
})