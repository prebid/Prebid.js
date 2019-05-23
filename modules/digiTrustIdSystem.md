## DigiTrust Universal Id Integration

Setup
-----
The DigiTrust Id integration for Prebid may be used with or without the full
DigiTrust library. This is an optional module that must be used in conjunction
with the userId module.

The full DigiTrust integration requires the DigiTrust package be included.
DigiTrust may be initialized in the standard manner or through the params
object. 

You can use npm or reference the script on the cdn.

npm install digitrust

or

<script src="https://cdn.digitru.st/prod/1.5.20/digitrust.min.js"></script>

Please note that version 1.5.20 or better is required.


See the [Prebid Integration Guide for DigiTrust](https://github.com/digi-trust/dt-cdn/wiki/Prebid-Integration-for-DigiTrust-Id)
and the [DigiTrust wiki](https://github.com/digi-trust/dt-cdn/wiki)
for further instructions.


## Example Prebid Configuration for Digitrust Id
```
        pbjs.que.push(function() {
            pbjs.setConfig({
                usersync: {
                    userIds: [{
						name: "digitrust",
						params: {
							init: {
								member: 'example_member_id',
								site: 'example_site_id'
							},
							callback: function (digiTrustResult) {
								if (digiTrustResult.success) {
									console.log('Success in Digitrust init');
									if (digiTrustResult.identity && digiTrustResult.identity.id != null) {
										console.log('DigiTrust Id (encrypted): ' + digiTrustResult.identity.id);
									}
									else {
										console.error('Digitrust gave success, but no identity returned');
									}
								}
								else {
									console.error('Digitrust init failed');
								}
							}
						},
						storage: {
							type: "html5",
							name: "pbjsdigitrust",
							expires: 60
						}
					}]
                }
            });
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                bidsBackHandler: sendAdserverRequest
            });
        });

```




