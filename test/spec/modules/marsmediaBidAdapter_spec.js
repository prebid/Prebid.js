import { expect } from 'chai';
import * as ajax from 'src/ajax';
import bidManager from 'src/bidmanager';
import MarsmediaBidAdapter from '../../../modules/marsmediaBidAdapter';
import CONSTANTS from 'src/constants.json';
import adLoader from 'src/adloader';

describe('MarsMedia adapter implementation', () => {
  let sandbox,
    server,
    marsmediaAdapter = new MarsmediaBidAdapter(),
    BIDDER_REQUEST,
    EMPTY_RESPONSE,
    VALID_RESPONSE;

  beforeEach(() => {
    BIDDER_REQUEST = {
      bidderCode: 'marsmedia',
      placementCode: 'div-1',
      bids: [
        {
          bidder: 'marsmedia',
          params: {
            publisherID: '1111',
            floor: 0
          },
          sizes: [[320, 50]]
        }
      ]
    };

    EMPTY_RESPONSE = {
      'seatbid': [
        {
          'bid': [
            {}
          ]
        }
      ],
      'bidid': '5616322932456153',
      'cur': 'USD'
    };

    VALID_RESPONSE = {
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
    };

    sandbox = sinon.sandbox.create();
    server = sinon.fakeServer.create();
    marsmediaAdapter = marsmediaAdapter.createNew();

    sandbox.stub(bidManager, 'addBidResponse');
  });

  afterEach(() => {
    sandbox.restore();
    server.restore();
  });

  describe('should receive a valid request bid -', () => {
    it('no params', () => {
      var bidder_request = BIDDER_REQUEST;
      delete bidder_request.bids[0].params;

      expect(marsmediaAdapter.buildCallParams.bind(marsmediaAdapter, bidder_request.bids[0])).to.throw('No params');
    });

    it('no sizes', () => {
      var bidder_request = BIDDER_REQUEST;
      delete bidder_request.bids[0].sizes;

      expect(marsmediaAdapter.buildCallParams.bind(marsmediaAdapter, bidder_request.bids[0])).to.throw('No sizes');
    });

    it('no floor', () => {
      var bidder_request = BIDDER_REQUEST;
      delete bidder_request.bids[0].params.floor;

      expect(marsmediaAdapter.buildCallParams.bind(marsmediaAdapter, bidder_request.bids[0])).to.throw('No floor');
    });

    it('floor should be number', () => {
      var bidder_request = BIDDER_REQUEST;
      bidder_request.bids[0].params.floor = 'str';

      expect(marsmediaAdapter.buildCallParams.bind(marsmediaAdapter, bidder_request.bids[0])).to.throw('Floor must be numeric value');
    });
  });

  describe('should receive a valid response -', () => {
    it('error building call params', () => {
      var request = marsmediaAdapter.buildCallParams(BIDDER_REQUEST.bids[0]);

      expect(request).that.is.an('string');

      var request_obj = JSON.parse(request);
      expect(request_obj).that.is.an('object');
      expect(request_obj).to.have.deep.property('id');
      expect(request_obj).to.have.deep.property('cur');

      expect(request_obj).to.have.deep.property('imp');
      expect(request_obj['imp'][0]).to.have.deep.property('bidfloor');

      expect(request_obj).to.have.deep.property('device');
      expect(request_obj).to.have.deep.property('user');
      expect(request_obj).to.have.deep.property('app');
      expect(request_obj).to.have.deep.property('publisher');
    });

    it('error register bid', () => {
      server.respondWith(JSON.stringify(VALID_RESPONSE));
      marsmediaAdapter.callBids(BIDDER_REQUEST);
      server.respond();

      expect(bidManager.addBidResponse.calledOnce).to.equal(true);
      expect(bidManager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
    });
  });

  describe('should handle bad response with - ', () => {
    it('broken response', () => {
      marsmediaAdapter.callBids(BIDDER_REQUEST);

      server.respondWith('{"id":');
      server.respond();

      expect(bidManager.addBidResponse.calledOnce).to.equal(true);
      expect(bidManager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    });

    it('empty response', () => {
      marsmediaAdapter.callBids(BIDDER_REQUEST);

      server.respondWith('{}');
      server.respond();

      expect(bidManager.addBidResponse.calledOnce).to.equal(true);
      expect(bidManager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    });

    it('empty bids', () => {
      marsmediaAdapter.callBids(BIDDER_REQUEST);

      server.respondWith(JSON.stringify(EMPTY_RESPONSE));

      server.respond();
      let response = JSON.parse(server.response[2]);

      expect(response).to.have.property('seatbid').that.is.an('array').with.lengthOf(1);
      expect(response['seatbid'][0]).to.have.property('bid').to.be.lengthOf(1);
    });

    it('no adm', () => {
      server.respondWith(JSON.stringify(VALID_RESPONSE));

      server.respond();
      let response = JSON.parse(server.response[2]);

      expect(response).to.have.property('seatbid').that.is.an('array').with.lengthOf(1);
      expect(response['seatbid'][0]).to.have.property('bid').to.be.lengthOf(1);
      expect(response['seatbid'][0]['bid'][0]).to.have.property('adm');
    });
  });
});
