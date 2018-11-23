import * as utils from "src/utils";
import { Renderer } from "src/Renderer";
import { registerBidder } from "src/adapters/bidderFactory";
import { BANNER, VIDEO } from "src/mediaTypes";

const BIDDER_CODE = "spotx",
    URL = "//search.spotxchange.com/openrtb/2.3/dados/",
    ORTB_VERSION = "2.3";

export const spec = {
    code: "spotx",
    aliases: ["spotx"],
    supportedMediaTypes: [BANNER, VIDEO],
    isBidRequestValid: function(e) {
        if (e && ("object" != typeof e.params || "object" != typeof e.params.video)) return utils.logMessage("spotx: video params is missing or is incorrect"), !1;
        if (void 0 === e.params.video.channel_id || void 0 === e.params.video.slot || void 0 === e.params.video.video_slot) return utils.logMessage("spotx: channel_id, slot and/or video_slot are not present in bidder params"), !1;
        const t = utils.getBidIdParameter("video_slot", e.params.video);
        if (null === window.document.getElementById(t)) return utils.logMessage("spotx: video_slot HTML node id does not exist on the page"), !1;
        const i = utils.getBidIdParameter("slot", e.params.video);
        return null !== window.document.getElementById(i) || (utils.logMessage("spotx: slot HTML node id does not exist on the page"), !1)
    },
    buildRequests: function(e, t) {
        const i = utils.getTopWindowLocation(),
            r = i.href,
            o = "https:" === i.protocol ? 1 : 0,
            a = t.bids[0],
            d = a.params.video.channel_id;
        let s = null;
        const n = window.document.getElementById(utils.getBidIdParameter("video_slot", a.params.video)),
            u = n.querySelectorAll("video").length,
            l = utils.getBidIdParameter("content_width", a.params.video) || (u ? n.querySelectorAll("video")[0].offsetWidth : n.offsetWidth),
            c = utils.getBidIdParameter("content_height", a.params.video) || (u ? n.querySelectorAll("video")[0].offsetHeight : n.offsetHeight),
            m = e.map(function(e) {
                const t = o || (utils.getBidIdParameter("secure", e.params) ? 1 : 0),
                    i = {
                        player_width: l,
                        player_height: c,
                        sdk_name: "Prebid 1+",
                        ad_mute: +!!utils.getBidIdParameter("ad_mute", e.params.video),
                        hide_skin: +!!utils.getBidIdParameter("hide_skin", e.params.video),
                        content_page_url: r,
                        versionOrtb: "2.3",
                        bidId: e.bidId,
                        videoSlot: e.params.video.video_slot
                    };
                "" != utils.getBidIdParameter("ad_volume", e.params.video) && (i.ad_volume = utils.getBidIdParameter("ad_volume", e.params.video)), "" != utils.getBidIdParameter("ad_unit", e.params.video) && (i.ad_unit = utils.getBidIdParameter("ad_unit", e.params.video)), "" != utils.getBidIdParameter("outstreamFunction", e.params.video) && (i.outstreamFunction = utils.getBidIdParameter("outstreamFunction", e.params.video)), "" != utils.getBidIdParameter("custom", e.params.video) && (i.custom = utils.getBidIdParameter("custom", e.params.video));
                const a = utils.getBidIdParameter("mimes", e.params.video) || ["application/javascript", "video/mp4", "video/webm"],
                    d = {
                        id: Date.now(),
                        secure: t,
                        video: {
                            w: l,
                            h: c,
                            ext: i,
                            mimes: a
                        }
                    };
                return "" != utils.getBidIdParameter("price_floor", e.params) && (d.bidfloor = utils.getBidIdParameter("price_floor", e.params)), "" != utils.getBidIdParameter("start_delay", e.params.video) && (d.video.startdelay = 0 + Boolean(utils.getBidIdParameter("start_delay", e.params.video))), e.crumbs && e.crumbs.pubcid && (s = e.crumbs.pubcid), d
            }),
            p = navigator.language ? "language" : "userLanguage",
            g = {
                h: screen.height,
                w: screen.width,
                dnt: utils.getDNT() ? 1 : 0,
                language: navigator[p].split("-")[0],
                make: navigator.vendor ? navigator.vendor : "",
                ua: navigator.userAgent
            };
        let _ = {
            id: d,
            imp: m,
            site: {
                id: "",
                page: r,
                content: "content"
            },
            device: g,
            ext: {
                wrap_response: 1
            }
        };
        utils.getBidIdParameter("number_of_ads", a.params) && (_.ext.number_of_ads = utils.getBidIdParameter("number_of_ads", a.params));
        let v = {};
        return t && t.gdprConsent && (v.consent = t.gdprConsent.consentString, void 0 !== t.gdprConsent.gdprApplies && (_.regs = {
            ext: {
                gdpr: t.gdprConsent.gdprApplies ? 1 : 0
            }
        })), s && (v.fpc = s), utils.isEmpty(v) || (_.user = {
            ext: v
        }), {
            method: "POST",
            url: URL + d,
            data: _,
            bidRequest: t
        }
    },
    interpretResponse: function(e, t) {
        const i = [],
            r = e.body,
            o = {};
        return t && t.data && t.data.imp && utils._each(t.data.imp, e => o[e.id] = e), r && utils.isArray(r.seatbid) && utils._each(r.seatbid, function(e) {
            utils._each(e.bid, function(e) {
                const t = o[e.impid],
                    a = {
                        requestId: t.video.ext.bidId,
                        currency: r.cur || "USD",
                        cpm: e.price,
                        creativeId: e.crid || "",
                        ttl: 360,
                        netRevenue: !0,
                        channel_id: r.id,
                        cache_key: e.ext.cache_key,
                        video_slot: t.video.ext.videoSlot
                    };
                if (t.video && (a.vastUrl = "//search.spotxchange.com/ad/vast.html?key=" + e.ext.cache_key, a.mediaType = VIDEO, a.width = e.w, a.height = e.h), "outstream" == t.video.ext.ad_unit) {
                    const e = Renderer.install({
                        id: 0,
                        url: "//",
                        config: {
                            adText: "SpotX Outstream Video Ad via Prebid.js",
                            player_width: t.video.ext.player_width,
                            player_height: t.video.ext.player_height,
                            content_page_url: t.video.ext.content_page_url,
                            ad_mute: t.video.ext.ad_mute,
                            outstreamFunction: t.video.ext.outstreamFunction
                        }
                    });
                    try {
                        e.setRender(outstreamRender), e.setEventHandlers({
                            impression: function() {
                                return utils.logMessage("SpotX outstream video impression event")
                            },
                            loaded: function() {
                                return utils.logMessage("SpotX outstream video loaded event")
                            },
                            ended: function() {
                                utils.logMessage("SpotX outstream renderer video event")
                            }
                        })
                    } catch (e) {
                        utils.logWarn("Prebid Error calling setRender or setEve,tHandlers on renderer", e)
                    }
                    a.renderer = e
                }
                i.push(a)
            })
        }), t && t.bidRequest && t.bidRequest.bids && utils._each(t.bidRequest.bids, function(e) {
            let t = null;
            for (let r = 0; r < i.length; r++) i[r].requestId == e.bidId && (t = i[r].cache_key);
            null != t && (e.bidId = t)
        }), i
    },
    getUserSyncs: function(e, t) {},
    onTimeout: function(e) {}
};

function outstreamRender(e) {
    if (null != e.renderer.config.outstreamFunction && "function" == typeof e.renderer.config.outstreamFunction) e.renderer.config.outstreamFunction(e);
    else try {
        utils.logMessage("[SPOTX][renderer] Handle SpotX outstream renderer");
        const t = window.document.createElement("script");
        if (t.type = "text/javascript", t.src = "//js.spotx.tv/easi/v1/" + e.channel_id + ".js", t.setAttribute("data-spotx_channel_id", "" + e.channel_id), t.setAttribute("data-spotx_vast_url", "" + e.vastUrl), t.setAttribute("data-spotx_content_width", e.renderer.config.player_width), t.setAttribute("data-spotx_content_height", e.renderer.config.player_height), t.setAttribute("data-spotx_content_page_url", e.renderer.config.content_page_url), e.renderer.config.ad_mute && t.setAttribute("data-spotx_ad_mute", "0"), t.setAttribute("data-spotx_ad_unit", "incontent"), t.setAttribute("data-spotx_collapse", "0"), t.setAttribute("data-spotx_autoplay", "1"), t.setAttribute("data-spotx_blocked_autoplay_override_mode", "1"), t.setAttribute("data-spotx_video_slot_can_autoplay", "1"), e.renderer.config.inIframe && "IFRAME" == window.document.getElementById(e.renderer.config.inIframe).nodeName) {
            const i = window.document.getElementById(e.renderer.config.inIframe);
            let r = i.contentDocument;
            !r && i.contentWindow && (r = i.contentWindow.document), r.body.appendChild(t)
        } else window.document.getElementById(e.video_slot).appendChild(t)
    } catch (e) {
        utils.logError("[SPOTX][renderer] " + e.message)
    }
}
registerBidder(spec);