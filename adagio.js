// hash: RgBOLRLarWLbdp3Ctr/cUVNfVGRqmeEgIYmJo2LMFDnFGlWZbuYVRV09tYM3d0rDIBJw9WRpgaJegnBSkPokzW6ThK3m3EClwCI71Z+cIZqYZk55Ja4oLOfjCSqpfSqj6CucvmqSNiJIwq5p4eLUGbwrdMFIpAiYvtpVpwHvykw=
var _ADAGIO = function(e) {
    "use strict";
    function t(e, t) {
        var n = Object.keys(e);
        if (Object.getOwnPropertySymbols) {
            var i = Object.getOwnPropertySymbols(e);
            t && (i = i.filter((function(t) {
                return Object.getOwnPropertyDescriptor(e, t).enumerable
            }
            ))),
            n.push.apply(n, i)
        }
        return n
    }
    function n(e) {
        for (var n = 1; n < arguments.length; n++) {
            var i = null != arguments[n] ? arguments[n] : {};
            n % 2 ? t(Object(i), !0).forEach((function(t) {
                d(e, t, i[t])
            }
            )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i)) : t(Object(i)).forEach((function(t) {
                Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t))
            }
            ))
        }
        return e
    }
    function i(e) {
        var t = function(e, t) {
            if ("object" != typeof e || !e)
                return e;
            var n = e[Symbol.toPrimitive];
            if (void 0 !== n) {
                var i = n.call(e, t || "default");
                if ("object" != typeof i)
                    return i;
                throw new TypeError("@@toPrimitive must return a primitive value.")
            }
            return ("string" === t ? String : Number)(e)
        }(e, "string");
        return "symbol" == typeof t ? t : t + ""
    }
    function a(e) {
        return (a = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
            return typeof e
        }
        : function(e) {
            return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
        }
        )(e)
    }
    function r(e, t) {
        if (!(e instanceof t))
            throw new TypeError("Cannot call a class as a function")
    }
    function s(e, t) {
        for (var n = 0; n < t.length; n++) {
            var a = t[n];
            a.enumerable = a.enumerable || !1,
            a.configurable = !0,
            "value"in a && (a.writable = !0),
            Object.defineProperty(e, i(a.key), a)
        }
    }
    function o(e, t, n) {
        return t && s(e.prototype, t),
        n && s(e, n),
        Object.defineProperty(e, "prototype", {
            writable: !1
        }),
        e
    }
    function d(e, t, n) {
        return (t = i(t))in e ? Object.defineProperty(e, t, {
            value: n,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : e[t] = n,
        e
    }
    function u(e) {
        return function(e) {
            if (Array.isArray(e))
                return l(e)
        }(e) || function(e) {
            if ("undefined" != typeof Symbol && null != e[Symbol.iterator] || null != e["@@iterator"])
                return Array.from(e)
        }(e) || c(e) || function() {
            throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
        }()
    }
    function c(e, t) {
        if (e) {
            if ("string" == typeof e)
                return l(e, t);
            var n = Object.prototype.toString.call(e).slice(8, -1);
            return "Object" === n && e.constructor && (n = e.constructor.name),
            "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? l(e, t) : void 0
        }
    }
    function l(e, t) {
        (null == t || t > e.length) && (t = e.length);
        for (var n = 0, i = new Array(t); n < t; n++)
            i[n] = e[n];
        return i
    }
    var f = ["120x600", "160x600", "300x250", "300x600", "300x1050", "600x250", "600x600", "728x90", "728x94", "728x315", "800x600", "970x90", "970x250", "1000x200"]
      , v = 0
      , h = 1
      , p = Array.isArray
      , g = "object" == typeof global && global && global.Object === Object && global
      , m = "object" == typeof self && self && self.Object === Object && self
      , b = g || m || Function("return this")()
      , y = b.Symbol
      , A = Object.prototype
      , w = A.hasOwnProperty
      , I = A.toString
      , _ = y ? y.toStringTag : void 0;
    var O = Object.prototype.toString;
    var D = y ? y.toStringTag : void 0;
    function E(e) {
        return null == e ? void 0 === e ? "[object Undefined]" : "[object Null]" : D && D in Object(e) ? function(e) {
            var t = w.call(e, _)
              , n = e[_];
            try {
                e[_] = void 0;
                var i = !0
            } catch (e) {}
            var a = I.call(e);
            return i && (t ? e[_] = n : delete e[_]),
            a
        }(e) : function(e) {
            return O.call(e)
        }(e)
    }
    function S(e) {
        return null != e && "object" == typeof e
    }
    function U(e) {
        return "symbol" == typeof e || S(e) && "[object Symbol]" == E(e)
    }
    var C = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/
      , x = /^\w*$/;
    function G(e) {
        var t = typeof e;
        return null != e && ("object" == t || "function" == t)
    }
    var j, k = b["__core-js_shared__"], N = (j = /[^.]+$/.exec(k && k.keys && k.keys.IE_PROTO || "")) ? "Symbol(src)_1." + j : "";
    var P = Function.prototype.toString;
    var R = /^\[object .+?Constructor\]$/
      , T = Function.prototype
      , B = Object.prototype
      , L = T.toString
      , z = B.hasOwnProperty
      , M = RegExp("^" + L.call(z).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
    function V(e) {
        return !(!G(e) || (t = e,
        N && N in t)) && (function(e) {
            if (!G(e))
                return !1;
            var t = E(e);
            return "[object Function]" == t || "[object GeneratorFunction]" == t || "[object AsyncFunction]" == t || "[object Proxy]" == t
        }(e) ? M : R).test(function(e) {
            if (null != e) {
                try {
                    return P.call(e)
                } catch (e) {}
                try {
                    return e + ""
                } catch (e) {}
            }
            return ""
        }(e));
        var t
    }
    function F(e, t) {
        var n = function(e, t) {
            return null == e ? void 0 : e[t]
        }(e, t);
        return V(n) ? n : void 0
    }
    var q = F(Object, "create");
    var H = Object.prototype.hasOwnProperty;
    var $ = Object.prototype.hasOwnProperty;
    function W(e) {
        var t = -1
          , n = null == e ? 0 : e.length;
        for (this.clear(); ++t < n; ) {
            var i = e[t];
            this.set(i[0], i[1])
        }
    }
    function J(e, t) {
        return e === t || e != e && t != t
    }
    function Q(e, t) {
        for (var n = e.length; n--; )
            if (J(e[n][0], t))
                return n;
        return -1
    }
    W.prototype.clear = function() {
        this.__data__ = q ? q(null) : {},
        this.size = 0
    }
    ,
    W.prototype.delete = function(e) {
        var t = this.has(e) && delete this.__data__[e];
        return this.size -= t ? 1 : 0,
        t
    }
    ,
    W.prototype.get = function(e) {
        var t = this.__data__;
        if (q) {
            var n = t[e];
            return "__lodash_hash_undefined__" === n ? void 0 : n
        }
        return H.call(t, e) ? t[e] : void 0
    }
    ,
    W.prototype.has = function(e) {
        var t = this.__data__;
        return q ? void 0 !== t[e] : $.call(t, e)
    }
    ,
    W.prototype.set = function(e, t) {
        var n = this.__data__;
        return this.size += this.has(e) ? 0 : 1,
        n[e] = q && void 0 === t ? "__lodash_hash_undefined__" : t,
        this
    }
    ;
    var K = Array.prototype.splice;
    function Z(e) {
        var t = -1
          , n = null == e ? 0 : e.length;
        for (this.clear(); ++t < n; ) {
            var i = e[t];
            this.set(i[0], i[1])
        }
    }
    Z.prototype.clear = function() {
        this.__data__ = [],
        this.size = 0
    }
    ,
    Z.prototype.delete = function(e) {
        var t = this.__data__
          , n = Q(t, e);
        return !(n < 0) && (n == t.length - 1 ? t.pop() : K.call(t, n, 1),
        --this.size,
        !0)
    }
    ,
    Z.prototype.get = function(e) {
        var t = this.__data__
          , n = Q(t, e);
        return n < 0 ? void 0 : t[n][1]
    }
    ,
    Z.prototype.has = function(e) {
        return Q(this.__data__, e) > -1
    }
    ,
    Z.prototype.set = function(e, t) {
        var n = this.__data__
          , i = Q(n, e);
        return i < 0 ? (++this.size,
        n.push([e, t])) : n[i][1] = t,
        this
    }
    ;
    var X = F(b, "Map");
    function Y(e, t) {
        var n, i, a = e.__data__;
        return ("string" == (i = typeof (n = t)) || "number" == i || "symbol" == i || "boolean" == i ? "__proto__" !== n : null === n) ? a["string" == typeof t ? "string" : "hash"] : a.map
    }
    function ee(e) {
        var t = -1
          , n = null == e ? 0 : e.length;
        for (this.clear(); ++t < n; ) {
            var i = e[t];
            this.set(i[0], i[1])
        }
    }
    ee.prototype.clear = function() {
        this.size = 0,
        this.__data__ = {
            hash: new W,
            map: new (X || Z),
            string: new W
        }
    }
    ,
    ee.prototype.delete = function(e) {
        var t = Y(this, e).delete(e);
        return this.size -= t ? 1 : 0,
        t
    }
    ,
    ee.prototype.get = function(e) {
        return Y(this, e).get(e)
    }
    ,
    ee.prototype.has = function(e) {
        return Y(this, e).has(e)
    }
    ,
    ee.prototype.set = function(e, t) {
        var n = Y(this, e)
          , i = n.size;
        return n.set(e, t),
        this.size += n.size == i ? 0 : 1,
        this
    }
    ;
    function te(e, t) {
        if ("function" != typeof e || null != t && "function" != typeof t)
            throw new TypeError("Expected a function");
        var n = function() {
            var i = arguments
              , a = t ? t.apply(this, i) : i[0]
              , r = n.cache;
            if (r.has(a))
                return r.get(a);
            var s = e.apply(this, i);
            return n.cache = r.set(a, s) || r,
            s
        };
        return n.cache = new (te.Cache || ee),
        n
    }
    te.Cache = ee;
    var ne = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g
      , ie = /\\(\\)?/g
      , ae = function(e) {
        var t = te(e, (function(e) {
            return 500 === n.size && n.clear(),
            e
        }
        ))
          , n = t.cache;
        return t
    }((function(e) {
        var t = [];
        return 46 === e.charCodeAt(0) && t.push(""),
        e.replace(ne, (function(e, n, i, a) {
            t.push(i ? a.replace(ie, "$1") : n || e)
        }
        )),
        t
    }
    ));
    var re = y ? y.prototype : void 0
      , se = re ? re.toString : void 0;
    function oe(e) {
        if ("string" == typeof e)
            return e;
        if (p(e))
            return function(e, t) {
                for (var n = -1, i = null == e ? 0 : e.length, a = Array(i); ++n < i; )
                    a[n] = t(e[n], n, e);
                return a
            }(e, oe) + "";
        if (U(e))
            return se ? se.call(e) : "";
        var t = e + "";
        return "0" == t && 1 / e == -1 / 0 ? "-0" : t
    }
    function de(e, t) {
        return p(e) ? e : function(e, t) {
            if (p(e))
                return !1;
            var n = typeof e;
            return !("number" != n && "symbol" != n && "boolean" != n && null != e && !U(e)) || (x.test(e) || !C.test(e) || null != t && e in Object(t))
        }(e, t) ? [e] : ae(function(e) {
            return null == e ? "" : oe(e)
        }(e))
    }
    function ue(e) {
        if ("string" == typeof e || U(e))
            return e;
        var t = e + "";
        return "0" == t && 1 / e == -1 / 0 ? "-0" : t
    }
    function ce(e, t) {
        for (var n = 0, i = (t = de(t, e)).length; null != e && n < i; )
            e = e[ue(t[n++])];
        return n && n == i ? e : void 0
    }
    var le = Object.prototype.hasOwnProperty;
    function fe(e, t) {
        return null != e && le.call(e, t)
    }
    function ve(e) {
        return S(e) && "[object Arguments]" == E(e)
    }
    var he = Object.prototype
      , pe = he.hasOwnProperty
      , ge = he.propertyIsEnumerable
      , me = ve(function() {
        return arguments
    }()) ? ve : function(e) {
        return S(e) && pe.call(e, "callee") && !ge.call(e, "callee")
    }
      , be = /^(?:0|[1-9]\d*)$/;
    function ye(e, t) {
        var n = typeof e;
        return !!(t = null == t ? 9007199254740991 : t) && ("number" == n || "symbol" != n && be.test(e)) && e > -1 && e % 1 == 0 && e < t
    }
    function Ae(e, t) {
        return null != e && function(e, t, n) {
            for (var i, a = -1, r = (t = de(t, e)).length, s = !1; ++a < r; ) {
                var o = ue(t[a]);
                if (!(s = null != e && n(e, o)))
                    break;
                e = e[o]
            }
            return s || ++a != r ? s : !!(r = null == e ? 0 : e.length) && ("number" == typeof (i = r) && i > -1 && i % 1 == 0 && i <= 9007199254740991) && ye(o, r) && (p(e) || me(e))
        }(e, t, fe)
    }
    var we = function() {
        try {
            var e = F(Object, "defineProperty");
            return e({}, "", {}),
            e
        } catch (e) {}
    }();
    var Ie = Object.prototype.hasOwnProperty;
    function _e(e, t, n) {
        var i = e[t];
        Ie.call(e, t) && J(i, n) && (void 0 !== n || t in e) || function(e, t, n) {
            "__proto__" == t && we ? we(e, t, {
                configurable: !0,
                enumerable: !0,
                value: n,
                writable: !0
            }) : e[t] = n
        }(e, t, n)
    }
    function Oe(e, t, n) {
        return null == e ? e : function(e, t, n, i) {
            if (!G(e))
                return e;
            for (var a = -1, r = (t = de(t, e)).length, s = r - 1, o = e; null != o && ++a < r; ) {
                var d = ue(t[a])
                  , u = n;
                if ("__proto__" === d || "constructor" === d || "prototype" === d)
                    return e;
                if (a != s) {
                    var c = o[d];
                    void 0 === (u = i ? i(c, d, o) : void 0) && (u = G(c) ? c : ye(t[a + 1]) ? [] : {})
                }
                _e(o, d, u),
                o = o[d]
            }
            return e
        }(e, t, n)
    }
    function De(e, t) {
        return t.length < 2 ? e : ce(e, function(e, t, n) {
            var i = -1
              , a = e.length;
            t < 0 && (t = -t > a ? 0 : a + t),
            (n = n > a ? a : n) < 0 && (n += a),
            a = t > n ? 0 : n - t >>> 0,
            t >>>= 0;
            for (var r = Array(a); ++i < a; )
                r[i] = e[i + t];
            return r
        }(t, 0, -1))
    }
    function Ee(e, t) {
        return null == e || function(e, t) {
            return null == (e = De(e, t = de(t, e))) || delete e[ue((n = t,
            i = null == n ? 0 : n.length,
            i ? n[i - 1] : void 0))];
            var n, i
        }(e, t)
    }
    var Se = function() {
        return o((function e() {
            r(this, e),
            this.init()
        }
        ), [{
            key: "init",
            value: function() {
                this.w = window,
                this.create()
            }
        }, {
            key: "create",
            value: function() {
                this.w.localStorage.getItem("adagio") || this.w.localStorage.setItem("adagio", JSON.stringify({}))
            }
        }, {
            key: "insureSchema",
            value: function() {
                var e = this.w.localStorage.getItem("adagio");
                try {
                    !(!e || !JSON.parse(e)) || (this.w.localStorage.removeItem("adagio"),
                    this.create())
                } catch (e) {
                    this.w.localStorage.removeItem("adagio"),
                    this.create()
                }
            }
        }, {
            key: "get",
            value: function(e) {
                this.insureSchema();
                var t = JSON.parse(this.w.localStorage.getItem("adagio"));
                return e ? Ae(t, e) ? function(e, t, n) {
                    var i = null == e ? void 0 : ce(e, t);
                    return void 0 === i ? n : i
                }(t, e) : null : t
            }
        }, {
            key: "store",
            value: function(e, t) {
                this.insureSchema();
                var n = JSON.parse(this.w.localStorage.getItem("adagio"));
                Oe(n, e, t),
                this.w.localStorage.setItem("adagio", JSON.stringify(n))
            }
        }, {
            key: "unset",
            value: function(e) {
                var t = JSON.parse(this.w.localStorage.getItem("adagio"));
                Ee(t, e),
                this.w.localStorage.setItem("adagio", JSON.stringify(t))
            }
        }])
    }()
      , Ue = function() {
        try {
            if (window.top.location.href)
                return !0
        } catch (e) {
            return !1
        }
    }
      , Ce = function() {
        return Ue() ? window.top : window.self
    }
      , xe = {
        default: "\n      background: #222;\n      color: #bada55;\n      border-radius: 4px 0 0 4px;\n      padding: 3px 4px 2px;\n      font-weight: normal;\n  ",
        reset: "\n      background: transparent;\n      color: inherit;\n      border-radius: 0;\n      padding: 0;\n      font-weight: normal;\n  ",
        debug: "\n      background: palegreen;\n      color: darkgreen;\n      border-radius: 0 4px 4px 0;\n      padding: 3px 4px 2px;\n      margin-right: 10px;\n      font-weight: normal;\n  ",
        warn: "\n      background: lightcoral;\n      color: moccasin;\n      border-radius: 0 4px 4px 0;\n      padding: 3px 4px 2px;\n      margin-right: 10px;\n      font-weight: normal;\n  ",
        error: "\n      background: firebrick;\n      color: gainsboro;\n      border-radius: 0 4px 4px 0;\n      padding: 3px 4px 2px;\n      margin-right: 10px;\n      font-weight: normal;\n  "
    }
      , Ge = function(e) {
        e = e || "debug";
        for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
            n[i - 1] = arguments[i];
        var a;
        "string" == typeof n[0] ? n[1] ? (console.log("%cADG%c".concat(e.toUpperCase(), " %c%s"), xe.default, xe[e], xe.reset, n[0]),
        n.shift(),
        n.map((function(e) {
            console.log(e)
        }
        ))) : console.log("%cADG%c".concat(e.toUpperCase(), " %c%s"), xe.default, xe[e], xe.reset, n[0]) : (a = console).log.apply(a, ["%cADG%c".concat(e.toUpperCase()), xe.default, xe[e]].concat(n))
    }
      , je = function() {
        var e = Ce();
        return e && e.localStorage && e.localStorage.getItem("ADAGIO_DEV_DEBUG")
    }
      , ke = function() {
        if (je()) {
            for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
                t[n] = arguments[n];
            Ge.apply(void 0, ["warn"].concat(t))
        }
    }
      , Ne = function() {
        if (je()) {
            for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
                t[n] = arguments[n];
            Ge.apply(void 0, ["error"].concat(t))
        }
    }
      , Pe = function() {
        if (je()) {
            for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
                t[n] = arguments[n];
            Ge.apply(void 0, ["debug"].concat(t))
        }
    }
      , Re = function e(t) {
        return t ? (t ^ 16 * Math.random() >> t / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, e)
    }
      , Te = function() {
        var e, t;
        switch (e = Ce().navigator.userAgent,
        /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(e) ? 5 : /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/.test(e) ? 4 : 2) {
        case 2:
            t = "desktop";
            break;
        case 4:
            t = "mobile";
            break;
        case 5:
            t = "tablet"
        }
        return t
    }
      , Be = function(e) {
        if ("string" != typeof e || "http" !== e.slice(0, 4))
            return Pe("uriParser: unable to parse uri, invalid", e),
            !1;
        var t = document.createElement("a")
          , n = ""
          , i = {};
        t.href = e;
        for (var a = 0, r = (n = t.search.slice(1).split("&")).length; a < r; a++) {
            var s = n[a].split("=");
            i[s[0]] = s[1]
        }
        return {
            protocol: t.protocol,
            hostname: t.hostname,
            port: t.port,
            pathname: t.pathname,
            search: t.search,
            searchParsed: i,
            hash: t.hash,
            host: t.host
        }
    }
      , Le = function() {
        var e = Ce()
          , t = null;
        return e.performance && e.performance.timing && e.performance.timing.domContentLoadedEventStart && (t = e.performance.timing.domContentLoadedEventStart),
        t
    }
      , ze = function() {
        return o((function e() {
            r(this, e),
            this.storage = new Se,
            this.maxTimeSession = 18e5,
            this._ensureSchema()
        }
        ), [{
            key: "_ensureSchema",
            value: function() {
                var e = this.storage.get("navigation")
                  , t = this.storage.get("navigation.session");
                if (t) {
                    if (t.sampling)
                        try {
                            var n = t.sampling.avw
                              , i = t.sampling.rates.avw;
                            t.rnd = !0 === n ? i + .01 : i - .01,
                            t.vwSmplg = i,
                            t.vwSmplgNxt = e && e.nextSamplingRates && e.nextSamplingRates.avw ? e.nextSamplingRates.avw : i,
                            t._firstPageviewId = t.sampling.firstPageviewId,
                            t._bidsSmplg = .1,
                            t._currentPagetype = t.currentPagetype,
                            t._previousPagetype = t.previousPagetype,
                            delete t.sampling,
                            delete t.currentPagetype,
                            delete t.previousPagetype
                        } catch (e) {}
                    this.storage.store("session", t),
                    this.storage.unset("navigation.session"),
                    delete e.session,
                    delete e.nextSamplingRates
                }
                e && (this.storage.store("_navigation", e),
                this.storage.unset("navigation"))
            }
        }, {
            key: "startOrUpdate",
            value: function(e) {
                var t = this
                  , n = Date.now()
                  , i = this.storage.get("_navigation")
                  , a = this.storage.get("session")
                  , r = e && e.v && e.v >= 2;
                try {
                    !i || !a || (r ? e.isNew : e.isNew && e.initiator) || "number" != typeof a.vwSmplg || (r ? "number" == typeof a.expiry && n > a.expiry : "number" == typeof a.lastActivityTime && n - a.lastActivityTime > t.maxTimeSession) ? this.start(e) : this.update(e)
                } catch (e) {
                    Pe(e)
                }
            }
        }, {
            key: "start",
            value: function(e) {
                var t = this.storage.get("_navigation") || {}
                  , n = parseInt(t.totalPages, 10) || 0
                  , i = parseInt(t.totalSessions, 10) || 0
                  , a = this.storage.get("session") || {};
                this.storage.store("_navigation.totalPages", n + 1),
                this.storage.store("_navigation.totalSessions", i + 1);
                var r, s, o, d, u = Date.now(), c = a.vwSmplgNxt || .1, l = e && e.v && e.v >= 2;
                l ? (r = e && e.rnd ? e.rnd : Math.random(),
                s = e && e.id ? e.id : Re()) : Object.keys(a).length && "snippet" === a.initiator ? (s = a.id,
                r = a.rnd,
                o = a.testName,
                d = a.testVersion) : (s = e && e.id ? e.id : Re(),
                r = e && e.rnd ? e.rnd : Math.random());
                var f = {
                    _firstPageviewId: null,
                    _currentPagetype: null,
                    _previousPagetype: null,
                    _bidsSmplg: .1,
                    pages: 1,
                    rnd: r,
                    id: s,
                    new: !0,
                    vwSmplg: c,
                    vwSmplgNxt: c
                };
                f.expiry = u + this.maxTimeSession,
                l ? f._v = 2 : (f.lastActivityTime = u,
                f.initiator = "adgjs",
                o && (f.testName = o),
                d && (f.testVersion = d)),
                this.storage.store("session", f)
            }
        }, {
            key: "update",
            value: function(e) {
                var t = Date.now()
                  , n = this.storage.get("_navigation")
                  , i = this.storage.get("session");
                if (!n || !i)
                    throw new Error("Key missing in localStorage");
                var a = i._v && i._v >= 2 || e && e.v && e.v >= 2;
                a && (this.storage.unset("session.testName"),
                this.storage.unset("session.testVersion"),
                this.storage.unset("session.lastActivityTime"),
                this.storage.store("session._v", 2)),
                i._pages && (i.pages = i._pages,
                this.storage.unset("session._pages"));
                var r = parseInt(i.pages, 10) || 0
                  , s = parseInt(n.totalPages, 10) || 0;
                this.storage.store("session.expiry", t + this.maxTimeSession),
                a || (this.storage.store("session.lastActivityTime", t),
                this.storage.store("session.initiator", "adgjs")),
                this.storage.store("session.new", !1),
                this.storage.store("session.pages", r + 1),
                this.storage.store("_navigation.totalPages", s + 1)
            }
        }, {
            key: "setVwSamplingNext",
            value: function(e) {
                this.storage.store("session.vwSmplgNxt", e)
            }
        }, {
            key: "setSampling",
            value: function(e, t) {
                var n = this.storage.get("session._firstPageviewId");
                if (!this.storage.get("session.rnd"))
                    throw new Error("The key rnd has not been found");
                n ? n === e && t && "number" == typeof t.vwSmplgNxt && t.vwSmplgNxt >= 0 && (this.storage.store("session.vwSmplg", t.vwSmplgNxt),
                this.storage.store("session.vwSmplgNxt", t.vwSmplgNxt)) : this.storage.store("session._firstPageviewId", e)
            }
        }])
    }()
      , Me = function() {
        return o((function e() {
            r(this, e),
            this._storage = new Se
        }
        ), [{
            key: "sessionLength",
            get: function() {
                return this._storage.get("session.pages") || 1
            }
        }, {
            key: "avgSessionLength",
            get: function() {
                var e = parseInt(this._storage.get("_navigation.totalSessions"), 10) || 1;
                return (parseInt(this._storage.get("_navigation.totalPages"), 10) || 1) / e
            }
        }, {
            key: "referrerFQDN",
            get: function() {
                var e = "";
                if (Ue()) {
                    var t = window.top.document.referrer;
                    if (t)
                        e = Be(t).hostname
                }
                return e
            }
        }, {
            key: "totalSessions",
            get: function() {
                return this._storage.get("_navigation.totalSessions") || 1
            }
        }, {
            key: "previousPagetype",
            get: function() {
                return this._storage.get("session._previousPagetype")
            }
        }, {
            key: "currentPagetype",
            get: function() {
                return this._storage.get("session._currentPagetype")
            }
        }, {
            key: "allowBeaconSending",
            value: function(e) {
                var t, n = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
                if (-1 === ["avw", "bids"].indexOf(e))
                    return !0;
                switch (e) {
                case "bids":
                    t = "number" == typeof n ? n : this._storage.get("session._bidsSmplg"),
                    0 === this._storage.get("session.vwSmplg") && (t = 0);
                    break;
                case "avw":
                    t = this._storage.get("session.vwSmplg")
                }
                var i = this._storage.get("session.rnd");
                return "number" != typeof t || "number" != typeof i || i < t
            }
        }, {
            key: "pageType",
            set: function(e) {
                var t = this.currentPagetype;
                null != t && this._storage.store("session._previousPagetype", t),
                this._storage.store("session._currentPagetype", e)
            }
        }])
    }()
      , Ve = {
        avw: "//c.4dex.tech/avw.gif"
    }
      , Fe = []
      , qe = !!navigator.sendBeacon
      , He = Ce();
    He.ADAGIO = He.ADAGIO || {};
    var $e = function(e) {
        var t, n = function(e) {
            var t = e.collector
              , n = e.data
              , i = e.eventType
              , a = [];
            if (!Ve[t])
                return !1;
            if (!(n = "function" == typeof n ? n() : {}))
                return !1;
            if (n.org_id && -1 !== Fe.indexOf(n.org_id))
                return Pe("Beacon cannot be sent due to blacklist"),
                !1;
            if (n.adu_code) {
                var r = n.adu_code;
                delete n.adu_code,
                a.push(encodeURIComponent("adu_code") + "=" + encodeURIComponent(r))
            }
            var s = i || n.evt || "";
            for (var o in delete n.evt,
            a.push(encodeURIComponent("evt") + "=" + encodeURIComponent(s)),
            n)
                a.push(encodeURIComponent(o) + "=" + encodeURIComponent(n[o]));
            return He.ADAGIO.versions && (He.ADAGIO.versions.adagiojs && a.push("adgjsv=".concat(encodeURIComponent(He.ADAGIO.versions.adagiojs))),
            He.ADAGIO.versions.ssp && a.push("sspv=".concat(encodeURIComponent(He.ADAGIO.versions.ssp)))),
            He.location.protocol + Ve[t] + "?" + a.join("&")
        }({
            collector: e.collector,
            data: e.data,
            eventType: e.eventType
        });
        if (!n)
            return !1;
        try {
            (t = new XMLHttpRequest).onerror = function() {
                qe && navigator.sendBeacon(n)
            }
            ,
            t.open("post", n),
            t.send()
        } catch (e) {}
    }
      , We = function(e) {
        var t = e.event
          , n = e.collector
          , i = e.data
          , a = t.element || He;
        t._rule ? "unload" === t._rule ? He.addEventListener("unload", (function() {
            return $e({
                collector: n,
                data: i,
                eventType: "unload"
            })
        }
        )) : "visibilitychange" === t._rule && He.document.addEventListener("visibilitychange", (function() {
            "hidden" === He.document.visibilityState && $e({
                collector: n,
                data: i,
                eventType: "visibilitychange"
            })
        }
        )) : a.addEventListener(t.name, (function() {
            if ("function" == typeof t.beforeSend) {
                var e = t.beforeSend({
                    collector: n,
                    data: i
                });
                e && $e(Object.assign({}, e, {
                    eventType: t.name
                }))
            } else
                $e({
                    collector: n,
                    data: i,
                    eventType: t.name
                })
        }
        ), !1)
    }
      , Je = function(e) {
        var t = e.collector
          , n = e.data
          , i = e.events;
        if (i.length) {
            var a, r = function(e, t) {
                var n = "undefined" != typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
                if (!n) {
                    if (Array.isArray(e) || (n = c(e)) || t && e && "number" == typeof e.length) {
                        n && (e = n);
                        var i = 0
                          , a = function() {};
                        return {
                            s: a,
                            n: function() {
                                return i >= e.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: e[i++]
                                }
                            },
                            e: function(e) {
                                throw e
                            },
                            f: a
                        }
                    }
                    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                }
                var r, s = !0, o = !1;
                return {
                    s: function() {
                        n = n.call(e)
                    },
                    n: function() {
                        var e = n.next();
                        return s = e.done,
                        e
                    },
                    e: function(e) {
                        o = !0,
                        r = e
                    },
                    f: function() {
                        try {
                            s || null == n.return || n.return()
                        } finally {
                            if (o)
                                throw r
                        }
                    }
                }
            }(i);
            try {
                for (r.s(); !(a = r.n()).done; ) {
                    var s = a.value;
                    We({
                        event: s,
                        collector: t,
                        data: n
                    })
                }
            } catch (e) {
                r.e(e)
            } finally {
                r.f()
            }
        } else
            $e({
                collector: t,
                data: n
            })
    }
      , Qe = function e(t, n) {
        if (!n || !n.length)
            return !1;
        if (!t || "function" != typeof t.getBoundingClientRect)
            return !1;
        try {
            var i = t.getBoundingClientRect()
              , a = Math.round(i.width) + "x" + Math.round(i.height);
            if (-1 !== n.indexOf(a))
                return t;
            var r = t.querySelectorAll("*:not(script)");
            if (r.length) {
                for (var s = 0, o = r.length; s < o; s++)
                    if (t = e(r[s], n))
                        return t;
                return !1
            }
        } catch (e) {}
        return !1
    }
      , Ke = function(e) {
        var t = new Date(e.detail.ts).toString()
          , n = "";
        e.detail.data.event && e.detail.data.event.slot ? n = e.detail.data.event.slot.getSlotElementId() : e.detail.data.args && e.detail.data.args.slot && (n = e.detail.data.args.slot.getSlotElementId()),
        n === this._adUnitElementId && (Pe("GPT impressionViewable: ".concat(n, " at ").concat(t)),
        this.viewability.adserver.visible = !0,
        this.viewability.adserver.viewableSince = e.detail.ts,
        this.viewability.adserver.exposureDelta = this.viewability.adagio.exposureDuration - 1e3,
        this.sendBeacon({
            becauseOf: "vsbl_actvw"
        }))
    }
      , Ze = function(e) {
        var t = e.detail.data.args
          , n = t.inViewPercentage
          , i = t.slot;
        return !!i && (i.getSlotElementId() === this._adUnitElementId && void (this.viewability.adserver.inViewport = n >= 50))
    }
      , Xe = function() {
        "hidden" === this.w.document.visibilityState && (this.hasMaxExposureDuration() || this.sendBeacon({
            becauseOf: "visibilitychange"
        }))
    }
      , Ye = function() {
        var e = Date.now();
        "hidden" === this.w.document.visibilityState ? this.pageVisibility.ts = e : (this.pageVisibility.computedDuration += e - this.pageVisibility.ts,
        this.pageVisibility.ts = !1)
    }
      , et = function(e, t, n) {
        var i = e.adUnitCode
          , a = e.adUnitElementId
          , r = e.refreshConfig
          , s = e.currentPrintNumber
          , o = e.timeout
          , d = Ce();
        if (d.googletag) {
            var u = d.googletag.pubads().getSlots().filter((function(e) {
                return e.getSlotElementId() === a
            }
            ))[0]
              , c = function(e, t) {
                var n = e.pbjs
                  , i = e.ADAGIO.pbjsAdUnits.find((function(e) {
                    return e.code = t
                }
                ));
                return i && i.localPbjsRef && (n = i.localPbjsRef),
                n
            }(d, i);
            u ? (u.setTargeting("adg_refresh", "true"),
            s && u.setTargeting("adg_pn", parseInt(s.toString(), 10) + 1),
            t({
                adUnitCode: i,
                adUnitElementId: a,
                refreshConfig: r,
                currentPrintNumber: s
            }).then((function(e) {
                !1 !== e && n({
                    pbjs: c,
                    adUnitCode: i,
                    timeout: o,
                    bidsBackHandler: function() {
                        c.setTargetingForGPTAsync(a),
                        d.googletag.pubads().refresh([u])
                    }
                })
            }
            ))) : Pe("No slot detected for adunitCode " + i + " with elementId : " + a)
        } else
            ke("Can not find the property: googletag in window")
    }
      , tt = function(e, t) {
        var n = e.adUnitCode
          , i = e.adUnitElementId
          , a = e.refreshConfig
          , r = Ce();
        if (r.sas) {
            var s = r.ADAGIO.adUnits;
            !s || s[n] ? t({
                adUnitCode: n,
                adUnitElementId: i,
                refreshConfig: a
            }).then((function(e) {
                if (!1 !== e)
                    try {
                        r.sas.refresh(n)
                    } catch (e) {
                        Ne(e)
                    }
            }
            )) : Pe("No slot detected for adunitCode " + n + " with elementId : " + i)
        } else
            ke("Can not find the property: sas in window")
    }
      , nt = function(e) {
        if (!e.refreshConfig || !e.refreshConfig.beforeRefresh || "function" != typeof e.refreshConfig.beforeRefresh)
            return new Promise((function(e) {
                return e(!0)
            }
            ));
        var t = e.refreshConfig.beforeRefresh(e);
        return Pe("Refresh: handleBeforeRefresh", t),
        new Promise((function(e, n) {
            if (!(t instanceof Promise))
                return e(t);
            t.then((function(t) {
                return e(t)
            }
            )).catch((function() {
                return n(!1)
            }
            ))
        }
        ))
    }
      , it = function(e) {
        var t = e.adUnitCode
          , n = e.bidsBackHandler
          , i = e.pbjs
          , a = e.timeout;
        i.que.push((function() {
            i.requestBids({
                timeout: a,
                adUnitCodes: [t],
                bidsBackHandler: n
            })
        }
        ))
    }
      , at = ["1012"]
      , rt = {
        page_dimensions: "pg_dims",
        viewport_dimensions: "vp_dims",
        dom_loading: "dom_l",
        layout: "lay",
        adunit_position: "adu_pos",
        user_timestamp: "u_ts",
        device: "dvc",
        browser: "brwsr",
        url: "url",
        print_number: "pn"
    }
      , st = {
        organizationId: "org_id",
        site: "site",
        placement: "plcmt",
        adUnitCode: "adu_code",
        pagetype: "pgtyp",
        category: "cat",
        subcategory: "subcat",
        environment: "env"
    }
      , ot = {
        adsrv: "adsrv",
        adsrv_advrt_id: "adsrv_advrt_id",
        adsrv_cmpgn_id: "adsrv_cmpgn_id",
        adsrv_crea_id: "adsrv_crea_id",
        adsrv_empty: "adsrv_empty",
        adsrv_lnitem_id: "adsrv_lnitem_id",
        adsrv_size: "adsrv_size"
    }
      , dt = function() {
        var e = Ce();
        if (e)
            return e.ONFOCUS = e.ONFOCUS || {},
            e.ONFOCUS.donotrefresh || e.onfocus_donotrefresh || e.onfocus_donotrefresh_slots || e.ONFOCUS.donotrefresh_slots
    }
      , ut = function() {
        return o((function e(t) {
            var n = t.ts
              , i = t.adUnitElementId
              , a = t.auctionId
              , s = t.params
              , o = t.options
              , d = t.featuresManager
              , u = t.measurersManager
              , c = t.navigationFeatures;
            return r(this, e),
            Pe("New measurer for adUnitElementId ".concat(i, ":"), {
                params: s,
                options: o
            }),
            this.w = Ce(),
            this.navigationFeatures = c,
            this.featuresManager = d,
            this.measurersManager = u,
            this.params = s || {},
            this.options = o || {},
            this.auctionId = a,
            this.initTime = null,
            this.startTime = null,
            this.ts = n,
            this.navigationStart = function() {
                var e = Ce()
                  , t = e.performance || e.msPerformance || e.webkitPerformance || e.mozPerformance;
                return t && t.timing && t.timing.navigationStart > 0 ? t.timing.navigationStart : null
            }(),
            this.internalId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            this.resetCounter = 0,
            this.resetTime = null,
            this.beaconVersion = 0,
            this.intervalId = !1,
            this.avwBeaconTimeoutId = !1,
            this.refreshStarted = !1,
            this.refreshConfig = this.options.refresh || !1,
            this.doNotRefresh = !1,
            this.useIntersectionObserver = !0,
            this.clickListenerHandler = null,
            this.mouseHoverListenerHandler = null,
            this.mouseOutListenerHandler = null,
            this.gptImpressionViewable = Ke.bind(this),
            this.gptSlotVisibilityChanged = Ze.bind(this),
            this.pageVisibility = {
                ts: !1,
                computedDuration: 0
            },
            this._adUnitElementId = this.adUnitElementId = i,
            this.element = {},
            this.prebidAdUnitConfig = this.options.adUnitConfig || [],
            this.throttleBeacons = "boolean" != typeof this.options.throttleBeacons || this.options.throttleBeacons,
            this.beaconsQueue = [],
            this.beaconsPending = !1,
            this.limitFirstBeaconsTimer = !1,
            window.self.document.getElementById(this.adUnitElementId) ? this.init() ? (this.unbindBeaconEvents(),
            this.bindBeaconEvents(),
            void this.start()) : (ke("Unable to init measurer"),
            !1) : (ke("Element to measure is missing in window: ".concat(this.adUnitElementId)),
            !1)
        }
        ), [{
            key: "init",
            value: function() {
                this.initTime = Date.now(),
                this.measurable = !0;
                var e = this.getFeatures(this._adUnitElementId);
                if (this.features = e && e.features ? e.features : {},
                this.featuresVersion = e && e.version ? e.version : "1",
                this.clickListenerHandler = this.clickListener.bind(this),
                this.mouseHoverListenerHandler = this.mouseHoverListener.bind(this),
                this.mouseOutListenerHandler = this.mouseOutListener.bind(this),
                this.resetViewability(),
                !window.IntersectionObserver)
                    return this.useIntersectionObserver = !1,
                    this.measurable = !1,
                    ke("no intersection observer"),
                    void this.stop("noIObserver");
                if ("function" != typeof window.CustomEvent)
                    return this.stop("noCustomEvent"),
                    !1;
                this.bindAdserverEvents();
                var t = this.detectBestDomElement();
                if (!t)
                    return this.stop("noElement"),
                    !1;
                this.setElement(t),
                this.startBackgroundDetection(),
                Pe("Init measurer for adUnitElementId ".concat(this.adUnitElementId, " with this detected element:"), {
                    el: this.element.el,
                    refresh: this.refreshConfig
                }),
                this.w.ADAGIO = this.w.ADAGIO || {},
                this.w.ADAGIO.doNotRefresh = dt() || this.w.ADAGIO.doNotRefresh || [];
                var n = this.params.adUnitCode || !1;
                return this.refreshConfig || (Pe("No refreshConfig for this Measurer: ".concat(n)),
                this.doNotRefresh = !0),
                n || (Pe("No adUnitCode for this Measurer: ".concat(n)),
                this.doNotRefresh = !0),
                Array.isArray(this.w.ADAGIO.doNotRefresh) && -1 !== this.w.ADAGIO.doNotRefresh.indexOf("*") && (Pe("No Refresh because doNotRefresh is activate on the whole page"),
                this.doNotRefresh = !0),
                Array.isArray(this.w.ADAGIO.doNotRefresh) && n && -1 !== this.w.ADAGIO.doNotRefresh.indexOf(n) && (Pe("This adUnitCode is in the ADAGIO.doNotRefresh: ".concat(n)),
                this.doNotRefresh = !0),
                !0
            }
        }, {
            key: "resetViewability",
            value: function(e) {
                var t = {
                    adagio: {
                        visible: !1,
                        continuousCounter: 0,
                        viewableSince: null,
                        exposureDuration: 0,
                        lastUpdateTs: !1,
                        elementMouseOver: !1,
                        exposureDurationOnClick: null,
                        lastAttentionBeaconSent: 0,
                        inViewport: !1
                    },
                    adserver: {
                        visible: !1,
                        viewableSince: null,
                        continuousCounter: 0,
                        exposureDuration: 0,
                        lastUpdateTs: !1,
                        lastAttentionBeaconSent: 0,
                        exposureDelta: 0,
                        inViewport: !1
                    }
                };
                e && this.viewability && Object.prototype.hasOwnProperty.call(this.viewability, e) ? this.viewability[e] = Object.assign({}, t[e]) : this.viewability = Object.assign({}, t),
                this.startObserver(!0)
            }
        }, {
            key: "detectBestDomElement",
            value: function() {
                try {
                    var e = window.self.document.getElementById(this.adUnitElementId)
                      , t = function(e) {
                        return Qe(e, f)
                    }(e)
                      , n = !!t
                      , i = function(e, t) {
                        return Qe(e, t)
                    }(e, this.prebidAdUnitConfig.sizes && this.prebidAdUnitConfig.sizes.length ? this.prebidAdUnitConfig.sizes.map((function(e) {
                        return e[0] + "x" + e[1]
                    }
                    )) : [])
                      , a = !!i
                      , r = i || t || e;
                    return {
                        el: r,
                        elId: r.id,
                        size: this.formatElementSize(r),
                        reasonNotMeasurable: t ? v : h,
                        hasIABDimensions: n,
                        hasPbjsDimensions: a
                    }
                } catch (e) {
                    return Ne(e),
                    !1
                }
            }
        }, {
            key: "setElement",
            value: function(e) {
                this.element = e
            }
        }, {
            key: "hasMinPageExposureDuration",
            value: function() {
                return !!(Le() && Date.now() - Le() >= 3e4)
            }
        }, {
            key: "hasMaxExposureDuration",
            value: function() {
                return "dfp" === this.options.adsrv ? this.viewability.adagio.exposureDuration > 9e4 || this.viewability.adserver.exposureDuration > 9e4 || this.viewability.adagio.exposureDuration > 6e4 && this.viewability.adserver.exposureDuration > 6e4 : this.viewability.adagio.exposureDuration > 6e4
            }
        }, {
            key: "formatElementSize",
            value: function(e) {
                try {
                    var t = e.getBoundingClientRect();
                    return [Math.round(t.width), Math.round(t.height)].join("x")
                } catch (e) {
                    return "0x0"
                }
            }
        }, {
            key: "startBackgroundDetection",
            value: function() {
                if (this.element.el && !this.element.hasIABDimensions && !this.element.hasPbjsDimensions && this.options && [0, "0"].includes(this.options.adsrv_empty) && Date.now() <= this.initTime + 4e3) {
                    var e = this;
                    return setTimeout((function() {
                        var t = e.detectBestDomElement();
                        t && (t.hasIABDimensions || t.hasPbjsDimensions) && e.resetWithElement(t),
                        e.startBackgroundDetection()
                    }
                    ), 50),
                    !1
                }
            }
        }, {
            key: "start",
            value: function() {
                if (this.startTime = Date.now(),
                "function" != typeof window.CustomEvent)
                    return this.stop("abort"),
                    !1;
                this.sendBeacon({
                    becauseOf: "start"
                }),
                this.bindMouseListeners(this.element.el),
                this.bindClickListener(),
                this.bindMeasureEvents(),
                this.w.document.dispatchEvent(new CustomEvent("adagio.measure.afterStart",{
                    detail: {
                        measure: this
                    }
                }))
            }
        }, {
            key: "stop",
            value: function(e) {
                e = e || "stop",
                this.unbindAdserverEvents(),
                this.unbindMeasureEvents(),
                this.unbindClickListener(),
                this.element.el && this.unbindMouseListeners(this.element.el),
                this.unbindBeaconEvents(),
                this.resetThrottledBeacon(),
                this.sendBeacon({
                    becauseOf: e
                }),
                this.sendBeacon = function() {}
            }
        }, {
            key: "resetWithElement",
            value: function(e) {
                Pe("Reset measurer for ".concat(this.adUnitElementId, " with this element"), e),
                this.resetCounter++,
                this.resetTime = Date.now(),
                this.element.el && this.unbindMouseListeners(this.element.el),
                this.setElement(e),
                this.bindMouseListeners(this.element.el),
                this.resetViewability(),
                this.sendBeacon({
                    becauseOf: "reset"
                })
            }
        }, {
            key: "startObserver",
            value: function() {
                var e = this
                  , t = arguments.length > 0 && void 0 !== arguments[0] && arguments[0]
                  , n = this;
                this.observer && !t || (this.observer = new IntersectionObserver((function(t) {
                    t.forEach((function(t) {
                        t.isIntersecting ? n.viewability.adagio.inViewport = !0 : (n.viewability.adagio.inViewport = !1,
                        document.dispatchEvent(new CustomEvent("adagio.measure.onUpdateExposureDuration",{
                            detail: {
                                elementId: e._adUnitElementId,
                                measurer: "adagio",
                                viewability: n.viewability.adagio
                            }
                        })))
                    }
                    ))
                }
                ),{
                    threshold: [.49, .5, .51]
                }),
                this.observer.observe(window.document.getElementById(this._adUnitElementId)))
            }
        }, {
            key: "clickListener",
            value: function() {
                var e = this.viewability.adagio;
                try {
                    if (document.activeElement instanceof HTMLIFrameElement) {
                        var t = this.element.el.getBoundingClientRect()
                          , n = document.activeElement.getBoundingClientRect()
                          , i = !(t.right < n.left || t.left > n.right || t.bottom < n.top || t.top > n.bottom)
                          , a = this.element.el;
                        a instanceof HTMLIFrameElement || (a = a.querySelector("iframe")),
                        (document.activeElement === a || e.elementMouseOver || i) && null == e.exposureDurationOnClick && (e.exposureDurationOnClick = e.exposureDuration,
                        Pe("Click event detected on  ".concat(this.element.elId, " :"), this))
                    }
                } catch (e) {
                    Ne(e)
                }
            }
        }, {
            key: "bindClickListener",
            value: function() {
                var e = this.params.adUnitCode || !1;
                if (e && this.measurersManager)
                    try {
                        this.measurersManager.get(e) ? ke("Measure: click: clickListener already bound for adUnitCode ".concat(e)) : window.addEventListener("blur", this.clickListenerHandler, !1)
                    } catch (e) {
                        Ne(e)
                    }
                else
                    Ne("Measure: click: unable to bind clickListener")
            }
        }, {
            key: "unbindClickListener",
            value: function() {
                window.removeEventListener("blur", this.clickListenerHandler, !1)
            }
        }, {
            key: "mouseHoverListener",
            value: function() {
                this.viewability.adagio.elementMouseOver = !0
            }
        }, {
            key: "mouseOutListener",
            value: function() {
                this.viewability.adagio.elementMouseOver = !1
            }
        }, {
            key: "bindMouseListeners",
            value: function(e) {
                e && (e.addEventListener("mouseover", this.mouseHoverListenerHandler),
                e.addEventListener("mouseout", this.mouseOutListenerHandler))
            }
        }, {
            key: "unbindMouseListeners",
            value: function(e) {
                e && (e.removeEventListener("mouseover", this.mouseHoverListenerHandler),
                e.removeEventListener("mouseout", this.mouseOutListenerHandler))
            }
        }, {
            key: "bindAdserverEvents",
            value: function() {
                this.unbindAdserverEvents(),
                this.w.document.addEventListener("adagio.gpt.impressionViewable", this.gptImpressionViewable, !1),
                this.w.document.addEventListener("adagio.gpt.slotVisibilityChanged", this.gptSlotVisibilityChanged, !1)
            }
        }, {
            key: "unbindAdserverEvents",
            value: function() {
                this.w.document.removeEventListener("adagio.gpt.impressionViewable", this.gptImpressionViewable),
                this.w.document.removeEventListener("adagio.gpt.slotVisibilityChanged", this.gptSlotVisibilityChanged)
            }
        }, {
            key: "bindMeasureEvents",
            value: function() {
                var e = this;
                this.startObserver(),
                this.intervalId = setInterval((function() {
                    document.hidden ? Object.keys(e.viewability).forEach((function(t) {
                        "adagio" !== t && "dfp" !== e.options.adsrv || e.resetPreViewability(t)
                    }
                    )) : ("dfp" === e.options.adsrv && e.updateActiveViewViewability(),
                    e.updateViewabilityWithIntersectionObserver())
                }
                ), 50)
            }
        }, {
            key: "unbindMeasureEvents",
            value: function() {
                clearInterval(this.intervalId)
            }
        }, {
            key: "bindBeaconEvents",
            value: function() {
                this.w.document.addEventListener("visibilitychange", Xe.bind(this), !1),
                this.w.document.addEventListener("visibilitychange", Ye.bind(this), !1)
            }
        }, {
            key: "unbindBeaconEvents",
            value: function() {
                this.w.document.removeEventListener("visibilitychange", Xe),
                this.w.document.removeEventListener("visibilitychange", Ye)
            }
        }, {
            key: "setBeaconTimeout",
            value: function(e) {
                var t = this;
                e = e || "adagio";
                var n = this.params.organizationId
                  , i = this.viewability[e];
                this.avwBeaconTimeoutId || i.visible && i.exposureDuration - i.lastAttentionBeaconSent > 1e3 && !this.hasMaxExposureDuration() && (this.avwBeaconTimeoutId = setTimeout((function() {
                    -1 === at.indexOf(n) && t.sendBeacon({
                        becauseOf: "exp_chg"
                    }),
                    t.avwBeaconTimeoutId = !1,
                    i.lastAttentionBeaconSent = i.exposureDuration
                }
                ), 5e3))
            }
        }, {
            key: "updateViewability",
            value: function() {
                var e = Date.now()
                  , t = this.viewability.adagio;
                t.visible || t.continuousCounter >= 1e3 && (t.visible = !0,
                t.viewableSince = e,
                Pe("Adagio impressionViewable: ".concat(this._adUnitElementId)),
                this.sendBeacon({
                    becauseOf: "vsbl"
                })),
                this.updateExposureDuration(e, "adagio"),
                t.lastUpdateTs = e,
                this.setBeaconTimeout("adagio"),
                this.w.document.dispatchEvent(new CustomEvent("adagio.measure.onUpdateViewability",{
                    detail: {
                        measure: this
                    }
                })),
                !1 === this.refreshStarted && !1 === this.doNotRefresh && this.refresh()
            }
        }, {
            key: "updateViewabilityWithIntersectionObserver",
            value: function() {
                var e = Date.now()
                  , t = this.viewability.adagio;
                if (!t.visible && t.continuousCounter >= 1e3) {
                    t.visible = !0,
                    t.viewableSince = e;
                    var n = new Date(t.viewableSince).toString();
                    Pe("Adagio impressionViewable with IObsrv: ".concat(this.element.elId, " at ").concat(n)),
                    this.sendBeacon({
                        becauseOf: "vsbl"
                    })
                }
                t.inViewport ? (this.updateExposureDuration(e, "adagio"),
                t.lastUpdateTs = e,
                this.setBeaconTimeout("adagio"),
                !1 === this.refreshStarted && !1 === this.doNotRefresh && this.refresh()) : this.resetPreViewability("adagio")
            }
        }, {
            key: "updateActiveViewViewability",
            value: function() {
                var e = Date.now()
                  , t = this.viewability.adserver;
                t.inViewport ? (this.updateExposureDuration(e, "adserver"),
                t.lastUpdateTs = e,
                !1 === this.refreshStarted && !1 === this.doNotRefresh && this.refresh("adserver"),
                this.setBeaconTimeout("adserver")) : this.resetPreViewability("adserver")
            }
        }, {
            key: "refresh",
            value: function(e) {
                e = e || "adagio";
                var t = this.params.adUnitCode || !1;
                if (t) {
                    var n = !(!this.w.ADAGIO.adUnits || !this.w.ADAGIO.adUnits[t]) && this.w.ADAGIO.adUnits[t].printNumber
                      , i = this.viewability[e];
                    if (!n)
                        return Pe("No PrintNumber to start refresh for this adUnit: ".concat(t)),
                        void (this.doNotRefresh = !0);
                    if (n && n >= this.refreshConfig.maxRefresh)
                        return Pe("Stoping refresh because currentPrintNumber is >= of ".concat(this.refreshConfig.maxRefresh, " maxRefresh for this adUnit: ").concat(t)),
                        void (this.doNotRefresh = !0);
                    if ((1 !== n || this.hasMinPageExposureDuration()) && i.continuousCounter >= this.refreshConfig.timeToRefresh && n <= this.refreshConfig.maxRefresh) {
                        var a = (dt() || []).concat(this.w.ADAGIO.doNotRefresh || []);
                        if (Array.isArray(a) && -1 !== a.indexOf("*"))
                            return Pe("No Refresh because doNotRefresh is activate on the whole page"),
                            this.doNotRefresh = !0,
                            !1;
                        if (Array.isArray(a) && t && -1 !== a.indexOf(t))
                            return Pe("This adUnitCode is in the ADAGIO.doNotRefresh: ".concat(t)),
                            this.doNotRefresh = !0,
                            !1;
                        this.refreshStarted = !0,
                        Pe("Trying to refresh adUnitCode: " + t + " at " + i.continuousCounter + " with conf: ", this.refreshConfig),
                        function(e) {
                            var t = e.adUnitCode
                              , n = e.adUnitElementId
                              , i = e.refreshConfig
                              , a = e.currentPrintNumber
                              , r = new CustomEvent("adagio.refresh.onBeforeRefresh",{
                                detail: {
                                    adUnitCode: t,
                                    adUnitElementId: n,
                                    refreshConfig: i,
                                    currentPrintNumber: a
                                },
                                cancelable: !0
                            });
                            Ce().document.dispatchEvent(r) ? "dfp" === i.adServer ? et(e, nt, it) : "sas" === i.adServer ? tt(e, nt) : Pe("No refresher has been defined") : Pe("Refresh is handled by the publisher itself")
                        }({
                            adUnitCode: t,
                            adUnitElementId: this.adUnitElementId,
                            refreshConfig: this.refreshConfig,
                            currentPrintNumber: n
                        })
                    }
                } else
                    Pe("No adUnitCode to start refresh for this adUnit: ".concat(t))
            }
        }, {
            key: "updateExposureDuration",
            value: function(e, t) {
                t = t || "adagio";
                var n = this.viewability[t];
                if (!n.lastUpdateTs)
                    return 0;
                var i = e - n.lastUpdateTs;
                n.exposureDuration += i,
                n.continuousCounter += i
            }
        }, {
            key: "resetPreViewability",
            value: function(e) {
                e = e || "adagio";
                var t = this.viewability[e];
                t.lastUpdateTs = !1,
                t.visible || (t.continuousCounter = 0),
                this.w.document.dispatchEvent(new CustomEvent("adagio.measure.onResetPreViewability",{
                    detail: {
                        measure: this
                    }
                }))
            }
        }, {
            key: "getFeatures",
            value: function(e) {
                var t;
                return (t = this.featuresManager.get(e)) ? Pe("Freezed features(v".concat(t.version, ") for ").concat(e, " from adagioBidAdapter:"), t.features) : Pe("No features found for ".concat(e)),
                t
            }
        }, {
            key: "sendThrottledBeacon",
            value: function() {
                var e = this.beaconsQueue.pop();
                this.resetThrottledBeacon(),
                e && (e.throttled = !0,
                this.sendBeacon(e))
            }
        }, {
            key: "resetThrottledBeacon",
            value: function() {
                this.beaconsQueue = [],
                this.beaconsPending = !1
            }
        }, {
            key: "sendBeacon",
            value: function(e) {
                var t = this
                  , n = this
                  , i = (e = e || {}).events || [];
                return !!this.navigationFeatures && (!!this.navigationFeatures.allowBeaconSending("avw") && (this.throttleBeacons && -1 !== ["start", "reset", "vsbl", "vsbl_actvw"].indexOf(e.becauseOf) && !e.throttled ? this.beaconsPending ? void this.beaconsQueue.push(e) : (this.beaconsPending = !0,
                this.beaconsQueue.push(e),
                void setTimeout(this.sendThrottledBeacon.bind(this), 3e3)) : void Je({
                    collector: "avw",
                    data: function() {
                        e = e || {};
                        var i = Date.now()
                          , a = Le()
                          , r = 0;
                        try {
                            r = (new Date).getTimezoneOffset()
                        } catch (e) {}
                        var s = [];
                        n.prebidAdUnitConfig && Array.isArray(n.prebidAdUnitConfig.sizes) && n.prebidAdUnitConfig.sizes.map((function(e) {
                            return s.push(e.join("x"))
                        }
                        ));
                        var o = {
                            pv_id: t.w.ADAGIO && t.w.ADAGIO.pageviewId ? t.w.ADAGIO.pageviewId : "",
                            adu_el_id: n.adUnitElementId,
                            v: n.beaconVersion++,
                            tz_off: r,
                            evt: e.becauseOf || "",
                            js_late: t.w.ADAGIO && !0 === t.w.ADAGIO.late ? 1 : 0,
                            js_ts: t.w._ADAGIO && t.w._ADAGIO.adagioStartTime ? t.w._ADAGIO.adagioStartTime : "",
                            size: n.element.size,
                            pbjs_sizes: s.join(","),
                            is_pbjs_size: !0 === n.element.hasPbjsDimensions ? 1 : 0,
                            is_iab_size: !0 === n.element.hasIABDimensions ? 1 : 0,
                            msrbl: !0 === n.measurable ? 1 : 0,
                            adu_exp: n.viewability.adagio.exposureDuration,
                            pg_durat: a ? i - a : 0,
                            pg_paused: n.pageVisibility.computedDuration,
                            pg_exp: a ? i - a - n.pageVisibility.computedDuration : 0,
                            vsbl: !0 === n.viewability.adagio.visible ? 1 : 0,
                            adsrv_vsbl: !0 === n.viewability.adserver.visible ? 1 : 0,
                            adsrv_att_delta: n.viewability.adserver.exposureDelta,
                            clk_time: null != n.viewability.adagio.exposureDurationOnClick ? n.viewability.adagio.exposureDurationOnClick : "",
                            reset: n.resetCounter,
                            adsrv_adu_exp: n.viewability.adserver.exposureDuration,
                            navs_ts: null != n.navigationStart ? n.navigationStart : "",
                            trgr_ts: null != n.ts ? parseInt(n.ts, 10) : "",
                            init_ts: n.initTime,
                            start_ts: n.startTime,
                            reset_ts: null != n.resetTime ? n.resetTime : "",
                            vsbl_ts: null != n.viewability.adagio.viewableSince ? n.viewability.adagio.viewableSince : "",
                            adsrv_vsbl_ts: null != n.viewability.adserver.viewableSince ? n.viewability.adserver.viewableSince : "",
                            auct_id: n.auctionId ? n.auctionId : ""
                        }
                          , d = {};
                        for (var u in n.params) {
                            if (Object.prototype.hasOwnProperty.call(st, u))
                                d[st[u]] = n.params[u] ? n.params[u] : ""
                        }
                        var c = {
                            featv: n.featuresVersion
                        };
                        for (var l in n.features) {
                            if (Object.prototype.hasOwnProperty.call(rt, l))
                                c[rt[l]] = n.features[l];
                            else
                                c[l] = n.features[l]
                        }
                        c.pn || (c.pn = 1);
                        var f = {
                            sess_lngth: t.navigationFeatures.sessionLength,
                            avg_sess_lngth: t.navigationFeatures.avgSessionLength,
                            sess_cnt: t.navigationFeatures.totalSessions,
                            rfr_fqdn: t.navigationFeatures.referrerFQDN,
                            prv_pgtyp: t.navigationFeatures.previousPagetype
                        }
                          , v = {};
                        for (var h in n.options) {
                            if (Object.prototype.hasOwnProperty.call(ot, h))
                                v[ot[h]] = n.options[h] ? n.options[h] : ""
                        }
                        return Object.assign(o, c, f, d, v),
                        n.element.reasonNotMeasurable,
                        o
                    },
                    events: i
                })))
            }
        }])
    }()
      , ct = new RegExp(/(^adagio$|[_-]adagio$|^adagio[_-])/i)
      , lt = new RegExp(/^[a-zA-Z0-9-_]{1,50}$/)
      , ft = new RegExp(/^[0-9]{4}$/)
      , vt = function(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}
          , n = "adagio" === ("" + t[e]).toLowerCase();
        return n || ct.test(e)
    }
      , ht = function(e, t) {
        var n = !1;
        if (e && e.length) {
            var i = e.filter((function(e) {
                return e.code === t
            }
            ));
            i.length && (n = i[0])
        }
        return n
    }
      , pt = function(e) {
        return e.localPbjsRef && e.localPbjsRef.aliasRegistry
    }
      , gt = function() {
        var e = Ce();
        if (!e)
            return [];
        e.ADAGIO = e.ADAGIO || {};
        var t = void 0
          , n = function(e) {
            t = Array.isArray(t) ? t.concat(e) : e
        };
        e.ADAGIO.pbjsAdUnits && (t = e.ADAGIO.pbjsAdUnits),
        e.ADAGIO.rtbpbjsAdUnits && n(e.ADAGIO.rtbpbjsAdUnits),
        e.ADAGIO.pbjsWtgAdUnits && n(e.ADAGIO.pbjsWtgAdUnits);
        var i = Te();
        return t.forEach((function(e) {
            try {
                e.bids[0].params.environment || (e.bids[0].params.environment = i)
            } catch (e) {
                ke(e)
            }
        }
        )),
        t
    }
      , mt = function() {
        return o((function e() {
            r(this, e),
            this.measurers = {},
            this.init()
        }
        ), [{
            key: "init",
            value: function() {}
        }, {
            key: "store",
            value: function(e) {
                var t = e.params && e.params.adUnitCode ? e.params.adUnitCode : void 0;
                if (this.get(t))
                    return !1;
                this.measurers[t] = e
            }
        }, {
            key: "get",
            value: function(e) {
                return e ? this.measurers[e] : this.measurers
            }
        }, {
            key: "has",
            value: function(e, t) {
                var n = this.get(e);
                return n && t ? n.auctionId === t : !!n
            }
        }, {
            key: "getByAdUnitElementId",
            value: function(e) {
                var t = this
                  , n = Object.keys(this.measurers);
                return !(!n || !n.length) && n.filter((function(n) {
                    return t.measurers[n] && t.measurers[n]._adUnitElementId === e
                }
                ))
            }
        }, {
            key: "remove",
            value: function(e) {
                return delete this.measurers[e]
            }
        }])
    }();
    function bt() {
        var e = Ce()
          , t = e.navigator.userAgent
          , n = t.toLowerCase();
        return /Edge\/\d./i.test(t) ? "edge" : n.indexOf("chrome") > 0 ? "chrome" : n.indexOf("firefox") > 0 ? "firefox" : n.indexOf("safari") > 0 ? "safari" : n.indexOf("opera") > 0 ? "opera" : n.indexOf("msie") > 0 || e.MSStream ? "ie" : "unknow"
    }
    var yt = function() {
        return o((function e() {
            r(this, e),
            this._featuresByAdUnitElementId = {},
            this.init()
        }
        ), [{
            key: "init",
            value: function() {}
        }, {
            key: "storeLegacy",
            value: function(e, t, n) {
                if ("object" !== a(t) || this.get(e) && !n)
                    return !1;
                this._featuresByAdUnitElementId[e] = t
            }
        }, {
            key: "store",
            value: function(e, t) {
                var i = e.adUnitCode
                  , r = e.features
                  , s = e.params;
                if (s.adUnitElementId) {
                    if ("object" !== a(r) || this.get(s.adUnitElementId) && !t)
                        return ke("Features cannot be set. data.features is not an object. adUnitCode: ".concat(i)),
                        !1;
                    var o = "";
                    Ue() && (o = Ce().location.href || "");
                    var d, u, c = n(n({}, r), {
                        device: (u = Ce().navigator.userAgent,
                        /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(u) ? 5 : /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/.test(u) ? 4 : 2).toString(),
                        os: (d = Ce().navigator.userAgent.toLowerCase(),
                        d.indexOf("android") > 0 ? "android" : d.indexOf("iphone") > 0 ? "ios" : d.indexOf("linux") > 0 ? "linux" : d.indexOf("mac") > 0 ? "mac" : d.indexOf("win") > 0 ? "windows" : ""),
                        browser: bt(),
                        url: o
                    });
                    this._featuresByAdUnitElementId[s.adUnitElementId] = {
                        version: "_",
                        features: c
                    }
                } else
                    ke("Features cannot be set. Missing adUnitElementId. adUnitCode: ".concat(i))
            }
        }, {
            key: "get",
            value: function(e) {
                return e ? this._featuresByAdUnitElementId[e] : this._featuresByAdUnitElementId
            }
        }])
    }()
      , At = [["rubicon", "secure-assets.rubiconproject.com"], ["pubmatic", "ads.pubmatic.com"], ["improvedigital", "ice.360yield.com"], ["onetag", "onetag-sys.com"], ["indexexchange", "ssum-sec.casalemedia.com"], ["richaudience", "sync.richaudience.com"], ["33across", "ssc-cms.33across.com"], ["appnexus", "ib.adnxs.com"], ["smart", "ssbsync.smartadserver.com"], ["adyoulike", "visitor.omnitagjs.com"], ["sovrn", "ap.lijit.com"], ["freewheel", "ads.stickyadstv.com"], ["openx", "u.openx.net"], ["openxpbs", "u.openx.net"], ["triplelift", "eb2.3lift.com"], ["eplanning", "ads.us.e-planning.net"], ["unruly", "sync.1rx.io"]]
      , wt = [];
    e.adagioStartTime = Date.now();
    var It = function(e, t) {
        var n = Ce()
          , i = new RegExp(/^(<iframe[a-z0-9\s-_'"=%;:]+src=["'](https?:\/\/[a-z0-9-.()#_?=&%/[\]]+)[a-z0-9\s-_'"=%;:]+><\/iframe>)(?![<])$/i)
          , a = new RegExp(/^(<img[a-z0-9\s-_'"=%;:]+src=["'](https?:\/\/[a-z0-9-.()#_?=&%/[\]]+)[a-z0-9\s-_'"=%;:]+?\/>)(?![<])$/i)
          , r = n.document.getElementsByTagName("body")[0]
          , s = i.test(e.html)
          , o = a.test(e.html);
        return e.html && (s || o) ? (setTimeout((function() {
            r.insertAdjacentHTML("beforeend", e.html)
        }
        ), t),
        !0) : (Pe("userSyncing: html markup is not valid to be added to the DOM."),
        !1)
    }
      , _t = function(e) {
        var t = new Se
          , n = bt()
          , i = t.get("syncs") || {}
          , a = u(At);
        Ce().ADAGIO && Ce().ADAGIO.bdrSyncs && Ce().ADAGIO.bdrSyncs.length && a.push.apply(a, u(Ce().ADAGIO.bdrSyncs));
        var r = Date.now()
          , s = 0;
        e && Array.isArray(e.user_syncs) && e.user_syncs.forEach((function(e) {
            var o = 1e3 * s;
            if ("safari" === n) {
                Pe("userSyncing: enter in Safari mode");
                var d = function(e, t) {
                    var n = new RegExp(/src=["'](https?:\/\/[^'"]+)["']/)
                      , i = e.match(n);
                    i[1] || ke("userSyncing: unable to find src in markup");
                    var a = Be(i[1]);
                    return t.filter((function(e) {
                        return e[1] === a.hostname
                    }
                    ))
                }(e.html, a);
                if (!d || !d.length)
                    return void ke("userSyncing: no bidder found", e.html);
                d.forEach((function(n) {
                    var a = n[0];
                    if (Object.prototype.hasOwnProperty.call(i, a)) {
                        var d = i[a];
                        r >= d + 216e5 && It(e, o) && (i[a] = r,
                        t.store("syncs", i),
                        s++)
                    } else
                        It(e, o) && (i[a] = r,
                        t.store("syncs", i),
                        s++)
                }
                ))
            } else
                It(e, o),
                s++
        }
        ))
    }
      , Ot = function(e, t, n, i, a) {
        var r = gt()
          , s = e.options || {};
        if (e.adUnitCode && r) {
            var o = Ce()
              , d = o.ADAGIO.adUnits && o.ADAGIO.adUnits[e.adUnitCode] && o.ADAGIO.adUnits[e.adUnitCode].auctionId;
            if (!d)
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ": no auctionId config found in window.ADAGIO.adUnits")),
                !1;
            if (o.ADAGIO.adUnits[e.adUnitCode].pageviewId !== o.ADAGIO.pageviewId)
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ": non consistent pageviewId for window.ADAGIO.adUnits")),
                !1;
            if (i.has(e.adUnitCode, d))
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ": a measurer is already registred for current auction ").concat(d)),
                i.get(e.adUnitCode).stop(),
                i.remove(e.adUnitCode),
                !1;
            var u = i.get(e.adUnitCode);
            if (u && u.auctionId !== d && (u.stop(),
            i.remove(e.adUnitCode)),
            !u && e.adUnitElementId) {
                var c = i.getByAdUnitElementId(e.adUnitElementId);
                c && c.map((function(e) {
                    var t = i.get(e);
                    t && (t.stop(),
                    i.remove(e))
                }
                ))
            }
            var l = function(e, t) {
                var n = ht(e, t)
                  , i = !1;
                if (n) {
                    var a = pt(n)
                      , r = n.bids.filter((function(e) {
                        return vt(e.bidder, a)
                    }
                    ));
                    r.length && (i = r[0])
                }
                return i
            }(r, e.adUnitCode);
            if (!l)
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ": adagio bidder has not been set (see prebid.js)")),
                !1;
            var f = function(e) {
                if (!e || !e.params || !e.params.adUnitElementId)
                    return !1;
                var t = e.params;
                return {
                    adUnitElementId: t.adUnitElementId,
                    category: t.category || "",
                    environment: t.environment || "",
                    organizationId: t.organizationId || "",
                    pagetype: t.pagetype || "",
                    placement: t.placement || "",
                    site: t.site || "",
                    size: t.size || "",
                    subcategory: t.subcategory || "",
                    postBid: t.postBid || !1
                }
            }(l);
            if (!f)
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ": no params. Mainly due to lack of adUnitElementId in Adagio bidder params")),
                !1;
            if (!function(e) {
                var t = e || {}
                  , n = t.organizationId
                  , i = t.site;
                return !(!ft.test(n) || !lt.test(i))
            }(f = Object.assign({}, f, {
                adUnitCode: e.adUnitCode
            })))
                return ke("Cannot start measurer.", "".concat(e.adUnitCode, ': invalid "site" or "organizationId" in Prebid.js params')),
                !1;
            var v = ht(r, e.adUnitCode);
            f.organizationId && f.site && (s.refresh = wt.find((function(t) {
                return t.adUnitCode == e.adUnitCode
            }
            ))),
            s.refresh && (s.adsrv ? s.refresh.adServer = s.adsrv : ke("Cannot detect adserver.")),
            v && (s.adUnitConfig = v),
            t && (s._window = t);
            var h = f.adUnitElementId;
            new ut({
                ts: e.ts,
                adUnitElementId: h,
                auctionId: d,
                params: f,
                options: s,
                featuresManager: n,
                measurersManager: i,
                navigationFeatures: a
            })
        } else
            ke("Cannot start measurer.", {
                msg: "no adUnitCode or adUnitsArray"
            })
    }
      , Dt = function(e, t, n, i, r) {
        var s = t.adsrv
          , o = t.action
          , d = t.eventName
          , u = t.afterOptions;
        if (e.action !== o || !e.data.eventName)
            return !1;
        if (e.data.eventName === d) {
            var c = e.data.args.elementId
              , l = gt();
            if (!l)
                return void Pe("".concat(s, ": Could not find ADAGIO.pbjsAdUnits or pbjs.adUnits before starting a measurer for ").concat(c));
            var f = l.filter((function(e) {
                var t = pt(e);
                return e.bids.find((function(e) {
                    return vt(e.bidder, t) && e.params.adUnitElementId === c
                }
                ))
            }
            ));
            if (!f || !f.length)
                return void Pe("".concat(s, ": Could not find adUnitCode from adUnitElementId ").concat(c));
            f = f.pop().code,
            Pe("Start a measurer from ".concat(s, ".").concat(d, " event for adUnitCode ").concat(f, ". Delay from queued: ").concat(Date.now() - e.ts));
            var v = {
                adsrv: s,
                adsrv_crea_id: e.data.args.creativeId,
                adsrv_empty: !0 === e.data.args.isEmpty ? "1" : "0",
                adsrv_size: function(e) {
                    if (Array.isArray(e)) {
                        var t = ["string", "number"];
                        if (2 === e.length && (t.indexOf(a(e[0])) > 0 || t.indexOf(a(e[1])) > 0))
                            return e.join("x")
                    }
                    if ("string" == typeof e && new RegExp(/^\d{1,4}x\d{1,4}$/).test(e))
                        return e;
                    return ""
                }(e.data.args.creativeSize)
            };
            "function" == typeof u && u(e, v),
            Ot({
                ts: e.ts,
                adUnitCode: f,
                adUnitElementId: c,
                options: v
            }, e.data._window, n, i, r)
        }
    }
      , Et = function(t, i) {
        var r = i.navigationFeatures
          , s = i.adagioNavigation
          , o = i.featuresManager
          , d = i.measurersManager
          , u = Ce();
        if (u._ADAGIO = u._ADAGIO || {},
        je() && "pb-analytics-event" !== t.action && (u._ADAGIO.queueHistory = u._ADAGIO.queueHistory || [],
        u._ADAGIO.queueHistory.push(t),
        u._ADAGIO.queueHistory.length > 100 && u._ADAGIO.queueHistory.shift()),
        "object" !== a(t) || !t.action)
            return !1;
        if ("ssp-data" === t.action) {
            !function(e) {
                e && (e.ssp_version || e.sspVersion) && (Ce().ADAGIO.versions.ssp = e.ssp_version || e.sspVersion)
            }(t.data),
            function(e, t) {
                try {
                    if (e && "number" == typeof e.vwSmplgNxt) {
                        var n = Ce();
                        t.setSampling(n.ADAGIO.pageviewId, {
                            vwSmplgNxt: e.vwSmplgNxt
                        }),
                        t.setVwSamplingNext(e.vwSmplgNxt)
                    }
                } catch (e) {
                    Pe(e)
                }
            }(t.data, s),
            _t(t.data),
            function(e) {
                if (!e || !e.refresh)
                    return !1;
                var t = Ce();
                e.refresh.map((function(e) {
                    t.ADAGIO.adUnits && t.ADAGIO.adUnits[e.adUnitCode] && !t.ADAGIO.adUnits[e.adUnitCode].printNumber && (t.ADAGIO.adUnits[e.adUnitCode].printNumber = 1),
                    void 0 === e.adServer && (e.timeToRefresh = 1e3 * e.timeToRefresh),
                    wt.push(e)
                }
                ))
            }(t.data);
            var c = gt();
            if (c && c.length && Array.isArray(c[0].bids)) {
                var l = pt(c[0])
                  , f = c[0].bids.find((function(e) {
                    return vt(e.bidder, l)
                }
                ));
                f && f.params && f.params.pagetype && (r.pageType = f.params.pagetype)
            }
        } else if ("features" === t.action)
            t.data.adUnitCode ? o.store(t.data, !0) : Object.keys(t.data).map((function(e) {
                o.storeLegacy(e, t.data[e], !0)
            }
            ));
        else if ("store" === t.action) {
            if (!t.data)
                return void Ne("store action called without ob.data");
            Pe("store action called with data:", t.data);
            var v = t.data.bidderRequestsCount ? t.data.bidderRequestsCount.toString() : "1"
              , h = t.data
              , p = h.organizationId
              , g = h.site
              , m = h.adUnitCode
              , b = h.ortb2
              , y = void 0 === b ? {} : b
              , A = h.ortb2Imp
              , w = void 0 === A ? {} : A
              , I = h.params
              , _ = void 0 === I ? {} : I
              , O = h.mediaTypes
              , D = void 0 === O ? {} : O
              , E = h.localPbjs
              , S = h.localPbjsRef
              , U = y.adg_rtd || {}
              , C = n(n(n({}, U.features || {}), w.adg_rtd), {}, {
                print_number: v
            });
            o.store({
                features: C,
                params: {
                    adUnitElementId: w.divId
                },
                adUnitCode: t.data.adUnitCode
            }, !0);
            var x = new Set
              , G = D.banner
              , j = D.video;
            G && Array.isArray(G.sizes) && G.sizes.length && (Array.isArray(G.sizes[0]) ? G.sizes.forEach((function(e) {
                return x.add(e)
            }
            )) : x.add([G.sizes])),
            j && Array.isArray(j.playerSize) && j.playerSize.length && x.add(j.playerSize[0]),
            u.ADAGIO.pbjsAdUnits = u.ADAGIO.pbjsAdUnits || [];
            var k = u.ADAGIO.pbjsAdUnits.filter((function(e) {
                return e.code !== t.data.adUnitCode
            }
            ));
            k.push({
                code: m,
                mediaTypes: D,
                sizes: Array.from(x),
                bids: [{
                    bidder: "adagio",
                    params: {
                        organizationId: p,
                        site: g,
                        pagetype: y.pagetype,
                        category: y.category,
                        placement: w.placement,
                        adUnitElementId: w.divId
                    }
                }],
                auctionId: U.uid || _.adagioAuctionId,
                pageviewId: u.ADAGIO.pageviewId,
                printNumber: v,
                localPbjs: E,
                localPbjsRef: S
            }),
            u.ADAGIO.pbjsAdUnits = k,
            u.ADAGIO.adUnits[m] = {
                auctionId: U.uid || _.adagioAuctionId,
                pageviewId: u.ADAGIO.pageviewId,
                printNumber: v
            }
        } else if ("gpt-event" === t.action)
            !function(e, t, n, i) {
                if ("gpt-event" !== e.action || !e.data.eventName)
                    return !1;
                var a = Ce();
                if ("slotRenderEnded" === e.data.eventName) {
                    var r = e.data.args
                      , s = r.advertiserId
                      , o = r.campaignId
                      , d = r.creativeId
                      , u = r.isEmpty
                      , c = r.lineItemId
                      , l = r.size
                      , f = r.slot
                      , v = f.getSlotElementId()
                      , h = gt();
                    if (!h)
                        return void Pe("DFP: Could not find ADAGIO.pbjsAdUnits or pbjs.adUnits before starting a measurer for ".concat(v));
                    var p = h.filter((function(e) {
                        var t = pt(e);
                        return e.bids.find((function(e) {
                            return vt(e.bidder, t) && e.params.adUnitElementId === v
                        }
                        ))
                    }
                    ));
                    if (p.length > 0) {
                        if (p[0].bids.length && p[0].bids[0].params && -1 !== [1013, "1013", 1026, "1026", 1090, "1090"].indexOf(p[0].bids[0].params.organizationId))
                            return void Pe("DFP: by-pass due to organizationId exception");
                        p = p[0].code
                    } else {
                        if (!(a.ADAGIO && a.ADAGIO.pbjsAdUnits && a.ADAGIO.pbjsAdUnits.length))
                            return void Pe("DFP: Cannot start measurer", "Could not find adUnitCode from adUnitElementId (2): ".concat(v));
                        var g = f.getAdUnitPath()
                          , m = a.ADAGIO.pbjsAdUnits.find((function(e) {
                            return e.code === g || e.code === v
                        }
                        ));
                        if (!m)
                            return void Pe("DFP: Cannot start measurer", "Could not find adUnitCode from adUnitElementId (1): ".concat(v));
                        Pe("DFP: auto-detect prebid adunit", "update ADAGIO.pbjsAdUnit array with adUnitElementId: ".concat(v)),
                        m.bids[0].params.adUnitElementId = v,
                        p = m.code
                    }
                    Pe("Start a measurer from gpt.slotRenderEnded event for ".concat(v, ". Delay from queued: ").concat(Date.now() - e.ts)),
                    Ot({
                        ts: e.ts,
                        adUnitCode: p,
                        options: {
                            adsrv: "dfp",
                            adsrv_advrt_id: s,
                            adsrv_cmpgn_id: o,
                            adsrv_crea_id: d,
                            adsrv_empty: !0 === u ? "1" : "0",
                            adsrv_lnitem_id: c,
                            adsrv_size: l && "undefined" !== l.join ? l.join("x") : ""
                        }
                    }, e.data._window, t, n, i)
                }
                "function" == typeof window.CustomEvent && a.document.dispatchEvent(new CustomEvent("adagio.gpt." + e.data.eventName,{
                    detail: e
                }))
            }(t, o, d, r);
        else if ("adagio-hb-event" === t.action)
            Dt(t, {
                adsrv: "hbagency",
                action: "adagio-hb-event",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("adagio-avs-render" === t.action)
            Dt(t, {
                adsrv: "thm",
                action: "adagio-avs-render",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("adagio-my-adserver-events" === t.action)
            Dt(t, {
                adsrv: "default",
                action: "adagio-my-adserver-events",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("splcznsci-event" === t.action)
            Dt(t, {
                adsrv: "splcznsci",
                action: "splcznsci-event",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("adagio-creative-rendered" === t.action)
            Dt(t, {
                adsrv: "sovrn",
                action: "adagio-creative-rendered",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("adagio-hbPROJECT-event" === t.action)
            Dt(t, {
                adsrv: "hbproject",
                action: "adagio-hbPROJECT-event",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("skyboard-event" === t.action)
            Dt(t, {
                adsrv: "skyboard",
                action: "skyboard-event",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("purpleads-events" === t.action)
            Dt(t, {
                adsrv: "purpleads",
                action: "purpleads-events",
                eventName: "renderEvent"
            }, o, d, r);
        else if ("sas-event" === t.action)
            !function(e, t, n, i) {
                if ("sas-event" !== e.action || !e.data.eventName)
                    return !1;
                var a = Ce();
                if ("noad" === e.data.eventName) {
                    var r = e.data.args.formatId
                      , s = gt();
                    if (!s)
                        return void Pe("SAS: Could not find ADAGIO.pbjsAdUnits or pbjs.adUnits before starting a measurer for ".concat(r));
                    s.filter((function(t) {
                        return t.code === e.data.args.tagId
                    }
                    )).length && (r = e.data.args.tagId),
                    r = "number" == typeof r ? r.toString() : r,
                    a.ADAGIO.adUnits && a.ADAGIO.adUnits[r] && (a.ADAGIO.adUnits[r].sasNoad = !0)
                }
                if ("setHeaderBiddingWinner" === e.data.eventName) {
                    var o = e.data.args.formatId
                      , d = gt();
                    if (!d)
                        return void Pe("SAS: Could not find ADAGIO.pbjsAdUnits or pbjs.adUnits before starting a measurer for ".concat(o));
                    if (d.filter((function(t) {
                        return t.code === e.data.args.tagId
                    }
                    )).length)
                        o = e.data.args.tagId;
                    else {
                        var u = d.find((function(t) {
                            return !(!t.bids || !t.bids.find((function(t) {
                                return e.data.args.tagId === t.params.adUnitElementId
                            }
                            )))
                        }
                        ));
                        u && (o = u.code)
                    }
                    o = "number" == typeof o ? o.toString() : o;
                    var c = !1;
                    a.ADAGIO.adUnits && a.ADAGIO.adUnits[o] && a.ADAGIO.adUnits[o].sasNoad && (c = !!a.ADAGIO.adUnits[o].sasNoad,
                    delete a.ADAGIO.adUnits[o].sasNoad),
                    Pe("Start a measurer from SAS", "".concat(e.data.eventName, " event for ").concat(o, ". Delay from queued: ").concat(Date.now() - e.ts)),
                    Ot({
                        ts: e.ts,
                        adUnitCode: o,
                        options: {
                            adsrv: "sas",
                            adsrv_empty: c ? "1" : "0"
                        }
                    }, e.data._window, t, n, i)
                }
                "function" == typeof window.CustomEvent && a.document.dispatchEvent(new CustomEvent("adagio.sas." + e.data.eventName,{
                    detail: e
                }))
            }(t, o, d, r);
        else if ("ast-event" === t.action)
            !function(e, t, n, i) {
                if ("ast-event" !== e.action || !e.data.eventName)
                    return !1;
                if ("adLoaded" === e.data.eventName && "banner" === e.data.args[0].adType) {
                    var a = e.data.args[0]
                      , r = a.targetId
                      , s = a.creativeId
                      , o = a.width
                      , d = a.height
                      , u = gt();
                    if (!u)
                        return void Pe("AST: Could not find ADAGIO.pbjsAdUnits or pbjs.adUnits before starting a measurer for ".concat(r));
                    var c = u.filter((function(e) {
                        var t = pt(e);
                        return e.bids.find((function(e) {
                            return vt(e.bidder, t) && e.params.adUnitElementId === r
                        }
                        ))
                    }
                    ));
                    if (!c.length)
                        return void Pe("AST: Cannot start measurer", "Could not find adUnitCode from adUnitElementId: ".concat(r));
                    c = c[0].code,
                    Pe("Start a measurer from ast.asLoaded event for ".concat(r, ". Delay from queued: ").concat(Date.now() - e.ts)),
                    Ot({
                        ts: e.ts,
                        adUnitCode: c,
                        adUnitElementId: r,
                        options: {
                            adsrv: "ast",
                            adsrv_crea_id: s,
                            adsrv_empty: 0,
                            adsrv_size: "".concat(o, "x").concat(d)
                        }
                    }, e.data._window, t, n, i)
                }
            }(t, o, d, r);
        else if ("pb-analytics-event" === t.action)
            ;
        else if ("reset" === t.action)
            !function(t) {
                Pe("Reset action called");
                var n = Ce()
                  , i = t.get();
                for (var a in i) {
                    var r = i[a];
                    r.stop(),
                    t.remove(r.params.adUnitCode)
                }
                e.adagioStartTime = Date.now(),
                n.ADAGIO.pageviewId = Re()
            }(d);
        else if ("session" === t.action) {
            var N = t.data && t.data.session ? t.data.session : {}
              , P = N.rnd
              , R = N.id
              , T = N.new
              , B = N.initiator
              , L = N.v
              , z = N.lastActivityTime;
            try {
                s.startOrUpdate({
                    rnd: P,
                    id: R,
                    isNew: T,
                    initiator: B,
                    v: L,
                    lastActivityTime: z
                }),
                s.setSampling(u.ADAGIO.pageviewId)
            } catch (e) {
                Pe(e)
            }
        } else
            ke('queue: Unknown action "'.concat(t.action, '" in payload ').concat(t))
    };
    !function() {
        var e = Ce();
        try {
            var t = document.currentScript;
            t && t.id && t.id.startsWith("adagiojs-") && (Pe("remove adagioScript from localStorage"),
            e.localStorage.removeItem("adagioScript"))
        } catch (e) {
            Ne(e)
        }
        e.ADAGIO && !0 === e.ADAGIO.hasRtd || function() {
            var e = {
                GPT: {
                    IMPRESSION_VIEWABLE: "impressionViewable",
                    SLOT_ON_LOAD: "slotOnload",
                    SLOT_RENDER_ENDED: "slotRenderEnded",
                    SLOT_REQUESTED: "slotRequested",
                    SLOT_RESPONSE_RECEIVED: "slotResponseReceived",
                    SLOT_VISIBILITY_CHANGED: "slotVisibilityChanged"
                },
                SAS: {
                    CALL: "call",
                    CLEAN: "clean",
                    BEFORE_RENDER: "beforeRender",
                    CMP_ANSWERED: "CmpAnswered",
                    CMP_CALLED: "CmpCalled",
                    LOAD: "load",
                    NOAD: "noad",
                    RENDER: "render",
                    RESET: "reset",
                    AD: "ad",
                    SET_HEADER_BIDDING_WINNER: "setHeaderBiddingWinner"
                },
                AST: {
                    adRequested: "adRequested",
                    adAvailable: "adAvailable",
                    adBadRequest: "adBadRequest",
                    adLoaded: "adLoaded",
                    adNoBid: "adNoBid",
                    adRequestFailure: "adRequestFailure",
                    adError: "adError",
                    adCollapse: "adCollapse"
                }
            }
              , t = Ce();
            t.ADAGIO = t.ADAGIO || {},
            t.ADAGIO.windows = t.ADAGIO.windows || [];
            var n = window.self
              , i = t.ADAGIO.windows.find((function(e) {
                return e.self === n
            }
            ));
            i || (i = {
                self: n
            },
            t.ADAGIO.windows.push(i));
            try {
                if (!0 === i.gpt || "gpt" === i.adserver)
                    return;
                n.googletag = n.googletag || {},
                n.googletag.cmd = n.googletag.cmd || [],
                n.googletag.cmd.push((function() {
                    Object.keys(e.GPT).map((function(t) {
                        return e.GPT[t]
                    }
                    )).forEach((function(e) {
                        n.googletag.pubads().addEventListener(e, (function(i) {
                            t.ADAGIO.queue.push({
                                action: "gpt-event",
                                data: {
                                    eventName: e,
                                    args: i,
                                    _window: n
                                },
                                ts: Date.now()
                            })
                        }
                        ))
                    }
                    )),
                    i.gpt = !0,
                    i.adserver = "gpt"
                }
                ))
            } catch (e) {}
            try {
                if (!0 === i.sas || "sas" === i.adserver)
                    return;
                n.sas = n.sas || {},
                n.sas.cmd = n.sas.cmd || [],
                n.sas.cmd.push((function() {
                    Object.keys(e.SAS).map((function(t) {
                        return e.SAS[t]
                    }
                    )).forEach((function(e) {
                        n.sas.events.on(e, (function(i) {
                            t.ADAGIO.queue.push({
                                action: "sas-event",
                                data: {
                                    eventName: e,
                                    args: i,
                                    _window: n
                                },
                                ts: Date.now()
                            })
                        }
                        ))
                    }
                    )),
                    i.sas = !0,
                    i.adserver = "sas"
                }
                ))
            } catch (e) {}
            try {
                if (!0 === i.ast || "ast" === i.adserver)
                    return;
                n.apntag = n.apntag || {},
                n.apntag.anq = n.apntag.anq || [],
                n.apntag.anq.push((function() {
                    Object.keys(e.AST).map((function(t) {
                        return e.AST[t]
                    }
                    )).forEach((function(e) {
                        n.apntag.onEvent(e, (function() {
                            t.ADAGIO.queue.push({
                                action: "ast-event",
                                data: {
                                    eventName: e,
                                    args: arguments,
                                    _window: n
                                },
                                ts: Date.now()
                            })
                        }
                        ))
                    }
                    )),
                    i.ast = !0,
                    i.adserver = "ast"
                }
                ))
            } catch (e) {}
        }(),
        e.ADAGIO && !0 === e.ADAGIO.loaded ? Pe("adagio.js already loaded") : (!function() {
            Pe("Initialize adagio.js");
            var e = Ce()
              , t = new ze
              , n = new Me
              , i = new yt
              , a = new mt;
            for (e.ADAGIO = e.ADAGIO || {},
            e.ADAGIO.versions = e.ADAGIO.versions || {},
            e.ADAGIO.versions.adagiojs = "2.1.8",
            e.ADAGIO.pageviewId = e.ADAGIO.pageviewId || Re(),
            e.ADAGIO.features = e.ADAGIO.features || i,
            e.ADAGIO.spl = e.ADAGIO.spl || {},
            e.ADAGIO.spl.avw = e.ADAGIO.spl.avw || !1,
            e.ADAGIO.spl.bids = e.ADAGIO.spl.bids || !1,
            e.ADAGIO.queue = e.ADAGIO.queue || [],
            e.ADAGIO.windows = e.ADAGIO.windows || [],
            e.document.addEventListener("adagio.measure.afterStart", (function(e) {
                a.store(e.detail.measure)
            }
            )); e.ADAGIO.queue.length; )
                Et(e.ADAGIO.queue.shift(), {
                    navigationFeatures: n,
                    adagioNavigation: t,
                    featuresManager: i,
                    measurersManager: a
                });
            e.ADAGIO.queue.push = function(e) {
                try {
                    Et(e, {
                        navigationFeatures: n,
                        adagioNavigation: t,
                        featuresManager: i,
                        measurersManager: a
                    })
                } catch (t) {
                    Ne("process queue", e.action, t)
                }
            }
        }(),
        Pe("adagio.js loaded: vers. ".concat("2.1.8")),
        e.ADAGIO.loaded = !0)
    }();
    var St = Ce()._ADAGIO && Ce()._ADAGIO.queueHistory ? Ce()._ADAGIO.queueHistory : [];
    return e.queueHistory = St,
    e
}({});
try {
    window.top.location.href ? top._ADAGIO = _ADAGIO : window._ADAGIO = _ADAGIO
} catch (e) {}
