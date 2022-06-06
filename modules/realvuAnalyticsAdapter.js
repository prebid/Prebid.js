// RealVu Analytics Adapter
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { getStorageManager } from '../src/storageManager.js';
import { logMessage, logError } from '../src/utils.js';
const storage = getStorageManager();

let realvuAnalyticsAdapter = adapter({
  global: 'realvuAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});
window.top1 = window;
try {
  let wnd = window;
  while ((window.top1 != top) && (typeof (wnd.document) != 'undefined')) {
    window.top1 = wnd;
    wnd = wnd.parent;
  }
} catch (e) {
  /* continue regardless of error */
}

export let lib = {
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
  defer: [],
  init: function () {
    let z = this;
    let u = navigator.userAgent;
    z.device = u.match(/iPhone|iPod|Android|Opera Mini|IEMobile/gi) ? 'mobile' : 'desktop';
    if (typeof (z.len) == 'undefined') z.len = 0;
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
    z.add_evt(window.top1, 'focus', function () {
      window.top1.realvu_aa.foc = 1;
    });
    z.add_evt(window.top1, 'scroll', function () {
      window.top1.realvu_aa.foc = 1;
    });
    z.add_evt(window.top1, 'blur', function () {
      window.top1.realvu_aa.foc = 0;
    });
    z.add_evt(window.top1.document, 'blur', function () {
      window.top1.realvu_aa.foc = 0;
    });
    z.add_evt(window.top1, 'visibilitychange', function () {
      window.top1.realvu_aa.foc = !window.top1.document.hidden;
    });
    z.doLog = (window.top1.location.search.match(/boost_log/) || document.referrer.match(/boost_log/)) ? 1 : 0;
    if (z.doLog) {
      window.setTimeout(z.scr('https://ac.realvu.net/realvu_aa_viz.js'), 500);
    }
  },

  add_evt: function (elem, evtType, func) {
    elem.addEventListener(evtType, func, true);
    this.defer.push(function() {
      elem.removeEventListener(evtType, func, true);
    });
  },

  update: function () {
    let z = this;
    let t = window.top1;
    let de = t.document.documentElement;
    z.x1 = t.pageXOffset ? t.pageXOffset : de.scrollLeft;
    z.y1 = t.pageYOffset ? t.pageYOffset : de.scrollTop;
    let w1 = t.innerWidth ? t.innerWidth : de.clientWidth;
    let h1 = t.innerHeight ? t.innerHeight : de.clientHeight;
    z.x2 = z.x1 + w1;
    z.y2 = z.y1 + h1;
  },
  brd: function (s, p) { // return a board Width, s-element, p={Top,Right,Bottom, Left}
    let u;
    if (window.getComputedStyle) u = window.getComputedStyle(s, null);
    else u = s.style;
    let a = u['border' + p + 'Width'];
    return parseInt(a.length > 2 ? a.slice(0, -2) : 0);
  },

  padd: function (s, p) { // return a board Width, s-element, p={Top,Right,Bottom, Left}
    let u;
    if (window.getComputedStyle) u = window.getComputedStyle(s, null);
    else u = s.style;
    let a = u['padding' + p];
    return parseInt(a.length > 2 ? a.slice(0, -2) : 0);
  },

  viz_area: function (x1, x2, y1, y2) { // coords of Ad
    if (this.fr == 1) {
      try {
        let iv = Math.round(100 * window.top1.$sf.ext.geom().self.iv);
        return iv;
      } catch (e) {
        /* continue regardless of error */
      }
    }
    let xv1 = Math.max(x1, this.x1);
    let yv1 = Math.max(y1, this.y1);
    let xv2 = Math.min(x2, this.x2);
    let yv2 = Math.min(y2, this.y2);
    let A = Math.round(100 * ((xv2 - xv1) * (yv2 - yv1)) / ((x2 - x1) * (y2 - y1)));
    return (A > 0) ? A : 0;
  },

  viz_dist: function (x1, x2, y1, y2) { // coords of Ad
    let d = Math.max(0, this.x1 - x2, x1 - this.x2) + Math.max(0, this.y1 - y2, y1 - this.y2);
    return d;
  },

  track: function (a, f, params) {
    let z = this;
    let s1 = z.tru(a, f) + params;
    if (f == 'conf') {
      z.scr(s1, a);
      z.log(' <a href=\'' + s1 + '\'>' + f + '</a>', a.num);
    } else {
      let bk = {
        s1: s1,
        a: a,
        f: f
      };
      z.beacons.push(bk);
    }
  },

  send_track: function () {
    let z = this;
    if (z.sr >= 'a') { // conf, send beacons
      let bk = z.beacons.shift();
      while (typeof bk != 'undefined') {
        bk.s1 = bk.s1.replace(/_sr=0*_/, '_sr=' + z.sr + '_');
        z.log(' ' + bk.a.riff + ' ' + bk.a.unit_id + /* ' '+pin.mode+ */ ' ' + bk.a.w + 'x' + bk.a.h + '@' + bk.a.x + ',' + bk.a.y +
          ' <a href=\'' + bk.s1 + '\'>' + bk.f + '</a>', bk.a.num);
        if (bk.a.rnd < Math.pow(10, 1 - (z.sr.charCodeAt(0) & 7))) {
          z.scr(bk.s1, bk.a);
        }
        bk = z.beacons.shift();
      }
    }
  },

  scr: function (s1, a) {
    let st = document.createElement('script');
    st.async = true;
    st.type = 'text/javascript';
    st.src = s1;
    if (a && a.dv0 != null) {
      a.dv0.appendChild(st);
    } else {
      let x = document.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(st, x);
    }
  },

  tru: function (a, f) {
    let pin = a.pins[0];
    let s2 = 'https://ac.realvu.net/flip/3/c=' + pin.partner_id +
      '_f=' + f + '_r=' + a.riff +
      '_s=' + a.w + 'x' + a.h;
    if (a.p) s2 += '_p=' + a.p;
    if (f != 'conf') s2 += '_ps=' + this.enc(a.unit_id);
    s2 += '_dv=' + this.device +
      // + '_a=' + this.enc(a.a)
      '_d=' + pin.mode +
      '_sr=' + this.sr +
      '_h=' + this.enc(a.ru) + '?';
    return s2.replace(/%/g, '!');
  },

  enc: function (s1) {
    // return escape(s1).replace(/[0-9a-f]{5,}/gi,'RANDOM').replace(/\*/g, '%2A').replace(/_/g, '%5F').replace(/\+/g,
    return escape(s1).replace(/\*/g, '%2A').replace(/_/g, '%5F').replace(/\+/g,
      '%2B').replace(/\./g, '%2E').replace(/\x2F/g, '%2F');
  },

  findPosG: function (adi) {
    let t = this;
    let ad = adi;
    let xp = 0;
    let yp = 0;
    let dc = adi.ownerDocument;
    let wnd = dc.defaultView || dc.parentWindow;

    try {
      while (ad != null && typeof (ad) != 'undefined') {
        if (ad.getBoundingClientRect) { // Internet Explorer, Firefox 3+, Google Chrome, Opera 9.5+, Safari 4+
          let r = ad.getBoundingClientRect();
          xp += r.left; // +sL;
          yp += r.top; // +sT;
          if (wnd == window.top1) {
            xp += t.x1;
            yp += t.y1;
          }
        } else {
          if (ad.tagName == 'IFRAME') {
            xp += t.brd(ad, 'Left');
            yp += t.brd(ad, 'Top');
          }
          xp += ad.offsetLeft;
          yp += ad.offsetTop;

          let op = ad.offsetParent;
          let pn = ad.parentNode;
          let opf = ad;
          while (opf != null) {
            let cs = window.getComputedStyle(opf, null);
            if (cs.position == 'fixed') {
              if (cs.top) yp += parseInt(cs.top) + this.y1;
            }
            if (opf == op) break;
            opf = opf.parentNode;
          }
          while (op != null && typeof (op) != 'undefined') {
            xp += op.offsetLeft;
            yp += op.offsetTop;
            let ptn = op.tagName;
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
      /* continue regardless of error */
    }
    let q = {
      'x': Math.round(xp),
      'y': Math.round(yp)
    };
    return q;
  },

  poll: function () {
    let fifo = window.top1.realvu_aa_fifo;
    while (fifo.length > 0) {
      (fifo.shift())();
    }
    let z = this;
    z.update();
    let now = new Date();
    if (typeof (z.ptm) == 'undefined') {
      z.ptm = now;
    }
    let dvz = now - z.ptm;
    z.ptm = now;
    for (let i = 0; i < z.len; i++) {
      let a = z.ads[i];
      let restored = false;
      if (a.div == null) { // ad unit is not found yet
        let adobj = document.getElementById(a.pins[0].unit_id);
        if (adobj == null) {
          restored = z.readPos(a);
          if (!restored) continue; // do nothing if not found
        } else {
          z.bind_obj(a, adobj);
          z.log('{m}"' + a.unit_id + '" is bound', a.num);
        }
      }
      if (!restored) {
        a.target = z.questA(a.div);
        let target = (a.target !== null) ? a.target : a.div;
        if (window.getComputedStyle(target).display == 'none') {
          let targSibl = target.previousElementSibling; // for 'none' containers on mobile define y as previous sibling y+h
          if (targSibl) {
            let q = z.findPosG(targSibl);
            a.x = q.x;
            a.y = q.y + targSibl.offsetHeight;
          } else {
            target = target.parentNode;
            let q = z.findPosG(target);
            a.x = q.x;
            a.y = q.y;
          }
          a.box.x = a.x;
          a.box.y = a.y;
          a.box.w = a.w;
          a.box.h = a.h;
        } else {
          a.box.w = Math.max(target.offsetWidth, a.w);
          a.box.h = Math.max(target.offsetHeight, a.h);
          let q = z.findPosG(target);
          let pad = {};
          pad.t = z.padd(target, 'Top');
          pad.l = z.padd(target, 'Left');
          pad.r = z.padd(target, 'Right');
          pad.b = z.padd(target, 'Bottom');
          let ax = q.x + pad.l;
          let ay = q.y + pad.t;
          a.box.x = ax;
          a.box.y = ay;
          if (a.box.w > a.w && a.box.w > 1) {
            ax += (a.box.w - a.w - pad.l - pad.r) / 2;
          }
          if (a.box.h > a.h && a.box.h > 1) {
            ay += (a.box.h - a.h - pad.t - pad.b) / 2;
          }
          if ((ax > 0 && ay > 0) && (a.x != ax || a.y != ay)) {
            a.x = ax;
            a.y = ay;
            z.writePos(a);
          }
        }
      }
      let vtr = ((a.box.w * a.box.h) < 242500) ? 49 : 29; // treashfold more then 49% and more then 29% for "oversized"
      if (a.pins[0].edge) {
        vtr = a.pins[0].edge - 1; // override default edge 50% (>49)
      }
      a.vz = z.viz_area(a.box.x, a.box.x + a.box.w, a.box.y, a.box.y + a.box.h);
      a.r = (z.fr > 1 ? 'frame' : (((a.vz > vtr) && z.foc) ? 'yes' : 'no')); // f-frame, y-yes in view,n-not in view
      if (a.y < 0) {
        a.r = 'out'; // if the unit intentionaly moved out, count it as out.
      }
      if (a.vz > vtr && z.foc) {
        a.vt += dvz; // real dt counter in milliseconds, because of poll() can be called irregularly
        a.vtu += dvz;
      }
      // now process every pin
      let plen = a.pins.length;
      for (let j = 0; j < plen; j++) {
        let pin = a.pins[j];
        if (pin.state <= 1) {
          let dist = z.viz_dist(a.x, a.x + a.w, a.y, a.y + a.h);
          let near = (pin.dist != null && dist <= pin.dist);
          // apply "near" rule for ad call only
          a.r = (z.fr > 1) ? 'frame' : (((a.vz > vtr) && z.foc) ? 'yes' : 'no');
          if (near && a.r == 'no') {
            a.r = 'yes';
          }
          if (a.riff === '') {
            a.riff = a.r;
            let vrScore = z.score(a, 'v:r');
            if (vrScore != null) {
              if (a.r == 'no' && vrScore > 75) {
                a.riff = 'yes';
              }
            }
            let vv0Score = z.score(a, 'v:v0');
            if (vv0Score != null) {
              if (a.r == 'yes' && vv0Score < (30 + 25 * Math.random())) {
                a.riff = 'no';
              }
            }
          }
          if ((pin.mode == 'kvp' || pin.mode == 'tx2') || (((a.vz > vtr) || near) && ((pin.mode == 'in-view' || pin.mode == 'video')))) {
            z.show(a, pin); // in-view or flip show immediately if initial realvu=yes, or delay is over
          }
        }
        if (pin.state == 2) {
          a.target = z.questA(a.div);
          if (a.target != null) {
            pin.state = 3;
            dvz = 0;
            a.vt = 0;
            // @if NODE_ENV='debug'
            let now = new Date();
            let msg = (now.getTime() - time0) / 1000 + ' RENDERED ' + a.unit_id;
            logMessage(msg);
            // @endif
            let rpt = z.bids_rpt(a, true);
            z.track(a, 'rend', rpt);
            z.incrMem(a, 'r', 'v:r');
          }
        }
        if (pin.state > 2) {
          let tmin = (pin.mode == 'video') ? 2E3 : 1E3; // mrc min view time
          if (a.vz > vtr) {
            pin.vt += dvz; // real dt counter in milliseconds, because of poll() can be called irregularly
            if (pin.state == 3) {
              pin.state = 4;
              z.incrMem(a, 'r', 'v:v0');
            }
            if (pin.state == 4 && pin.vt >= tmin) {
              pin.state = 5;
              let rpt = z.bids_rpt(a, true);
              z.track(a, 'view', rpt);
              z.incrMem(a, 'v', 'v:r');
              z.incrMem(a, 'v', 'v:v0');
            }
            if (pin.state == 5 && pin.vt >= 5 * tmin) {
              pin.state = 6;
              let rpt = z.bids_rpt(a, true);
              z.track(a, 'view2', rpt);
            }
          } else if (pin.vt < tmin) {
            pin.vt = 0; // reset to track continuous 1 sec
          }
        }
        if (pin.state >= 2 && pin.mode === 'tx2' &&
          ((a.vtu > pin.rotate) || (pin.delay > 0 && a.vtu > pin.delay && a.riff === 'no' && a.ncall < 2)) && pin.tx2n > 0) {
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
    if (a.nodeType == Node.TEXT_NODE) {
      let dc = a.ownerDocument;
      let wnd = dc.defaultView || dc.parentWindow;
      let par = a.parentNode;
      if (wnd == wnd.top) {
        return par;
      } else {
        return par.offsetParent;
      }
    }
    let notFriendly = false;
    let ain = null;
    let tn = a.tagName;
    if (tn == 'HEAD' || tn == 'SCRIPT') return null;
    if (tn == 'IFRAME') {
      ain = this.doc(a);
      if (ain == null) {
        notFriendly = true;
      } else {
        a = ain;
        tn = a.tagName;
      }
    }
    if (notFriendly || tn == 'OBJECT' || tn == 'IMG' || tn == 'EMBED' || tn == 'SVG' || tn == 'CANVAS' ||
      (tn == 'DIV' && a.style.backgroundImage)) {
      let w1 = a.offsetWidth;
      let h1 = a.offsetHeight;
      if (w1 > 33 && h1 > 33 && a.style.display != 'none') return a;
    }
    if (a.hasChildNodes()) {
      let b = a.firstChild;
      while (b != null) {
        let c = this.questA(b);
        if (c != null) return c;
        b = b.nextSibling;
      }
    }
    return null;
  },

  doc: function(f) { // return document of f-iframe
    let d = null;
    try {
      if (f.contentDocument) d = f.contentDocument; // DOM
      else if (f.contentWindow) d = f.contentWindow.document; // IE
    } catch (e) {
      /* continue regardless of error */
    }
    return d;
  },

  bind_obj: function (a, adobj) {
    a.div = adobj;
    a.target = null; // initially null, found ad when served
    a.unit_id = adobj.id; // placement id or name
    a.w = adobj.offsetWidth || 1; // width, min 1
    a.h = adobj.offsetHeight || 1; // height, min 1
  },
  add: function (wnd1, p) { // p - realvu unit id
    let a = {
      num: this.len,
      x: 0,
      y: 0,
      box: {
        x: 0,
        y: 0,
        h: 1,
        w: 1
      }, // measured ad box
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
      riff: '', // r to report
      rnd: Math.random(),
      ncall: 0, // a callback number
      rq_bids: [], // rq bids of registered partners
      bids: [] // array of bids
    };
    a.ru = window.top1.location.hostname;
    window.top1.realvu_aa.ads[this.len++] = a;
    return a;
  },

  fmt: function (a, pin) {
    return {
      'realvu': a.r,
      'riff': a.riff,
      'area': a.vz,
      'ncall': a.ncall,
      'n': a.num,
      'id': a.unit_id,
      'pin': pin
    };
  },

  show: function (a, pin) {
    pin.state = 2; // 2-published
    pin.vt = 0; // reset view time counter
    if (pin.size) {
      let asz = this.setSize(pin.size);
      if (asz != null) {
        a.w = asz.w;
        a.h = asz.h;
      }
    }
    if (typeof pin.callback != 'undefined') {
      pin.callback(this.fmt(a, pin));
    }
    a.ncall++;
    this.track(a, 'show', '');
  },

  check: function (p1) {
    let pin = {
      dist: 150,
      state: 0,
      tx2n: 7
    }; // if dist is set trigger ad when distance < pin.dist
    for (let attr in p1) {
      if (p1.hasOwnProperty(attr)) {
        if ((attr == 'ad_sizes') && (typeof (p1[attr]) == 'string')) {
          pin[attr] = p1[attr].split(',');
        } else if (attr == 'edge') {
          try {
            let ed = parseInt(p1[attr]);
            if (ed > 0 && ed < 251) pin[attr] = ed;
          } catch (e) {
            /* continue regardless of error */
          }
        } else {
          pin[attr] = p1[attr];
        }
      }
    }
    let a = null;
    let z = this;
    try {
      // not to track the same object more than one time
      for (let i = 0; i < z.len; i++) {
        //         if (z.ads[i].div == adobj) { a = z.ads[i]; break; }
        if (z.ads[i].unit_id == pin.unit_id) {
          a = z.ads[i];
          break;
        }
      }
      pin.wnd = pin.wnd || window;
      if (a == null) {
        a = z.add(pin.wnd, pin.p);
        a.unit_id = pin.unit_id;
        let adobj = (pin.unit) ? pin.unit : document.getElementById(a.unit_id);
        if (adobj != null) {
          z.bind_obj(a, adobj);
        } else {
          z.log('{w}"' + pin.unit_id + '" not found', a.num);
        }
        if (pin.size) {
          let asz = z.setSize(pin.size);
          if (asz != null) {
            a.w = asz.w;
            a.h = asz.h;
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
      }
      if (this.sr === '') {
        z.track(a, 'conf', '');
        this.sr = '0';
      }
      this.poll();
      return a;
    } catch (e) {
      z.log(e.message, -1);
      return {
        r: 'err'
      };
    }
  },

  setSize: function (sa) {
    let sb = sa;
    try {
      if (typeof (sa) == 'string') sb = sa.split('x'); // pin.size is a string WWWxHHH or array
      else if (Array.isArray(sa)) {
        let mm = 4;
        while (--mm > 0 && Array.isArray(sa[0]) && Array.isArray(sa[0][0])) {
          sa = sa[0];
        }
        for (let m = 0; m < sa.length; m++) {
          if (Array.isArray(sa[m])) {
            sb = sa[m]; // if size is [][]
            let s = sb[0] + 'x' + sb[1];
            if (s == '300x250' || s == '728x90' || s == '320x50' || s == '970x90') {
              break; // use most popular sizes
            }
          } else if (sa.length > 1) {
            sb = sa;
          }
        }
      }
      let w1 = parseInt(sb[0]);
      let h1 = parseInt(sb[1]);
      return {
        w: w1,
        h: h1
      };
    } catch (e) {
      /* continue regardless of error */
    }
    return null;
  },
  // API functions
  addUnitById: function (partnerId, unitId, callback, delay) {
    let p1 = partnerId;
    if (typeof (p1) == 'string') {
      p1 = {
        partner_id: partnerId,
        unit_id: unitId,
        callback: callback,
        delay: delay
      };
    }
    let a = window.top1.realvu_aa.check(p1);
    return a.riff;
  },

  checkBidIn: function(partnerId, args, b) { // process a bid from hb
    // b==true - add/update, b==false - update only
    if (args.cpm == 0) return; // collect only bids submitted
    const boost = window.top1.realvu_aa;
    let pushBid = false;
    let adi = null;
    if (!b) { // update only if already checked in by xyzBidAdapter
      for (let i = 0; i < boost.ads.length; i++) {
        adi = boost.ads[i];
        if (adi.unit_id == args.adUnitCode) {
          pushBid = true;
          break;
        }
      }
    } else {
      pushBid = true;
      adi = window.top1.realvu_aa.check({
        unit_id: args.adUnitCode,
        size: args.size,
        partner_id: partnerId
      });
    }
    if (pushBid) {
      let pb = {
        bidder: args.bidder,
        cpm: args.cpm,
        size: args.size,
        adId: args.adId,
        requestId: args.requestId,
        crid: '',
        ttr: args.timeToRespond,
        winner: 0
      };
      if (args.creative_id) {
        pb.crid = args.creative_id;
      }
      adi.bids.push(pb);
    }
  },

  checkBidWon: function(partnerId, args, b) {
    // b==true - add/update, b==false - update only
    const z = this;
    const unitId = args.adUnitCode;
    for (let i = 0; i < z.ads.length; i++) {
      let adi = z.ads[i];
      if (adi.unit_id == unitId) {
        for (let j = 0; j < adi.bids.length; j++) {
          let bj = adi.bids[j];
          if (bj.adId == args.adId) {
            bj.winner = 1;
            break;
          }
        }
        let rpt = z.bids_rpt(adi, false);
        z.track(adi, 'win', rpt);
        break;
      }
    }
  },

  bids_rpt: function(a, wo) { // a-unit, wo=true - WinnerOnly
    let rpt = '';
    for (let i = 0; i < a.bids.length; i++) {
      let g = a.bids[i];
      if (wo && !g.winner) continue;
      rpt += '&bdr=' + g.bidder + '&cpm=' + g.cpm + '&vi=' + a.riff +
        '&gw=' + g.winner + '&crt=' + g.crid + '&ttr=' + g.ttr;
      // append bid partner_id if any
      let pid = '';
      for (let j = 0; j < a.rq_bids.length; j++) {
        let rqb = a.rq_bids[j];
        if (rqb.adId == g.adId) {
          pid = rqb.partner_id;
          break;
        }
      }
      rpt += '&bc=' + pid;
    }
    return rpt;
  },

  getStatusById: function (unitId) { // return status object
    for (let i = 0; i < this.ads.length; i++) {
      let adi = this.ads[i];
      if (adi.unit_id == unitId) return this.fmt(adi);
    }
    return null;
  },

  log: function (m1, i) {
    if (this.doLog) {
      this.msg.push({
        dt: new Date() - this.t0,
        s: 'U' + (i + 1) + m1
      });
    }
  },

  keyPos: function (a) {
    if (a.pins[0].unit_id) {
      let level = 'L' + (window.top1.location.pathname.match(/\//g) || []).length;
      return 'realvu.' + level + '.' + a.pins[0].unit_id.replace(/[0-9]{5,}/gi, 'RANDOM');
    }
  },

  writePos: function (a) {
    try {
      let v = a.x + ',' + a.y + ',' + a.w + ',' + a.h;
      storage.setDataInLocalStorage(this.keyPos(a), v);
    } catch (ex) {
      /* continue regardless of error */
    }
  },

  readPos: function (a) {
    try {
      let s = storage.getDataFromLocalStorage(this.keyPos(a));
      if (s) {
        let v = s.split(',');
        a.x = parseInt(v[0], 10);
        a.y = parseInt(v[1], 10);
        a.w = parseInt(v[2], 10);
        a.h = parseInt(v[3], 10);
        a.box = {x: a.x, y: a.y, w: a.w, h: a.h};
        return true;
      }
    } catch (ex) {
      /* do nothing */
    }
    return false;
  },

  incrMem: function(a, evt, name) {
    try {
      let k1 = this.keyPos(a) + '.' + name;
      let vmem = storage.getDataFromLocalStorage(k1);
      if (vmem == null) vmem = '1:3';
      let vr = vmem.split(':');
      let nv = parseInt(vr[0], 10);
      let nr = parseInt(vr[1], 10);
      if (evt == 'r') {
        nr <<= 1;
        nr |= 1;
        nv <<= 1;
      }
      if (evt == 'v') {
        nv |= 1;
      }
      storage.setDataInLocalStorage(k1, nv + ':' + nr);
    } catch (ex) {
      /* do nothing */
    }
  },

  score: function (a, name) {
    try {
      let vstr = storage.getDataFromLocalStorage(this.keyPos(a) + '.' + name);
      if (vstr != null) {
        let vr = vstr.split(':');
        let nv = parseInt(vr[0], 10);
        let nr = parseInt(vr[1], 10);
        let sv = 0;
        let sr = 0;
        for (nr &= 0x3FF; nr > 0; nr >>>= 1, nv >>>= 1) { // count 10 deliveries
          if (nr & 0x1) sr++;
          if (nv & 0x1) sv++;
        }
        return Math.round(sv * 100 / sr);
      }
    } catch (ex) {
      /* do nothing */
    }
    return null;
  }
};

window.top1.realvu_aa_fifo = window.top1.realvu_aa_fifo || [];
window.top1.realvu_aa = window.top1.realvu_aa || lib;

if (typeof (window.top1.boost_poll) == 'undefined') {
  window.top1.realvu_aa.init();
  window.top1.boost_poll = setInterval(function () {
    window.top1 && window.top1.realvu_aa && window.top1.realvu_aa.poll();
  }, 20);
}

let _options = {};

realvuAnalyticsAdapter.originEnableAnalytics = realvuAnalyticsAdapter.enableAnalytics;

realvuAnalyticsAdapter.enableAnalytics = function (config) {
  _options = config.options;
  if (typeof (_options.partnerId) == 'undefined' || _options.partnerId == '') {
    logError('Missed realvu.com partnerId parameter', 101, 'Missed partnerId parameter');
  }
  realvuAnalyticsAdapter.originEnableAnalytics(config);
  return _options.partnerId;
};

const time0 = (new Date()).getTime();

realvuAnalyticsAdapter.track = function ({eventType, args}) {
  // @if NODE_ENV='debug'
  let msg = '';
  let now = new Date();
  msg += (now.getTime() - time0) / 1000 + ' eventType=' + eventType;
  if (typeof (args) != 'undefined') {
    msg += ', args.bidder=' + args.bidder + ' args.adUnitCode=' + args.adUnitCode +
      ' args.adId=' + args.adId +
      ' args.cpm=' + args.cpm +
      ' creativei_id=' + args.creative_id;
  }
  // msg += '\nargs=' + JSON.stringify(args) + '<br>';
  logMessage(msg);
  // @endif

  const boost = window.top1.realvu_aa;
  let b = false; // false - update only, true - add if not checked in yet
  let partnerId = null;
  if (_options && _options.partnerId && args) {
    partnerId = _options.partnerId;
    let code = args.adUnitCode;
    b = _options.regAllUnits;
    if (!b && _options.unitIds) {
      for (let j = 0; j < _options.unitIds.length; j++) {
        if (code === _options.unitIds[j]) {
          b = true;
          break;
        }
      }
    }
  }
  if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
    boost.checkBidIn(partnerId, args, b);
  } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
    boost.checkBidWon(partnerId, args, b);
  }
};

// xyzBidAdapter calls checkin() to obtain "yes/no" viewability
realvuAnalyticsAdapter.checkIn = function (bid, partnerId) {
  // find (or add if not registered yet) the unit in boost
  if (typeof (partnerId) == 'undefined' || partnerId == '') {
    logError('Missed realvu.com partnerId parameter', 102, 'Missed partnerId parameter');
  }
  let a = window.top1.realvu_aa.check({
    unit_id: bid.adUnitCode,
    size: bid.sizes,
    partner_id: partnerId
  });
  a.rq_bids.push({
    bidder: bid.bidder,
    adId: bid.bidId,
    partner_id: partnerId
  });
  return a.riff;
};

realvuAnalyticsAdapter.isInView = function (adUnitCode) {
  let r = 'NA';
  let s = window.top1.realvu_aa.getStatusById(adUnitCode);
  if (s) {
    r = s.realvu;
  }
  return r;
};

let disableAnalyticsSuper = realvuAnalyticsAdapter.disableAnalytics;
realvuAnalyticsAdapter.disableAnalytics = function () {
  while (lib.defer.length) {
    lib.defer.pop()();
  }
  disableAnalyticsSuper.apply(this, arguments);
};

adapterManager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvuAnalytics'
});

export default realvuAnalyticsAdapter;
