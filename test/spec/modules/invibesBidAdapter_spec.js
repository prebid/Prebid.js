import {expect} from 'chai';
import { config } from 'src/config.js';
import {spec, resetInvibes, stubDomainOptions, readGdprConsent} from 'modules/invibesBidAdapter.js';

describe('invibesBidAdapter:', function () {
  const BIDDER_CODE = 'invibes';
  const PLACEMENT_ID = '12345';
  const ENDPOINT = 'https://bid.videostep.com/Bid/VideoAdContent';
  const SYNC_ENDPOINT = 'https://k.r66net.com/GetUserSync';

  let bidRequests = [
    {
      bidId: 'b1',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r1',
      params: {
        placementId: PLACEMENT_ID,
        disableUserSyncs: false

      },
      adUnitCode: 'test-div1',
      auctionId: 'a1',
      sizes: [
        [300, 250],
        [400, 300],
        [125, 125]
      ],
      transactionId: 't1'
    }, {
      bidId: 'b2',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r2',
      params: {
        placementId: 'abcde',
        disableUserSyncs: false
      },
      adUnitCode: 'test-div2',
      auctionId: 'a2',
      sizes: [
        [300, 250],
        [400, 300]
      ],
      transactionId: 't2'
    }
  ];

  let bidRequestsWithUserId = [
    {
      bidId: 'b1',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r1',
      params: {
        placementId: PLACEMENT_ID
      },
      adUnitCode: 'test-div1',
      auctionId: 'a1',
      sizes: [
        [300, 250],
        [400, 300],
        [125, 125]
      ],
      transactionId: 't1',
      userId: {
        pubcid: 'pub-cid-code',
        pubProvidedId: 'pub-provided-id'
      }
    }, {
      bidId: 'b2',
      bidder: BIDDER_CODE,
      bidderRequestId: 'r2',
      params: {
        placementId: 'abcde'
      },
      adUnitCode: 'test-div2',
      auctionId: 'a2',
      sizes: [
        [300, 250],
        [400, 300]
      ],
      transactionId: 't2'
    }
  ];

  let StubbedPersistence = function (initialValue) {
    var value = initialValue;
    return {
      load: function () {
        let str = value || '';
        try {
          return JSON.parse(str);
        } catch (e) {
        }
      },
      save: function (obj) {
        value = JSON.stringify(obj);
      }
    }
  };

  let SetBidderAccess = function() {
    config.setConfig({
      deviceAccess: true
    });
    $$PREBID_GLOBAL$$.bidderSettings = {
      invibes: {
        storageAllowed: true
      }
    };
  }

  beforeEach(function () {
    resetInvibes();
    $$PREBID_GLOBAL$$.bidderSettings = {
      invibes: {
        storageAllowed: true
      }
    };
    document.cookie = '';
    this.cStub1 = sinon.stub(console, 'info');
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {};
    this.cStub1.restore();
  });

  describe('isBidRequestValid:', function () {
    context('valid bid request:', function () {
      it('returns true when bidder params.placementId is set', function () {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            placementId: PLACEMENT_ID
          }
        }

        expect(spec.isBidRequestValid(validBid)).to.be.true;
      })
    });

    context('invalid bid request:', function () {
      it('returns false when no params', function () {
        const invalidBid = {
          bidder: BIDDER_CODE
        }

        expect(spec.isBidRequestValid(invalidBid)).to.be.false;
      });

      it('returns false when placementId is not set', function () {
        const invalidBid = {
          bidder: BIDDER_CODE,
          params: {
            id: '5'
          }
        }

        expect(spec.isBidRequestValid(invalidBid)).to.be.false;
      });

      it('returns true when bid response was previously received', function () {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            placementId: PLACEMENT_ID
          }
        }

        top.window.invibes.bidResponse = {prop: 'prop'};
        expect(spec.isBidRequestValid(validBid)).to.be.true;
      });
    });
  });

  describe('buildRequests', function () {
    it('sends preventPageViewEvent as false on first call', function () {
      let request = spec.buildRequests(bidRequests);
      expect(request.data.preventPageViewEvent).to.be.false;
    });

    it('sends preventPageViewEvent as true on 2nd call', function () {
      let request = spec.buildRequests(bidRequests);
      expect(request.data.preventPageViewEvent).to.be.true;
    });

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to custom endpoint via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'placement',
          customEndpoint: 'sub.domain.com/Bid/VideoAdContent'
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('sub.domain.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to default endpoint when no placement', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to default endpoint when null placement', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: null
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to default endpoint 1 via GET', function () {
	  const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'placement'
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to network id endpoint 1 via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'placement',
          domainId: 1001
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to network id endpoint 2 via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'placement',
          domainId: 1002
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid2.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to network id by placement 1 via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'infeed_ivbs1'
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to network id by placement 2 via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'infeed_ivbs2'
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid2.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to network id by placement 10 via GET', function () {
      const request = spec.buildRequests([{
        bidId: 'b1',
        bidder: BIDDER_CODE,
        params: {
          placementId: 'infeed_ivbs10'
        },
        adUnitCode: 'test-div1'
      }]);
      expect(request.url).to.equal('https://bid10.videostep.com/Bid/VideoAdContent');
      expect(request.method).to.equal('GET');
    });

    it('sends cookies with the bid request', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('has location, html id, placement and width/height', function () {
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      const parsedData = request.data;
      expect(parsedData.location).to.exist;
      expect(parsedData.videoAdHtmlId).to.exist;
      expect(parsedData.vId).to.exist;
      expect(parsedData.width).to.exist;
      expect(parsedData.height).to.exist;
    });

    it('has capped ids if local storage variable is correctly formatted', function () {
      top.window.invibes.optIn = 1;
      top.window.invibes.purposes = [true, false, false, false, false, false, false, false, false, false];
      localStorage.ivvcap = '{"9731":[1,1768600800000]}';
      SetBidderAccess();

      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});

      expect(request.data.capCounts).to.equal('9731=1');
    });

    it('does not have capped ids if local storage variable is correctly formatted but no opt in', function () {
      let bidderRequest = {
        auctionStart: Date.now(),
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            purpose: {
              consents: {
                1: false,
                2: false,
                3: false,
                4: false,
                5: false,
                6: false,
                7: false,
                8: false,
                9: false,
                10: false
              }
            }
          }
        }
      };

      localStorage.ivvcap = '{"9731":[1,1768600800000]}';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.capCounts).to.equal('');
    });

    it('does not have capped ids if local storage variable is incorrectly formatted', function () {
      localStorage.ivvcap = ':[1,1574334216992]}';
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      expect(request.data.capCounts).to.equal('');
    });

    it('does not have capped ids if local storage variable is expired', function () {
      localStorage.ivvcap = '{"9731":[1,1574330064104]}';
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      expect(request.data.capCounts).to.equal('');
    });

    it('sends query string params from localstorage 1', function () {
      localStorage.ivbs = JSON.stringify({bvci: 1});
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      expect(request.data.bvci).to.equal(1);
    });

    it('sends query string params from localstorage 2', function () {
      localStorage.ivbs = JSON.stringify({invibbvlog: true});
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      expect(request.data.invibbvlog).to.equal(true);
    });

    it('does not send query string params from localstorage if unknwon', function () {
      localStorage.ivbs = JSON.stringify({someparam: true});
      const request = spec.buildRequests(bidRequests, {auctionStart: Date.now()});
      expect(request.data.someparam).to.be.undefined;
    });

    it('sends all Placement Ids', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[0].params.placementId);
      expect(JSON.parse(request.data.bidParamsJson).placementIds).to.contain(bidRequests[1].params.placementId);
    });

    it('sends all adUnitCodes', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request.data.bidParamsJson).adUnitCodes).to.contain(bidRequests[0].adUnitCode);
      expect(JSON.parse(request.data.bidParamsJson).adUnitCodes).to.contain(bidRequests[1].adUnitCode);
    });

    it('sends all Placement Ids and userId', function () {
      const request = spec.buildRequests(bidRequestsWithUserId);
      expect(JSON.parse(request.data.bidParamsJson).userId).to.exist;
    });

    it('sends undefined lid when no cookie', function () {
      let request = spec.buildRequests(bidRequests);
      expect(request.data.lId).to.be.undefined;
    });

    it('sends pushed cids if they exist', function () {
      top.window.invibes.pushedCids = { 981: [] };
      let request = spec.buildRequests(bidRequests);
      expect(request.data.pcids).to.contain(981);
    });

    it('sends lid when comes on cookie', function () {
      top.window.invibes.optIn = 1;
      top.window.invibes.purposes = [true, false, false, false, false, false, false, false, false, false];
      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":' + Date.now() + ',"hc":0}';
      let bidderRequest = {gdprConsent: {vendorData: {vendorConsents: {436: true}}}};
      SetBidderAccess();

      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.lId).to.exist;
    });

    it('should send purpose 1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.purposes.split(',')[0]).to.equal('true');
    });

    it('should send purpose 2 & 7', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.purposes.split(',')[1] && request.data.purposes.split(',')[6]).to.equal('true');
    });

    it('should send purpose 9', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.purposes.split(',')[9]).to.equal('true');
    });

    it('should send legitimateInterests 2 & 7', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              },
              legitimateInterests: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.li.split(',')[1] && request.data.li.split(',')[6]).to.equal('true');
    });
    it('should send oi = 1 when vendorData is null (calculation will be performed by ADWEB)', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: null
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(0);
    });

    it('should send oi = 2 when consent was approved on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });
    it('should send oi = 0 when vendor consents for invibes are false on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: false}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(0);
    });
    it('should send oi = 2 when vendor consent for invibes are false and vendor legitimate interest for invibes are true on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: false}, legitimateInterests: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });
    it('should send oi = 0 when vendor consents and legitimate interests for invibes are false on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: false}, legitimateInterests: {436: false}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(0);
    });
    it('should send oi = 0 when purpose consents is null', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: false}},
            purpose: {}
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(0);
    });

    it('should send oi = 2 when purpose consents weren\'t approved on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: false,
                3: false,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 2 when purpose consents are less then 10 on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: true}},
            purpose: {
              consents: {
                1: true,
                2: false,
                3: false,
                4: true,
                5: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 4 when vendor consents are null on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: null},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(4);
    });

    it('should send oi = 4 when vendor consents for invibes is null on tcf v2', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendor: {consents: {436: null}},
            purpose: {
              consents: {
                1: true,
                2: true,
                3: true,
                4: true,
                5: true,
                6: true,
                7: true,
                8: true,
                9: true,
                10: true
              }
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(4);
    });

    it('should send oi = 4 when vendor consents for invibes is null on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: {436: null},
            purposeConsents: {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(4);
    });

    it('should send oi = 4 when vendor consents consents are null on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: null,
            purposeConsents: {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(4);
    });

    it('should send oi = 2 when gdpr doesn\'t apply or has global consent', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: false,
            hasGlobalConsent: true,
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 2 when consent was approved on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: {436: true},
            purposeConsents: {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 2 when purpose consents weren\'t approved on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: {436: true},
            purposeConsents: {
              1: false,
              2: false,
              3: true,
              4: true,
              5: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 2 when purpose consents are less then 5 on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: {436: true},
            purposeConsents: {
              1: false,
              2: false,
              3: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(2);
    });

    it('should send oi = 0 when vendor consents for invibes are false on tcf v1', function () {
      let bidderRequest = {
        gdprConsent: {
          vendorData: {
            gdprApplies: true,
            hasGlobalConsent: false,
            vendorConsents: {436: false},
            purposeConsents: {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true
            }
          }
        }
      };
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.oi).to.equal(0);
    });
  });

  describe('interpretResponse', function () {
    let response = {
      Ads: [{
        BidPrice: 0.5,
        VideoExposedId: 123
      }],
      BidModel: {
        BidVersion: 1,
        PlacementId: '12345',
        AuctionStartTime: Date.now(),
        CreativeHtml: '<!-- Creative -->'
      }
    };

    let expectedResponse = [{
      requestId: bidRequests[0].bidId,
      cpm: 0.5,
      width: 400,
      height: 300,
      creativeId: 123,
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      ad: `<html>
        <head><script type='text/javascript'>inDapIF=true;</script></head>
          <body style='margin : 0; padding: 0;'>
          <!-- Creative -->
          </body>
        </html>`,
      meta: {}
    }];

    let multiResponse = {
      MultipositionEnabled: true,
      AdPlacements: [{
        Ads: [{
          BidPrice: 0.5,
          VideoExposedId: 123
        }],
        BidModel: {
          BidVersion: 1,
          PlacementId: '12345',
          AuctionStartTime: Date.now(),
          CreativeHtml: '<!-- Creative -->'
        }
      }]
    };

    let invalidResponse = {
      AdPlacements: [{
        Ads: [{
          BidPrice: 0.5,
          VideoExposedId: 123
        }]
      }]
    };

    let responseWithMeta = {
      Ads: [{
        BidPrice: 0.5,
        VideoExposedId: 123
      }],
      BidModel: {
        BidVersion: 1,
        PlacementId: '12345',
        AuctionStartTime: Date.now(),
        CreativeHtml: '<!-- Creative -->',
        Meta: {
          advertiserDomains: ['theadvertiser.com', 'theadvertiser_2.com'],
          advertiserName: 'theadvertiser'
        }
      }
    };

    let responseWithAdUnit = {
      Ads: [{
        BidPrice: 0.5,
        VideoExposedId: 123
      }],
      BidModel: {
        BidVersion: 1,
        PlacementId: '12345_test-div1',
        AuctionStartTime: Date.now(),
        CreativeHtml: '<!-- Creative -->'
      },
	  UseAdUnitCode: true
    };

    var buildResponse = function(placementId, cid, blcids, creativeId, ShouldSetLId) {
      if (ShouldSetLId) {
        return {
          MultipositionEnabled: true,
          AdPlacements: [{
            Ads: [{
              BidPrice: 0.5,
              VideoExposedId: creativeId,
              Cid: cid,
              Blcids: blcids
            }],
            BidModel: {
              BidVersion: 1,
              PlacementId: placementId,
              AuctionStartTime: Date.now(),
              CreativeHtml: '<!-- Creative -->'
            }
          }],
          ShouldSetLId: true,
          LId: 'dvdjkams6nkq'
        }
      }

      return {
        MultipositionEnabled: true,
        AdPlacements: [{
          Ads: [{
            BidPrice: 0.5,
            VideoExposedId: creativeId,
            Cid: cid,
            Blcids: blcids
          }],
          BidModel: {
            BidVersion: 1,
            PlacementId: placementId,
            AuctionStartTime: Date.now(),
            CreativeHtml: '<!-- Creative -->'
          }
        }]
      };
    };

    context('when the response is not valid', function () {
      it('handles response with no bids requested', function () {
        let emptyResult = spec.interpretResponse({body: response});
        expect(emptyResult).to.be.empty;
      });

      it('handles empty response', function () {
        let emptyResult = spec.interpretResponse(null, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response with bidding is not configured', function () {
        let emptyResult = spec.interpretResponse({body: {Ads: [{BidPrice: 1}]}}, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received', function () {
        let emptyResult = spec.interpretResponse({
          body: {
            BidModel: {PlacementId: '12345'},
            AdReason: 'No ads'
          }
        }, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response with no ads are received - no ad reason', function () {
        let emptyResult = spec.interpretResponse({body: {BidModel: {PlacementId: '12345'}}}, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response when no placement Id matches', function () {
        let emptyResult = spec.interpretResponse({
          body: {
            BidModel: {PlacementId: '123456'},
            Ads: [{BidPrice: 1}]
          }
        }, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response when placement Id is not present', function () {
        let emptyResult = spec.interpretResponse({BidModel: {}, Ads: [{BidPrice: 1}]}, {bidRequests});
        expect(emptyResult).to.be.empty;
      });

      it('handles response when bid model is missing', function () {
        let emptyResult = spec.interpretResponse(invalidResponse);
        expect(emptyResult).to.be.empty;
      });
    });

    context('when the multiresponse is valid', function () {
      it('responds with a valid multiresponse bid', function () {
        let result = spec.interpretResponse({body: multiResponse}, {bidRequests});
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('responds with a valid singleresponse bid', function () {
        let result = spec.interpretResponse({body: response}, {bidRequests});
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });

      it('does not make multiple bids', function () {
        let result = spec.interpretResponse({body: response}, {bidRequests});
        let secondResult = spec.interpretResponse({body: response}, {bidRequests});
        expect(secondResult).to.be.empty;
      });

      it('bids using the adUnitCode', function () {
        let result = spec.interpretResponse({body: responseWithAdUnit}, {bidRequests});
        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      });
    });

    context('when the response has meta', function () {
      it('responds with a valid bid, with the meta info', function () {
        let result = spec.interpretResponse({body: responseWithMeta}, {bidRequests});
        expect(result[0].meta.advertiserName).to.equal('theadvertiser');
        expect(result[0].meta.advertiserDomains).to.contain('theadvertiser.com');
        expect(result[0].meta.advertiserDomains).to.contain('theadvertiser_2.com');
      });
    });

    context('AdWeb generates LIDs', function() {
      it('works when no LID is not sent from AdWeb', function() {
        var firstResponse = buildResponse('12345', 1, [], 123);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        expect(firstResult[0].creativeId).to.equal(123);
      });

      it('sets lid when AdWeb sends it', function() {
        var firstResponse = buildResponse('12345', 1, [], 123, true);

        spec.interpretResponse({body: firstResponse}, {bidRequests});
        expect(global.document.cookie.indexOf('ivbsdid')).to.greaterThanOrEqual(0);
      });
    });

    context('in multiposition context, with conflicting ads', function() {
      it('registers the second ad when no conflict', function() {
        var firstResponse = buildResponse('12345', 1, [1], 123);
        var secondResponse = buildResponse('abcde', 2, [2], 456);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        var secondResult = spec.interpretResponse({body: secondResponse}, {bidRequests});
        expect(secondResult[0].creativeId).to.equal(456);
      });

      it('registers the second ad when no conflict - empty arrays', function() {
        var firstResponse = buildResponse('12345', 1, [], 123);
        var secondResponse = buildResponse('abcde', 2, [], 456);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        var secondResult = spec.interpretResponse({body: secondResponse}, {bidRequests});
        expect(secondResult[0].creativeId).to.equal(456);
      });

      it('doesnt register the second ad when it is blacklisted by the first', function() {
        var firstResponse = buildResponse('12345', 1, [2], 123);
        var secondResponse = buildResponse('abcde', 2, [], 456);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        var secondResult = spec.interpretResponse({body: secondResponse}, {bidRequests});
        expect(secondResult).to.be.empty;
      });

      it('doesnt register the second ad when it is blacklisting the first', function() {
        var firstResponse = buildResponse('12345', 1, [], 123);
        var secondResponse = buildResponse('abcde', 2, [1], 456);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        var secondResult = spec.interpretResponse({body: secondResponse}, {bidRequests});
        expect(secondResult).to.be.empty;
      });

      it('doesnt register the second ad when it has same ids as the first', function() {
        var firstResponse = buildResponse('12345', 1, [1], 123);
        var secondResponse = buildResponse('abcde', 1, [1], 456);

        var firstResult = spec.interpretResponse({body: firstResponse}, {bidRequests});
        var secondResult = spec.interpretResponse({body: secondResponse}, {bidRequests});
        expect(secondResult).to.be.empty;
      });
    });
  });

  describe('getUserSyncs', function () {
    it('returns undefined if disableUserSyncs not passed as bid request param ', function () {
      spec.buildRequests(bidRequestsWithUserId);
      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response).to.equal(undefined);
    });

    it('returns an iframe if enabled', function () {
      spec.buildRequests(bidRequests);

      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
    });

    it('returns an iframe with params if enabled', function () {
      top.window.invibes.optIn = 1;
      spec.buildRequests(bidRequests);

      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
      expect(response.url).to.include('optIn');
    });

    it('returns an iframe with params including if enabled', function () {
      top.window.invibes.optIn = 1;
      spec.buildRequests(bidRequests);

      global.document.cookie = 'ivbsdid={"id":"dvdjkams6nkq","cr":' + Date.now() + ',"hc":0}';
      SetBidderAccess();

      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
      expect(response.url).to.include('optIn');
      expect(response.url).to.include('ivbsdid');
    });

    it('returns an iframe with params including if enabled read from LocalStorage', function () {
      spec.buildRequests(bidRequests);
      top.window.invibes.optIn = 1;

      localStorage.ivbsdid = 'dvdjkams6nkq';
      SetBidderAccess();

      let response = spec.getUserSyncs({iframeEnabled: true});
      expect(response.type).to.equal('iframe');
      expect(response.url).to.include(SYNC_ENDPOINT);
      expect(response.url).to.include('optIn');
      expect(response.url).to.include('ivbsdid');
    });

    it('returns undefined if iframe not enabled ', function () {
      spec.buildRequests(bidRequests);

      let response = spec.getUserSyncs({iframeEnabled: false});
      expect(response).to.equal(undefined);
    });
  });
});
