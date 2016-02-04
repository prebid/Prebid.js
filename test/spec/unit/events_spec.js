var assert = require("assert");
var events = require('src/events');
var utils = require('src/utils');

var allEvents =  utils._map(require('src/constants.json')['EVENTS'], function (v){ return v; });
var eventsFired = [];
var event = 'bidAdjustment';
var _handlers = {};
var mock = { eventHandler: function() {} };

describe('Events', function() {
    describe('on', function() {
        it()
    });

    describe('emit', function() {
        it('should log a message', function() {
            events.emit(event);
        });
    });
    describe('off', function() {
        var event = 'bidAdjustment';
        it('should remove event from _handlers que', function() {
            events.off(event);
        });
    });
});