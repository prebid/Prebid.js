import {userIdTargeting} from '../../../modules/userIdTargeting';
import { expect } from 'chai';

describe('#userIdTargeting', function() {
  let userIds;
  let config;

  beforeEach(function() {
    userIds = {
      tdid: 'my-tdid'
    };
    config = {
      'GAM': true,
      'GAM_KEYS': {
        'tdid': 'TD_ID'
      }
    };
  });

  it('Do nothing if config is invaild', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    userIdTargeting(userIds, JSON.stringify(config));
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST']});
  });

  it('all UserIds are passed as is with GAM: true', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    delete config.GAM_KEYS;
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST'], tdid: ['my-tdid']});
  })

  it('Publisher prefered key-names are used', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST'], 'TD_ID': ['my-tdid']});
  });

  it('Publisher does not want to pass an id', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    config.GAM_KEYS.tdid = '';
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting()).to.deep.equal({test: ['TEST']});
  });
});
