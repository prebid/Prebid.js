var app = require('../../../index');

/**
 * This file will have the fixtures for request and response. Each one has to export two functions getRequest and getResponse.
 * expectation directory will hold all the request reponse pairs of different types. middlewares added to the server will parse
 * these files and return the response when expecation is met
 *
 */

/**
 * This function will return the request object with all the entities method, path, body, header etc.
 *
 * @return {object} Request object
 */
exports.getRequest = function() {
  return {
    'httpRequest': {
      'method': 'POST',
      'path': '/',
      'body': {
        'tags': [{
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
          }
        }],
        'user': {},
        'brand_category_uniqueness': true
      }
    }
  }
}

/**
 * This function will return the response object with all the entities method, path, body, header etc.
 *
 * @return {object} Response object
 */
exports.getResponse = function() {
  return {
    'httpResponse': {
      'body': {
        'version': '3.0.0',
        'tags': [{
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '2678252910506723691',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '3548675574061430850',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '8693167356543642173',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '7686428711280367086',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '3784359541475413084',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '7233136875958651734',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '159775901183771330',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '6558726890185052779',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '6624810255570939818',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '528384387675374412',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '2535665225687089273',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '2166694611986638079',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '9137369006412413609',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '3524702228053475248',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2d4806af582cf6',
          'tag_id': 15394006,
          'auction_id': '57990683038266307',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
