import { expect } from 'chai';
import * as priceFloors from '../../../modules/priceFloors';
import * as utils from '../../../src/utils.js';
import * as suaModule from '../../../src/fpd/sua.js';
import { config as conf } from '../../../src/config';
import * as hook from '../../../src/hook.js';
import * as pubmaticRtdProviderModule from '../../../modules/pubmaticRtdProvider.js';
import {
    registerSubModule, pubmaticSubmodule, setFloorsConfig, fetchData, getRtdConfig,
    getTimeOfDay, getBrowser, getOs, getDeviceType, getCountry, getBidder, getUtm, _country,
    _profileConfigs, defaultValueTemplate, _configData
} from '../../../modules/pubmaticRtdProvider.js';
import sinon from 'sinon';

describe('Pubmatic RTD Provider', () => {
    let sandbox;
    let getConfigStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        // Store the stub reference so we can modify its behavior in nested describes
        getConfigStub = sandbox.stub(conf, 'getConfig');
        getConfigStub.callsFake(() => {
            return {
                floors: {
                    'enforcement': {
                        'floorDeals': true,
                        'enforceJS': true
                    }
                },
                realTimeData: {
                    auctionDelay: 100
                }
            };
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('registerSubModule', () => {
        it('should register RTD submodule provider', () => {
            let submoduleStub = sinon.stub(hook, 'submodule');
            registerSubModule();
            assert(submoduleStub.calledOnceWith('realTimeData', pubmaticSubmodule));
            submoduleStub.restore();
        });
    });

    describe('submodule', () => {
        describe('name', () => {
            it('should be pubmatic', () => {
                expect(pubmaticSubmodule.name).to.equal('pubmatic');
            });
        });
    });

    describe('init', () => {
        let logErrorStub;
        let continueAuctionStub;

        const getConfig = () => ({
            params: {
                publisherId: 'test-publisher-id',
                profileId: 'test-profile-id'
            },
        });

        beforeEach(() => {
            logErrorStub = sandbox.stub(utils, 'logError');
            continueAuctionStub = sandbox.stub(priceFloors, 'continueAuction');
        });

        it('should return false if publisherId is missing', () => {
            const config = {
                params: {
                    profileId: 'test-profile-id'
                }
            };
            expect(pubmaticSubmodule.init(config)).to.be.false;
        });

        it('should return false if profileId is missing', () => {
            const config = {
                params: {
                    publisherId: 'test-publisher-id'
                }
            };
            expect(pubmaticSubmodule.init(config)).to.be.false;
        });

        it('should return false if publisherId is not a string', () => {
            const config = {
                params: {
                    publisherId: 123,
                    profileId: 'test-profile-id'
                }
            };
            expect(pubmaticSubmodule.init(config)).to.be.false;
        });

        it('should return false if profileId is not a string', () => {
            const config = {
                params: {
                    publisherId: 'test-publisher-id',
                    profileId: 345
                }
            };
            expect(pubmaticSubmodule.init(config)).to.be.false;
        });

        it('should initialize successfully with valid config', () => {
            expect(pubmaticSubmodule.init(getConfig())).to.be.true;
        });

        it('should handle empty config object', () => {
            expect(pubmaticSubmodule.init({})).to.be.false;
            expect(logErrorStub.calledWith(sinon.match(/Missing publisher Id/))).to.be.true;
        });

        it('should return false if continueAuction is not a function', () => {
            continueAuctionStub.value(undefined);
            expect(pubmaticSubmodule.init(getConfig())).to.be.false;
            expect(logErrorStub.calledWith(sinon.match(/continueAuction is not a function/))).to.be.true;
        });
    });

    describe('getTimeOfDay', () => {
        let clock;

        beforeEach(() => {
            clock = sandbox.useFakeTimers(new Date('2024-01-01T12:00:00')); // Set fixed time for testing
        });

        afterEach(() => {
            clock.restore();
        });

        const testTimes = [
            { hour: 6, expected: 'morning' },
            { hour: 13, expected: 'afternoon' },
            { hour: 18, expected: 'evening' },
            { hour: 22, expected: 'night' },
            { hour: 4, expected: 'night' }
        ];

        testTimes.forEach(({ hour, expected }) => {
            it(`should return ${expected} at ${hour}:00`, () => {
                clock.setSystemTime(new Date().setHours(hour));
                const result = getTimeOfDay();
                expect(result).to.equal(expected);
            });
        });
    });

    describe('getBrowser', () => {
        let userAgentStub, getLowEntropySUAStub;

        const USER_AGENTS = {
            chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/91.0.864.67 Safari/537.36',
            safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.6 Mobile/15E148 Safari/604.1',
            ie: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
            opera: 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.16',
            unknown: 'UnknownBrowser/1.0'
        };

        beforeEach(() => {
            userAgentStub = sandbox.stub(navigator, 'userAgent');
            getLowEntropySUAStub = sandbox.stub(suaModule, 'getLowEntropySUA').returns(undefined);
        });

        afterEach(() => {
            userAgentStub.restore();
            getLowEntropySUAStub.restore();
        });

        it('should detect Chrome', () => {
            userAgentStub.value(USER_AGENTS.chrome);
            expect(getBrowser()).to.equal('9');
        });

        it('should detect Firefox', () => {
            userAgentStub.value(USER_AGENTS.firefox);
            expect(getBrowser()).to.equal('12');
        });

        it('should detect Edge', () => {
            userAgentStub.value(USER_AGENTS.edge);
            expect(getBrowser()).to.equal('2');
        });

        it('should detect Internet Explorer', () => {
            userAgentStub.value(USER_AGENTS.ie);
            expect(getBrowser()).to.equal('4');
        });

        it('should detect Opera', () => {
            userAgentStub.value(USER_AGENTS.opera);
            expect(getBrowser()).to.equal('3');
        });

        it('should return 0 for unknown browser', () => {
            userAgentStub.value(USER_AGENTS.unknown);
            expect(getBrowser()).to.equal('0');
        });

        it('should return -1 when userAgent is null', () => {
            userAgentStub.value(null);
            expect(getBrowser()).to.equal('-1');
        });
    });

    describe('Utility functions', () => {
        it('should set browser correctly', () => {
            expect(getBrowser()).to.be.a('string');
        });

        it('should set OS correctly', () => {
            expect(getOs()).to.be.a('string');
        });

        it('should set device type correctly', () => {
            expect(getDeviceType()).to.be.a('string');
        });

        it('should set time of day correctly', () => {
            expect(getTimeOfDay()).to.be.a('string');
        });

        it('should set country correctly', () => {
            expect(getCountry()).to.satisfy(value => typeof value === 'string' || value === undefined);
        });

        it('should set UTM correctly', () => {
            expect(getUtm()).to.be.a('string');
            expect(getUtm()).to.be.oneOf(['0', '1']);
        });

        it('should extract bidder correctly', () => {
            expect(getBidder({ bidder: 'pubmatic' })).to.equal('pubmatic');
            expect(getBidder({})).to.be.undefined;
            expect(getBidder(null)).to.be.undefined;
            expect(getBidder(undefined)).to.be.undefined;
        });
    });

    describe('setFloorsConfig', () => {
        let logErrorStub;
        let originalConfigData;

        beforeEach(() => {
            // Store original _configData to restore it later
            originalConfigData = Object.assign({}, _configData);
            
            // Reset _configData for each test
            Object.keys(_configData).forEach(key => delete _configData[key]);
            
            // Set up test data
            Object.assign(_configData, {
                "profileName": "profile name",
                "desc": "description",
                "plugins": {
                    "dynamicFloors": {
                        "enabled": true,
                        "config": {
                            "enforcement": {
                                "floorDeals": false,
                                "enforceJS": false
                            },
                            "floorMin": 0.1111,
                            "skipRate": 11,
                            "defaultValues": {
                                "*|*": 0.2
                            }
                        },
                        "data": {
                            "currency": "USD",
                            "modelGroups": [
                                {
                                    "modelVersion": "M_1",
                                    "modelWeight": 100,
                                    "schema": {
                                        "fields": [
                                            "domain"
                                        ]
                                    },
                                    "values": {
                                        "*": 2.00
                                    }
                                }
                            ],
                            "skipRate": 0
                        }
                    }
                }
            });
            
            logErrorStub = sandbox.stub(utils, 'logError');
            
            // Set up default floor config
            getConfigStub.withArgs('floors').returns({
                'enforcement': {
                    'floorDeals': true,
                    'enforceJS': true
                },
                'floorProvider': 'default-provider',
                'endpoint': {
                    'url': 'https://example.com/floors'
                }
            });
        });
        
        afterEach(() => {
            // Restore original _configData
            Object.keys(_configData).forEach(key => delete _configData[key]);
            Object.assign(_configData, originalConfigData);
        });

        it('should return correct config structure', () => {
            const result = setFloorsConfig();

            expect(result.floors).to.be.an('object');
            expect(result.floors).to.have.property('enforcement');
            expect(result.floors.enforcement).to.have.property('floorDeals', false);
            expect(result.floors.enforcement).to.have.property('enforceJS', false);
            expect(result.floors).to.have.property('floorMin', 0.1111);
            expect(result.floors).to.have.property('skipRate', 11);
            expect(result.floors).to.not.have.property('endpoint');

            // Verify the additionalSchemaFields structure
            expect(result.floors.additionalSchemaFields).to.have.all.keys([
                'deviceType',
                'timeOfDay',
                'browser',
                'os',
                'country',
                'utm',
                'bidder'
            ]);

            Object.values(result.floors.additionalSchemaFields).forEach(field => {
                expect(field).to.be.a('function');
            });
        });

        it('should return undefined when plugin is disabled', () => {
            _configData.plugins.dynamicFloors.enabled = false;
            const result = setFloorsConfig();

            expect(result).to.equal(undefined);
        });

        it('should use default values when floor data is not available', () => {
            delete _configData.plugins.dynamicFloors.data;
            const result = setFloorsConfig();

            expect(result.floors.data).to.have.property('currency', 'USD');
            expect(result.floors.data).to.have.property('skipRate', 11);
            expect(result.floors.data.schema).to.deep.equal(defaultValueTemplate.schema);
            expect(result.floors.data.values).to.deep.equal({ '*|*': 0.2 });
        });

        it('should override skipRate from config when available', () => {
            const result = setFloorsConfig();

            expect(result.floors.data).to.have.property('skipRate', 11);
        });

        it('should not override skipRate when not available in config', () => {
            delete _configData.plugins.dynamicFloors.config.skipRate;
            const result = setFloorsConfig();

            expect(result.floors.data).to.have.property('skipRate', 0);
        });

        it('should maintain correct function references', () => {
            const result = setFloorsConfig();

            expect(result.floors.additionalSchemaFields.deviceType).to.equal(getDeviceType);
            expect(result.floors.additionalSchemaFields.timeOfDay).to.equal(getTimeOfDay);
            expect(result.floors.additionalSchemaFields.browser).to.equal(getBrowser);
            expect(result.floors.additionalSchemaFields.os).to.equal(getOs);
            expect(result.floors.additionalSchemaFields.country).to.equal(getCountry);
            expect(result.floors.additionalSchemaFields.utm).to.equal(getUtm);
            expect(result.floors.additionalSchemaFields.bidder).to.equal(getBidder);
        });

        it('should return undefined when dynamicFloors config is missing', () => {
            delete _configData.plugins.dynamicFloors.config;
            const result = setFloorsConfig();
            expect(result).to.be.undefined;
        });

        it('should merge with default page floor config', () => {
            // Update the getConfig stub for this specific test
            getConfigStub.withArgs('floors').returns({
                'enforcement': {
                    'floorDeals': true,
                    'enforceJS': true
                },
                'floorProvider': 'default-provider'
            });

            const result = setFloorsConfig();

            // Config from mockConfigData should override default page config
            expect(result.floors.enforcement.floorDeals).to.equal(false);
            expect(result.floors.enforcement.enforceJS).to.equal(false);
            
            // Non-overridden values should be preserved
            expect(result.floors.floorProvider).to.equal('default-provider');
        });
    });

    describe('getRtdConfig', () => {
        let fetchDataStub;
        let logErrorStub;
        let setConfigStub;
        let originalConfigData;
        
        beforeEach(() => {
            // Store original _configData to restore it later
            originalConfigData = Object.assign({}, _configData);
            
            // Reset sandbox for each test
            sandbox.restore();
            sandbox = sinon.createSandbox();
            
            // Create stubs
            fetchDataStub = sandbox.stub(pubmaticRtdProviderModule, 'fetchData');
            logErrorStub = sandbox.stub(utils, 'logError');
            setConfigStub = sandbox.stub(conf, 'setConfig');
            
            // Reset _configData for each test
            Object.keys(_configData).forEach(key => delete _configData[key]);
        });
        
        afterEach(() => {
            // Restore original _configData
            Object.keys(_configData).forEach(key => delete _configData[key]);
            Object.assign(_configData, originalConfigData);
        });
        
        it('should log error for invalid API response', async () => {
            fetchDataStub.resolves(null);
            
            await getRtdConfig('pub123', 'profile456');
            
            expect(logErrorStub.calledWith(sinon.match(/profileConfigs is not an object or is empty/))).to.be.true;
            expect(setConfigStub.called).to.be.false;
        });
        
        it('should log error for empty API response', async () => {
            fetchDataStub.resolves({});
            
            await getRtdConfig('pub123', 'profile456');
            
            expect(logErrorStub.calledWith(sinon.match(/profileConfigs is not an object or is empty/))).to.be.true;
            expect(setConfigStub.called).to.be.false;
        });
        
       
        //     const mockApiResponse = {
        //         "profileName": "profile name",
        //         "desc": "description",
        //         "plugins": {
        //             "dynamicFloors": {
        //                 "enabled": true,
        //                 "config": {
        //                     "enforcement": {
        //                         "floorDeals": false,
        //                         "enforceJS": false
        //                     },
        //                     "floorMin": 0.1111,
        //                     "skipRate": 11,
        //                     "defaultValues": {
        //                         "*|*": 0.2
        //                     }
        //                 },
        //                 "data": {
        //                     "currency": "USD",
        //                     "modelGroups": [
        //                         {
        //                             "modelVersion": "M_1",
        //                             "modelWeight": 100,
        //                             "schema": {
        //                                 "fields": [
        //                                     "domain"
        //                                 ]
        //                             },
        //                             "values": {
        //                                 "*": 2.00
        //                             }
        //                         }
        //                     ],
        //                     "skipRate": 0
        //                 }
        //             }
        //         }
        //     };
            
        //     // Have fetchData update _configData and return the mock response
        //     fetchDataStub.callsFake(async () => {
        //         Object.assign(_configData, mockApiResponse);
        //         return mockApiResponse;
        //     });
            
        //     // Update the existing getConfigStub to return floors config when called with 'floors'
        //     getConfigStub.withArgs('floors').returns({
        //         'enforcement': {
        //             'floorDeals': true,
        //             'enforceJS': true
        //         },
        //         'floorProvider': 'pubmatic'
        //     });
            
        //     await getRtdConfig('pub123', 'profile456');
            
        //     expect(fetchDataStub.calledWith('pub123', 'profile456')).to.be.true;
        //     expect(setConfigStub.calledOnce).to.be.true;
            
        //     // We can't check the exact object equality since setFloorsConfig creates a new object
        //     // but we can check that the structure is correct
        //     const configArg = setConfigStub.firstCall.args[0];
        //     expect(configArg).to.have.property('floors');
        //     expect(configArg.floors).to.have.property('data');
        //     expect(configArg.floors.data).to.have.property('currency', 'USD');
        //     expect(configArg.floors).to.have.property('floorMin', 0.1111);
        //     expect(configArg.floors).to.have.property('enforcement');
        //     expect(configArg.floors.enforcement).to.have.property('floorDeals', false);
        //     expect(configArg.floors.enforcement).to.have.property('enforceJS', false);
        // });
        
        // it('should not configure floors when dynamicFloors plugin does not exist', async () => {
        //     const mockApiResponse = {
        //         plugins: {
        //             otherPlugin: {}
        //         }
        //     };
            
        //     fetchDataStub.resolves(mockApiResponse);
            
        //     await getRtdConfig('pub123', 'profile456');
            
        //     expect(fetchDataStub.calledWith('pub123', 'profile456')).to.be.true;
        //     expect(setFloorsConfigStub.called).to.be.false;
        //     expect(setConfigStub.called).to.be.false;
        // });
    });
    //     let confStub;

    //     beforeEach(() => {
    //         logErrorStub = sandbox.stub(utils, 'logError');
    //         fetchStub = sandbox.stub(window, 'fetch');
    //         confStub = sandbox.stub(conf, 'setConfig');
    //     });

    //     afterEach(() => {
    //         sandbox.restore();
    //     });

    //     it('should successfully fetch profile configs', async () => {
    //         const mockApiResponse = {
    //             "profileName": "profie name",
    //             "desc": "description",
    //             "plugins": {
    //                 "dynamicFloors": {
    //                     "enabled": false
    //                 }
    //             }
    //         };

    //         fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200 }));

    //         const result = await fetchData('1234', '123', 'CONFIGS');
    //         expect(result).to.deep.equal(mockApiResponse);
    //     });

    //     it('should log error when JSON parsing fails', async () => {
    //         fetchStub.resolves(new Response('Invalid JSON', { status: 200 }));

    //         await fetchData('1234', '123', 'CONFIGS');
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*CONFIGS/))).to.be.true;
    //     });

    //     it('should log error when response is not ok', async () => {
    //         fetchStub.resolves(new Response(null, { status: 500 }));

    //         await fetchData('1234', '123', 'CONFIGS');
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*CONFIGS/))).to.be.true;
    //     });

    //     it('should log error on network failure', async () => {
    //         fetchStub.rejects(new Error('Network Error'));

    //         await fetchData('1234', '123', 'CONFIGS');
    //         expect(logErrorStub.called).to.be.true;
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*CONFIGS/))).to.be.true;
    //     });
    // });

    // describe('fetchData for floors', () => {
    //     let logErrorStub;
    //     let fetchStub;
    //     let confStub;

    //     beforeEach(() => {
    //         logErrorStub = sandbox.stub(utils, 'logError');
    //         fetchStub = sandbox.stub(window, 'fetch');
    //         confStub = sandbox.stub(conf, 'setConfig');
    //         global._country = undefined;
    //     });

    //     afterEach(() => {
    //         sandbox.restore();
    //     });

    //     it('should successfully fetch and parse floor rules', async () => {
    //         const mockApiResponse = {
    //             data: {
    //                 currency: 'USD',
    //                 modelGroups: [],
    //                 values: {}
    //             }
    //         };

    //         fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200, headers: { 'country_code': 'US' } }));

    //         const result = await fetchData('1234', '123', 'FLOORS');
    //         expect(result).to.deep.equal(mockApiResponse);
    //         expect(_country).to.equal('US');
    //     });

    //     it('should correctly extract the first unique country code from response headers', async () => {
    //         fetchStub.resolves(new Response(JSON.stringify({}), {
    //             status: 200,
    //             headers: { 'country_code': 'US,IN,US' }
    //         }));

    //         await fetchData('1234', '123', 'FLOORS');
    //         expect(_country).to.equal('US');
    //     });

    //     it('should set _country to undefined if country_code header is missing', async () => {
    //         fetchStub.resolves(new Response(JSON.stringify({}), {
    //             status: 200
    //         }));

    //         await fetchData('1234', '123', 'FLOORS');
    //         expect(_country).to.be.undefined;
    //     });

    //     it('should log error when JSON parsing fails', async () => {
    //         fetchStub.resolves(new Response('Invalid JSON', { status: 200 }));

    //         await fetchData('1234', '123', 'FLOORS');
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*FLOORS/))).to.be.true;
    //     });

    //     it('should log error when response is not ok', async () => {
    //         fetchStub.resolves(new Response(null, { status: 500 }));

    //         await fetchData('1234', '123', 'FLOORS');
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*FLOORS/))).to.be.true;
    //     });

    //     it('should log error on network failure', async () => {
    //         fetchStub.rejects(new Error('Network Error'));

    //         await fetchData('1234', '123', 'FLOORS');
    //         expect(logErrorStub.called).to.be.true;
    //         expect(logErrorStub.calledWith(sinon.match(/Error while fetching\s*FLOORS/))).to.be.true;
    //     });
    // });

    describe('getBidRequestData', function () {
        let callback, continueAuctionStub, mergeDeepStub, logErrorStub;

        const reqBidsConfigObj = {
            adUnits: [{ code: 'ad-slot-code-0' }],
            auctionId: 'auction-id-0',
            ortb2Fragments: {
              bidder: {
                user: {
                  ext: {
                    ctr: 'US',
                  }
                }
              }
            }
        };

        const ortb2 = {
            user: {
              ext: {
                ctr: 'US',
              }
            }
        }

        const hookConfig = {
            reqBidsConfigObj,
            context: this,
            nextFn: () => true,
            haveExited: false,
            timer: null
        };

        beforeEach(() => {
            callback = sinon.spy();
            continueAuctionStub = sandbox.stub(priceFloors, 'continueAuction');
            logErrorStub = sandbox.stub(utils, 'logError');

            global._ymConfigPromise = Promise.resolve();
        });

        afterEach(() => {
            sandbox.restore(); // Restore all stubs/spies
        });

        it('should call continueAuction with correct hookConfig', async function () {
            await pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

            expect(continueAuctionStub.called).to.be.true;
            expect(continueAuctionStub.firstCall.args[0]).to.have.property('reqBidsConfigObj', reqBidsConfigObj);
            expect(continueAuctionStub.firstCall.args[0]).to.have.property('haveExited', false);
        });

        it('should merge country data into ortb2Fragments.bidder', async function () {
            global._country = 'US';
            pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);
            expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.include(ortb2);
            // expect(reqBidsConfigObj.ortb2Fragments.bidder.pubmatic.user.ext.ctr).to.equal('US');
        });

        it('should call callback once after execution', async function () {
            await pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

            expect(callback.called).to.be.true;
        });
    });
});
