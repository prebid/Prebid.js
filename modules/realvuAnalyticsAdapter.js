// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
// const utils = require('src/utils');

var realvuAnalyticsAdapter = adapter({
  global: 'realvuAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});
/* 
  Copyright(C) 2001-2017, RealVu Inc., All rights reserved. Use of RealVu’s patented, patent pending,
  copyrighted and proprietary code is not being made available under an Apache or other open source license,
  but is available only under a proprietary license of RealVu Inc. 
*/
window.top1 = window;
try {
  var wnd = window;
  while ((window.top1 != top) && (typeof (wnd.document) != 'undefined')) {
    window.top1 = wnd;
    wnd = wnd.parent;
  }
} catch (e) {
  /* continue regardless of error */
}
window.top1.realvu_boost = window.top1.realvu_boost || {
  ads: [],
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  t0: new Date(),
  nn: 0,
  frm: false, // check first if we are inside other domain iframe
  msg: [],
  foc: !window.top1.document.hidden, // 1-in, 0-out of focus
  c: '', // owner id
  sr: '', //
  beacons: [], // array of beacons to collect while 'conf' is not responded
  init: function() {
    var z = this;
    var u = navigator.userAgent;
    z.device = u.match(/iPad|Tablet/gi) ? 'tablet' : u.match(/iPhone|iPod|Android|Opera Mini|IEMobile/gi) ? 'mobile' : 'desktop';
    if (typeof (z.len) == 'undefined') z.len = 0; // check, meybe too much, just make it len:0,
    z.ie = navigator.appVersion.match(/MSIE/);
    z.saf = (u.match(/Safari/) && !u.match(/Chrome/));
    z.ff = u.match(/Firefox/i);
    z.cr = (u.match(/Chrome/));
    z.ope = window.opera;
    z.fr = 0;
    if (window.top1 != top) {
      z.fr = 2;
      if (typeof window.top1.$sf != 'undefined') {
        z.fr = 1;
      }
    }
    z.add_evt(window.top1, 'focus', function() {
      window.top1.realvu_boost.foc = 1; /* window.top1.realvu_boost.log('focus',-1); */
    });
    // z.add_evt(window.top1, "scroll", function(){window.top1.realvu_boost.foc=1;window.top1.realvu_boost.log('scroll focus',-1);});
    z.add_evt(window.top1, 'blur', function() {
      window.top1.realvu_boost.foc = 0; /* window.top1.realvu_boost.log('blur',-1); */
    });
    // + http://www.w3.org/TR/page-visibility/
    z.add_evt(window.top1.document, 'blur', function() {
      window.top1.realvu_boost.foc = 0; /* window.top1.realvu_boost.log('blur',-1); */
    });
    z.add_evt(window.top1, 'visibilitychange'
      , function() {
        window.top1.realvu_boost.foc = !window.top1.document.hidden; /* window.top1.realvu_boost.log('vis-ch '+window.top1.realvu_boost.foc,-1); */
      });
    // -
    z.doLog = (window.top1.location.search.match(/boost_log/) || document.referrer.match(/boost_log/)) ? 1 : 0;
    if (z.doLog) {
      window.setTimeout(z.scr(window.top1.location.protocol + '//ac.realvu.net/realvu_boost_log.js'), 500);
    }
  },

  add_evt: function (elem, evtType, func) {
    if (elem.addEventListener) {
      elem.addEventListener(evtType, func, true);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + evtType, func);
    } else {
      elem['on' + evtType] = func;
    }
  },

  update: function() {
    var z = this;
    var de = window.top1.document.documentElement;
    z.x1 = window.top1.pageXOffset ? window.top1.pageXOffset : de.scrollLeft;
    z.y1 = window.top1.pageYOffset ? window.top1.pageYOffset : de.scrollTop;
    var w1 = window.top1.innerWidth ? window.top1.innerWidth : de.clientWidth;
    var h1 = window.top1.innerHeight ? window.top1.innerHeight : de.clientHeight;
    z.x2 = z.x1 + w1;
    z.y2 = z.y1 + h1;
  },
  brd: function(s, p) { // return a board Width, s-element, p={Top,Right,Bottom, Left}
    var u;
    if (window.getComputedStyle) u = window.getComputedStyle(s, null);
    else u = s.style;
    var a = u['border' + p + 'Width'];
    return parseInt(a.length > 2 ? a.slice(0, -2) : 0);
  },
  padd: function(s, p) { // return a board Width, s-element, p={Top,Right,Bottom, Left}
    var u;
    if (window.getComputedStyle) u = window.getComputedStyle(s, null);
    else u = s.style;
    var a = u['padding' + p];
    return parseInt(a.length > 2 ? a.slice(0, -2) : 0);
  },
  viz_area: function(x1, x2, y1, y2) { // coords of Ad
    if (this.fr == 1) {
      try {
        var iv = Math.round(100 * window.top1.$sf.ext.geom().self.iv);
        return iv;
      } catch (e) {
        /* continue regardless of error */
      }
    }
    var xv1 = Math.max(x1, this.x1);
    var yv1 = Math.max(y1, this.y1);
    var xv2 = Math.min(x2, this.x2);
    var yv2 = Math.min(y2, this.y2);
    var A = Math.round(100 * ((xv2 - xv1) * (yv2 - yv1)) / ((x2 - x1) * (y2 - y1)));
    return (A > 0) ? A : 0;
  },

  viz_dist: function(x1, x2, y1, y2) { // coords of Ad
    var d = Math.max(0, this.x1 - x2, x1 - this.x2) + Math.max(0, this.y1 - y2, y1 - this.y2);
    return d;
  },

  track: function(a, pin, f) {
    var z = this;
    var s1 = z.tru(a, pin, f);
    if (f == 'conf') {
      z.scr(s1, a);
      z.log(' <a href=\'' + s1 + '\'>' + f + '</a>', a.num);
    } else {
      var bk = {s1: s1, a: a, f: f};
      z.beacons.push(bk);
    }
  },

  send_track: function() {
    var z = this;
    if (z.sr >= 'a') { // conf, send beacons
      var bk = z.beacons.shift();
      while (typeof bk != 'undefined') {
        bk.s1 = bk.s1.replace(/_sr=0*_/, '_sr=' + z.sr + '_');
        z.log(' ' + bk.a.rr + ' ' + bk.a.unit_id +/* " "+pin.mode+ */' ' + bk.a.w + 'x' + bk.a.h + '@' + bk.a.x + ',' + bk.a.y +
          ' <a href=\'' + bk.s1 + '\'>' + bk.f + '</a>', bk.a.num);
        if (bk.a.rnd < Math.pow(10, 1 - (z.sr.charCodeAt(0) & 7))) {
          if (bk.a.w > 9 && bk.a.h > 9) { // report only w>9 and h>9
            z.scr(bk.s1, bk.a);
          }
        }
        bk = z.beacons.shift();
      }
    }
  },

  scr: function(s1, a) {
    var st = document.createElement('script');
    st.async = true;
    st.type = 'text/javascript';
    st.src = s1;// +"&ds1="+document.readyState;
    if (a && a.dv0 != null) {
      a.dv0.appendChild(st);
    } else {
      var x = document.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(st, x);
    }
  },

  tru: function(a, pin, f) {
    var s2 = '//ac.realvu.net/flip/2/c=' + pin.partner_id +
    '_f=' + f + '_r=' + a.rr +
    '_s=' + a.w + 'x' + a.h;
    if (a.p) s2 += '_p=' + a.p;
    s2 += '_ps=' + this.enc(a.unit_id) + // 08-Jun-15 - _p= is replaced with _ps= - p-number, ps-string
      // + '_n=' + a.num  03-Mar-15 - we ignore order number for collection
      '_dv=' + this.device +
      // + '_a=' + this.enc(a.a)
      '_d=' + pin.mode +
      '_sr=' + this.sr +
      '_h=' + this.enc(a.ru) + '?';
    return s2.replace(/%/g, '!');
  },

  enc: function(s1) {
    // return escape(s1).replace(/[0-9a-f]{5,}/gi,'RANDOM').replace(/\*/g, "%2A").replace(/_/g, "%5F").replace(/\+/g,
    return escape(s1).replace(/\*/g, '%2A').replace(/_/g, '%5F').replace(/\+/g,
      '%2B').replace(/\./g, '%2E').replace(/\x2F/g, '%2F');
  },

  findPosG: function(adi, wnd) {
    var t = this;
    var ad = adi;
    var xp = 0;
    var yp = 0;
    try {
      while (ad != null && typeof (ad) != 'undefined') {
        if (ad.getBoundingClientRect) { // Internet Explorer, Firefox 3+, Google Chrome, Opera 9.5+, Safari 4+
          var r = ad.getBoundingClientRect();
          xp += r.left;// +sL;
          yp += r.top;// +sT;
          if (wnd == window.top1) {
            xp += this.x1;
            yp += this.y1;
          }
          // w = rect.right - rect.left;
          // h = rect.bottom - rect.top;
        } else { // keep it as is, check IE if modify anything in findPosG()
          if (ad.tagName == 'IFRAME') {
            xp += t.brd(ad, 'Left');
            yp += t.brd(ad, 'Top');
          }
          xp += ad.offsetLeft;
          yp += ad.offsetTop;

          var op = ad.offsetParent;
          var pn = ad.parentNode;
          // + position:fixed fix
          var opf = ad;
          while (opf != null) {
            var cs = window.getComputedStyle(opf, null);
            if (cs.position == 'fixed') {
              if (cs.top) yp += parseInt(cs.top) + this.y1;
            }
            if (opf == op) break;
            opf = opf.parentNode;
          }
          // -
          while (op != null && typeof (op) != 'undefined') {
            xp += op.offsetLeft;
            yp += op.offsetTop;

            var ptn = op.tagName;
            if (t.cr || t.saf || (t.ff && ptn == 'TD')) {
              xp += t.brd(op, 'Left');
              yp += t.brd(op, 'Top');
            }
            if (ad.tagName != 'IFRAME' && op != document.body && op != document.documentElement) {
              xp -= op.scrollLeft;
              yp -= op.scrollTop;
            }

            if (!t.ie) {
              while (op != pn && pn != null) {
                xp -= pn.scrollLeft;
                yp -= pn.scrollTop;
                if (t.ff_o) {
                  xp += t.brd(pn, 'Left');
                  yp += t.brd(pn, 'Top');
                }
                pn = pn.parentNode;
              }
            }
            pn = pn.parentNode;
            op = op.offsetParent;
          }
        }
        if (this.fr) break; // inside different domain iframe or sf
        ad = wnd.frameElement; // in case Ad is allocated inside iframe here we go up
        wnd = wnd.parent;
      }
    } catch (e) {
      // if(window.top1.RealVu_test)window.top1.RealVu_log.write("FindPosG Exception: "+e.message+ " xp="+xp+" yp="+yp );
    }
    var q = {'x': Math.round(xp), 'y': Math.round(yp)};
    return q;
  },

  poll: function() {
    while (window.top1 && window.top1.boost_fifo && window.top1.boost_fifo.length > 0) {
      (window.top1.boost_fifo.shift())();
    }
    var z = this;
    z.update();
    var now = new Date();
    if (typeof (z.ptm) == 'undefined') {
      z.ptm = now;
    }
    var dvz = now - z.ptm;
    z.ptm = now;
    for (var i = 0; i < z.len; i++) {
      var a = z.ads[i];
      var restored = false;
      if (a.div == null) { // ad unit is not found yet
        var adobj = document.getElementById(a.pins[0].unit_id);
        if (adobj == null) {
          restored = z.restorePos(a);
          if (!restored) continue; // do nothing if not found
        }
        this.bind_obj(a, adobj);
        this.log('{m}"' + a.unit_id + '" is bound', a.num);
      }
      if (!restored) {
        a.target = this.questA(a.div);

        var target = (a.target !== null) ? a.target : a.div;
        a.box.w = Math.max(target.offsetWidth, a.w);
        a.box.h = Math.max(target.offsetHeight, a.h);
        var q = z.findPosG(target, a.wnd);
        if (a.pins[0].edge) {
          vtr = a.pins[0].edge - 1; // override default edge 50% (>49)
        }
        var pad = {};
        pad.t = z.padd(target, 'Top');
        pad.l = z.padd(target, 'Left');
        pad.r = z.padd(target, 'Right');
        pad.b = z.padd(target, 'Bottom');

        var ax = q.x + pad.l;
        var ay = q.y + pad.t;
        a.box.x = ax;
        a.box.y = ay;
        if (a.box.w > a.w && a.box.w > 1) {
          // / a.w=Math.max(w1,1);
          ax += (a.box.w - a.w - pad.l - pad.r) / 2;
        }
        if (a.box.h > a.h && a.box.h > 1) {
          // / a.h=h1;
          ay += (a.box.h - a.h - pad.t - pad.b) / 2;
        }
        if ((ax > 0 && ay > 0) && (a.x != ax || a.y != ay)) {
          a.x = ax;
          a.y = ay;
          z.savePos(a);
        }
      }
      var vtr = ((a.box.w * a.box.h) < 242500) ? 49 : 29; // treashfold more then 49% and more then 29% for "oversized"
      a.vz = z.viz_area(a.box.x, a.box.x + a.box.w, a.box.y, a.box.y + a.box.h);
      a.r = (z.fr > 1 ? 'frame' : (((a.vz > vtr) && z.foc) ? 'yes' : 'no')); // f-frame, y-yes in view,n-not in view
      if (a.y < 0) {
        a.r = 'out'; // 11-Mar-17, if the unit intentionaly moved out, count it as out.
        // 25-Mar-17, a.x<0||a.y<0 --> a.y<0
      }
      if (a.vz > vtr) {
        a.vt += dvz;// real dt counter in milliseconds, because of poll() can be called irregularly
        a.vtu += dvz;
      }
      // now process every pin
      var plen = a.pins.length;
      for (var j = 0; j < plen; j++) {
        var pin = a.pins[j];
        var doMem = (a.x > 0) && (a.y > 0) && ((pin.partner_id != 'E1OU') || (a.ru === 'time.com') || (a.ru === 'fortune.com'));
        if (pin.state <= 1) {
          var dist = z.viz_dist(a.x, a.x + a.w, a.y, a.y + a.h);
          var near = (pin.dist != null && dist <= pin.dist);
          // apply "near" rule for ad call only
          // a.r = z.frm ? "frame" : ((((a.vz > vtr)||near) && z.foc) ? "yes" : "no");
          a.r = (z.fr > 1) ? 'frame' : (((a.vz > vtr) && z.foc) ? 'yes' : 'no');
          if (/* this.device=='mobile' && */ near && a.r == 'no') {
            a.r = 'yes';
          }
          if (doMem) {
            var scr = z.score(a.num);
            if (a.r == 'yes' && scr < (20 + 40 * Math.random())) {
              a.r = 'no';
            }
            /* if (a.r=="no"&&scr>80){
              a.r="yes";
            } */
          }
          if (a.y < 0) {
            a.r = 'out'; // 11-Mar-17, if the unit intentionaly moved out, count it as out.
          }
          // f-frame, y-yes in view,n-not in view
          if ((pin.mode == 'kvp' || pin.mode == 'tx2') || (((a.vz > vtr) || near) && ((pin.mode == 'in-view' || pin.mode == 'video')))) {
            z.show(a, pin); // in-view or flip show immediately if initial realvu=yes, or delay is over
          }
        }
        if (pin.state == 2) { // TODO: add simple rendering check - by number of objects?
          a.target = this.questA(a.div);
          if (a.target != null) {
            pin.state = 3;
            dvz = 0;
            a.vt = 0;
            z.track(a, pin, 'rend');
            if (doMem) z.incrMem(a.num, 'r');
          }
        }
        if (pin.state > 2) {
          var tmin = (pin.mode == 'video') ? 2E3 : 1E3; // mrc min view time
          if (a.vz > vtr) {
            pin.vt += dvz;// real dt counter in milliseconds, because of poll() can be called irregularly
            if (pin.state == 3 && pin.vt >= tmin) {
              pin.state = 4;
              z.track(a, pin, 'view');
              if (doMem) z.incrMem(a.num, 'v');
            }
            if (pin.state == 4 && pin.vt >= 2 * tmin) {
              pin.state = 5;
              z.track(a, pin, 'view2');
            }
          } else if (pin.vt < tmin) {
            pin.vt = 0; // reset to track continuous 1 sec
          }
        }
        if (pin.state >= 2 && pin.mode === 'tx2' &&
                      ((a.vtu > pin.rotate) || (pin.delay > 0 && a.vtu > pin.delay && a.rr === 'no' && a.ncall < 2)) && pin.tx2n > 0) {
          // flip or rotate
          pin.tx2n--;
          pin.state = 1;
          a.vtu = 0;
          a.target = null;
        }
      }
    }
    this.send_track();
  },

  questA: function (a) { // look for the visible object of ad_sizes size
    // returns the object or null
    if (a == null) return a;
    var tn = a.tagName;
    if (tn == 'OBJECT' || tn == 'IMG' || tn == 'IFRAME' || tn == 'EMBED' || tn == 'SVG' || tn == 'A') {
      var w1 = a.offsetWidth;
      var h1 = a.offsetHeight;
      if (w1 > 16 && h1 > 16 && a.style.display != 'none') return a;
      if (tn == 'IFRAME') {
        try {
          a = this.doc(a); // a.contentDocument || a.contentWindow.document; // get inside iframe;
          if (a == null) return null;
        } catch (e) {
          return null; // 2-can't get inside iframe of visible size (more then 99 sq.pixels)
        }
      }
    }
    if (a.hasChildNodes()) {
      var b = a.firstChild;
      while (b != null) {
        var c = this.questA(b);
        if (c != null) return c;
        b = b.nextSibling;
      }
    }
    return null;
  },

  newf: function(a, w, h) {
    var f = a.wnd.document.createElement('iframe');
    f.src = 'about:blank';
    f.width = w;
    f.height = h;
    f.frameBorder = 0;
    f.scrolling = 'no';
    f.style['border'] = 'none';
    return f;
  },

  doc: function(f) { // return document of f-iframe, keep here "n" as a parameter because of call from setTimeout()
    var d = null;
    try {
      if (f.contentDocument) d = f.contentDocument; // DOM
      else if (f.contentWindow) d = f.contentWindow.document; // IE
      // //else if (f.document) d = f.document;
    } catch (e) {
      this.log(e.message, -1);
    }
    return d;
  },

  // add is a local function - place a div and define visibility
  bind_obj: function(a, adobj) {
    a.div = adobj;
    a.target = null; // initially null, found ad when served
    a.unit_id = adobj.id; // placement id or name
    a.w = adobj.offsetWidth || 1; // width, min 1
    a.h = adobj.offsetHeight || 1; // height, min 1
  },
  add: function(wnd1, p) { // p - realvu unit id
    var a = {
      num: this.len,
      x: 0,
      y: 0,
      box: {x: 0, y: 0, h: 1, w: 1}, // measured ad box
      p: p,
      state: 0, // 0-init, (1-loaded,2-rendered,3-viewed)
      delay: 0, // delay in msec to show ad after gets in view
      vt: 0, // total view time
      vtu: 0, // view time to update and mem
      a: '', // ad_placement id
      wnd: wnd1,
      div: null,
      pins: [],
      frm: null, // it will be frame when "show"
      rr: '', // r to report, value when ad call "show" event)
      rnd: Math.random(),
      ncall: 0, // a callback number
      mem_xy: '',
      mem_num: 0
    };
    a.ru = window.top1.location.hostname;
    window.top1.realvu_boost.ads[this.len++] = a;
    return a;
  },

  fmt: function(a, pin) {
    return {'realvu': a.r, 'area': a.vz, 'ncall': a.ncall, 'n': a.num, 'id': a.unit_id, 'pin': pin};
  },

  show: function(a, pin) {
    a.rr = a.r; // now report r when ad call, and report the rr same value if view happen
    pin.state = 2; // 2-published
    pin.vt = 0; // reset view time counter
    if (pin.size) {
      var asz = this.setSize(pin.size);
      if (asz != null) {
        a.w = asz.w;
        a.h = asz.h;
      }
    }
    if (typeof pin.callback != 'undefined') {
      pin.callback(this.fmt(a, pin));
    }
    a.ncall++;
    if (typeof pin.content != 'undefined') {
      if (a.frm == null) {
        a.div.style.width = a.w + 'px';
        a.div.style.height = a.h + 'px';
        a.frm = this.newf(a, a.w, a.h);
        a.div.appendChild(a.frm);
      } else {
        this.exp(a);
      }
      var d1 = this.doc(a.frm);
      d1.open();
      d1.write('<!DOCTYPE html><html><head></head><body style="margin:0px;">' +
     pin.content.replace(/{realvu}/, a.r) +
     '</body></html>');
      d1.close();
    }
    this.track(a, pin, 'show');
  },
  // publisher calls check() to get "RealVu" flag for the d element
  // check can be called 1 or 2 times
  // one without callback - doWatch
  // one with callback - doBoost
  // we send to server a=watch or a=boost accordingly
  check: function(p1) {
    var pin = {dist: 150, state: 0, tx2n: 7}; // if dist is set trigger ad when distance < pin.dist
    for (var attr in p1) {
      if (p1.hasOwnProperty(attr)) {
        if ((attr == 'ad_sizes') && (typeof (p1[attr]) == 'string')) {
          pin[attr] = p1[attr].split(',');
        } else if (attr == 'edge') {
          try {
            var ed = parseInt(p1[attr]);
            if (ed > 0 && ed < 251) pin[attr] = ed;
          } catch (e) {
            /* continue regardless of error */
          }
        } else {
          pin[attr] = p1[attr];
        }
      }
    }
    var a = null;
    var z = this;
    try {
      // not to track the same object more than one time
      for (var i = 0; i < z.len; i++) {
        //         if (z.ads[i].div == adobj) { a = z.ads[i]; break; }
        if (z.ads[i].unit_id == pin.unit_id) {
          a = z.ads[i]; break;
        }
      }
      pin.wnd = pin.wnd || window;
      if (a == null) {
        a = z.add(pin.wnd, pin.p);
        var adobj = (pin.unit) ? pin.unit : document.getElementById(pin.unit_id);
        if (adobj != null) {
          z.bind_obj(a, adobj);
        } else {
          z.log('{w}"' + pin.unit_id + '" not found', a.num);
        }
        if (pin.size) {
          var asz = z.setSize(pin.size);
          if (asz != null) {
            a.w = asz.w;
            a.h = asz.h;
          }
        }
      }
      pin.delay = pin.delay || 0; // delay in msec
      if (typeof pin.mode == 'undefined') {
        if ((typeof pin.callback != 'undefined') || (typeof pin.content != 'undefined')) {
          pin.mode = (pin.delay > 0) ? 'tx2' : 'in-view';
        } else {
          pin.mode = 'kvp';
        }
        // delays are for views only
      }
      pin.vt = 0; // view time
      pin.state = 0;
      a.pins.push(pin);
      if (this.sr === '') {
        z.track(a, pin, 'conf');
        this.sr = '0';
      }
      // if(pin.mode=='kvp'){ // to return state right away
      this.poll();
      // }
      // if(a.vz>49||this.frm) this.show(a,pin);
      return a;
    } catch (e) {
      z.log(e.message, -1);
      return 'err';
    }
  },
  setSize: function(sa) {
    var sb = sa;
    try {
      if (typeof (sa) == 'string') sb = sa.split('x'); // pin.size is a string WWWxHHH or array
      else if (Array.isArray(sa)) {
        var mm = 4;
        while (--mm > 0 && Array.isArray(sa[0]) && Array.isArray(sa[0][0])) {
          sa = sa[0];
        }
        for (var m = 0; m < sa.length; m++) {
          if (Array.isArray(sa[m])) {
            sb = sa[m]; // if size is [][]
            var s = sb[0] + 'x' + sb[1];
            if (s == '300x250' || s == '728x90' || s == '320x50' || s == '970x90') {
              break; // use most popular sizes
            }
          } else if (sa.length > 1) {
            sb = sa;
          }
        }
      }
      var w1 = parseInt(sb[0]);
      var h1 = parseInt(sb[1]);
      return {w: w1, h: h1};
    } catch (e) {
      /* continue regardless of error */
    }
    return null;
  },
  exp: function(a) {
    a.frx = a.frm; // "old" iframe - to be replaced
    a.frm = this.newf(a, a.w, 0);
    a.frm.style.display = 'block';
    a.div.insertBefore(a.frm, a.div.firstChild);
    this.trans(a.num, 5);
  },
  trans: function(i, h) {
    var a = window.top1.realvu_boost.ads[i];
    h += 5 + h / 5;
    if (h > a.h)h = a.h;
    a.frm.height = h;
    a.frx.height = a.h - h;
    if (h < a.h) setTimeout(window.top1.realvu_boost.trans(i, h), 20);
    else { // if old content inside iframe - remove it
      a.frx.height = 0;
      a.frx.style.display = 'none';
      a.div.removeChild(a.frx);
      a.frx = null;
    }
  },
  // API functions
  addUnitsByClassName: function(partner_id, class_name, callback, delay) {
    var p1 = partner_id;
    if (typeof (p1) == 'string') {
      p1 = {partner_id: partner_id, class_name: class_name, callback: callback, delay: delay};
    }
    var ads = document.getElementsByClassName(p1.class_name);
    window.top1.realvu_boost.log('N=' + ads.length, -1);
    for (var i = 0; i < ads.length; i++) {
      p1.unit_id = ads[i].id;
      window.top1.realvu_boost.check(p1);
    }
    this.poll();
  },

  addUnitById: function(partner_id, unit_id, callback, delay) {
    var p1 = partner_id;
    if (typeof (p1) == 'string') {
      p1 = {partner_id: partner_id, unit_id: unit_id, callback: callback, delay: delay};
    }
    var a = window.top1.realvu_boost.check(p1);
    // this.poll();
    return a.r; // this.fmt(a); // return a.r temporary - to sync with WN
  },

  addUnit: function(u) {
    var tgt = u.unit ? u.unit : document.body; // if delivered inside iframe
    var z = window.top1.realvu_boost;
    if (tgt) {
      u.unit = tgt;
      var a = z.check(u);
      return z.fmt(a); // return a.r temporary - to sync with WN
    } else {
      return null;
    }
  },

  getViewStatusById: function(unit_id) {
    for (var i = 0; i < this.ads.length; i++) {
      var adi = this.ads[i];
      if (adi.unit_id == unit_id) return adi.r; // this.fmt(a); // return a.r temporary - to sync with WN
    }
    return 'nr';
  },

  getStatusById: function(unit_id) { // Jun 1, 2015 - return status object
    for (var i = 0; i < this.ads.length; i++) {
      var adi = this.ads[i];
      if (adi.unit_id == unit_id) return this.fmt(adi); // return a.r temporary - to sync with WN
    }
    return null;
  },

  log: function(m1, i) {
    if (this.doLog) {
      this.msg.push({
        dt: new Date() - this.t0,
        s: 'U' + (i + 1) + m1
      });
    }
  },
  // +
  keyPos: function(a) {
    var level = 'L' + (window.top1.location.pathname.match(/\//g) || []).length;
    return 'realvu.' + level + '.' + a.unit_id.replace(/[0-9]{5,}/gi, 'RANDOM');
  },
  savePos: function(a) {
    var v = a.x + ',' + a.y + ',' + a.w + ',' + a.h;
    if (localStorage) localStorage.setItem(this.keyPos(a), v);
  },
  restorePos: function(a) {
    if (!localStorage) return false;
    var s = localStorage.getItem(this.keyPos(a));
    if (s) {
      var v = s.split[','];
      a.x = v[0];
      a.y = v[1];
      a.w = v[2];
      a.h = v[3];
      a.box = {x: a.x, y: a.y, w: a.w, h: a.h};
      return true;
    }
    return false;
  },
  // -
  // +
  keyMem: function(num) {
    var a = this.ads[num];
    if (a.mem_xy == '') {
      var kx = Math.round(a.x / 100);
      var ky = (a.y < 1600) ? Math.round(a.y / 100) : 'btf';
      a.mem_xy = 'X' + kx + 'Y' + ky;
      for (var j = 0; j < this.ads.length; j++) {
        if (j == num) continue;
        if (a.mem_xy == this.ads[j].mem_xy) a.mem_num++; // if more then one ad unit takes the same position - increment mem_num
      }
    }
    var level = 'L' + (window.top1.location.pathname.match(/\//g) || []).length;
    var smem = (a.mem_num < 1) ? '' : 'N' + a.mem_num;
    var scall = (a.ncall < 2) ? '' : 'S1';
    return level + a.mem_xy + smem + scall;
  },
  incrMem: function(num, v) {
    var k1 = this.keyMem(num);
    var n = parseInt(this.getMem('rv', k1), 10);
    if (isNaN(n)) {
      n = 0x57F57; // initial score 75, 20 bits, step 5
    }
    if (v == 'r')n = n << 1;
    if (v == 'v')n |= 1;
    n &= 0xFFFFF;
    this.updateMem('rv', k1, n);
  },
  score: function(num) {
    var k1 = this.keyMem(num);
    var r = parseInt(this.getMem('rv', k1));
    if (isNaN(r))r = 0x57F57;
    var s = 0;
    for (r &= 0x3FF; r > 0; r >>>= 1) {
      if (r & 0x1)s++;
    }
    return s * 100.0 / 10;
  },
  getMem: function(name, a) {
    return localStorage.getItem(name + '.' + a);
  },
  updateMem: function(name, a, new_value) {
    localStorage.setItem(name + '.' + a, new_value);
  }
  // -
};

if (typeof (window.top1.boost_poll) == 'undefined') {
  window.top1.realvu_boost.init();
  window.top1.boost_poll = setInterval(function() {
    window.top1 && window.top1.realvu_boost && window.top1.realvu_boost.poll();
  }, 20);
}

// -boost
var options = { };

realvuAnalyticsAdapter.originEnableAnalytics = realvuAnalyticsAdapter.enableAnalytics;

realvuAnalyticsAdapter.enableAnalytics = function (config) {
  var msg = document.getElementById('msg_an');
  if (msg) {
    msg.innerHTML += 'config:<br>' + JSON.stringify(config) + '<br>';
  }
  options = config.options;
  realvuAnalyticsAdapter.originEnableAnalytics(config);
};

realvuAnalyticsAdapter.track = function ({eventType, args}) {
  var msg = document.getElementById('msg_an');
  if (msg) {
    msg.innerHTML += 'track: eventType=' + eventType + ', args= ' + args + ';';
  }
  if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
    if (options && options.partner_id) {
      var hb = $$PREBID_GLOBAL$$;
      for (var i = 0; i < hb.adUnits.length; i++) {
        var code = hb.adUnits[i].code;
        var b = options.all_in;
        if (!b && options.unit_ids) {
          for (var j = 0; j < options.unit_ids.length; j++) {
            if (code === options.unit_ids[j]) {
              b = true;
              break;
            }
          }
        }
        if (b) {
          // register the unit in realvu_boost
          var sizes = hb.adUnits[i].sizes;
          var ui = {partner_id: options.partner_id, unit_id: code, size: sizes};
          window.top1.realvu_boost.check(ui);
        }
      }
    }
  }
};

realvuAnalyticsAdapter.inView = function (bid, partner_id) {
  if (top1.realvu_boost) {
    return top1.realvu_boost.addUnitById({unit_id: bid.placementCode, partner_id: partner_id, size: bid.sizes});
  }
  return 'NA';
};

// queue() is a proxy function to add a callback function to boost_fifo to be async executed in realvu_boost
realvuAnalyticsAdapter.queue = function (callback) {
  if (typeof callback === 'function') {
    top1.boost_fifo.push(callback);
  }
};

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvuAnalytics'
});

module.exports = realvuAnalyticsAdapter;
