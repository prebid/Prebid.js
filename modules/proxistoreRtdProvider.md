# Overview

Module Name: ProxistoreRtdProvider
Module Type: Rtd Provider
Maintainer: vincent.descamps.proxistore@example.com

# Description

Proxistore Rtd Provider allows you to get the user data targeting from sirdata by respecting GDPR.

Please see the example below:

pbjs.setConfig({
realTimeData: {
auctionDelay: 0,
dataProviders: [
{
name: "ProxistoreRTDModule",
waitForIt: true,
},
],
}
});
