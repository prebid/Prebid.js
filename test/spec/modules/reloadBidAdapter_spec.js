import { expect } from 'chai';
import { spec } from 'modules/reloadBidAdapter';

let getParams = () => {
  return JSON.parse(JSON.stringify({
    'plcmID': 'placement_01',
    'partID': 'part00',
    'opdomID': 1,
    'bsrvID': 1,
    'type': 'pcm'
  }));
};

let getBidderRequest = () => {
  return JSON.parse(JSON.stringify({
    bidderCode: 'reload',
    auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'reload',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      params: getParams()
    }]
  }));
};

let getValidBidRequests = () => {
  return JSON.parse(JSON.stringify([
    {
      'bidder': 'reload',
      'params': getParams(),
      'mediaTypes': {
        'banner': {
          'sizes': [[160, 600]]
        }
      },
      'adUnitCode': '1b243858-3c53-43dc-9fdf-89f839ea4a0f',
      'transactionId': '8cbafa10-123d-4673-a1a5-04a1c7d62ded',
      'sizes': [[160, 600]],
      'bidId': '2236e11dc09931',
      'bidderRequestId': '1266bb886c2267',
      'auctionId': '4fb72c4d-94dc-4db1-8fac-3c2090ceeec0',
      'src': 'client',
      'bidRequestsCount': 1
    }
  ]));
}

let getExt1ServerResponse = () => {
  return JSON.parse(JSON.stringify({
    'pcmdata': {
      'thisVer': '100',
      'plcmSett': {
        'name': 'zz_test_mariano_adapter',
        'Version': '210',
        'lifeSpan': '100',
        'versionFolder': 'v4.14q',
        'versionFolderA': 'v4.14q',
        'versionFolderB': '',
        'stage': 'zz_test_mariano_adapter',
        'synchro': 1556916507000,
        'localCache': 'true',
        'testCase': 'A:00_B:100',
        'opdomain': '1',
        'checksum': '6378',
        'cpm': '0',
        'bstfct': '100',
        'totstop': 'false',
        'pcmurl': 'bidsrv01.reload.net'
      },
      'srvUrl': 'bidsrv01.reload.net',
      'instr': {'go': true, 'prc': 32, 'cur': 'USD'},
      'statStr': 'eyN4aHYnQCk5OTotOC',
      'status': 'ok',
      'message': '',
      'log': '---- LOG ----'
    },
    'plcmID': 'zz_test_mariano_adapter',
    'partID': 'prx_part',
    'opdomID': '0',
    'bsrvID': 1,
    'adUnitCode': '1b243858-3c53-43dc-9fdf-89f839ea4a0f',
    'banner': {'w': 300, 'h': 250}
  }));
}

let getExt2ServerResponse = () => {
  return JSON.parse(JSON.stringify({
    'pcmdata': {
      'thisVer': '100',
      'plcmSett': {
        'name': 'placement_01',
        'Version': '210',
        'lifeSpan': '100',
        'versionFolder': 'v4.14q',
        'versionFolderA': 'v4.14q',
        'versionFolderB': '',
        'stage': 'placement_01',
        'synchro': 1556574760000,
        'localCache': 'true',
        'testCase': 'A:00_B:100',
        'opdomain': '1',
        'checksum': '6378',
        'cpm': '0',
        'bstfct': '100',
        'totstop': 'false',
        'pcmurl': 'bidsrv00.reload.net'
      },
      'srvUrl': 'bidsrv00.reload.net',
      'log': 'incomp_input_obj_version',
      'message': 'incomp_input_obj_version',
      'status': 'error'
    },
    'plcmID': 'placement_01',
    'partID': 'prx_part',
    'opdomID': '0',
    'bsrvID': 1,
    'adUnitCode': '1b243858-3c53-43dc-9fdf-89f839ea4a0f',
    'banner': {'w': 160, 'h': 600}
  }));
}

let getServerResponse = (pExt) => {
  return JSON.parse(JSON.stringify({
    'body': {
      'id': '2759340f70210d',
      'bidid': 'fbs-br-3mzdbycetjv8f8079',
      'seatbid': [
        {
          'bid': [
            {
              'id': 'fbs-br-stbd-bd-3mzdbycetjv8f807b',
              'price': 0,
              'nurl': '',
              'adm': '',
              'ext': pExt
            }
          ],
          'seat': 'fbs-br-stbd-3mzdbycetjv8f807a',
          'group': 0
        }
      ]
    },
    'headers': {}
  }));
}

describe('ReloadAdapter', function () {
  describe('isBidRequestValid', function () {
    var bid = {
      'bidder': 'reload',
      'params': {
        'plcmID': 'placement_01',
        'partID': 'part00',
        'opdomID': 1,
        'bsrvID': 23,
        'type': 'pcm'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when bsrvID is not number', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'plcmID': 'placement_01',
        'partID': 'part00',
        'opdomID': 1,
        'bsrvID': 'abc'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bsrvID > 99', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'plcmID': 'placement_01',
        'partID': 'part00',
        'opdomID': 1,
        'bsrvID': 230
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bsrvID < 0', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'plcmID': 'placement_01',
        'partID': 'part00',
        'opdomID': 1,
        'bsrvID': -3,
        'type': 'pcm'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'plcmID': 'placement_01'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests()', function () {
    let vRequests = spec.buildRequests(getValidBidRequests(), {});
    let vData = JSON.parse(vRequests[0].data);

    it('should send one requests', () => {
      expect(vRequests.length).to.equal(1);
    });

    it('should send one requests, one impression', () => {
      expect(vData.imp.length).to.equal(1);
    });

    it('should exists ext.type and ext.pcmdata', () => {
      expect(vData.imp[0].banner).to.exist;
      expect(vData.imp[0].banner.ext).to.exist;
      expect(vData.imp[0].banner.ext.type).to.exist;
      expect(vData.imp[0].banner.ext.pcmdata).to.exist;
      expect(vData.imp[0].banner.ext.type).to.equal('pcm');
    });
  });

  describe('interpretResponse()', function () {
    it('Returns an empty array', () => {
      let vData = spec.interpretResponse(getServerResponse(getExt2ServerResponse()), {});

      expect(vData.length).to.equal(0);
    });

    it('Returns an array with one response', () => {
      let vData = spec.interpretResponse(getServerResponse(getExt1ServerResponse()), {});
      expect(vData.length).to.equal(1);
    });

    it('required fileds', () => {
      let vData = spec.interpretResponse(getServerResponse(getExt1ServerResponse()), {});
      expect(vData.length).to.equal(1);
      expect(vData[0]).to.have.all.keys(['requestId', 'ad', 'cpm', 'width', 'height', 'creativeId', 'currency', 'ttl', 'netRevenue']);
    });

    it('CPM great than 0', () => {
      let vData = spec.interpretResponse(getServerResponse(getExt1ServerResponse()), {});
      expect(vData[0].cpm).to.greaterThan(0);
    });

    it('instruction empty', () => {
      let vResponse = Object.assign({}, getServerResponse(getExt1ServerResponse()));
      vResponse.body.seatbid[0].bid[0].ext.pcmdata.instr = null;
      let vData = spec.interpretResponse(vResponse, {});
      expect(vData.length).to.equal(0);

      vResponse = Object.assign({}, getServerResponse(getExt1ServerResponse()));
      vResponse.body.seatbid[0].bid[0].ext.pcmdata.instr = undefined;
      vData = spec.interpretResponse(vResponse, {});
      expect(vData.length).to.equal(0);

      vResponse = Object.assign({}, getServerResponse(getExt1ServerResponse()));
      vResponse.body.seatbid[0].bid[0].ext.pcmdata.instr.go = undefined;
      vData = spec.interpretResponse(vResponse, {});
      expect(vData.length).to.equal(0);
    });

    it('instruction with go = false', () => {
      let vResponse = getServerResponse(getExt1ServerResponse());
      vResponse.body.seatbid[0].bid[0].ext.pcmdata.instr.go = false;
      let vData = spec.interpretResponse(vResponse, {});
      expect(vData.length).to.equal(0);
    });

    it('incompatibility output object version (thisVer)', () => {
      let vResponse = getServerResponse(getExt1ServerResponse());
      vResponse.body.seatbid[0].bid[0].ext.pcmdata.thisVer = '200';
      let vData = spec.interpretResponse(vResponse, {});
      expect(vData.length).to.equal(0);
    });
  });
});
