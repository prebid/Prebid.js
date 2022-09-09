import { config } from '../src/config.js';
import events from '../src/events.js';
import { EVENTS } from '../src/constants.json';
import {isPlainObject, isArray} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js'

// const MODULE_NAME = 'Prebid JS Debug UI';
const UI_LIBRARY_END_POINT = 'https://pm-harshad-mane.github.io/pbjs-debug-ui/bundle.js';
const UI_LIBRARY_LOAD_DELAY = 3000;
// UI library depends on these keys, so do not make changes to keys
const DEBUG_OBJECT_KEY_NAME = '_pbjsDebugUI';
const AUCTIONS_KEY = '_auctions';
const AUCTION_INIT_KEY = '_init';
const AUCTION_END_KEY = '_end';
const AUCTIONS_BIDS_WON_KEY = '_bidsWon';
const DEBUG_KEY = '_debug';
const AUCTION_TAEGETING_KEY = '_targeting';
const TCF2_KEY = '_tcf2Enforcement';

// Do not load the lib if already loaded
let uiLibraryLoaded = false;

/*
ToDo:
*/

function loadUILibIfNotAlreadyLoaded() {
  if (uiLibraryLoaded === false) {
    uiLibraryLoaded = true;
    loadExternalScript(UI_LIBRARY_END_POINT, 'pbjs-debug-ui');
  }
}

function loadUILibrary() {
  // the js library needs this variable to be defined to know which is the primary prebid-js code on page in case tehre are multiple instances of prebid-js on page
  window.PBJS_NAMESPACE = '$$PREBID_GLOBAL$$';
  // Load the UI library after page-load / some delay
  // Load lib on DOMContentLoaded
  window.document.addEventListener('DOMContentLoaded', function() {
    loadUILibIfNotAlreadyLoaded();
  });
  // Load lib after some timeout
  setTimeout(function() {
    loadUILibIfNotAlreadyLoaded()
  }, UI_LIBRARY_LOAD_DELAY)
}

function createDebugObjectIfNotPresent() {
  if (isPlainObject($$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME]) === false) {
    $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME] = {};
  }
}

function createDebugObjectAuctionIfNotPresent() {
  if (isArray($$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY]) === false) {
    $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY] = [];
  }
}

function getAuctionIdEntry(auctionId) {
  // create one if not present
  let auctionEntry = $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY].find(
    auctionEntry => auctionEntry.auctionId === auctionId
  );
  if (isPlainObject(auctionEntry) === false) {
    auctionEntry = { auctionId };
    $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY].push(auctionEntry);
  }
  return auctionEntry;
}

// TODO: improve the latest auction logic;
//       current logic fails when multiple auctions are initiated simultaneously
//       better if pbjs passes respective auctionId with each event
function getLatestAuctionEntry() {
  return $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY][ $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][AUCTIONS_KEY].length - 1 ];
}

function auctionInitHandler(auctionInitData) {
  createDebugObjectIfNotPresent();
  createDebugObjectAuctionIfNotPresent();
  let auctionEntry = getAuctionIdEntry(auctionInitData.auctionId)
  auctionEntry[AUCTION_INIT_KEY] = auctionInitData;
}

function auctionEndHandler(auctionEndData) {
  createDebugObjectIfNotPresent();
  createDebugObjectAuctionIfNotPresent();
  // auctionEndData.timestamp is auctionStart
  auctionEndData.auctionStart = auctionEndData.timestamp;
  let auctionEntry = getAuctionIdEntry(auctionEndData.auctionId)
  auctionEntry[AUCTION_END_KEY] = auctionEndData;
}

function createDebugObjectAuctionDebugIfNotPresent() {
  if (isArray($$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][DEBUG_KEY]) === false) {
    $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][DEBUG_KEY] = [];
  }
}

function saveAuctionDebugData(auctionDebugData) {
  $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][DEBUG_KEY].push(auctionDebugData);
}

function auctionDebugHandler(auctionDebugData) {
  createDebugObjectIfNotPresent();
  createDebugObjectAuctionDebugIfNotPresent();
  saveAuctionDebugData(auctionDebugData);
  // this data can't be put inside auction as error might be thrown before init of the auction
}

function createDebugObjectTcf2IfNotPresent() {
  if (isPlainObject($$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][TCF2_KEY]) === false) {
    $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][TCF2_KEY] = {};
  }
}

function saveTcf2EnforcementData(tcf2EnforcementData) {
  $$PREBID_GLOBAL$$[DEBUG_OBJECT_KEY_NAME][TCF2_KEY] = tcf2EnforcementData;
}

function tcf2EnforcementHandler(tcf2EnforcementData) {
  createDebugObjectIfNotPresent();
  createDebugObjectTcf2IfNotPresent();
  saveTcf2EnforcementData(tcf2EnforcementData);
}

// putting this data in last auction to keep it safe
//    otherwise the old data will be lost after a new auction takes place
function setTargetingHandler(targetingData) {
  createDebugObjectIfNotPresent();
  createDebugObjectAuctionIfNotPresent();
  let auctionEntry = getLatestAuctionEntry();
  auctionEntry[AUCTION_TAEGETING_KEY] = targetingData;
}

function bidWonHandler(bidWonData) {
  createDebugObjectIfNotPresent();
  createDebugObjectAuctionIfNotPresent();
  let auctionEntry = getAuctionIdEntry(bidWonData.auctionId);
  if (!isPlainObject(auctionEntry[AUCTIONS_BIDS_WON_KEY])) {
    auctionEntry[AUCTIONS_BIDS_WON_KEY] = {};
  }
  auctionEntry[AUCTIONS_BIDS_WON_KEY][bidWonData.adId] = bidWonData;
}

function init() {
  // this module should work only if pbjs_debug is set to true in page-URL or debug mode is on thru config
  if (config.getConfig('debug') !== true) {
    return;
  }
  events.on(EVENTS.AUCTION_INIT, auctionInitHandler);
  events.on(EVENTS.AUCTION_END, auctionEndHandler);
  events.on(EVENTS.AUCTION_DEBUG, auctionDebugHandler);
  events.on(EVENTS.SET_TARGETING, setTargetingHandler);
  events.on(EVENTS.TCF2_ENFORCEMENT, tcf2EnforcementHandler);
  events.on(EVENTS.BID_WON, bidWonHandler);
  loadUILibrary();
}

init();
