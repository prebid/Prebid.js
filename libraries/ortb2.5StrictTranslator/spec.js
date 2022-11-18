import {Arr, extend, ID, IntEnum, Named, Obj} from './dsl.js';

const CatDomain = Named[extend](['cat', 'domain']);
const Segment = Named[extend](['value']);
const Data = Named[extend]([], {
  segment: Arr(Segment)
});
const Content = ID[extend](['episode', 'title', 'series', 'season', 'artist', 'genre', 'album', 'isrc', 'url', 'cat', 'contentrating', 'userrating', 'keywords', 'livestream', 'sourcerelationship', 'len', 'language', 'embeddable'], {
  producer: CatDomain,
  data: Arr(Data),
  prodq: IntEnum(0, 3),
  videoquality: IntEnum(0, 3),
  context: IntEnum(1, 7),
  qagmediarating: IntEnum(1, 3),
});

const Client = CatDomain[extend](['sectioncat', 'pagecat', 'privacypolicy', 'keywords'], {
  publisher: CatDomain, content: Content,
});
const Site = Client[extend](['page', 'ref', 'search', 'mobile']);
const App = Client[extend](['bundle', 'storeurl', 'ver', 'paid']);

const Geo = Obj(['lat', 'lon', 'accuracy', 'lastfix', 'country', 'region', 'regionfips104', 'metro', 'city', 'zip', 'utcoffset'], {
  type: IntEnum(1, 3),
  ipservice: IntEnum(1, 4)
});
const Device = Obj(['ua', 'dnt', 'lmt', 'ip', 'ipv6', 'make', 'model', 'os', 'osv', 'hwv', 'h', 'w', 'ppi', 'pxratio', 'js', 'geofetch', 'flashver', 'language', 'carrier', 'mccmnc', 'ifa', 'didsha1', 'didmd5', 'dpidsha1', 'dpidmd5', 'macsha1', 'macmd5'], {
  geo: Geo, devicetype: IntEnum(1, 7), connectiontype: IntEnum(0, 6)
});
const User = ID[extend](['buyeruid', 'yob', 'gender', 'keywords', 'customdata'], {
  geo: Geo, data: Arr(Data),
});

const Floorable = ID[extend](['bidfloor', 'bidfloorcur']);
const Deal = Floorable[extend](['at', 'wseat', 'wadomain']);
const Pmp = Obj(['private_auction'], {
  deals: Arr(Deal),
});
const Format = Obj(['w', 'h', 'wratio', 'hratio', 'wmin']);
const MediaType = Obj(['mimes'], {
  api: Arr(IntEnum(1, 6)), battr: Arr(IntEnum(1, 17))
});
const Banner = MediaType[extend](['id', 'w', 'h', 'wmax', 'hmax', 'hmin', 'wmin', 'topframe', 'vcm'], {
  format: Arr(Format), btype: Arr(IntEnum(1, 4)), pos: IntEnum(0, 7), expdir: Arr(IntEnum(1, 5))
});
const Native = MediaType[extend](['request', 'ver']);
const RichMediaType = MediaType[extend](['minduration', 'maxduration', 'startdelay', 'sequence', 'maxextended', 'minbitrate', 'maxbitrate'], {
  protocols: Arr(IntEnum(1, 10)),
  delivery: Arr(IntEnum(1, 3)),
  companionad: Arr(Banner),
  companiontype: Arr(IntEnum(1, 3)),
});
/*
const Audio = RichMediaType[extend](['maxseq', 'stitched'], {
  feed: IntEnum(1, 3), nvol: IntEnum(0, 4),
});
 */
const Video = RichMediaType[extend](['w', 'h', 'skip', 'skipmin', 'skipafter', 'boxingallowed'], {
  pos: IntEnum(0, 7),
  protocol: IntEnum(1, 10),
  placement: IntEnum(1, 5),
  linearity: IntEnum(1, 2),
  playbackmethod: Arr(IntEnum(1, 6)),
  playbackend: IntEnum(1, 3),
});
const Metric = Obj(['type', 'value', 'vendor']);
const Imp = (() => {
  const spec = {
    metric: Arr(Metric), banner: Banner, video: Video, pmp: Pmp,
  };
  if (FEATURES.NATIVE) {
    spec.native = Native;
  }
  return Floorable[extend](['displaymanager', 'displaymanagerver', 'instl', 'tagid', 'clickbrowser', 'secure', 'iframebuster', 'exp'], spec);
})();

const Regs = Obj(['coppa']);
const Source = Obj(['fd', 'tid', 'pchain']);
export const BidRequest = ID[extend](['test', 'at', 'tmax', 'wseat', 'bseat', 'allimps', 'cur', 'wlang', 'bcat', 'badv', 'bapp'], {
  imp: Arr(Imp), site: Site, app: App, device: Device, user: User, source: Source, regs: Regs
});
