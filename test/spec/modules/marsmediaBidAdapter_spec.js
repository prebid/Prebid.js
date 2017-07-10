import { expect } from 'chai';
import bidManager from 'src/bidmanager';
import marsmediaBidAdapter from '../../../modules/marsmediaBidAdapter';
import CONSTANTS from 'src/constants.json';

describe('the marsmedia adapter', () => {
  let sandbox,
    bidderRequest;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    bidderRequest = {
      sizes: [[320, 50]],
      bids: [
        {
          bidder: 'marsmedia',
          publisherID: '77895',
          id: 'marsRtbTeam',
          params: {
            floor: 0
          }
        }
      ]
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids implementation', () => {
    let bids,
      server,
      addBidResponseAction,
      marsmediaAdapter;

    marsmediaAdapter = new marsmediaBidAdapter();

    beforeEach(() => {
      bids = [];

      server = sinon.fakeServer.create();

      sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
        bids.push(bid);
      });
    });

    afterEach(() => {
      server.restore();
    });

    it('should receive a valid request', () => {
      expect(bidderRequest).to.have.deep.property('sizes').that.is.an('array');
      expect(bidderRequest.sizes[0]).to.deep.equal([320, 50]);

      expect(bidderRequest).to.have.property('bids').that.is.an('array').with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]').to.have.property('bidder', 'marsmedia');

      expect(bidderRequest.bids[0]).to.have.deep.property('params');

      expect(bidderRequest.bids[0].params).to.have.deep.property('floor').that.is.an('number');
    });

    it('should handle a success response', () => {
      marsmediaAdapter.callBids(bidderRequest);

      server.respondWith(JSON.stringify({
        'id': 'marsRtbTeam',
        'seatbid': [
          {
            'bid': [
              {
                'id': '1',
                'impid': '0c5b2f42-057b-0429-0694-0b42029af9e8',
                'price': 5,
                'adid': '11890',
                'nurl': 'http://ping-hq-2.rtbanalytics.com/bidder/ping_rtb.php?bid=3mhdom&wn=1&a_id=e7a96e1a-9777-5c48-41bc-91151c5b0b8e&gid=&r_id=9625963823905202&a_bp=5.0&a_p=${AUCTION_PRICE}&dcid=1&d=real1.rtbsrv.com&s_id=26&b_r_id=11890&v_id=0&a_pos=&u=5956487987&enp=uQ5qwrn5TQ&oapi=IzJ6W%3D%3DwN4kzN4QjN1kTN23bqB&oai=R2hHylhjYwIWNjFTNxETOtMmYxQTL4QzY10yN3cTOtEWMlZTOhdTZeXpeu&aname=asV6EXbmbP&abundle=ZywyWBnMaH&sdomain=0vQGB%3D%3DQbvNmL2J3ciRncuEDbhVmcKD4pf&spid=iPR8W%3D%3DwN4kzN4QjN1kTNKsMet&s_s_id=5956487987&dcarrier=HMjOzDJYic&city=G9diP6gJT7&uctm=1495112599131&b_id=306&cui=jYGqt%3D0SL8hqk6&hostn=bw7NZyEDbhVmc5j4VD&dspr=X2WmAw4CMCM32y',
                'adm': '<img src="http://ping-hq-2.rtbanalytics.com/bidder/ping_rtb.php?bid=3mhdom&a_id=e7a96e1a-9777-5c48-41bc-91151c5b0b8e&uip=4UEzgrbonc&udid=3KxXdQTFpx&uua=bGbqG%3DYzMuczM18SayFmZhNFI2kjL5IDMz4CMugTNvUWbvJHaDBSKvt2YldEIltWasBCLM1EVItEKgYzMuczM18CdptkYldVZsBHcBBSK0YDegsDN24WaXByOx4iNgQlTgM3dvRmbpdFKgAjL18SYsxWa69WTMheRw&uctm=1495112599130&gid=&r_id=9625963823905202&a_bp=5.0&a_p=${AUCTION_PRICE}&dcid=1&d=real1.rtbsrv.com&s_id=26&b_r_id=11890&b_g_id=35&v_id=0&a_pos=&bmk=&rdt=2017-05-18+13%3A03%3A19&rsi=&und=Imt39cw6Xu&fct=2&u=5956487987&w=320&h=50&dspr=YeqYsw4CMaNn6w&oapi=fw4rn%3D%3DwN4kzN4QjN1kTNewHGk&oai=p8jp8lhjYwIWNjFTNxETOtMmYxQTL4QzY10yN3cTOtEWMlZTOhdTZaByTW&aname=FvdCem5HAc&abundle=3XpwrVhDaY&sdomain=UFGS3%3D%3DQbvNmL2J3ciRncuEDbhVmcKCToi&spid=1nP2X%3D%3DwN4kzN4QjN1kTNlVJll&s_s_id=5956487987&dcarrier=TJcrKZ2rVn&city=lyPJdSNzH0&b_id=306&cui=h58Ut%3D0SL7U3V8&hostn=3XoiDyEDbhVmcPjQcY" width="1" height="1" style="display:none;" /><article style="display:none;font-size:0px"><h2 style="display:none">Click link below</h2><section id="main_content" style="display:none">This link is a link<div style="display:none"><a style="display:none" href="http://ping-hq-2.rtbanalytics.com/bidder/beacon.php?bid=3mhdom&a_id=e7a96e1a-9777-5c48-41bc-91151c5b0b8e&gid=&u=5956487987&r_id=9625963823905202&a_bp=5.0&d=real1.rtbsrv.com&s_id=26&b_r_id=11890&v_id=0&a_pos=&s_s_id=5956487987&bt=5&a_p=${AUCTION_PRICE}&dcid=1">A</a></div></section></article><a href="https://www.wooga.com/games/jelly-splash/" target="_blank"><img src="http://feed-848915510.us-east-1.elb.amazonaws.com/banners/2290/jelly_splash/2861815_jelly-splash-iphone-app_android-app-install_creatives-jelly_320x50.jpg" border=0 width="320" height="50" /></a>',
                'adomain': ['wooga.com'],
                'iurl': 'http://feed-848915510.us-east-1.elb.amazonaws.com/banners/2290/jelly_splash/2861815_jelly-splash-iphone-app_android-app-install_creatives-jelly_320x50.jpg',
                'cid': '11890',
                'crid': '11890',
                'attr': [16]
              }
            ],
            'seat': '306'
          }
        ],
        'bidid': '9625963823905202',
        'cur': 'USD'
      }));

      server.respond();

      expect(bidManager.addBidResponse.calledOnce).to.equal(true);
      expect(bidManager.addBidResponse.calledTwice).to.equal(false);
      expect(bids).to.be.lengthOf(1);
    });

    describe('should handle bad response with - ', () => {
      it('broken response', () => {
        marsmediaAdapter.callBids(bidderRequest);

        server.respondWith('{"id":');
        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      });

      it('empty response', () => {
        marsmediaAdapter.callBids(bidderRequest);

        server.respondWith('{}');
        server.respond();

        expect(bidManager.addBidResponse.calledOnce).to.equal(true);
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      });

      it('no seatbid', () => {
        marsmediaAdapter.callBids(bidderRequest);

        server.respondWith(JSON.stringify({
          'id': 'marsRtbTeam',
          'seatbid': [
            {
              'bid': [
                {}
              ]
            }
          ],
          'bidid': '5616322932456153',
          'cur': 'USD'
        }));

        server.respond();
        let response = JSON.parse(server.response[2]);

        expect(response).to.have.property('seatbid').that.is.an('array').with.lengthOf(1);
      });

      it('empty bids', () => {
        marsmediaAdapter.callBids(bidderRequest);

        server.respondWith(JSON.stringify({
          'id': 'marsRtbTeam',
          'seatbid': [
            {
              'bid': [
                {}
              ]
            }
          ],
          'bidid': '5616322932456153',
          'cur': 'USD'
        }));

        server.respond();
        let response = JSON.parse(server.response[2]);

        expect(response).to.have.property('seatbid').that.is.an('array').with.lengthOf(1);
        expect(response['seatbid'][0]).to.have.property('bid').to.be.lengthOf(1);
      });

      it('no adm', () => {
        server.respondWith(JSON.stringify({
          'id': 'marsRtbTeam',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'impid': '0c5b2f42-057b-0429-0694-0b42029af9e8',
                  'price': 5,
                  'adid': '11890',
                  'nurl': 'http://ping-hq-2.rtbanalytics.com/bidder/ping_rtb.php?bid=3mhdom&wn=1&a_id=e7a96e1a-9777-5c48-41bc-91151c5b0b8e&gid=&r_id=9625963823905202&a_bp=5.0&a_p=${AUCTION_PRICE}&dcid=1&d=real1.rtbsrv.com&s_id=26&b_r_id=11890&v_id=0&a_pos=&u=5956487987&enp=uQ5qwrn5TQ&oapi=IzJ6W%3D%3DwN4kzN4QjN1kTN23bqB&oai=R2hHylhjYwIWNjFTNxETOtMmYxQTL4QzY10yN3cTOtEWMlZTOhdTZeXpeu&aname=asV6EXbmbP&abundle=ZywyWBnMaH&sdomain=0vQGB%3D%3DQbvNmL2J3ciRncuEDbhVmcKD4pf&spid=iPR8W%3D%3DwN4kzN4QjN1kTNKsMet&s_s_id=5956487987&dcarrier=HMjOzDJYic&city=G9diP6gJT7&uctm=1495112599131&b_id=306&cui=jYGqt%3D0SL8hqk6&hostn=bw7NZyEDbhVmc5j4VD&dspr=X2WmAw4CMCM32y',
                  'adm': '',
                  'adomain': ['wooga.com'],
                  'iurl': 'http://feed-848915510.us-east-1.elb.amazonaws.com/banners/2290/jelly_splash/2861815_jelly-splash-iphone-app_android-app-install_creatives-jelly_320x50.jpg',
                  'cid': '11890',
                  'crid': '11890',
                  'attr': [16]
                }
              ],
              'seat': '306'
            }
          ],
          'bidid': '9625963823905202',
          'cur': 'USD'
        }));

        server.respond();
        let response = JSON.parse(server.response[2]);

        expect(response).to.have.property('seatbid').that.is.an('array').with.lengthOf(1);
        expect(response['seatbid'][0]).to.have.property('bid').to.be.lengthOf(1);
        expect(response['seatbid'][0]['bid'][0]).to.have.property('adm');
      });
    });
  });
});
