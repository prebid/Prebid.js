import {shareUserIds} from '../../../modules/shareUserIds';
import { expect } from 'chai';

describe('#shareUserIds', function() {
  let userIds;
  let config;

  beforeEach(function() {
    userIds = {
      tdid: 'my-tdid'
    };
    config = {
      'DFP': true,
      'DFP_KEYS': {
        'tdid': 'TD_ID'
      }
    };
  });

  it('Do nothing if config is invaild', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    shareUserIds(userIds, JSON.stringify(config));
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST']});
  });

  it('all UserIds are passed as is with DFP: true', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    delete config.DFP_KEYS;
    shareUserIds(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST'], tdid: ['my-tdid']});
  })

  it('Publisher prefered key-names are used', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    shareUserIds(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST'], 'TD_ID': ['my-tdid']});
  });

  it('Publisher does not want to pass an id', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    config.DFP_KEYS.tdid = '';
    shareUserIds(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST']});
  });
});
