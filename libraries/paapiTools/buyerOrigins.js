/*
   This list is several known buyer origins for PAAPI auctions.
   Bidders should add anyone they like to it.
   It is not intended to be comphensive nor maintained by the Core team.
   Rather, Bid adapters should simply append additional constants whenever
   the need arises in their adapter.

   The goal is to reduce expression of common constants over many
   bid adapters attempting to define interestGroupBuyers
   in advance of network traffic.

   Bidders should consider updating their interstGroupBuyer list
   with server communication for auctions initiated after the first bid response.

   Known buyers without current importers are commented out. If you need one, uncomment it.
*/

export const BO_CSR_ONET = 'https://csr.onet.pl';
// export const BO_DOUBLECLICK_GOOGLEADS = 'https://googleads.g.doubleclick.net';
// export const BO_DOUBLECLICK_TD = 'https://td.doubleclick.net';
// export const BO_RTBHOUSE = 'https://f.creativecdn.com';
// export const BO_CRITEO_US = 'https://fledge.us.criteo.com';
// export const BO_CRITEO_EU = 'https://fledge.eu.criteo.com';
// export const BO_CRITEO_AS = 'https://fledge.as.criteo.com';
// export const BO_CRITEO_GRID_MERCURY = 'https://grid-mercury.criteo.com';
// export const BO_CRITEO_BIDSWITCH_TRADR = 'https://tradr.bsw-sb.criteo.com';
// export const BO_CRITEO_BIDSWITCH_SANDBOX = 'https://dsp-paapi-sandbox.bsw-ig.criteo.com';
// export const BO_APPSPOT = 'https://fledge-buyer-testing-1.uc.r.appspot.com';
// export const BO_OPTABLE = 'https://ads.optable.co';
// export const BO_ADROLL = 'https://x.adroll.com';
// export const BO_ADFORM = 'https://a2.adform.net';
// export const BO_RETARGETLY = 'https://cookieless-campaign.prd-00.retargetly.com';
// export const BO_AUDIGENT = 'https://proton.ad.gt';
// export const BO_YAHOO = 'https://pa.ybp.yahoo.com';
// export const BO_DOTOMI = 'https://usadmm.dotomi.com';
