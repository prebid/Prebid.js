import { expect } from 'chai';
import {
  getImp,
  replaceUsersyncMacros,
  setConsentStrings,
  setOrtb2Parameters,
  setEids,
  spec,
} from 'modules/nextMillenniumBidAdapter.js';

describe('nextMillenniumBidAdapterTests', () => {
  describe('function getImp', () => {
    const dataTests = [
      {
        title: 'imp - banner',
        data: {
          id: '123',
          bid: {
            mediaTypes: {banner: {sizes: [[300, 250], [320, 250]]}},
            adUnitCode: 'test-banner-1',
          },

          mediaTypes: {
            banner: {
              data: {sizes: [[300, 250], [320, 250]]},
              bidfloorcur: 'EUR',
              bidfloor: 1.11,
            },
          },
        },

        expected: {
          id: 'test-banner-1',
          bidfloorcur: 'EUR',
          bidfloor: 1.11,
          ext: {prebid: {storedrequest: {id: '123'}}},
          banner: {w: 300, h: 250, format: [{w: 300, h: 250}, {w: 320, h: 250}]},
        },
      },

      {
        title: 'imp - video',
        data: {
          id: '234',
          bid: {
            mediaTypes: {video: {playerSize: [400, 300], api: [2], placement: 1, plcmt: 1}},
            adUnitCode: 'test-video-1',
          },

          mediaTypes: {
            video: {
              data: {playerSize: [400, 300], api: [2], placement: 1, plcmt: 1},
              bidfloorcur: 'USD',
            },
          },
        },

        expected: {
          id: 'test-video-1',
          bidfloorcur: 'USD',
          ext: {prebid: {storedrequest: {id: '234'}}},
          video: {
            mimes: ['video/mp4', 'video/x-ms-wmv', 'application/javascript'],
            api: [2],
            placement: 1,
            plcmt: 1,
            w: 400,
            h: 300,
          },
        },
      },

      {
        title: 'imp - mediaTypes.video is empty',
        data: {
          id: '234',
          bid: {
            mediaTypes: {video: {w: 640, h: 480}},
            adUnitCode: 'test-video-2',
          },

          mediaTypes: {
            video: {
              data: {w: 640, h: 480},
              bidfloorcur: 'USD',
            },
          },
        },

        expected: {
          id: 'test-video-2',
          bidfloorcur: 'USD',
          ext: {prebid: {storedrequest: {id: '234'}}},
          video: {w: 640, h: 480, mimes: ['video/mp4', 'video/x-ms-wmv', 'application/javascript']},
        },
      },
    ];

    for (let {title, data, expected} of dataTests) {
      it(title, () => {
        const {bid, id, mediaTypes} = data;
        const imp = getImp(bid, id, mediaTypes);
        expect(imp).to.deep.equal(expected);
      });
    }
  });

  describe('function setConsentStrings', () => {
    const dataTests = [
      {
        title: 'full: uspConsent, gdprConsent and gppConsent',
        data: {
          postBody: {},
          bidderRequest: {
            uspConsent: '1---',
            gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7]},
            gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
            ortb2: {regs: {gpp: 'DSFHFHWEUYVDC', gpp_sid: [8, 9, 10]}},
          },
        },

        expected: {
          user: {ext: {consent: 'kjfdniwjnifwenrif3'}},
          regs: {
            gpp: 'DBACNYA~CPXxRfAPXxR',
            gpp_sid: [7],
            ext: {gdpr: 1, us_privacy: '1---'},
          },
        },
      },

      {
        title: 'gdprConsent(false) and ortb2(gpp)',
        data: {
          postBody: {},
          bidderRequest: {
            gdprConsent: {consentString: 'ewtewbefbawyadexv', gdprApplies: false},
            ortb2: {regs: {gpp: 'DSFHFHWEUYVDC', gpp_sid: [8, 9, 10]}},
          },
        },

        expected: {
          user: {ext: {consent: 'ewtewbefbawyadexv'}},
          regs: {
            gpp: 'DSFHFHWEUYVDC',
            gpp_sid: [8, 9, 10],
            ext: {gdpr: 0},
          },
        },
      },

      {
        title: 'gdprConsent(false)',
        data: {
          postBody: {},
          bidderRequest: {gdprConsent: {gdprApplies: false}},
        },

        expected: {
          regs: {ext: {gdpr: 0}},
        },
      },

      {
        title: 'empty',
        data: {
          postBody: {},
          bidderRequest: {},
        },

        expected: {},
      },
    ];

    for (let {title, data, expected} of dataTests) {
      it(title, () => {
        const {postBody, bidderRequest} = data;
        setConsentStrings(postBody, bidderRequest);
        expect(postBody).to.deep.equal(expected);
      });
    }
  });

  describe('function replaceUsersyncMacros', () => {
    const dataTests = [
      {
        title: 'url with all macroses - consents full: uspConsent, gdprConsent and gppConsent',
        data: {
          url: 'https://some.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}&type={{.TYPE_PIXEL}}',
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
          type: 'image',
        },

        expected: 'https://some.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8&type=image',
      },

      {
        title: 'url with some macroses - consents full: uspConsent, gdprConsent and gppConsent',
        data: {
          url: 'https://some.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&type={{.TYPE_PIXEL}}',
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: false},
          type: 'iframe',
        },

        expected: 'https://some.url?gdpr=0&gdpr_consent=kjfdniwjnifwenrif3&type=iframe',
      },

      {
        title: 'url without macroses - consents full: uspConsent, gdprConsent and gppConsent',
        data: {
          url: 'https://some.url?param1=value1&param2=value2',
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: false},
          type: 'iframe',
        },

        expected: 'https://some.url?param1=value1&param2=value2',
      },

      {
        title: 'url with all macroses - consents are empty',
        data: {
          url: 'https://some.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}&type={{.TYPE_PIXEL}}',
        },

        expected: 'https://some.url?gdpr=0&gdpr_consent=&us_privacy=&gpp=&gpp_sid=&type=',
      },
    ];

    for (let {title, data, expected} of dataTests) {
      it(title, () => {
        const {url, gdprConsent, uspConsent, gppConsent, type} = data;
        const newUrl = replaceUsersyncMacros(url, gdprConsent, uspConsent, gppConsent, type);
        expect(newUrl).to.equal(expected);
      });
    }
  });

  describe('function spec.getUserSyncs', () => {
    const dataTests = [
      {
        title: 'pixels from responses ({iframeEnabled: true, pixelEnabled: true})',
        data: {
          syncOptions: {iframeEnabled: true, pixelEnabled: true},
          responses: [
            {body: {ext: {sync: {
              image: [
                'https://some.1.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.2.url?us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.3.url?param=1234',
              ],

              iframe: [
                'https://some.4.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.5.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}',
              ],
            }}}},

            {body: {ext: {sync: {
              iframe: [
                'https://some.6.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.7.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}',
              ],
            }}}},

            {body: {ext: {sync: {
              image: [
                'https://some.8.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
              ],
            }}}},
          ],

          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [
          {type: 'image', url: 'https://some.1.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'image', url: 'https://some.2.url?us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'image', url: 'https://some.3.url?param=1234'},
          {type: 'iframe', url: 'https://some.4.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'iframe', url: 'https://some.5.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---'},
          {type: 'iframe', url: 'https://some.6.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'iframe', url: 'https://some.7.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---'},
          {type: 'image', url: 'https://some.8.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
        ],
      },

      {
        title: 'pixels from responses ({iframeEnabled: true, pixelEnabled: false})',
        data: {
          syncOptions: {iframeEnabled: true, pixelEnabled: false},
          responses: [
            {body: {ext: {sync: {
              image: [
                'https://some.1.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.2.url?us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.3.url?param=1234',
              ],

              iframe: [
                'https://some.4.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.5.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}',
              ],
            }}}},
          ],

          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [
          {type: 'iframe', url: 'https://some.4.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'iframe', url: 'https://some.5.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---'},
        ],
      },

      {
        title: 'pixels from responses ({iframeEnabled: false, pixelEnabled: true})',
        data: {
          syncOptions: {iframeEnabled: false, pixelEnabled: true},
          responses: [
            {body: {ext: {sync: {
              image: [
                'https://some.1.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.2.url?us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.3.url?param=1234',
              ],

              iframe: [
                'https://some.4.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}',
                'https://some.5.url?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}',
              ],
            }}}},
          ],

          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [
          {type: 'image', url: 'https://some.1.url?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'image', url: 'https://some.2.url?us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8'},
          {type: 'image', url: 'https://some.3.url?param=1234'},
        ],
      },

      {
        title: 'pixels - responses is empty ({iframeEnabled: true, pixelEnabled: true})',
        data: {
          syncOptions: {iframeEnabled: true, pixelEnabled: true},
          responses: [],
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [
          {type: 'image', url: 'https://cookies.nextmillmedia.com/sync?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8&type=image'},
          {type: 'iframe', url: 'https://cookies.nextmillmedia.com/sync?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8&type=iframe'},
        ],
      },

      {
        title: 'pixels - responses is empty ({iframeEnabled: true, pixelEnabled: false})',
        data: {
          syncOptions: {iframeEnabled: true, pixelEnabled: false},
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [
          {type: 'iframe', url: 'https://cookies.nextmillmedia.com/sync?gdpr=1&gdpr_consent=kjfdniwjnifwenrif3&us_privacy=1---&gpp=DBACNYA~CPXxRfAPXxR&gpp_sid=7,8&type=iframe'},
        ],
      },

      {
        title: 'pixels - responses is empty ({iframeEnabled: false, pixelEnabled: false})',
        data: {
          syncOptions: {iframeEnabled: false, pixelEnabled: false},
          uspConsent: '1---',
          gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7, 8]},
          gdprConsent: {consentString: 'kjfdniwjnifwenrif3', gdprApplies: true},
        },

        expected: [],
      },
    ];

    for (let {title, data, expected} of dataTests) {
      it(title, () => {
        const {syncOptions, responses, gdprConsent, uspConsent, gppConsent} = data;
        const pixels = spec.getUserSyncs(syncOptions, responses, gdprConsent, uspConsent, gppConsent);
        expect(pixels).to.deep.equal(expected);
      });
    }
  });

  describe('function setOrtb2Parameters', () => {
    const dataTests = [
      {
        title: 'site.pagecat, site.content.cat and site.content.language',
        data: {
          postBody: {},
          ortb2: {site: {
            pagecat: ['IAB2-11', 'IAB2-12', 'IAB2-14'],
            content: {cat: ['IAB2-11', 'IAB2-12', 'IAB2-14'], language: 'EN'},
          }},
        },

        expected: {site: {
          pagecat: ['IAB2-11', 'IAB2-12', 'IAB2-14'],
          content: {cat: ['IAB2-11', 'IAB2-12', 'IAB2-14'], language: 'EN'},
        }},
      },

      {
        title: 'site.keywords, site.content.keywords and user.keywords',
        data: {
          postBody: {},
          ortb2: {
            user: {keywords: 'key7,key8,key9'},
            site: {
              keywords: 'key1,key2,key3',
              content: {keywords: 'key4,key5,key6'},
            },
          },
        },

        expected: {
          user: {keywords: 'key7,key8,key9'},
          site: {
            keywords: 'key1,key2,key3',
            content: {keywords: 'key4,key5,key6'},
          },
        },
      },

      {
        title: 'only site.content.language',
        data: {
          postBody: {site: {domain: 'some.domain'}},
          ortb2: {site: {
            content: {language: 'EN'},
          }},
        },

        expected: {site: {
          domain: 'some.domain',
          content: {language: 'EN'},
        }},
      },

      {
        title: 'object ortb2 is empty',
        data: {
          postBody: {imp: []},
        },

        expected: {imp: []},
      },
    ];

    for (let {title, data, expected} of dataTests) {
      it(title, () => {
        const {postBody, ortb2} = data;
        setOrtb2Parameters(postBody, ortb2);
        expect(postBody).to.deep.equal(expected);
      });
    };
  });

  describe('function setEids', () => {
    const dataTests = [
      {
        title: 'setEids - userIdAsEids is empty',
        data: {
          postBody: {},
          bid: {
            userIdAsEids: undefined,
          },
        },

        expected: {},
      },

      {
        title: 'setEids - userIdAsEids - array is empty',
        data: {
          postBody: {},
          bid: {
            userIdAsEids: [],
          },
        },

        expected: {},
      },

      {
        title: 'setEids - userIdAsEids is',
        data: {
          postBody: {},
          bid: {
            userIdAsEids: [
              {
                source: '33across.com',
                uids: [{id: 'some-random-id-value', atype: 1}],
              },

              {
                source: 'utiq.com',
                uids: [{id: 'some-random-id-value', atype: 1}],
              },
            ],
          },
        },

        expected: {
          user: {
            eids: [
              {
                source: '33across.com',
                uids: [{id: 'some-random-id-value', atype: 1}],
              },

              {
                source: 'utiq.com',
                uids: [{id: 'some-random-id-value', atype: 1}],
              },
            ],
          },
        },
      },
    ];

    for (let { title, data, expected } of dataTests) {
      it(title, () => {
        const { postBody, bid } = data;
        setEids(postBody, bid);
        expect(postBody).to.deep.equal(expected);
      });
    }
  });

  const bidRequestData = [{
    adUnitCode: 'test-div',
    bidId: 'bid1234',
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    bidder: 'nextMillennium',
    params: { placement_id: '-1' },
    sizes: [[300, 250]],
    uspConsent: '1---',
    gppConsent: {gppString: 'DBACNYA~CPXxRfAPXxR', applicableSections: [7]},
    gdprConsent: {
      consentString: 'kjfdniwjnifwenrif3',
      gdprApplies: true
    },

    ortb2: {
      device: {
        w: 1500,
        h: 1000
      },

      site: {
        domain: 'example.com',
        page: 'http://example.com'
      }
    }
  }];

  const serverResponse = {
    body: {
      id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
      seatbid: [
        {
          bid: [
            {
              id: '7457329903666272789',
              price: 0.5,
              adm: 'Hello! It\'s a test ad!',
              adid: '96846035',
              adomain: ['test.addomain.com'],
              w: 300,
              h: 250
            }
          ]
        }
      ],
      cur: 'USD',
      ext: {
        sync: {
          image: ['urlA?gdpr={{.GDPR}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}'],
          iframe: ['urlB'],
        }
      }
    }
  };

  const bidRequestDataGI = [
    {
      adUnitCode: 'test-banner-gi',
      bidId: 'bid1234',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidder: 'nextMillennium',
      params: { group_id: '1234' },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },

      sizes: [[300, 250]],
      uspConsent: '1---',
      gdprConsent: {
        consentString: 'kjfdniwjnifwenrif3',
        gdprApplies: true
      }
    },

    {
      adUnitCode: 'test-banner-gi',
      bidId: 'bid1234',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidder: 'nextMillennium',
      params: { group_id: '1234' },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 300]]
        }
      },

      sizes: [[300, 250], [300, 300]],
      uspConsent: '1---',
      gdprConsent: {
        consentString: 'kjfdniwjnifwenrif3',
        gdprApplies: true
      }
    },

    {
      adUnitCode: 'test-video-gi',
      bidId: 'bid1234',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidder: 'nextMillennium',
      params: { group_id: '1234' },
      mediaTypes: {
        video: {
          playerSize: [640, 480],
        }
      },

      uspConsent: '1---',
      gdprConsent: {
        consentString: 'kjfdniwjnifwenrif3',
        gdprApplies: true
      }
    },
  ];

  it('validate_generated_params', function() {
    const request = spec.buildRequests(bidRequestData, {bidderRequestId: 'mock-uuid'});
    expect(request[0].bidId).to.equal('bid1234');
    expect(JSON.parse(request[0].data).id).to.exist;
  });

  it('use parameters group_id', function() {
    for (let test of bidRequestDataGI) {
      const request = spec.buildRequests([test]);
      const requestData = JSON.parse(request[0].data);
      const storeRequestId = requestData.ext.prebid.storedrequest.id;
      const templateRE = /^g[1-9]\d*;(?:[1-9]\d*x[1-9]\d*\|)*[1-9]\d*x[1-9]\d*;/;
      expect(templateRE.test(storeRequestId)).to.be.true;
    };
  });

  it('Check if refresh_count param is incremented', function() {
    const request = spec.buildRequests(bidRequestData);
    expect(JSON.parse(request[0].data).ext.nextMillennium.refresh_count).to.equal(1);
  });

  it('Check if domain was added', function() {
    const request = spec.buildRequests(bidRequestData)
    expect(JSON.parse(request[0].data).site.domain).to.exist
  })

  it('Check if elOffsets was added', function() {
    const request = spec.buildRequests(bidRequestData)
    expect(JSON.parse(request[0].data).ext.nextMillennium.elOffsets).to.be.an('object')
  })

  it('Check if imp object was added', function() {
    const request = spec.buildRequests(bidRequestData)
    expect(JSON.parse(request[0].data).imp).to.be.an('array')
  });

  it('Check if imp prebid stored id is correct', function() {
    const request = spec.buildRequests(bidRequestData)
    const requestData = JSON.parse(request[0].data);
    const storedReqId = requestData.ext.prebid.storedrequest.id;
    expect(requestData.imp[0].ext.prebid.storedrequest.id).to.equal(storedReqId)
  });

  it('validate_response_params', function() {
    let bids = spec.interpretResponse(serverResponse, bidRequestData[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('96846035');
    expect(bid.ad).to.equal('Hello! It\'s a test ad!');
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('validate_videowrapper_response_params', function() {
    const serverResponse = {
      body: {
        id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
        seatbid: [
          {
            bid: [
              {
                id: '7457329903666272789',
                price: 0.5,
                adm: 'https://some_vast_host.com/vast.xml',
                adid: '96846035',
                adomain: ['test.addomain.com'],
                w: 300,
                h: 250,
                ext: {
                  prebid: {
                    type: 'video'
                  }
                }
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('96846035');
    expect(bid.vastUrl).to.equal('https://some_vast_host.com/vast.xml');
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('validate_videoxml_response_params', function() {
    const serverResponse = {
      body: {
        id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
        seatbid: [
          {
            bid: [
              {
                id: '7457329903666272789',
                price: 0.5,
                adm: '<vast><ad></ad></vast>',
                adid: '96846035',
                adomain: ['test.addomain.com'],
                w: 300,
                h: 250,
                ext: {
                  prebid: {
                    type: 'video'
                  }
                }
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('96846035');
    expect(bid.vastXml).to.equal('<vast><ad></ad></vast>');
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('Check function of getting URL for sending statistics data', function() {
    const dataForTests = [
      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'appnexus',
          bids: [{bidder: 'appnexus', params: {}}],
        },

        expected: undefined,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'appnexus',
          bids: [{bidder: 'appnexus', params: {placement_id: '807'}}],
        },

        expected: undefined,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'nextMillennium',
          bids: [{bidder: 'nextMillennium', params: {placement_id: '807'}}],
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'nextMillennium',
          bids: [
            {bidder: 'nextMillennium', params: {placement_id: '807'}},
            {bidder: 'nextMillennium', params: {placement_id: '111'}},
          ],
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&placements=807;111',
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'nextMillennium',
          bids: [{bidder: 'nextMillennium', params: {placement_id: '807', group_id: '123'}}],
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&groups=123',
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'nextMillennium',
          bids: [
            {bidder: 'nextMillennium', params: {placement_id: '807', group_id: '123'}},
            {bidder: 'nextMillennium', params: {group_id: '456'}},
            {bidder: 'nextMillennium', params: {placement_id: '222'}},
          ],
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&groups=123;456&placements=222',
      },

      {
        eventName: 'bidResponse',
        bid: {
          bidderCode: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'bidResponse',
        bid: {
          bidderCode: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidResponse&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        eventName: 'noBid',
        bid: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'noBid',
        bid: {
          bidder: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=noBid&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        eventName: 'bidTimeout',
        bid: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'bidTimeout',
        bid: {
          bidder: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://report2.hb.brainlyads.com/statistics/metric?event=bidTimeout&bidder=nextMillennium&source=pbjs&placements=807',
      },
    ];

    for (let {eventName, bid, expected} of dataForTests) {
      const url = spec._getUrlPixelMetric(eventName, bid);
      expect(url).to.equal(expected);
    };
  })
});
