import {expect} from 'chai';
import {spec} from 'modules/buzzoolaBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import '../../../src/prebid.js';
import {executeRenderer, Renderer} from '../../../src/Renderer.js';
import {deepClone} from '../../../src/utils.js';

const ENDPOINT = 'https://exchange.buzzoola.com/ssp/prebidjs';
const RENDERER_SRC = 'https://tube.buzzoola.com/new/build/buzzlibrary.js';

const INVALID_BIDS = [{
  'bidder': 'buzzoola',
  'mediaTypes': {'banner': {'sizes': [[240, 400], [300, 600]]}},
  'sizes': [[240, 400], [300, 600]]
}, {
  'bidder': 'buzzoola',
  'params': {'placementId': 417846},
  'sizes': [[240, 400], [300, 600]]
}, {
  'bidder': 'buzzoola',
  'mediaTypes': {
    'video': {
      'playerSize': [[640, 380]],
      'mimes': ['video/mp4'],
      'minduration': 1,
      'maxduration': 2
    }
  }
}, {
  'bidder': 'buzzoola',
  'params': {'placementId': 417845}
}];

const BANNER_BID = {
  'bidder': 'buzzoola',
  'params': {'placementId': 417846},
  'mediaTypes': {'banner': {'sizes': [[240, 400], [300, 600]]}},
  'sizes': [[240, 400], [300, 600]],
  'bidId': '2a11641ada3c6a'
};

const BANNER_BID_REQUEST = {
  bidderCode: 'buzzoola',
  bids: [BANNER_BID]
};

const BANNER_RESPONSE = [{
  'requestId': '2a11641ada3c6a',
  'cpm': 5.583115,
  'width': 240,
  'height': 400,
  'creativeId': '11773',
  'dealId': '',
  'currency': 'RUB',
  'netRevenue': true,
  'ttl': 10800,
  'ad': '<div id=\"2a11641ada3c6a\"><script>\n(function(w, d){\n\tvar env = \"prod\";\n\tvar playerData = unescape(\"\\u003ca href=\"https://buzzoola.com\" target="_blank"\\u003e\\u003cimg src="https://tube.buzzoola.com/xstatic/o42/buzzoola-test/240x400.jpg" width="240" height="400"/\\u003e\\u003c/a\\u003e\\u003cscript\\u003econsole.log("Im a buzzoola banner!");\\u003c/script\\u003e\");\n\tvar containerId = \"2a11641ada3c6a\";\n\n\tloadScript = function(src, cb){\n\t\tvar s = d.createElement(\"script\");\n\t\ts.onload = function(){cb && cb()};\n\t\ts.onerror = function(){cb && cb(true)};\n\t\ts.src = src;\n\t\ts.async = true;\n\t\td.body.appendChild(s);\n\t};\n\n\tthis.createPlayer = (function(containerId, env, playerData){ return function(){\n\t\tvar p = d.createElement(\"div\");\n\t\tif (env) p.setAttribute(\"data-debug_env\", env);\n\t\tvar container = d.getElementById(containerId)\n\t\tif(container){\n\t\t\tcontainer.appendChild(p);\n\n\t\t\tnew w.Buzzoola.Core(p, {\n\t\t\t\tdata: {\n\t\t\t\t\tcrs: [{\n\t\t\t\t\t\tcontent: {\n\t\t\t\t\t\t\tmain_content: playerData,\n\t\t\t\t\t\t\tbanner_height: 400,\n\t\t\t\t\t\t\tbanner_width: 240\n\t\t\t\t\t\t},\n\t\t\t\t\t\tevent_url: \"https://exchange.buzzoola.com/event/398e072c-4987-4745-6e72-109b214a79e0/3fa02874-3d73-48a1-4ba6-2129c6f99e1d/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75R6wziBhL0JAERGosa1adol78sahgLU5t/\",\n\t\t\t\t\t\tcontent_type: \"banner\",\n\t\t\t\t\t\tshare_buttons: [],\n\t\t\t\t\t\tbranding_template: \"\",\n\t\t\t\t\t\tplayer_show_skip_button_seconds: 5,\n\t\t\t\t\t\ttracking_url: {\"ctor\":[\"https://www.tns-counter.ru/V13a****buzzola_com/ru/CP1251/tmsec=buzzola_total/5786980942666966205\",\"https://www.tns-counter.ru/V13a****buzzoola_kz/ru/UTF-8/tmsec=buzzoola_video/3495102609460744232\",\"https://buzzoolaru.solution.weborama.fr/fcgi-bin/dispatch.fcgi?a.A=ev\\u0026a.si=3071\\u0026a.te=37\\u0026a.aap=1\\u0026a.agi=862\\u0026a.evn=PrebidJS.test\\u0026g.ra=7385909726626079306\",\"https://x01.aidata.io/0.gif?pid=BUZZOOLA\\u0026id=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://top-fwz1.mail.ru/counter?id=3026766\",\"https://dm.hybrid.ai/match?id=111\\u0026vid=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://px.adhigh.net/p/cm/buzzoola?u=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://ssp1.rtb.beeline.ru/userbind?src=buz\\u0026ssp_user_id=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://sync.upravel.com/image?source=buzzoola\\u0026id=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://relap.io/api/partners/bzcs.gif?uid=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://x.bidswitch.net/sync?ssp=sspicyads\",\"https://inv-nets.admixer.net/adxcm.aspx?ssp=3C5173FC-CA30-4692-9116-009C19CB1BF9\\u0026rurl=%2F%2Fexchange.buzzoola.com%2Fcookiesync%2Fdsp%2Fadmixer-video%2F%24%24visitor_cookie%24%24\",\"https://sync.datamind.ru/cookie/accepter?source=buzzoola\\u0026id=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://dmp.vihub.ru/match?sysid=buz\\u0026redir=no\\u0026uid=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://ad.adriver.ru/cgi-bin/rle.cgi?sid=1\\u0026ad=608223\\u0026bt=21\\u0026pid=2551979\\u0026bid=6150299\\u0026bn=6150299\\u0026rnd=8725366486107503947\",\"https://reichelcormier.bid/point/?method=match\\u0026type=ssp\\u0026key=4677290772f9000878093d69c199bfba\\u0026id=3509\\u0026extUid=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://sync.republer.com/match?src=buzzoola\\u0026id=dbdb5b13-e719-4987-7f6a-a882322bbfce\",\"https://sm.rtb.mts.ru/p?id=dbdb5b13-e719-4987-7f6a-a882322bbfce\\u0026ssp=buzzoola\",\"https://cm.mgid.com/m?cdsp=371151\\u0026adu=https%3A%2F%2Fexchange.buzzoola.com%2Fcookiesync%2Fdsp%2Fmarketgid-native%2F%7Bmuidn%7D\",\"https://dmp.gotechnology.io/dmp/syncsspdmp?sspid=122258\"]},\n\t\t\t\t\t\ttracking_js: {\"ctor\":[\"https://buzzoola.fraudscore.mobi/dooJ9sheeeDaZ3fe.js?s=268671\\u0026l=417846\"]}\n\t\t\t\t\t}],\n\t\t\t\t\tauction_id: \"398e072c-4987-4745-6e72-109b214a79e0\"\n\t\t        }\n\t\t    });\n\t\t}\n\t}})(containerId, env, playerData)\n\n\tif (w.Buzzoola !== null && w.Buzzoola !== undefined){\n\t\tthis.createPlayer();\n\t} else {\n\t\tloadScript(\"https://tube.buzzoola.com/new/build/buzzlibrary.js\", (function(context){return function(err){\n\t\t\tif (err){\n\t\t\t\t// TODO: error callback\n\t\t\t} else {\n\t\t\t\tcontext.createPlayer();\n\t\t\t}\n\t\t}})(this));\n\t}\n\n}).call({},window, document);\n</script></div>',
  'mediaType': 'banner',
  'meta': {
    'advertiserDomains': [
      'buzzoola.com'
    ]
  }
}];

const REQUIRED_BANNER_FIELDS = [
  'requestId',
  'cpm',
  'width',
  'height',
  'ad',
  'ttl',
  'creativeId',
  'netRevenue',
  'currency',
  'mediaType',
  'meta'
];

const VIDEO_BID = {
  'bidder': 'buzzoola',
  'params': {'placementId': 417845},
  'mediaTypes': {
    'video': {
      'context': 'instream',
      'playerSize': [[640, 380]],
      'mimes': ['video/mp4'],
      'minduration': 1,
      'maxduration': 2
    }
  },
  'bidId': '325a54271dc40a'
};

const VIDEO_BID_REQUEST = {
  bidderCode: 'buzzoola',
  bids: [VIDEO_BID]
};

const VIDEO_RESPONSE = [{
  'requestId': '325a54271dc40a',
  'cpm': 5.528554074074074,
  'width': 640,
  'height': 480,
  'creativeId': '11774',
  'dealId': '',
  'currency': 'RUB',
  'netRevenue': true,
  'ttl': 10800,
  'ad': '{"crs":[{"advertiser_id":165,"title":"qa//PrebidJStestVideoURL","description":"qa//PrebidJStest","duration":0,"ya_id":"55038886","raw_content":"{\\"main_content\\": \\"https://tube.buzzoola.com/xstatic/o42/mcaug/2.mp4\\"}","content":{"main_content":"https://tube.buzzoola.com/xstatic/o42/mcaug/2.mp4"},"content_type":"video_url","sponsor_link":"","sponsor_name":"","overlay":"","overlay_start_after":0,"overlay_close_after":0,"action_button_title":"","tracking_url":{},"iframe_domains":[],"soc_share_url":"https://tube.buzzoola.com/share.html","player_show_skip_button_before_play":false,"player_show_skip_button_seconds":5,"player_show_title":true,"player_data_attributes":{"expandable":"default","overroll":"default"},"click_event_view":"default","share_panel_position":"left","auto_play":true,"logo_url":{},"share_buttons":["vkontakte","facebook","twitter","moimir","odnoklassniki","embed"],"player_show_panels":false,"thumbnail":"","tracking_js":{},"click_event_url":"https://exchange.buzzoola.com/event/f9382ceb-49c2-4683-50d8-5c516c53cd69/14795a96-6261-49dc-7241-207333ab1490/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpIERGosa1adogXgqjDml4Pm/click/0/","vpaid_js_url":"https://tube.buzzoola.com/new/js/lib/vpaid_js_proxy.js","skip_clickthru":false,"landing_link_text":"","sound_enabled_by_default":false,"landing_link_position":"right","displayed_price":"","js_wrapper_url":"","enable_moat":false,"branding_template":"","event_url":"https://exchange.buzzoola.com/event/f9382ceb-49c2-4683-50d8-5c516c53cd69/14795a96-6261-49dc-7241-207333ab1490/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpIERGosa1adogXgqjDml4Pm/","resend_event_url":"https://exchange.buzzoola.com/resend_event/f9382ceb-49c2-4683-50d8-5c516c53cd69/14795a96-6261-49dc-7241-207333ab1490/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpIERGosa1adogXgqjDml4Pm/","creative_hash":"m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpIERGosa1adogXgqjDml4Pm","custom_html":"","custom_js":"","height":0,"width":0,"campaign_id":5758,"line_item_id":17319,"creative_id":11774,"extra":{"imp_id":"14795a96-6261-49dc-7241-207333ab1490","rtime":"2019-08-27 13:58:36"},"subcontent":"vast","auction_settings":{"price":"4.6158956756756755","currency":"RUB","event_name":"player_seen","time_slice":0},"hash_to_embed":"kbDH64c7yFYkSu0KCwSkoUD2bNHAnUTHBERqLGtWnaIF4Kow5peD5g","need_ad":false}],"tracking_urls":{"ctor":["https://www.tns-counter.ru/V13a****buzzola_com/ru/CP1251/tmsec=buzzola_total/1322650417245790778","https://www.tns-counter.ru/V13a****buzzoola_kz/ru/UTF-8/tmsec=buzzoola_video/5395765100939533275","https://buzzoolaru.solution.weborama.fr/fcgi-bin/dispatch.fcgi?a.A=ev&a.si=3071&a.te=37&a.aap=1&a.agi=862&a.evn=PrebidJS.test&g.ra=4581478478720298652","https://x01.aidata.io/0.gif?pid=BUZZOOLA&id=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://top-fwz1.mail.ru/counter?id=3026769","https://www.tns-counter.ru/V13a****buzzola_com/ru/UTF-8/tmsec=buzzola_inread/542059452789128996","https://dm.hybrid.ai/match?id=111&vid=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://px.adhigh.net/p/cm/buzzoola?u=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://ssp1.rtb.beeline.ru/userbind?src=buz&ssp_user_id=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://sync.upravel.com/image?source=buzzoola&id=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://relap.io/api/partners/bzcs.gif?uid=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://x.bidswitch.net/sync?ssp=sspicyads","https://inv-nets.admixer.net/adxcm.aspx?ssp=3C5173FC-CA30-4692-9116-009C19CB1BF9&rurl=%2F%2Fexchange.buzzoola.com%2Fcookiesync%2Fdsp%2Fadmixer-video%2F%24%24visitor_cookie%24%24","https://sync.datamind.ru/cookie/accepter?source=buzzoola&id=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://dmp.vihub.ru/match?sysid=buz&redir=no&uid=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://ad.adriver.ru/cgi-bin/rle.cgi?sid=1&ad=608223&bt=21&pid=2551979&bid=6150299&bn=6150299&rnd=1279444531737367663","https://reichelcormier.bid/point/?method=match&type=ssp&key=4677290772f9000878093d69c199bfba&id=3509&extUid=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://sync.republer.com/match?src=buzzoola&id=dbdb5b13-e719-4987-7f6a-a882322bbfce","https://sm.rtb.mts.ru/p?id=dbdb5b13-e719-4987-7f6a-a882322bbfce&ssp=buzzoola","https://cm.mgid.com/m?cdsp=371151&adu=https%3A%2F%2Fexchange.buzzoola.com%2Fcookiesync%2Fdsp%2Fmarketgid-native%2F%7Bmuidn%7D","https://dmp.gotechnology.io/dmp/syncsspdmp?sspid=122258"]},"tracking_js":{"ctor":["https://buzzoola.fraudscore.mobi/dooJ9sheeeDaZ3fe.js?s=268671&l=417845"]},"placement":{"placement_id":417845,"unit_type":"inread","unit_settings":{"align":"left","autoplay_enable_sound":false,"creatives_amount":1,"debug_mode":false,"expandable":"never","sound_control":"default","target":"","width":"100%"},"unit_settings_list":["width","sound_control","debug_mode","target","creatives_amount","expandable","container_height","align","height"]},"uuid":"dbdb5b13-e719-4987-7f6a-a882322bbfce","auction_id":"f9382ceb-49c2-4683-50d8-5c516c53cd69","env":"prod"}',
  'vastUrl': 'https://exchange.buzzoola.com/prebid/adm/6cfa2ee1-f001-4fab-5582-a62eaee46205/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75R6wziBhL0JAERGosa1adogXgqjDml4Pm/?auction_id=92702ce1-2328-4c7a-57aa-41c738e8bb75',
  'mediaType': 'video',
  'meta': {
    'advertiserDomains': [
      'buzzoola.com'
    ]
  }
}];

const RENDERER_DATA = {
  data: JSON.parse(VIDEO_RESPONSE[0].ad)
};
RENDERER_DATA.data.placement.unit_settings.width = '' + VIDEO_RESPONSE[0].width;
RENDERER_DATA.data.placement.unit_settings.height = RENDERER_DATA.data.placement.unit_settings.container_height = '' + VIDEO_RESPONSE[0].height;

const REQUIRED_VIDEO_FIELDS = [
  'requestId',
  'cpm',
  'width',
  'height',
  'ad',
  'ttl',
  'creativeId',
  'netRevenue',
  'currency',
  'vastUrl',
  'mediaType',
  'meta'
];

const NATIVE_BID = {
  'bidder': 'buzzoola',
  'params': {'placementId': 417845},
  'mediaTypes': {
    'native': {
      'image': {
        'required': true,
        'sizes': [640, 134]
      },
      'title': {
        'required': true,
        'len': 80
      },
      'sponsoredBy': {
        'required': true
      },
      'clickUrl': {
        'required': true
      },
      'privacyLink': {
        'required': false
      },
      'body': {
        'required': true
      },
      'icon': {
        'required': true,
        'sizes': [50, 50]
      }
    }
  },
  'bidId': '22a42cd3522c6f'
};

const NATIVE_BID_REQUEST = {
  bidderCode: 'buzzoola',
  bids: [NATIVE_BID]
};

const NATIVE_RESPONSE = [{
  'requestId': '22a42cd3522c6f',
  'cpm': 6.553015238095238,
  'width': 600,
  'height': 300,
  'creativeId': '17970',
  'dealId': '',
  'currency': 'RUB',
  'netRevenue': true,
  'ttl': 10800,
  'ad': 'https://tube.buzzoola.com/xstatic/o42/stoloto/6',
  'mediaType': 'native',
  'native': {
    'body': 'В 1388-м тираже «Русского лото» джекпот',
    'clickTrackers': [
      'https://exchange.buzzoola.com/event/6cee890f-1878-4a37-46b3-0107b6c590ae/a1aedc5b-50f2-4a7c-6d24-e235bb1f87ed/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpJwP8cy-zNH8GX-_nWFkILh/click/'
    ],
    'clickUrl': 'https://ad.doubleclick.net/ddm/trackclk/N250204.3446512BUZZOOLA/B25801892.303578321;dc_trk_aid=496248119;dc_trk_cid=151207455;dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=;ltd=?https://stoloto.onelink.me/mEJM?pid=Buzzoola_mb4&c=rl_10_05_2021&is_retargeting=true&af_ios_url=https%3A%2F%2Fapps.apple.com%2Fru%2Fapp%2F%25D1%2581%25D1%2582%25D0%25BE%25D0%25BB%25D0%25BE%25D1%2582%25D0%25BE-%25D1%2583-%25D0%25BD%25D0%25B0%25D1%2581-%25D0%25B2%25D1%258B%25D0%25B8%25D0%25B3%25D1%2580%25D1%258B%25D0%25B2%25D0%25B0%25D1%258E%25D1%2582%2Fid579961527&af_android_url=https%3A%2F%2Fgalaxystore.samsung.com%2Fdetail%2Fru.stoloto.mobile&af_dp=stolotoone%3A%2F%2Fgames&af_web_dp=https%3A%2F%2Fwww.stoloto.ru%2Fruslotto%2Fgame%3Flastdraw%3Fad%3Dbuzzoola_app_dx_rl_10_05_2021%26utm_source%3Dbuzzoola_app_dx%26utm_medium%3Dcpm%26utm_campaign%3Drl_10_05_2021%26utm_content%3Dbuzzoola_app_dx_mob_native_ios_mb4%26utm_term%3D__6ple2-9znjyg_',
    'icon': {
      'height': '100',
      'url': 'https://tube.buzzoola.com/xstatic/o42/stoloto/logo3.png',
      'width': '100'
    },
    'image': {
      'height': '450',
      'url': 'https://tube.buzzoola.com/xstatic/o42/stoloto/6/16x9.png',
      'width': '800'
    },
    'impressionTrackers': [
      'https://exchange.buzzoola.com/event/6cee890f-1878-4a37-46b3-0107b6c590ae/a1aedc5b-50f2-4a7c-6d24-e235bb1f87ed/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpJwP8cy-zNH8GX-_nWFkILh/ctor/',
      'https://exchange.buzzoola.com/event/6cee890f-1878-4a37-46b3-0107b6c590ae/a1aedc5b-50f2-4a7c-6d24-e235bb1f87ed/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpJwP8cy-zNH8GX-_nWFkILh/impression/?price=${AUCTION_PRICE}&cur=${AUCTION_CURRENCY}',
      'https://exchange.buzzoola.com/event/6cee890f-1878-4a37-46b3-0107b6c590ae/a1aedc5b-50f2-4a7c-6d24-e235bb1f87ed/m7JVQI9Y7J35_gEDugNO2bIiP2qTqPKfuLrqqh_LoJu0tD6PoLEglMXUBzVpSg75c-unsaijXpJwP8cy-zNH8GX-_nWFkILh/player_seen/',
      'https://cr.frontend.weborama.fr/cr?key=mailru&url=https%3A%2F%2Fad.mail.ru%2Fcm.gif%3Fp%3D68%26id%3D%7BWEBO_CID%7D'
    ],
    'sponsoredBy': 'Buzzoola',
    'title': 'Test PrebidJS Native'
  },
  'meta': {
    'advertiserDomains': [
      'buzzoola.com'
    ]
  }
}];

const REQUIRED_NATIVE_FIELDS = [
  'requestId',
  'cpm',
  'width',
  'height',
  'ad',
  'native',
  'ttl',
  'creativeId',
  'netRevenue',
  'currency',
  'mediaType',
  'meta'
];

describe('buzzoolaBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(VIDEO_BID)).to.be.true;
    });

    it('should return false when required params are not passed', () => {
      INVALID_BIDS.forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });
    });
  });

  describe('buildRequests', () => {
    let videoBidRequests = [VIDEO_BID];
    let bannerBidRequests = [BANNER_BID];
    let nativeBidRequests = [NATIVE_BID];

    const bannerRequest = spec.buildRequests(bannerBidRequests, BANNER_BID_REQUEST);
    const nativeRequest = spec.buildRequests(nativeBidRequests, NATIVE_BID_REQUEST);
    const videoRequest = spec.buildRequests(videoBidRequests, VIDEO_BID_REQUEST);

    it('sends bid request to ENDPOINT via POST', () => {
      expect(videoRequest.method).to.equal('POST');
      expect(bannerRequest.method).to.equal('POST');
      expect(nativeRequest.method).to.equal('POST');
    });

    it('sends bid request to correct ENDPOINT', () => {
      expect(videoRequest.url).to.equal(ENDPOINT);
      expect(bannerRequest.url).to.equal(ENDPOINT);
      expect(nativeRequest.url).to.equal(ENDPOINT);
    });

    it('sends correct video bid parameters', () => {
      expect(videoRequest.data).to.deep.equal(VIDEO_BID_REQUEST);
    });

    it('sends correct banner bid parameters', () => {
      expect(bannerRequest.data).to.deep.equal(BANNER_BID_REQUEST);
    });

    it('sends correct native bid parameters', () => {
      expect(nativeRequest.data).to.deep.equal(NATIVE_BID_REQUEST);
    });
  });

  describe('interpretResponse', () => {
    const noBidServerResponse = [];
    const emptyResponse = '';

    function nobidServerResponseCheck(request, response = noBidServerResponse) {
      const noBidResult = spec.interpretResponse({body: response}, {data: request});

      expect(noBidResult.length).to.equal(0);
    }

    function bidServerResponseCheck(response, request, fields) {
      const result = spec.interpretResponse({body: response}, {data: request});

      expect(result).to.deep.equal(response);
      result.forEach(bid => {
        fields.forEach(field => {
          expect(bid).to.have.own.property(field);
        })
      });
    }

    it('handles video nobid responses', () => {
      nobidServerResponseCheck(VIDEO_BID_REQUEST);
    });

    it('handles banner nobid responses', () => {
      nobidServerResponseCheck(BANNER_BID_REQUEST);
    });

    it('handles native nobid responses', () => {
      nobidServerResponseCheck(NATIVE_BID_REQUEST);
    });

    it('handles video empty responses', () => {
      nobidServerResponseCheck(VIDEO_BID_REQUEST, emptyResponse);
    });

    it('handles banner empty responses', () => {
      nobidServerResponseCheck(BANNER_BID_REQUEST, emptyResponse);
    });

    it('handles native empty responses', () => {
      nobidServerResponseCheck(NATIVE_BID_REQUEST, emptyResponse);
    });

    it('should get correct video bid response', () => {
      bidServerResponseCheck(VIDEO_RESPONSE, VIDEO_BID_REQUEST, REQUIRED_VIDEO_FIELDS);
    });

    it('should get correct banner bid response', () => {
      bidServerResponseCheck(BANNER_RESPONSE, BANNER_BID_REQUEST, REQUIRED_BANNER_FIELDS);
    });

    it('should get correct native bid response', () => {
      bidServerResponseCheck(NATIVE_RESPONSE, NATIVE_BID_REQUEST, REQUIRED_NATIVE_FIELDS);
    });
  });

  describe('outstream renderer', () => {
    let result;
    let renderer;

    before(() => {
      const adContainer = document.createElement('div');
      adContainer.id = 'adUnitCode';
      document.body.appendChild(adContainer);

      const outstreamVideoBid = deepClone(VIDEO_BID);
      outstreamVideoBid.mediaTypes.video.context = 'outstream';

      const outstreamVideoRequest = deepClone(VIDEO_BID_REQUEST);
      outstreamVideoRequest.bids = [outstreamVideoBid];

      const scriptElement = document.createElement('div');

      const scriptStub = sinon.stub(document, 'createElement');
      scriptStub.withArgs('script').returns(scriptElement);

      result = spec.interpretResponse({body: VIDEO_RESPONSE}, {data: outstreamVideoRequest})[0];
      renderer = result.renderer;

      result.adUnitCode = 'adUnitCode';

      scriptElement.onload && scriptElement.onload();

      scriptStub.restore();
    });

    it('should add renderer for outstream video', () => {
      expect(result).to.have.own.property('renderer');
    });

    it('should be instance of Renderer', () => {
      expect(renderer).to.be.instanceof(Renderer);
    });

    it('should have valid src', () => {
      expect(renderer.url).to.equal(RENDERER_SRC);
    });

    it('should create player instance', () => {
      window.Buzzoola = {
        Core: {
          install: () => {}
        }
      };
      const spy = sinon.spy(window.Buzzoola.Core, 'install');
      executeRenderer(renderer, result);
      renderer.callback();
      expect(spy.called).to.be.true;

      const spyCall = spy.getCall(0);

      expect(spyCall.args[0]).to.be.instanceof(Element);
      expect(spyCall.args[1]).to.deep.equal(RENDERER_DATA);
    });
  });
});
