## User ID Example Configuration

Example showing `cookie` storage for user id data for each of the submodules
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "pubCommonId",
            storage: {
                type: "cookie",
                name: "_pubcid",
                expires: 60
            }
        }, {
            name: 'dmdId',
            storage: {
                name: 'dmd-dgid',
                type: 'cookie',
                expires: 30
            },
            params: {
                api_key: '3fdbe297-3690-4f5c-9e11-ee9186a6d77c', // provided by DMD
            }
        }, {
            name: "unifiedId",
            params: {
                partner: "prebid",
                url: "//match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
            },
            storage: {
                type: "cookie",
                name: "unifiedid",
                expires: 60
            }
        }, {
            name: "id5Id",
            params: {
                partner: 173,         // Set your real ID5 partner ID here for production, please ask for one at https://id5.io/universal-id
                pd: "some-pd-string"  // See https://wiki.id5.io/x/BIAZ for details
            },
            storage: {
                type: "html5",        // ID5 requires html5
                name: "id5id",
                expires: 90,          // Expiration in days
                refreshInSeconds: 8*3600 // User Id cache lifetime in seconds, defaulting to 'expires'
            },
        }, {
            name: 'parrableId',
            params: {
                // Replace partner with comma-separated (if more than one) Parrable Partner Client ID(s) for Parrable-aware bid adapters in use
                partner: "30182847-e426-4ff9-b2b5-9ca1324ea09b"
            }
        }, {
            name: 'identityLink',
            params: {
                pid: '999', // Set your real identityLink placement ID here
                // notUse3P: true // true/false - If you do not want to use 3P endpoint to retrieve envelope. If you do not set this property to true, 3p endpoint will be fired. By default this property is undefined and 3p request will be fired.
            },
            storage: {
                type: 'cookie',
                name: 'idl_env',
                expires: 30
            }
        }, {
            name: 'liveIntentId',
            params: {
                publisherId: '7798696' // Set an identifier of a publisher know to your systems
            },
            storage: {
                type: 'cookie',
                name: '_li_pbid',
                expires: 60
            }
        }, {
             name: 'sharedId',
              params: {
                    syncTime: 60 // in seconds, default is 24 hours
               },
             storage: {
                 type: 'cookie',
                 name: 'sharedid',
                 expires: 28
              }
        }, {
             name: 'criteo',
             storage: {             // It is best not to specify this parameter since the module needs to be called as many times as possible
                 type: 'cookie',
                 name: '_criteoId',
                 expires: 1
              }
        }, {
            name: 'mwOpenLinkId',
            params: {
                accountId: 0000,
                partnerId: 0000,
                uid: '12345xyz'
            }
        },{
            name: "merkleId",
            params: {
                vendor:'sdfg',
                sv_cid:'dfg',
                sv_pubid:'xcv',
                sv_domain:'zxv'
            },
            storage: {
                type: "cookie",
                name: "merkleId",
                expires: 30
            } 
        },{
            name: 'uid2'
        }
        }, {
              name: 'admixerId',
              params: {
                  pid: "4D393FAC-B6BB-4E19-8396-0A4813607316", // example id
                  e: "3d400b57e069c993babea0bd9efa79e5dc698e16c042686569faae20391fd7ea", // example hashed email (sha256)
                  p: "05de6c07eb3ea4bce45adca4e0182e771d80fbb99e12401416ca84ddf94c3eb9" //example hashed phone (sha256)
              },
              storage: {
                  type: 'cookie',
                  name: '__adm__admixer',
                  expires: 30
              }
        },{
              name: 'flocId',
               params: {
                    token: "Registered token or default sharedid.org token" // Default sharedid.org token: "A3dHTSoNUMjjERBLlrvJSelNnwWUCwVQhZ5tNQ+sll7y+LkPPVZXtB77u2y7CweRIxiYaGwGXNlW1/dFp8VMEgIAAAB+eyJvcmlnaW4iOiJodHRwczovL3NoYXJlZGlkLm9yZzo0NDMiLCJmZWF0dXJlIjoiSW50ZXJlc3RDb2hvcnRBUEkiLCJleHBpcnkiOjE2MjYyMjA3OTksImlzU3ViZG9tYWluIjp0cnVlLCJpc1RoaXJkUGFydHkiOnRydWV9"     
           }
        }],
        syncDelay: 5000,
        auctionDelay: 1000
    }
});
```

Example showing `localStorage` for user id data for some submodules
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "unifiedId",
            params: {
                partner: "prebid",
                url: "http://match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
            },
            storage: {
                type: "html5",
                name: "unifiedid",
                expires: 60
            }
        }, {
            name: "pubCommonId",
            storage: {
                type: "html5",
                name: "pubcid",
                expires: 60
            }
        }, {
            name: 'identityLink',
            params: {
                pid: '999', // Set your real identityLink placement ID here
                // notUse3P: true // true/false - If you do not want to use 3P endpoint to retrieve envelope. If you do not set this property to true, 3p endpoint will be fired. By default this property is undefined and 3p request will be fired.
            },
            storage: {
                type: 'html5',
                name: 'idl_env',
                expires: 30
            }
        }, {
            name: 'liveIntentId',
            params: {
                publisherId: '7798696' // Set an identifier of a publisher know to your systems
            },
            storage: {
                type: 'html5',
                name: '_li_pbid',
                expires: 60
            }
        }, {
            name: 'sharedId',
            params: {
                  syncTime: 60 // in seconds, default is 24 hours
               },
             storage: {
                type: 'html5',
                name: 'sharedid',
                expires: 28
             }
        }, {
            name: 'id5Id',
            params: {
                partner: 173,         // Set your real ID5 partner ID here for production, please ask for one at https://id5.io/universal-id
                pd: 'some-pd-string'  // See https://wiki.id5.io/x/BIAZ for details
            },
            storage: {
                type: 'html5',
                name: 'id5id',
                expires: 90,          // Expiration in days
                refreshInSeconds: 8*3600 // User Id cache lifetime in seconds, defaulting to 'expires'
            },
        }, {
                name: 'nextrollId',
                params: {
                    partnerId: "1009",         // Set your real NextRoll partner ID here for production
                }
        }, {
             name: 'criteo',
             storage: {              // It is best not to specify this parameter since the module needs to be called as many times as possible
                 type: 'html5',
                 name: '_criteoId',
                 expires: 1
             }
        },{
            name: "merkleId",
            params: {
                vendor:'sdfg',
                sv_cid:'dfg',
                sv_pubid:'xcv',
                sv_domain:'zxv'
            },
            storage: {
                type: "html5",
                name: "merkleId",
                expires: 30
            } 
        }, {
              name: 'admixerId',
              params: {
                  pid: "4D393FAC-B6BB-4E19-8396-0A4813607316", // example id
                  e: "3d400b57e069c993babea0bd9efa79e5dc698e16c042686569faae20391fd7ea", // example hashed email (sha256)
                  p: "05de6c07eb3ea4bce45adca4e0182e771d80fbb99e12401416ca84ddf94c3eb9" //example hashed phone (sha256)
              },
              storage: {
                  type: 'html5',
                  name: 'admixerId',
                  expires: 30
              }
       },{
              name: 'flocId',
               params: {
               token: "Registered token or default sharedid.org token" // Default sharedid.org token: "A3dHTSoNUMjjERBLlrvJSelNnwWUCwVQhZ5tNQ+sll7y+LkPPVZXtB77u2y7CweRIxiYaGwGXNlW1/dFp8VMEgIAAAB+eyJvcmlnaW4iOiJodHRwczovL3NoYXJlZGlkLm9yZzo0NDMiLCJmZWF0dXJlIjoiSW50ZXJlc3RDb2hvcnRBUEkiLCJleHBpcnkiOjE2MjYyMjA3OTksImlzU3ViZG9tYWluIjp0cnVlLCJpc1RoaXJkUGFydHkiOnRydWV9"
        }
        },{
            name: "deepintentId",
            storage: {
                type: "html5",
                name: "_dpes_id",
                expires: 90
            }
        },{
            name: "deepintentId",
            storage: {
                type: "cookie",
                name: "_dpes_id",
                expires: 90
            }
        }],
        syncDelay: 5000
    }
});
```

Example showing how to configure a `value` object to pass directly to bid adapters
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "pubCommonId",
            value: {
              "providedPubCommonId": "1234567890"
            }
        },
        {
            name: "id5Id",
            value: { "id5id": "ID5-abcdef" }
        },
        {
            name: "netId",
            value: { "netId": "fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg" }
        },
        {
            name: "criteo",
            value: { "criteoId": "wK-fkF8zaEIlMkZMbHl3eFo4NEtoNmZaeXJtYkFjZlVuWjBhcjJMaTRYd3pZNSUyQnlKRHNGRXlpdzdjd3pjVzhjcSUyQmY4eTFzN3VSZjV1ZyUyRlA0U2ZiR0UwN2I4bDZRJTNEJTNE" }
        },
        {
            name: "novatiq",
            value: { "snowflake": "81b001ec-8914-488c-a96e-8c220d4ee08895ef" }
        }],
        syncDelay: 5000
    }
});
```
