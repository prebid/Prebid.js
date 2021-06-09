import {userIdTargeting} from '../../../modules/userIdTargeting.js';
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
    expect(pubads.getTargeting('test')).to.deep.equal(['TEST']);
  });

  it('all UserIds are passed as is with GAM: true', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    delete config.GAM_KEYS;
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting('test')).to.deep.equal(['TEST']);
    expect(pubads.getTargeting('tdid')).to.deep.equal(['my-tdid']);
  })

  it('Publisher prefered key-names are used', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting('test')).to.deep.equal(['TEST']);
    expect(pubads.getTargeting('TD_ID')).to.deep.equal(['my-tdid']);
  });

  it('Publisher does not want to pass an id', function() {
    let pubads = window.googletag.pubads();
    pubads.clearTargeting();
    pubads.setTargeting('test', ['TEST']);
    config.GAM_KEYS.tdid = '';
    userIdTargeting(userIds, config);
    expect(pubads.getTargeting('tdid')).to.be.an('array').that.is.empty;
    expect(pubads.getTargeting('test')).to.deep.equal(['TEST']);
  });

  it('User Id Targeting is added to googletag queue when GPT is not ready', function() {
    let pubads = window.googletag.pubads;
    delete window.googletag.pubads;
    userIdTargeting(userIds, config);
    window.googletag.pubads = pubads;
    window.googletag.cmd.map(command => command());
    expect(window.googletag.pubads().getTargeting('TD_ID')).to.deep.equal(['my-tdid']);
  });
});
