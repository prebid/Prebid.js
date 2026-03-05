import { expect } from 'chai';
import {
  getImp,
  setImpPos,
  getSourceObj,
  getExtNextMilImp,
  replaceUsersyncMacros,
  setConsentStrings,
  setOrtb2Parameters,
  setEids,
  spec,
  ALLOWED_ORTB2_PARAMETERS,
} from 'modules/nextMillenniumBidAdapter.js';

describe('nextMillenniumBidAdapterTests', () => {
  describe('function getImp', () => {
    const dataTests = [
      {
        title: 'imp - banner',
        data: {
          impId: '5',
          id: '123',
          bid: {
            mediaTypes: {banner: {sizes: [[300, 250], [320, 250]]}},
            adUnitCode: 'test-banner-1',
            bidId: 'e36ea395f67f',
          },

          mediaTypes: {
            banner: {
              data: {sizes: [[300, 250], [320, 250]]},
              bidfloorcur: 'EUR',
              bidfloor: 1.11,
              pos: 3,
            },
          },
        },

        expected: {
          id: '5',
          bidfloorcur: 'EUR',
          bidfloor: 1.11,
          ext: {prebid: {storedrequest: {id: '123'}}},
          banner: {
            pos: 3,
            w: 300,
            h: 250,
            format: [{w: 300, h: 250}, {w: 320, h: 250}],
          },
        },
      },

      {
        title: 'imp - video',
        data: {
          impId: '3',
          id: '234',
          bid: {
            mediaTypes: {video: {playerSize: [400, 300], api: [2], placement: 1, plcmt: 1}},
            adUnitCode: 'test-video-1',
            bidId: 'e36ea395f67f',
          },

          mediaTypes: {
            video: {
              data: {playerSize: [400, 300], api: [2], placement: 1, plcmt: 1},
              bidfloorcur: 'USD',
              pos: 0,
            },
          },
        },

        expected: {
          id: '3',
          bidfloorcur: 'USD',
          ext: {prebid: {storedrequest: {id: '234'}}},
          video: {
            mimes: ['video/mp4', 'video/x-ms-wmv', 'application/javascript'],
            api: [2],
            placement: 1,
            plcmt: 1,
            w: 400,
            h: 300,
            pos: 0,
          },
        },
      },

      {
        title: 'imp - mediaTypes.video is empty',
        data: {
          impId: '4',
          id: '234',
          bid: {
            mediaTypes: {video: {w: 640, h: 480}},
            bidId: 'e36ea395f67f',
          },

          mediaTypes: {
            video: {
              data: {w: 640, h: 480},
              bidfloorcur: 'USD',
            },
          },
        },

        expected: {
          id: '4',
          bidfloorcur: 'USD',
          ext: {prebid: {storedrequest: {id: '234'}}},
          video: {w: 640, h: 480, mimes: ['video/mp4', 'video/x-ms-wmv', 'application/javascript']},
        },
      },

      {
        title: 'imp with gpid',
        data: {
          impId: '2',
          id: '123',
          bid: {
            mediaTypes: {banner: {sizes: [[300, 250], [320, 250]]}},
            adUnitCode: 'test-gpid-1',
            bidId: 'e36ea395f67a',
            ortb2Imp: {ext: {gpid: 'imp-gpid-123'}},
          },

          mediaTypes: {
            banner: {
              data: {sizes: [[300, 250], [320, 250]]},
            },
          },
        },

        expected: {
          id: '2',
          ext: {
            prebid: {storedrequest: {id: '123'}},
            gpid: 'imp-gpid-123'
          },
          banner: {w: 300, h: 250, format: [{w: 300, h: 250}, {w: 320, h: 250}]},
        },
      },

      {
        title: 'imp with pbadslot',
        data: {
          impId: '1',
          id: '123',
          bid: {
            mediaTypes: {banner: {sizes: [[300, 250], [320, 250]]}},
            adUnitCode: 'test-gpid-1',
            bidId: 'e36ea395f67a',
            ortb2Imp: {
              ext: {
                data: {
                  pbadslot: 'slot-123'
                }
              }
            },
          },

          mediaTypes: {
            banner: {
              data: {sizes: [[300, 250], [320, 250]]},
            },
          },
        },

        expected: {
          id: '1',
          ext: {
            prebid: {storedrequest: {id: '123'}},
          },
          banner: {w: 300, h: 250, format: [{w: 300, h: 250}, {w: 320, h: 250}]},
        },
      },
    ];

    for (const {title, data, expected} of dataTests) {
      it(title, () => {
        const {impId, bid, id, mediaTypes} = data;
        const imp = getImp(impId, bid, id, mediaTypes);
        expect(imp).to.deep.equal(expected);
      });
    }
  });

  describe('function setImpPos', () => {
    const tests = [
      {
        title: 'position is - 1',
        pos: 0,
        expected: {pos: 0},
      },

      {
        title: 'position is - 2',
        pos: 7,
        expected: {pos: 7},
      },

      {
        title: 'position is empty',
        expected: {},
      },
    ];

    for (const {title, pos, expected} of tests) {
      it(title, () => {
        const obj = {};
        setImpPos(obj, pos);
        expect(obj).to.deep.equal(expected);
      });
    };
  });

  describe('function getSourceObj', () => {
    const dataTests = [
      {
        title: 'schain is empty',
        validBidRequests: [{}],
        bidderRequest: {},
        expected: undefined,
      },

      {
        title: 'schain is validBidReequest',
        bidderRequest: {},
        validBidRequests: [{
          ortb2: {
            source: {
              ext: {
                schain: {
                  validation: 'strict',
                  config: {
                    ver: '1.0',
                    complete: 1,
                    nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
                  },
                },
              },
            },
          },
        }],

        expected: {
          schain: {
            validation: 'strict',
            config: {
              ver: '1.0',
              complete: 1,
              nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
            },
          },
        },
      },

      {
        title: 'schain is bidderReequest.ortb2.source.schain',
        bidderRequest: {
          ortb2: {
            source: {
              schain: {
                validation: 'strict',
                config: {
                  ver: '1.0',
                  complete: 1,
                  nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
                },
              },
            },
          },
        },

        validBidRequests: [{}],
        expected: {
          schain: {
            validation: 'strict',
            config: {
              ver: '1.0',
              complete: 1,
              nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
            },
          },
        },
      },

      {
        title: 'schain is bidderReequest.ortb2.source.ext.schain',
        bidderRequest: {
          ortb2: {
            source: {
              ext: {
                schain: {
                  validation: 'strict',
                  config: {
                    ver: '1.0',
                    complete: 1,
                    nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
                  },
                },
              },
            },
          },
        },

        validBidRequests: [{}],
        expected: {
          schain: {
            validation: 'strict',
            config: {
              ver: '1.0',
              complete: 1,
              nodes: [{asi: 'test.test', sid: '00001', hp: 1}],
            },
          },
        },
      },
    ];

    for (const {title, validBidRequests, bidderRequest, expected} of dataTests) {
      it(title, () => {
        const source = getSourceObj(validBidRequests, bidderRequest);
        expect(source).to.deep.equal(expected);
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
            ortb2: {regs: {gpp: 'DSFHFHWEUYVDC', gpp_sid: [8, 9, 10], coppa: 1}},
          },
        },

        expected: {
          user: {consent: 'kjfdniwjnifwenrif3'},
          regs: {
            gpp: 'DBACNYA~CPXxRfAPXxR',
            gpp_sid: [7],
            gdpr: 1,
            us_privacy: '1---',
            coppa: 1
          },
        },
      },

      {
        title: 'gdprConsent(false) and ortb2(gpp)',
        data: {
          postBody: {},
          bidderRequest: {
            gdprConsent: {consentString: 'ewtewbefbawyadexv', gdprApplies: false},
            ortb2: {regs: {gpp: 'DSFHFHWEUYVDC', gpp_sid: [8, 9, 10], coppa: 0}},
          },
        },

        expected: {
          user: {consent: 'ewtewbefbawyadexv'},
          regs: {
            gpp: 'DSFHFHWEUYVDC',
            gpp_sid: [8, 9, 10],
            gdpr: 0,
            coppa: 0,
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
          regs: {gdpr: 0},
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

    for (const {title, data, expected} of dataTests) {
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

    for (const {title, data, expected} of dataTests) {
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

    for (const {title, data, expected} of dataTests) {
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
          ortb2: {
            bcat: ['IAB1-3', 'IAB1-4'],
            badv: ['domain1.com', 'domain2.com'],
            wlang: ['en', 'fr', 'de'],
            wlangb: ['en', 'fr', 'de'],
            site: {
              pagecat: ['IAB2-11', 'IAB2-12', 'IAB2-14'],
              content: {cat: ['IAB2-11', 'IAB2-12', 'IAB2-14'], language: 'EN'},
            }
          },
        },

        expected: {
          bcat: ['IAB1-3', 'IAB1-4'],
          badv: ['domain1.com', 'domain2.com'],
          wlang: ['en', 'fr', 'de'],
          site: {
            pagecat: ['IAB2-11', 'IAB2-12', 'IAB2-14'],
            content: {cat: ['IAB2-11', 'IAB2-12', 'IAB2-14'], language: 'EN'},
          }
        },
      },

      {
        title: 'site.keywords, site.content.keywords and user.keywords',
        data: {
          postBody: {},
          ortb2: {
            wlangb: ['en', 'fr', 'de'],
            user: {keywords: 'key7,key8,key9'},
            site: {
              keywords: 'key1,key2,key3',
              content: {keywords: 'key4,key5,key6'},
            },
          },
        },

        expected: {
          wlangb: ['en', 'fr', 'de'],
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

    for (const {title, data, expected} of dataTests) {
      it(title, () => {
        const {postBody, ortb2} = data;
        setOrtb2Parameters(ALLOWED_ORTB2_PARAMETERS, postBody, ortb2);
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
          bids: [{
            userIdAsEids: undefined,
          }],
        },

        expected: {},
      },

      {
        title: 'setEids - userIdAsEids - array is empty',
        data: {
          postBody: {},
          bids: [{
            userIdAsEids: [],
          }],
        },

        expected: {},
      },

      {
        title: 'setEids - userIdAsEids is',
        data: {
          postBody: {},
          bids: [
            {
              userIdAsEids: [],
            },

            {
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

            {
              userIdAsEids: [
                {
                  source: 'test.test',
                  uids: [{id: 'some-random-id-value', atype: 1}],
                },
              ],
            },
          ],
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

    for (const { title, data, expected } of dataTests) {
      it(title, () => {
        const { postBody, bids } = data;
        setEids(postBody, bids);
        expect(postBody).to.deep.equal(expected);
      });
    }
  });

  const bidRequestDataGI = getBidRequestDataGI();
  function getBidRequestDataGI(adUnitCodes = ['test-banner-gi', 'test-banner-gi', 'test-video-gi']) {
    return [
      {
        adUnitCode: adUnitCodes[0],
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
        adUnitCode: adUnitCodes[1],
        bidId: 'bid1235',
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
        adUnitCode: adUnitCodes[2],
        bidId: 'bid1236',
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
  }

  describe('check parameters group_id or placement_id', function() {
    let numberTest = 0
    for (const test of bidRequestDataGI) {
      it(`test - ${++numberTest}`, () => {
        const request = spec.buildRequests([test]);
        const requestData = JSON.parse(request[0].data);
        const storeRequestId = (requestData.imp[0].ext.prebid.storedrequest.id || '');
        expect(storeRequestId.length).to.be.not.equal(0);

        const srId = storeRequestId.split(';');
        const isGroupId = (/^g[1-9]\d*/).test(srId[0]);
        if (isGroupId) {
          expect(srId.length).to.be.equal(3);
          expect((/^g[1-9]\d*/).test(srId[0])).to.be.true;
          const sizes = srId[1].split('|');
          for (const size of sizes) {
            if (!(/^[1-9]\d*[xX,][1-9]\d*$/).test(size)) {
              expect(storeRequestId).to.be.equal('');
            }

            expect((/^[1-9]\d*[xX,][1-9]\d*$/).test(size)).to.be.true;
          }
        } else {
          expect(srId.length).to.be.equal(1);
          expect((/^[1-9]\d*/).test(srId[0])).to.be.true;
        };
      });
    };
  });

  describe('Check ext.next_mil_imps', function() {
    const expectedNextMilImps = [
      {
        impId: '1',
        nextMillennium: {refresh_count: 1},
      },

      {
        impId: '2',
        nextMillennium: {refresh_count: 1},
      },

      {
        impId: '3',
        nextMillennium: {refresh_count: 1},
      },
    ];

    const dataForRequest = getBidRequestDataGI(expectedNextMilImps.map(el => el.impId));
    for (let j = 0; j < 2; j++) {
      const request = spec.buildRequests(dataForRequest);
      const bidRequest = JSON.parse(request[0].data);
      for (let i = 0; i < bidRequest.ext.next_mil_imps.length; i++) {
        it(`test - ${j * i + 1}`, () => {
          const nextMilImp = bidRequest.ext.next_mil_imps[i];
          expect(nextMilImp.impId).to.deep.equal(expectedNextMilImps[i].impId);
          expect(nextMilImp.nextMillennium.refresh_count).to.deep.equal(expectedNextMilImps[i].nextMillennium.refresh_count + j);
        })
      };
    };
  });

  describe('function spec._getUrlPixelMetric', function() {
    const dataForTests = [
      {
        title: 'Check function of getting URL for sending statistics data - 1',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'appnexus',
          bids: [{bidder: 'appnexus', params: {}}],
        },

        expected: undefined,
      },

      {
        title: 'Check function of getting URL for sending statistics data - 2',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'appnexus',
          bids: [{bidder: 'appnexus', params: {placement_id: '807'}}],
        },

        expected: undefined,
      },

      {
        title: 'Check function of getting URL for sending statistics data - 3',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'nextMillennium',
          bids: [{bidder: 'nextMillennium', params: {placement_id: '807'}}],
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 4',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'nextMillennium',
          bids: [
            {bidder: 'nextMillennium', params: {placement_id: '807'}},
            {bidder: 'nextMillennium', params: {placement_id: '111'}},
          ],
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&placements=807;111',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 5',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'nextMillennium',
          bids: [{bidder: 'nextMillennium', params: {placement_id: '807', group_id: '123'}}],
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&groups=123',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 6',
        eventName: 'bidRequested',
        bids: {
          bidderCode: 'nextMillennium',
          bids: [
            {bidder: 'nextMillennium', params: {placement_id: '807', group_id: '123'}},
            {bidder: 'nextMillennium', params: {group_id: '456'}},
            {bidder: 'nextMillennium', params: {placement_id: '222'}},
          ],
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&groups=123;456&placements=222',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 7',
        eventName: 'bidResponse',
        bids: {
          bidderCode: 'appnexus',
        },

        expected: undefined,
      },

      {
        title: 'Check function of getting URL for sending statistics data - 8',
        eventName: 'bidResponse',
        bids: {
          bidderCode: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidResponse&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 9',
        eventName: 'noBid',
        bids: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        title: 'Check function of getting URL for sending statistics data - 10',
        eventName: 'noBid',
        bids: {
          bidder: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=noBid&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 11',
        eventName: 'bidTimeout',
        bids: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        title: 'Check function of getting URL for sending statistics data - 12',
        eventName: 'bidTimeout',
        bids: {
          bidder: 'nextMillennium',
          params: {placement_id: '807'},
        },

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidTimeout&bidder=nextMillennium&source=pbjs&placements=807',
      },

      {
        title: 'Check function of getting URL for sending statistics data - 13',
        eventName: 'bidRequested',
        bids: [
          {
            bidderCode: 'nextMillennium',
            bids: [
              {bidder: 'nextMillennium', params: {placement_id: '807', group_id: '123'}},
              {bidder: 'nextMillennium', params: {group_id: '456'}},
              {bidder: 'nextMillennium', params: {placement_id: '222'}},
            ],
          },

          {
            bidderCode: 'nextMillennium',
            params: {group_id: '7777'},
          },

          {
            bidderCode: 'nextMillennium',
            params: {placement_id: '8888'},
          },
        ],

        expected: 'https://hb-analytics.nextmillmedia.com/statistics/metric?event=bidRequested&bidder=nextMillennium&source=pbjs&groups=123;456;7777&placements=222;8888',
      },
    ];

    for (const {title, eventName, bids, expected} of dataForTests) {
      it(title, () => {
        const url = spec._getUrlPixelMetric(eventName, bids);
        expect(url).to.equal(expected);
      });
    };
  });

  describe('check function buildRequests', () => {
    const tests = [
      {
        title: 'test - 1',
        bidderRequest: {bidderRequestId: 'mock-uuid', timeout: 1200},
        bidRequests: [
          {
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
          },

          {
            adUnitCode: 'test-div-2',
            bidId: 'bid1235',
            auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
            bidder: 'nextMillennium',
            params: { placement_id: '333' },
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
            },
          },
        ],

        expected: {
          id: 'mock-uuid',
          impSize: 2,
          requestSize: 1,
          domain: 'example.com',
          tmax: 1200,
        },
      },
    ];

    for (const {title, bidRequests, bidderRequest, expected} of tests) {
      it(title, () => {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.length).to.equal(expected.requestSize);

        const requestData = JSON.parse(request[0].data);
        expect(requestData.id).to.equal(expected.id);
        expect(requestData.tmax).to.equal(expected.tmax);
        expect(requestData?.imp?.length).to.equal(expected.impSize);

        for (let i = 0; i < bidRequests.length; i++) {
          const impId = String(i + 1);
          expect(impId).to.equal(requestData.imp[i].id);
          expect(bidRequests[i].bidId).to.equal(request[0].bidIds.get(impId));
        };
      });
    };
  });

  describe('check function interpretResponse', () => {
    const tests = [
      {
        title: 'test - 1',
        serverResponse: {
          body: {
            id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
            seatbid: [
              {
                bid: [
                  {
                    id: '7457329903666272789-0',
                    impid: '1',
                    price: 0.5,
                    adm: 'Hello! It\'s a test ad!',
                    adid: '96846035-0',
                    adomain: ['test.addomain.com'],
                    w: 300,
                    h: 250,
                  },

                  {
                    id: '7457329903666272789-1',
                    impid: '2',
                    price: 0.7,
                    adm: 'https://some_vast_host.com/vast.xml',
                    adid: '96846035-1',
                    adomain: ['test.addomain.com'],
                    w: 400,
                    h: 300,
                    ext: {prebid: {type: 'video'}},
                  },

                  {
                    id: '7457329903666272789-2',
                    impid: '3',
                    price: 1.0,
                    adm: '<vast><ad></ad></vast>',
                    adid: '96846035-3',
                    adomain: ['test.addomain.com'],
                    w: 640,
                    h: 480,
                    ext: {prebid: {type: 'video'}},
                  },
                ],
              },
            ],
            cur: 'USD',
          },
        },

        bidRequest: {
          bidIds: new Map([
            ['1', '700ce0a43f72'],
            ['2', '700ce0a43f73'],
            ['3', '700ce0a43f74'],
          ]),
        },

        expected: [
          {
            title: 'banner',
            requestId: '700ce0a43f72',
            creativeId: '96846035-0',
            ad: 'Hello! It\'s a test ad!',
            vastUrl: undefined,
            vastXml: undefined,
            cpm: 0.5,
            width: 300,
            height: 250,
            currency: 'USD',
          },

          {
            title: 'video - vastUrl',
            requestId: '700ce0a43f73',
            creativeId: '96846035-1',
            ad: undefined,
            vastUrl: 'https://some_vast_host.com/vast.xml',
            vastXml: undefined,
            cpm: 0.7,
            width: 400,
            height: 300,
            currency: 'USD',
          },

          {
            title: 'video - vastXml',
            requestId: '700ce0a43f74',
            creativeId: '96846035-3',
            ad: undefined,
            vastUrl: undefined,
            vastXml: '<vast><ad></ad></vast>',
            cpm: 1.0,
            width: 640,
            height: 480,
            currency: 'USD',
          },
        ],
      },
    ];

    for (const {title, serverResponse, bidRequest, expected} of tests) {
      describe(title, () => {
        const bids = spec.interpretResponse(serverResponse, bidRequest);
        for (let i = 0; i < bids.length; i++) {
          it(expected[i].title, () => {
            expect(bids).to.have.lengthOf(expected.length);

            const bid = bids[i]
            expect(bid.creativeId).to.equal(expected[i].creativeId);
            expect(bid.requestId).to.equal(expected[i].requestId);
            expect(bid.ad).to.equal(expected[i].ad);
            expect(bid.vastUrl).to.equal(expected[i].vastUrl);
            expect(bid.vastXml).to.equal(expected[i].vastXml);
            expect(bid.cpm).to.equal(expected[i].cpm);
            expect(bid.width).to.equal(expected[i].width);
            expect(bid.height).to.equal(expected[i].height);
            expect(bid.currency).to.equal(expected[i].currency);
          });
        };
      });
    };
  });

  describe('getExtNextMilImp parameters adSlots and allowedAds', () => {
    const tests = [
      {
        title: 'parameters adSlots and allowedAds are empty',
        impId: '1',
        bid: {
          params: {},
        },

        expected: {
          impId: '1',
        },
      },

      {
        title: 'parameters adSlots and allowedAds',
        impId: '2',
        bid: {
          params: {
            adSlots: ['test1'],
            allowedAds: ['test2'],
          },
        },

        expected: {
          impId: '2',
          adSlots: ['test1'],
          allowedAds: ['test2'],
        },
      },
    ];

    for (const {title, impId, bid, expected} of tests) {
      it(title, () => {
        const extNextMilImp = getExtNextMilImp(impId, bid);
        expect(extNextMilImp.impId).to.deep.equal(expected.impId);
        expect(extNextMilImp.nextMillennium.adSlots).to.deep.equal(expected.adSlots);
        expect(extNextMilImp.nextMillennium.allowedAds).to.deep.equal(expected.allowedAds);
      });
    };
  });
});
