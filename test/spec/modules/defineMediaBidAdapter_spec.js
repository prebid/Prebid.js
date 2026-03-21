// jshint esversion: 6, es3: false, node: true
import { assert } from 'chai';
import { spec } from 'modules/defineMediaBidAdapter.js';
import { deepClone } from 'src/utils.js';

describe('Define Media Bid Adapter', function () {
  const mockValidBids = [
    {
      "bidder": "defineMedia",
      "params": {
        "supplierDomainName": "traffective.com",
        "devMode": false
      },
      "mediaTypes": {
        "banner": {
          "sizes": [
            [
              1,
              1
            ],
            [
              300,
              250
            ]
          ]
        }
      },
      "adUnitCode": "custom-adunit-code",
      "transactionId": "9af02bbf-558f-4328-a7b3-0b67bac44dbc",
      "adUnitId": "e9a971c1-7ce9-4bcf-8b64-611e79f6e35c",
      "sizes": [
        [
          1,
          1
        ],
        [
          300,
          250
        ]
      ],
      "bidId": "464ae0039a4147",
      "bidderRequestId": "3a7736f5f19f638",
      "auctionId": "586233c7-4e5d-4231-9f06-b1ff37b0db53",
      "src": "client",
      "auctionsCount": 1,
      "bidRequestsCount": 22,
      "bidderRequestsCount": 1,
      "bidderWinsCount": 0,
      "deferBilling": false,
    },
    {
      "bidder": "defineMedia",
      "params": {
        "supplierDomainName": "traffective.com",
        "devMode": false
      },
      "mediaTypes": {
        "banner": {
          "sizes": [
            [
              300,
              250
            ],
            [
              1,
              1
            ]
          ]
        }
      },
      "adUnitCode": "custim-adunit-code-2",
      "transactionId": "3f7fa504-f29f-49cc-8edb-31f8b404e27f",
      "adUnitId": "1e5fdfe3-b5c7-4dd4-83d1-770bce897773",
      "sizes": [
        [
          300,
          250
        ],
        [
          1,
          1
        ]
      ],
      "bidId": "53836dbf7d7aac8",
      "bidderRequestId": "3a7736f5f19f638",
      "auctionId": "586233c7-4e5d-4231-9f06-b1ff37b0db53",
      "src": "client",
      "auctionsCount": 1,
      "bidRequestsCount": 19,
      "bidderRequestsCount": 1,
      "bidderWinsCount": 0,
      "deferBilling": false,
    }
  ]

  const mockBidderRequest = {
    "bidderCode": "defineMedia",
    "auctionId": "586233c7-4e5d-4231-9f06-b1ff37b0db53",
    "bidderRequestId": "3a7736f5f19f638",
    "bids": mockValidBids,
    "auctionStart": 1753448647982,
    "timeout": 1500,
    "refererInfo": {
      "reachedTop": true,
      "isAmp": false,
      "numIframes": 0,
      "stack": [],
      "topmostLocation": "https://www.any-random-page.com/",
      "location": "https://www.any-random-page.com/",
      "canonicalUrl": "https://www.any-random-page.com/",
      "page": "https://www.any-random-page.com/",
      "domain": "www.any-random-page.com",
      "ref": "https://www.any-random-page.com/",
      "legacy": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "referer": "https://www.any-random-page.com/",
        "canonicalUrl": "https://www.any-random-page.com/"
      }
    },
    "ortb2": {
      "source": {},
      "site": {
        "domain": "any-random-page.com",
        "publisher": {
          "domain": "any-random-page.com"
        },
        "page": "https://www.any-random-page.com/",
        "ref": "https://www.any-random-page.com/",
        "content": {
          "data": [
            {
              "name": "articlegenius.ai",
              "ext": {
                "segtax": 7
              },
              "segment": [
                {
                  "id": "186"
                },
                {
                  "id": "387"
                },
                {
                  "id": "400"
                }
              ]
            }
          ],
          "language": "de"
        },
        "ext": {
          "data": {
            "pagetype": "article",
            "category": "localnews",
            "documentLang": "de",
            "adg_rtd": {
              "uid": "c7910f59-446a-4786-8826-8181e884afd6",
              "pageviewId": "915818a5-73f2-4efb-8eff-dd312755dd4a",
              "features": {
                "page_dimensions": "1235x6597",
                "viewport_dimensions": "1250x959",
                "user_timestamp": "1753455847",
                "dom_loading": "204"
              },
              "session": {
                "rnd": 0.8341928086704196,
                "pages": 4,
                "new": false,
                "vwSmplg": 0.1,
                "vwSmplgNxt": 0.05,
                "expiry": 1753450360922,
                "lastActivityTime": 1753448560922,
                "id": "bd8b3c7a-ff7f-4433-a5fd-a06cf0fa6e1f"
              }
            }
          }
        }
      },
      "regs": {
        "ext": {
          "gdpr": 1
        }
      },
      "user": {
        "ext": {
          "consent": "RANDOMCONSENTSTRING",
          "eids": [
            {
              "source": "criteo.com",
              "uids": [
                {
                  "id": "random-id",
                  "atype": 1
                }
              ]
            }
          ]
        }
      },
      "ext": {
        "prebid": {
          "adServerCurrency": "EUR"
        }
      },
      "device": {
        "w": 1920,
        "h": 1080,
        "dnt": 0,
        "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "language": "de",
        "ext": {
          "vpw": 1250,
          "vph": 959
        },
        "sua": {
          "source": 1,
          "platform": {
            "brand": "Linux"
          },
          "browsers": [
            {
              "brand": "Google Chrome",
              "version": [
                "137"
              ]
            },
            {
              "brand": "Chromium",
              "version": [
                "137"
              ]
            },
            {
              "brand": "Not/A)Brand",
              "version": [
                "24"
              ]
            }
          ],
          "mobile": 0
        }
      }
    },
    "gdprConsent": {
      "consentString": "RANDOMCONSENTSTRING",
      "vendorData": {
        "cmpId": 21,
        "cmpVersion": 2,
        "gdprApplies": true,
        "tcfPolicyVersion": 5,
        "tcString": "RANDOMTCSTRING",
        "listenerId": 12,
        "eventStatus": "tcloaded",
        "cmpStatus": "loaded",
        "isServiceSpecific": true,
        "useNonStandardTexts": false,
        "publisherCC": "DE",
        "purposeOneTreatment": false,
        "outOfBand": {
          "allowedVendors": {},
          "disclosedVendors": {}
        },
        "purpose": {
          "consents": {
            "1": true,
            "2": true,
            "3": true,
            "4": true,
            "5": true,
            "6": true,
            "7": true,
            "8": true,
            "9": true,
            "10": true,
            "11": true
          },
          "legitimateInterests": {
            "1": false,
            "2": true,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": true,
            "8": true,
            "9": true,
            "10": true,
            "11": true
          }
        },
        "vendor": {
          "consents": {
            "755": true,
          },
          "legitimateInterests": {
            "755": true,
          }
        },
        "specialFeatureOptins": {
          "1": true,
          "2": true
        },
        "publisher": {
          "consents": {},
          "legitimateInterests": {},
          "customPurpose": {
            "consents": {},
            "legitimateInterests": {}
          },
          "restrictions": {}
        },
        "opencmp": {
          "consentType": "tcf",
          "googleConsent": {
            "ad_storage": "granted",
            "ad_user_data": "granted",
            "ad_personalization": "granted",
            "analytics_storage": "granted"
          }
        },
        "addtlConsent": "2~89~dv.",
        "customVendors": {
          "consents": {
            "45": true
          },
          "legitimateInterests": {
            "45": false
          }
        }
      },
      "gdprApplies": true,
      "apiVersion": 2,
      "addtlConsent": "2~89~dv."
    },
    "start": 1753448648053
  }

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      for (const bidRequest of mockValidBids) {
        assert.isTrue(spec.isBidRequestValid(bidRequest));
      }
    });

    it('should return false when supplierDomainName is not set', function () {
      let invalidBids = deepClone(mockValidBids);
      for (const bidRequest of invalidBids) {
        bidRequest.params = {};
        assert.isFalse(spec.isBidRequestValid(bidRequest));
      }
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      let requests = spec.buildRequests(mockValidBids, mockBidderRequest);
      for (const request of requests) {
        assert.equal(request.method, 'POST');
        assert.ok(request.data);
      }
    });

    it('should have default request structure', function () {
      let keys = 'id,imp,site,source,device'.split(',');
      let requests = spec.buildRequests(mockValidBids, mockBidderRequest);

      for (const request of requests) {
        let data = Object.keys(request.data);
        assert.includeDeepMembers(data, keys);
      }
    });

    it('Verify the site url', function () {
      let siteUrl = 'https://www.yourdomain.tld/your-directory/';
      let bidderRequest = deepClone(mockBidderRequest);

      bidderRequest.ortb2.site.page = siteUrl;
      bidderRequest.refererInfo.page = siteUrl;

      let requests = spec.buildRequests(mockValidBids, bidderRequest);

      for (const request of requests) {
        assert.equal(request.data.site.page, siteUrl);
      }
    });
  });
})

describe('interpretResponse', function () {
  const formerBids = [
    {
      "bidder": "defineMedia",
      "params": {
        "supplierDomainName": "traffective.com",
        "devMode": false
      },
      "mediaTypes": {
        "banner": {
          "sizes": [
            [
              1,
              1
            ],
            [
              300,
              250
            ]
          ]
        },
      },
      "adUnitCode": "custom-adunit-code",
      "transactionId": null,
      "adUnitId": "1eb2de11-c637-4175-b560-002fc4160841",
      "sizes": [
        [
          1,
          1
        ],
        [
          300,
          250
        ]
      ],
      "bidId": "8566b4bbc519b58",
      "bidderRequestId": "7a7870d573e715",
      "auctionId": null,
      "src": "client",
      "auctionsCount": 1,
      "bidRequestsCount": 22,
      "bidderRequestsCount": 1,
      "bidderWinsCount": 0,
      "deferBilling": false,
      "ortb2": {
        "source": {},
        "site": {
          "domain": "any-random-page.com",
          "publisher": {
            "domain": "any-random-page.com"
          },
          "page": "https://www.any-random-page.com/",
          "ref": "https://www.any-random-page.com/",
          "content": {
            "data": [
              {
                "name": "articlegenius.ai",
                "ext": {
                  "segtax": 7
                },
                "segment": [
                  {
                    "id": "186"
                  },
                  {
                    "id": "387"
                  },
                  {
                    "id": "400"
                  }
                ]
              }
            ],
            "language": "de"
          },
          "ext": {
            "data": {
              "pagetype": "article",
              "category": "localnews",
              "documentLang": "de"
            }
          }
        },
        "device": {
          "w": 1920,
          "h": 1080,
          "dnt": 0,
          "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          "language": "de",
          "ext": {
            "vpw": 1250,
            "vph": 959
          },
          "sua": {
            "source": 1,
            "platform": {
              "brand": "Linux"
            },
            "browsers": [
              {
                "brand": "Google Chrome",
                "version": [
                  "137"
                ]
              },
              {
                "brand": "Chromium",
                "version": [
                  "137"
                ]
              },
              {
                "brand": "Not/A)Brand",
                "version": [
                  "24"
                ]
              }
            ],
            "mobile": 0
          }
        }
      }
    }
  ]
  const formerBidRequest = {
    "bidderCode": "defineMedia",
    "auctionId": "0720d855-f13d-41b7-b5cf-41d6c89454af",
    "bidderRequestId": "7a7870d573e715",
    "bids": formerBids,
    "auctionStart": 1753451739223,
    "timeout": 1500,
    "refererInfo": {
      "reachedTop": true,
      "isAmp": false,
      "numIframes": 0,
      "stack": [
        "https://www.any-random-page.com/"
      ],
      "topmostLocation": "https://www.any-random-page.com/",
      "location": "https://www.any-random-page.com/",
      "canonicalUrl": "https://www.any-random-page.com/",
      "page": "https://www.any-random-page.com/",
      "domain": "www.any-random-page.com",
      "ref": "https://www.any-random-page.com/",
      "legacy": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [
          "https://www.any-random-page.com/"
        ],
        "referer": "https://www.any-random-page.com/",
        "canonicalUrl": "https://www.any-random-page.com"
      }
    },
    "ortb2": {
      "source": {},
      "site": {
        "domain": "any-random-page.com",
        "publisher": {
          "domain": "any-random-page.com"
        },
        "page": "https://www.any-random-page.com/",
        "ref": "https://www.any-random-page.com/",
        "content": {
          "data": [
            {
              "name": "articlegenius.ai",
              "ext": {
                "segtax": 7
              },
              "segment": [
                {
                  "id": "186"
                },
                {
                  "id": "387"
                },
                {
                  "id": "400"
                }
              ]
            }
          ],
          "language": "de"
        },
        "ext": {
          "data": {
            "pagetype": "article",
            "category": "localnews",
            "documentLang": "de"
          }
        }
      },
      "device": {
        "w": 1920,
        "h": 1080,
        "dnt": 0,
        "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "language": "de",
        "ext": {
          "vpw": 1250,
          "vph": 959
        },
        "sua": {
          "source": 1,
          "platform": {
            "brand": "Linux"
          },
          "browsers": [
            {
              "brand": "Google Chrome",
              "version": [
                "137"
              ]
            },
            {
              "brand": "Chromium",
              "version": [
                "137"
              ]
            },
            {
              "brand": "Not/A)Brand",
              "version": [
                "24"
              ]
            }
          ],
          "mobile": 0
        }
      }
    },
    "start": 1753451739307
  }

  const goodBannerRequest = {
    "imp": [
      {
        "id": "8566b4bbc519b58",
        "banner": {
          "topframe": 0,
          "format": [
            {
              "w": 1,
              "h": 1
            },
            {
              "w": 300,
              "h": 250
            }
          ]
        },
        "secure": 1,
      }
    ],
    "source": {
      "schain": {
        "complete": 1,
        "nodes": [
          {
            "asi": "traffective.com"
          }
        ]
      }
    },
    "site": {
      "domain": "any-random-page.com",
      "publisher": {
        "domain": "any-random-page.com"
      },
      "page": "https://www.any-random-page.com/",
      "ref": "https://www.any-random-page.com/",
      "content": {
        "data": [
          {
            "name": "articlegenius.ai",
            "ext": {
              "segtax": 7
            },
            "segment": [
              {
                "id": "186"
              },
              {
                "id": "387"
              },
              {
                "id": "400"
              }
            ]
          }
        ],
        "language": "de"
      },
      "ext": {
        "data": {
          "pagetype": "article",
          "category": "localnews",
          "documentLang": "de"
        }
      }
    },
    "device": {
      "w": 1920,
      "h": 1080,
      "dnt": 0,
      "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "language": "de",
      "ext": {
        "vpw": 1250,
        "vph": 959
      },
      "sua": {
        "source": 1,
        "platform": {
          "brand": "Linux"
        },
        "browsers": [
          {
            "brand": "Google Chrome",
            "version": [
              "137"
            ]
          },
          {
            "brand": "Chromium",
            "version": [
              "137"
            ]
          },
          {
            "brand": "Not/A)Brand",
            "version": [
              "24"
            ]
          }
        ],
        "mobile": 0
      }
    },
    // "id": "15009fd8-a057-458f-9819-5ddcbf474cfe", //this is a random uuid, so it is not set here
    "test": 0,
    "tmax": 1500
  }
  const goodBannerResponse = {
    // "id": "15009fd8-a057-458f-9819-5ddcbf474cfe", //this is a random uuid, so it is not set here
    "seatbid": [
      {
        "bid": [
          {
            "id": "23da7c99-8945-4ff9-6426-3da72d25e73a",
            "impid": "8566b4bbc519b58",
            "price": 1.0,
            "burl": "https://somewhere-in-the-internet.com",
            "lurl": "https://somewhere-in-the-internet.com",
            "adm": "<p>ad markup</p>",
            "adid": "e44efd3c-0b58-4834-8fc0-d9d3f658fa1c",
            "adomain": [
              "definemedia.de"
            ],
            "crid": "dim_playout$6b3082ae93341939",
            "w": 800,
            "h": 250,
            "mtype": 1,
            "ext": {
              "prebid": {
                "type": "banner"
              }
            }
          }
        ],
        "seat": "definemedia"
      }
    ],
    "cur": "EUR"
  }
  const goodInterpretedBannerResponses = [
    {
      "mediaType": "banner",
      "ad": "<p>ad markup</p>",
      "requestId": "8566b4bbc519b58",
      "seatBidId": "23da7c99-8945-4ff9-6426-3da72d25e73a",
      "cpm": 1.0,
      "currency": "EUR",
      "width": 800,
      "height": 250,
      "creative_id": "dim_playout$6b3082ae93341939",
      "creativeId": "dim_playout$6b3082ae93341939",
      "burl": "https://somewhere-in-the-internet.com",
      "ttl": 1000,
      "netRevenue": true,
      "meta": { "advertiserDomains": ["definemedia.de"] }
    }
  ]
  it('should return null if body is missing or empty', function () {
    let serverResponse = {
      body: null
    }
    let request = {
      data: deepClone(goodBannerRequest)
    }

    const result = spec.interpretResponse(serverResponse, request);
    assert.equal(result.length, 0);
  });

  it('should return the correct params', function () {
    const computedRequest = spec.buildRequests(formerBids, formerBidRequest)[0]
    let computedRequestExpected = deepClone(computedRequest.data);
    assert.deepInclude(computedRequestExpected, goodBannerRequest)
    let serverResponse = {
      body: deepClone(goodBannerResponse)
    }
    const result = spec.interpretResponse(serverResponse, computedRequest);
    assert.notEqual(result, null);

    const bid = result[0].cpm
    assert.isAbove(bid, 0.01, "Bid price should be higher 0.0");
    assert.deepInclude(result[0], goodInterpretedBannerResponses[0])
  });
})
