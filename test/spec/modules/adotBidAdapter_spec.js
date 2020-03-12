import { expect } from 'chai';
import { executeRenderer } from 'src/Renderer.js';
import * as utils from 'src/utils.js';
import { spec } from 'modules/adotBidAdapter.js';

const BIDDER_URL = 'https://dsp.adotmob.com/headerbidding/bidrequest';

describe('Adot Adapter', function () {
  const examples = {
    adUnit_banner: {
      adUnitCode: 'ad_unit_banner',
      bidder: 'adot',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {},
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    },

    adUnit_video_outstream: {
      adUnitCode: 'ad_unit_video_outstream',
      bidder: 'adot',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {
        video: {
          mimes: ['video/mp4'],
          minDuration: 5,
          maxDuration: 30,
          protocols: [2, 3]
        }
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[300, 250]]
        }
      }
    },

    adUnit_video_instream: {
      adUnitCode: 'ad_unit_video_instream',
      bidder: 'adot',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {
        video: {
          instreamContext: 'pre-roll',
          mimes: ['video/mp4'],
          minDuration: 5,
          maxDuration: 30,
          protocols: [2, 3]
        }
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[300, 250]]
        }
      }
    },

    adUnitContext: {
      refererInfo: {
        referer: 'https://we-are-adot.com/test',
      },
      gdprConsent: {
        consentString: 'consent_string',
        gdprApplies: true
      }
    },

    adUnit_position: {
      adUnitCode: 'ad_unit_position',
      bidder: 'adot',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {
        position: 1
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    },

    adUnit_native: {
      adUnitCode: 'ad_unit_native',
      bidder: 'adot',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {},
      mediaTypes: {
        native: {
          title: {required: true, len: 140},
          icon: {required: true, sizes: [50, 50]},
          image: {required: false, sizes: [320, 200]},
          sponsoredBy: {required: false},
          body: {required: false},
          cta: {required: true}
        }
      }
    },

    serverRequest_banner: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_banner_0_0',
            banner: {
              format: [{
                w: 300,
                h: 200
              }]
            },
            video: null
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_banner_0_0',
            adUnitCode: 'ad_unit_banner',
            bidId: 'imp_id_banner'
          }
        ]
      }
    },

    serverRequest_banner_twoImps: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_banner_0_0',
            banner: {
              format: [{
                w: 300,
                h: 200
              }]
            },
            video: null
          },
          {
            id: 'imp_id_banner_2_0_0',
            banner: {
              format: [{
                w: 300,
                h: 200
              }]
            },
            video: null
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_banner_0_0',
            adUnitCode: 'ad_unit_banner',
            bidId: 'imp_id_banner'
          },
          {
            impressionId: 'imp_id_banner_2_0_0',
            adUnitCode: 'ad_unit_banner_2',
            bidId: 'imp_id_banner_2'
          }
        ]
      }
    },

    serverRequest_video_instream: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_video_instream_0',
            banner: null,
            video: {
              mimes: ['video/mp4'],
              w: 300,
              h: 200,
              startdelay: 0,
              minduration: 5,
              maxduration: 35,
              protocols: [2, 3]
            }
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_video_instream_0',
            adUnitCode: 'ad_unit_video_instream',
            bidId: 'imp_id_video_instream'
          }
        ]
      }
    },

    serverRequest_video_outstream: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_video_outstream_0',
            banner: null,
            video: {
              mimes: ['video/mp4'],
              w: 300,
              h: 200,
              startdelay: null,
              minduration: 5,
              maxduration: 35,
              protocols: [2, 3]
            }
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_video_outstream_0',
            adUnitCode: 'ad_unit_video_outstream',
            bidId: 'imp_id_video_outstream'
          }
        ]
      }
    },

    serverRequest_video_instream_outstream: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_video_instream_0',
            banner: null,
            video: {
              mimes: ['video/mp4'],
              w: 300,
              h: 200,
              startdelay: 0,
              minduration: 5,
              maxduration: 35,
              protocols: [2, 3]
            }
          },
          {
            id: 'imp_id_video_outstream_0',
            banner: null,
            video: {
              mimes: ['video/mp4'],
              w: 300,
              h: 200,
              startdelay: null,
              minduration: 5,
              maxduration: 35,
              protocols: [2, 3]
            }
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_video_instream_0',
            adUnitCode: 'ad_unit_video_instream',
            bidId: 'imp_id_video_instream'
          },
          {
            impressionId: 'imp_id_video_outstream_0',
            adUnitCode: 'ad_unit_video_outstream',
            bidId: 'imp_id_video_outstream'
          }
        ]
      }
    },

    serverRequest_position: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_banner',
            banner: {
              format: [{
                w: 300,
                h: 200
              }],
              position: 1
            },
            video: null
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_banner',
            adUnitCode: 'ad_unit_position'
          }
        ]
      }
    },

    serverRequest_native: {
      method: 'POST',
      url: 'https://we-are-adot.com/bidrequest',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_native_0',
            native: {
              request: {
                assets: [
                  {
                    id: 1,
                    required: true,
                    title: {
                      len: 140
                    }
                  },
                  {
                    id: 2,
                    required: true,
                    img: {
                      type: 1,
                      wmin: 50,
                      hmin: 50
                    }
                  },
                  {
                    id: 3,
                    required: false,
                    img: {
                      type: 3,
                      wmin: 320,
                      hmin: 200
                    }
                  },
                  {
                    id: 4,
                    required: false,
                    data: {
                      type: 1
                    }
                  },
                  {
                    id: 5,
                    required: false,
                    data: {
                      type: 2
                    }
                  },
                  {
                    id: 6,
                    required: true,
                    data: {
                      type: 12
                    }
                  }
                ]
              }
            },
            video: null,
            banner: null
          }
        ],
        site: {
          page: 'https://we-are-adot.com/test',
          domain: 'we-are-adot.com',
          name: 'we-are-adot.com'
        },
        device: {
          ua: '',
          language: 'en'
        },
        user: null,
        regs: null,
        at: 1,
        ext: {
          adot: {
            'adapter_version': 'v1.0.0'
          }
        }
      },
      _adot_internal: {
        impressions: [
          {
            impressionId: 'imp_id_native_0',
            adUnitCode: 'ad_unit_native',
            bidId: 'imp_id_native'
          }
        ]
      }
    },

    serverResponse_banner: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_banner_0_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                h: 350,
                w: 300,
                ext: {
                  adot: {
                    media_type: 'banner'
                  }
                }
              }
            ]
          }
        ]
      }
    },

    serverResponse_banner_twoBids: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_banner_0_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                h: 350,
                w: 300,
                ext: {
                  adot: {
                    media_type: 'banner'
                  }
                }
              },
              {
                impid: 'imp_id_banner_2_0_0',
                crid: 'creative_id_2',
                adm: 'creative_data_2_${AUCTION_PRICE}',
                nurl: 'win_notice_url_2_${AUCTION_PRICE}',
                price: 2.5,
                h: 400,
                w: 350,
                ext: {
                  adot: {
                    media_type: 'banner'
                  }
                }
              }
            ]
          }
        ]
      }
    },

    serverResponse_video_instream: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_video_instream_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                ext: {
                  adot: {
                    media_type: 'video'
                  }
                }
              }
            ]
          }
        ]
      }
    },

    serverResponse_video_outstream: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_video_outstream_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                ext: {
                  adot: {
                    media_type: 'video'
                  }
                }
              }
            ]
          }
        ]
      }
    },

    serverResponse_video_instream_outstream: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_video_instream_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                ext: {
                  adot: {
                    media_type: 'video'
                  }
                }
              },
              {
                impid: 'imp_id_video_outstream_0',
                crid: 'creative_id',
                adm: 'creative_data_${AUCTION_PRICE}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                ext: {
                  adot: {
                    media_type: 'video'
                  }
                }
              }
            ]
          }
        ]
      }
    },

    serverResponse_native: {
      body: {
        cur: 'EUR',
        seatbid: [
          {
            bid: [
              {
                impid: 'imp_id_native_0',
                crid: 'creative_id',
                adm: '{"native":{"assets":[{"id":1,"title":{"len":140,"text":"Hi everyone"}},{"id":2,"img":{"url":"https://adotmob.com","type":1,"w":50,"h":50}},{"id":3,"img":{"url":"https://adotmob.com","type":3,"w":320,"h":200}},{"id":4,"data":{"type":1,"value":"adotmob"}},{"id":5,"data":{"type":2,"value":"This is a test ad"}},{"id":6,"data":{"type":12,"value":"Click to buy"}}],"link":{"url":"https://adotmob.com?auction=${AUCTION_PRICE}"}}}',
                nurl: 'win_notice_url_${AUCTION_PRICE}',
                price: 1.5,
                ext: {
                  adot: {
                    media_type: 'native'
                  }
                }
              }
            ]
          }
        ]
      }
    }
  };

  describe('isBidRequestValid', function () {
    describe('General', function () {
      it('should return false when not given an ad unit', function () {
        const adUnit = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an invalid ad unit', function () {
        const adUnit = 'bad_bid';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without bidder code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidder = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a bad bidder code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidder = 'unknownBidder';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without ad unit code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.adUnitCode = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid ad unit code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.adUnitCode = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without bid request identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidderRequestId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid bid request identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidderRequestId = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without impression identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid impression identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidId = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with empty media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with invalid media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = 'bad_media_types';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });
    });

    describe('Banner', function () {
      it('should return true when given a valid ad unit', function () {
        const adUnit = examples.adUnit_banner;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid ad unit without bidder parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.params = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return false when given an ad unit without size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = 'bad_banner_size';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an empty size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = ['bad_banner_size_value'];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with less than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with more than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, 250, 30]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[-300, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, -250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[false, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, {}]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });
    });

    describe('Video', function () {
      it('should return true when given a valid outstream ad unit', function () {
        const adUnit = examples.adUnit_video_outstream;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid pre-roll instream ad unit', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_instream);
        adUnit.params.video.instreamContext = 'pre-roll';

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid mid-roll instream ad unit', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_instream);
        adUnit.params.video.instreamContext = 'mid-roll';

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid post-roll instream ad unit', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_instream);
        adUnit.params.video.instreamContext = 'post-roll';

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given an ad unit without size', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given an ad unit with an empty size', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given an ad unit without minimum duration parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.minDuration = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given an ad unit without maximum duration parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.maxDuration = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return false when given an ad unit without bidder parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with invalid bidder parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params = 'bad_bidder_parameters';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without video parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with invalid video parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video = 'bad_bidder_parameters';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without mime types parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.mimes = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid mime types parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.mimes = 'bad_mime_types';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an empty mime types parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.mimes = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid mime types parameter value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.mimes = [200];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid minimum duration parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.minDuration = 'bad_min_duration';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid maximum duration parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.maxDuration = 'bad_max_duration';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without protocols parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.protocols = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid protocols parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.protocols = 'bad_protocols';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an empty protocols parameter', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.protocols = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid protocols parameter value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.params.video.protocols = ['bad_protocols_value'];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an instream ad unit without instream context', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_instream);
        adUnit.params.video.instreamContext = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an instream ad unit with an invalid instream context', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_instream);
        adUnit.params.video.instreamContext = 'bad_instream_context';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without context', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.context = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid context', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.context = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an adpod ad unit', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.context = 'adpod';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an unknown context', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.context = 'invalid_context';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = 'bad_video_size';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = ['bad_video_size_value'];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with less than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[300]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with more than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[300, 250, 30]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[-300, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[300, -250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[false, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_video_outstream);
        adUnit.mediaTypes.video.playerSize = [[300, {}]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('ServerRequest', function () {
      it('should return a server request when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0].method).to.exist.and.to.be.a('string').and.to.equal('POST');
        expect(serverRequests[0].url).to.exist.and.to.be.a('string').and.to.equal(BIDDER_URL);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions).to.exist.and.to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0]._adot_internal.impressions[0]).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions[0].impressionId).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
        expect(serverRequests[0]._adot_internal.impressions[0].adUnitCode).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].adUnitCode);
      });

      it('should return a server request containing a position when given a valid ad unit and a valid ad unit context and a position in the bidder params', function () {
        const adUnits = [examples.adUnit_position];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0].method).to.exist.and.to.be.a('string').and.to.equal('POST');
        expect(serverRequests[0].url).to.exist.and.to.be.a('string').and.to.equal(BIDDER_URL);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions).to.exist.and.to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0]._adot_internal.impressions[0]).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions[0].impressionId).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
        expect(serverRequests[0]._adot_internal.impressions[0].adUnitCode).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].adUnitCode);
        expect(serverRequests[0].data.imp[0].banner.pos).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.position);
      });

      it('should return a server request when given two valid ad units and a valid ad unit context', function () {
        const adUnits_1 = utils.deepClone(examples.adUnit_banner);
        adUnits_1.bidId = 'bid_id_1';
        adUnits_1.adUnitCode = 'ad_unit_banner_1';

        const adUnits_2 = utils.deepClone(examples.adUnit_banner);
        adUnits_2.bidId = 'bid_id_2';
        adUnits_2.adUnitCode = 'ad_unit_banner_2';

        const adUnits = [adUnits_1, adUnits_2];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0].method).to.exist.and.to.be.a('string').and.to.equal('POST');
        expect(serverRequests[0].url).to.exist.and.to.be.a('string').and.to.equal(BIDDER_URL);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions).to.exist.and.to.be.an('array').and.to.have.length(2);
        expect(serverRequests[0]._adot_internal.impressions[0]).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions[0].impressionId).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
        expect(serverRequests[0]._adot_internal.impressions[0].adUnitCode).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].adUnitCode);
        expect(serverRequests[0]._adot_internal.impressions[1]).to.exist.and.to.be.an('object');
        expect(serverRequests[0]._adot_internal.impressions[1].impressionId).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0_0`);
        expect(serverRequests[0]._adot_internal.impressions[1].adUnitCode).to.exist.and.to.be.a('string').and.to.equal(adUnits[1].adUnitCode);
      });

      it('should return an empty server request list when given an empty ad unit list and a valid ad unit context', function () {
        const adUnits = [];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.length(0);
      });

      it('should not return a server request when given no ad unit and a valid ad unit context', function () {
        const serverRequests = spec.buildRequests(null, examples.adUnitContext);

        expect(serverRequests).to.equal(null);
      });

      it('should not return a server request when given a valid ad unit and no ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, null);

        expect(serverRequests).to.be.an('array').and.to.have.length(1);
      });

      it('should not return a server request when given a valid ad unit and an invalid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, {});

        expect(serverRequests).to.be.an('array').and.to.have.length(1);
      });
    });

    describe('BidRequest', function () {
      it('should return a valid server request when given a valid ad unit', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.at).to.exist.and.to.be.a('number').and.to.equal(1);
        expect(serverRequests[0].data.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.ext.adot).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.ext.adot.adapter_version).to.exist.and.to.be.a('string').and.to.equal('v1.0.0');
      });

      it('should return one server request when given one valid ad unit', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
      });

      it('should return one server request when given two valid ad units with different impression identifiers', function () {
        const adUnit_1 = utils.deepClone(examples.adUnit_banner);
        adUnit_1.bidId = 'bid_id_1';

        const adUnit_2 = utils.deepClone(examples.adUnit_banner);
        adUnit_2.bidId = 'bid_id_2';

        const adUnits = [adUnit_1, adUnit_2];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[1].bidderRequestId);
      });

      it('should return two server requests when given two valid ad units with different bid request identifiers', function () {
        const adUnit_1 = utils.deepClone(examples.adUnit_banner);
        adUnit_1.bidderRequestId = 'bidder_request_id_1';

        const adUnit_2 = utils.deepClone(examples.adUnit_banner);
        adUnit_2.bidderRequestId = 'bidder_request_id_2';

        const adUnits = [adUnit_1, adUnit_2];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(2);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[1].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[1].bidderRequestId);
      });
    });

    describe('Impression', function () {
      describe('Banner', function () {
        it('should return a server request with one impression when given a valid ad unit', function () {
          const adUnits = [examples.adUnit_banner];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[0][0],
            h: adUnits[0].mediaTypes.banner.sizes[0][1]
          });
        });

        it('should return a server request with two impressions containing one banner formats when given a valid ad unit with two banner sizes', function () {
          const adUnit = utils.deepClone(examples.adUnit_banner);
          adUnit.mediaTypes.banner.sizes = [
            [300, 250],
            [350, 300]
          ];

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(2);

          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[0][0],
            h: adUnits[0].mediaTypes.banner.sizes[0][1]
          });

          expect(serverRequests[0].data.imp[1]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_1`);
          expect(serverRequests[0].data.imp[1].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[1][0]);
          expect(serverRequests[0].data.imp[1].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[1][1]);
          expect(serverRequests[0].data.imp[1].banner.format).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[1].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[1][0],
            h: adUnits[0].mediaTypes.banner.sizes[1][1]
          });
        });

        it('should return a server request with two impressions when given two valid ad units with different impression identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_banner);
          adUnit_1.bidId = 'bid_id_1';

          const adUnit_2 = utils.deepClone(examples.adUnit_banner);
          adUnit_2.bidId = 'bid_id_2';

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(2);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array');
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[0][0],
            h: adUnits[0].mediaTypes.banner.sizes[0][1]
          });
          expect(serverRequests[0].data.imp[1]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0_0`);
          expect(serverRequests[0].data.imp[1].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[1].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[1].banner.format).to.exist.and.to.be.an('array');
          expect(serverRequests[0].data.imp[1].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[1].mediaTypes.banner.sizes[0][0],
            h: adUnits[1].mediaTypes.banner.sizes[0][1]
          });
        });

        it('should return a server request with one overriden impression when given two valid ad units with identical identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_banner);
          adUnit_1.mediaTypes.banner.sizes = [[300, 250]];

          const adUnit_2 = utils.deepClone(examples.adUnit_banner);
          adUnit_2.mediaTypes.banner.sizes = [[350, 300]];

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array');
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[1].mediaTypes.banner.sizes[0][0],
            h: adUnits[1].mediaTypes.banner.sizes[0][1]
          });
        });

        it('should return two server requests with one impression when given two valid ad units with different bid request identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_banner);
          adUnit_1.bidderRequestId = 'bidder_request_id_1';

          const adUnit_2 = utils.deepClone(examples.adUnit_banner);
          adUnit_2.bidderRequestId = 'bidder_request_id_2';

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(2);
          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array');
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[0][0],
            h: adUnits[0].mediaTypes.banner.sizes[0][1]
          });
          expect(serverRequests[1].data).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[1].bidderRequestId);
          expect(serverRequests[1].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[1].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0_0`);
          expect(serverRequests[1].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[1].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[1].data.imp[0].banner.format).to.exist.and.to.be.an('array');
          expect(serverRequests[1].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[1].mediaTypes.banner.sizes[0][0],
            h: adUnits[1].mediaTypes.banner.sizes[0][1]
          });
        });
      });

      describe('Video', function () {
        it('should return a server request with one impression when given a valid outstream ad unit', function () {
          const adUnit = examples.adUnit_video_outstream;

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid pre-roll instream ad unit', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_instream);
          adUnit.params.video.instreamContext = 'pre-roll';

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.exist.and.to.be.a('number').and.to.equal(0);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid mid-roll instream ad unit', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_instream);
          adUnit.params.video.instreamContext = 'mid-roll';

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.exist.and.to.be.a('number').and.to.equal(-1);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid post-roll instream ad unit', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_instream);
          adUnit.params.video.instreamContext = 'post-roll';

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.exist.and.to.be.a('number').and.to.equal(-2);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid ad unit without player size', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_outstream);
          adUnit.mediaTypes.video.playerSize = undefined;

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.h).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid ad unit with an empty player size', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_outstream);
          adUnit.mediaTypes.video.playerSize = [];

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.h).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid ad unit with multiple player sizes', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_outstream);
          adUnit.mediaTypes.video.playerSize = [[350, 300], [400, 350]];

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid ad unit without minimum duration', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_outstream);
          adUnit.params.video.minDuration = undefined;

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with one impression when given a valid ad unit without maximum duration', function () {
          const adUnit = utils.deepClone(examples.adUnit_video_outstream);
          adUnit.params.video.maxDuration = undefined;

          const adUnits = [adUnit];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
        });

        it('should return a server request with two impressions when given two valid ad units with different impression identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_1.bidId = 'bid_id_1';

          const adUnit_2 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_2.bidId = 'bid_id_2';

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(2);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
          expect(serverRequests[0].data.imp[1]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0`);
          expect(serverRequests[0].data.imp[1].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[1].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[1].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[1].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[1].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[1].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.minDuration);
          expect(serverRequests[0].data.imp[1].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.maxDuration);
          expect(serverRequests[0].data.imp[1].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[1].params.video.protocols);
        });

        it('should return a server request with one overridden impression when given two valid ad units with identical identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_1.params.video.minDuration = 10;

          const adUnit_2 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_2.params.video.minDuration = 15;

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[1].params.video.protocols);
        });

        it('should return two server requests with one impression when given two valid ad units with different bid request identifiers', function () {
          const adUnit_1 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_1.bidderRequestId = 'bidder_request_id_1';

          const adUnit_2 = utils.deepClone(examples.adUnit_video_outstream);
          adUnit_2.bidderRequestId = 'bidder_request_id_2';

          const adUnits = [adUnit_1, adUnit_2];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(2);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[0].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[0].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[0].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[0].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.minDuration);
          expect(serverRequests[0].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].params.video.maxDuration);
          expect(serverRequests[0].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.protocols);
          expect(serverRequests[1].data).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[1].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[1].bidId}_0`);
          expect(serverRequests[1].data.imp[0].video).to.exist.and.to.be.an('object');
          expect(serverRequests[1].data.imp[0].video.mimes).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[0].params.video.mimes);
          expect(serverRequests[1].data.imp[0].video.startdelay).to.equal(null);
          expect(serverRequests[1].data.imp[0].video.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][0]);
          expect(serverRequests[1].data.imp[0].video.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].mediaTypes.video.playerSize[0][1]);
          expect(serverRequests[1].data.imp[0].video.minduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.minDuration);
          expect(serverRequests[1].data.imp[0].video.maxduration).to.exist.and.to.be.a('number').and.to.equal(adUnits[1].params.video.maxDuration);
          expect(serverRequests[1].data.imp[0].video.protocols).to.exist.and.to.be.an('array').and.to.deep.equal(adUnits[1].params.video.protocols);
        });
      });

      describe('Native', function () {
        it('should return a server request with one impression when given a valid ad unit', function () {
          const adUnits = [examples.adUnit_native];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnit_native);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0`);
          expect(serverRequests[0].data.imp[0].native).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].native.request).to.exist.and.to.be.a('string').and.to.equal(JSON.stringify(examples.serverRequest_native.data.imp[0].native.request))
        });
      });
    });

    describe('Site', function () {
      it('should return a server request with site information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.site.page).to.exist.and.to.be.an('string').and.to.equal(adUnitContext.refererInfo.referer);
        expect(serverRequests[0].data.site.id).to.equal(undefined);
        expect(serverRequests[0].data.site.domain).to.exist.and.to.be.an('string').and.to.equal('we-are-adot.com');
        expect(serverRequests[0].data.site.name).to.exist.and.to.be.an('string').and.to.equal('we-are-adot.com');
      });

      it('should return a server request without site information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context without referer information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with invalid referer information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo = 'bad_referer_information';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context without referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with an invalid referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = {};

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with a misformatted referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = 'we-are-adot';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });
    });

    describe('Device', function () {
      it('should return a server request with device information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.device).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.device.ua).to.exist.and.to.be.a('string');
        expect(serverRequests[0].data.device.language).to.exist.and.to.be.a('string');
      });
    });

    describe('Regs', function () {
      it('should return a server request with regulations information when given a valid ad unit and a valid ad unit context with GDPR applying', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext.gdpr).to.exist.and.to.be.a('boolean').and.to.equal(adUnitContext.gdprConsent.gdprApplies);
      });

      it('should return a server request with regulations information when given a valid ad unit and a valid ad unit context with GDPR not applying', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.gdprApplies = false;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext.gdpr).to.exist.and.to.be.a('boolean').and.to.equal(adUnitContext.gdprConsent.gdprApplies);
      });

      it('should return a server request without regulations information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context without GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context with invalid GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = 'bad_gdpr_consent';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context with invalid GDPR application information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.gdprApplies = 'bad_gdpr_applies';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });
    });

    describe('User', function () {
      it('should return a server request with user information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.user.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.user.ext.consent).to.exist.and.to.be.a('string').and.to.equal(adUnitContext.gdprConsent.consentString);
      });

      it('should return a server request without user information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context without GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context with invalid GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = 'bad_gdpr_consent';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context with an invalid consent string', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.consentString = true;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });
    });
  });

  describe('interpretResponse', function () {
    describe('General', function () {
      it('should return an ad when given a valid server response with one bid with USD currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = 'USD';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return two ads when given a valid server response with two bids', function () {
        const serverRequest = examples.serverRequest_banner_twoImps;

        const serverResponse = examples.serverResponse_banner_twoBids;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(2);

        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
        expect(ads[1].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[1].bidId);
        expect(ads[1].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[1].adm);
        expect(ads[1].adUrl).to.equal(null);
        expect(ads[1].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[1].crid);
        expect(ads[1].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[1].price);
        expect(ads[1].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[1].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[1].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[1].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[1].h);
        expect(ads[1].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[1].w);
        expect(ads[1].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[1].renderer).to.equal(null);
      });

      it('should return no ad when not given a server response', function () {
        const ads = spec.interpretResponse(null);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when not given a server response body', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given an invalid server response body', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body = 'invalid_body';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response without seat bids', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with invalid seat bids', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = 'invalid_seat_bids';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an empty seat bids array', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = [];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an invalid seat bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = 'invalid_bids';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an empty bids array', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = [];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an invalid bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = ['invalid_bid'];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without impression identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].impid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid impression identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].impid = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without creative identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].crid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid creative identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].crid = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without ad markup and ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = undefined;
        serverResponse.body.seatbid[0].bid[0].nurl = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid ad markup', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an ad markup without auction price macro', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = 'creative_data';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].nurl = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an ad serving URL without auction price macro', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].nurl = 'win_notice_url';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without bid price', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].price = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid bid price', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].price = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext = 'bad_ext';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without adot extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid adot extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot = 'bad_adot_ext';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an unknown media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = 'unknown_media_type';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and no server request', function () {
        const serverRequest = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and an invalid server request', function () {
        const serverRequest = 'bad_server_request';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without bid request', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with an invalid bid request', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data = 'bad_bid_request';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with an invalid impression field', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp = 'invalid_impressions';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without matching impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp[0].id = 'unknown_imp_id';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without internal data', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with invalid internal data', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal = 'bad_internal_data';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without internal impression data', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal.impressions = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with invalid internal impression data', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal.impressions = 'bad_internal_impression_data';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without matching internal impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal.impressions[0].impressionId = 'unknown_imp_id';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without internal impression ad unit code', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal.impressions[0].adUnitCode = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with an invalid internal impression ad unit code', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest._adot_internal.impressions[0].adUnitCode = {};

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });
    });

    describe('Banner', function () {
      it('should return an ad when given a valid server response with one bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with one bid without a win notice URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].nurl = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with one bid using an ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.equal(null);
        expect(ads[0].adUrl).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].nurl);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return no ad when given a server response with a bid without height', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].h = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid height', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].h = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without width', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].w = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid width', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].w = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without banner impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp[0].banner = undefined;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });
    });

    describe('Video', function () {
      it('should return an ad when given a valid server response with one bid on an instream impression', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = examples.serverResponse_video_instream;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with one bid on an outstream impression', function () {
        const serverRequest = examples.serverRequest_video_outstream;

        const serverResponse = examples.serverResponse_video_outstream;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.be.an('object');
      });

      it('should return two ads when given a valid server response with two bids on both instream and outstream impressions', function () {
        const serverRequest = examples.serverRequest_video_instream_outstream;

        const serverResponse = examples.serverResponse_video_instream_outstream;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(2);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
        expect(ads[1].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[1].bidId);
        expect(ads[1].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[1].adm);
        expect(ads[1].adUrl).to.equal(null);
        expect(ads[1].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[1].vastUrl).to.equal(null);
        expect(ads[1].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[1].crid);
        expect(ads[1].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[1].price);
        expect(ads[1].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[1].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[1].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[1].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[1].video.w);
        expect(ads[1].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[1].renderer).to.be.an('object');
      });

      it('should return an ad when given a valid server response with one bid without a win notice URL', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].nurl = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with one bid using an ad serving URL', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].adm = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.equal(null);
        expect(ads[0].adUrl).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].nurl);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(serverResponse.body.seatbid[0].bid[0].nurl);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with a bid with a video height', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].h = 500;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with a bid with a video width', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].w = 500;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverRequest.data.imp[0].video.h);
        expect(ads[0].width).to.equal(serverRequest.data.imp[0].video.w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with a bid with a video width and height', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].w = 500;
        serverResponse.body.seatbid[0].bid[0].h = 400;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response and server request with a video impression without width', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_video_instream);
        serverRequest.data.imp[0].video.w = null;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(null);
        expect(ads[0].width).to.equal(null);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response and server request with a video impression without height', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_video_instream);
        serverRequest.data.imp[0].video.h = null;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.equal(null);
        expect(ads[0].width).to.equal(null);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('video');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return no ad when given a server response with a bid with an invalid height', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].h = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid width', function () {
        const serverRequest = examples.serverRequest_video_instream;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);
        serverResponse.body.seatbid[0].bid[0].w = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without video impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_video_instream);
        serverRequest.data.imp[0].video = undefined;

        const serverResponse = utils.deepClone(examples.serverResponse_video_instream);

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      describe('Outstream renderer', function () {
        function spyAdRenderingQueue(ad) {
          const spy = sinon.spy(ad.renderer, 'push');

          this.sinonSpies.push(spy);
        }

        function executeAdRenderer(ad, onRendererExecution, done) {
          executeRenderer(ad.renderer, ad);

          setTimeout(() => {
            try {
              onRendererExecution();
            } catch (err) {
              done(err);
            }

            done()
          }, 100);
        }

        before('Bind helper functions to the Mocha context', function () {
          this.spyAdRenderingQueue = spyAdRenderingQueue.bind(this);

          window.VASTPlayer = function VASTPlayer() {};
          window.VASTPlayer.prototype.loadXml = function loadXml() {
            return new Promise((resolve, reject) => resolve())
          };
          window.VASTPlayer.prototype.load = function load() {
            return new Promise((resolve, reject) => resolve())
          };
          window.VASTPlayer.prototype.on = function on(event, callback) {};
          window.VASTPlayer.prototype.startAd = function startAd() {};
        });

        beforeEach('Initialize the Sinon spies list', function () {
          this.sinonSpies = [];
        });

        afterEach('Clear the registered Sinon spies', function () {
          this.sinonSpies.forEach(spy => spy.restore());
        });

        after('clear data', () => {
          window.VASTPlayer = null;
        });

        it('should return an ad with valid renderer', function () {
          const serverRequest = examples.serverRequest_video_outstream;
          const serverResponse = examples.serverResponse_video_outstream;

          const ads = spec.interpretResponse(serverResponse, serverRequest);

          expect(ads).to.be.an('array').and.to.have.length(1);
          expect(ads[0].renderer).to.be.an('object');
        });

        it('should append a command to the ad rendering queue when executing the renderer', function (done) {
          const serverRequest = examples.serverRequest_video_outstream;
          const serverResponse = examples.serverResponse_video_outstream;

          const [ad] = spec.interpretResponse(serverResponse, serverRequest);

          this.spyAdRenderingQueue(ad);

          executeAdRenderer(ad, () => {
            expect(ad.renderer.push.calledOnce).to.equal(true);
            expect(ad.renderer.push.firstCall.args[0]).to.exist.and.to.be.a('function');
          }, done);
        });
      });
    });

    describe('Native', function () {
      it('should return an ad when given a valid server response with one bid', function () {
        const serverRequest = examples.serverRequest_native;
        const serverResponse = examples.serverResponse_native;
        const native = JSON.parse(serverResponse.body.seatbid[0].bid[0].adm).native;
        const {link, assets} = native;
        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].requestId).to.exist.and.to.be.a('string').and.to.equal(serverRequest._adot_internal.impressions[0].bidId);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('native');
        expect(ads[0].native).to.exist.and.to.be.an('object');
        expect(Object.keys(ads[0].native)).to.have.length(10);
        expect(ads[0].native.title).to.equal(assets[0].title.text);
        expect(ads[0].native.icon.url).to.equal(assets[1].img.url);
        expect(ads[0].native.icon.width).to.equal(assets[1].img.w);
        expect(ads[0].native.icon.height).to.equal(assets[1].img.h);
        expect(ads[0].native.image.url).to.equal(assets[2].img.url);
        expect(ads[0].native.image.width).to.equal(assets[2].img.w);
        expect(ads[0].native.image.height).to.equal(assets[2].img.h);
        expect(ads[0].native.sponsoredBy).to.equal(assets[3].data.value);
        expect(ads[0].native.body).to.equal(assets[4].data.value);
        expect(ads[0].native.cta).to.equal(assets[5].data.value);
        expect(ads[0].native.clickUrl).to.equal(link.url);
      });
    });
  });
});
