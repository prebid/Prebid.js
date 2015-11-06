/**
 * events.js
 */
var utils = require('./utils'),
  slice = Array.prototype.slice;

//define entire events
var allEvents = ['bidRequested','bidResponse','bidWon','bidTimeout'];

module.exports = (function (){

  var _handlers = {},
      _public = {};

  function _dispatch(event, args) {
    utils.logMessage('Emitting event for: ' + event  );
    utils._each(_handlers[event], function (fn) {
        if (!fn) return;
        fn.apply(null, args);
    });
  }

  function _checkAvailableEvent(event){
    return utils.contains(allEvents,event);
  }

  _public.on = function (event, handler) {

    //check whether available event or not
    if(_checkAvailableEvent(event)){
      _handlers[event] = _handlers[event] || [];
      _handlers[event].push(handler);
    }
    else{
      utils.logError('Wrong event name : ' + event + ' Valid event names :' + allEvents);
    }
  };

  _public.emit = function (event) {
    var args = slice.call(arguments, 1);
    _dispatch(event, args);
  };

  _public.off = function (event, id, handler) {
    if (utils.isEmpty(_handlers[event])) {
      return;
    }

    utils._each(_handlers[event],function(h){
      if(h[id] !== null && h[id] !== undefined ){
        if(typeof handler === 'undefined' || h[id] === handler){
          h[id] = null;
        }
      }
    });
  };

  _public.get = function(){
    return _handlers;
  };

  return _public;
}());
