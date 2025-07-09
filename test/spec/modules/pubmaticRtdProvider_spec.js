import { expect } from 'chai';
import * as priceFloors from '../../../modules/priceFloors';
import * as utils from '../../../src/utils.js';
import * as suaModule from '../../../src/fpd/sua.js';
import { config as conf } from '../../../src/config';
import * as hook from '../../../src/hook.js';
import {
    registerSubModule, pubmaticSubmodule, getFloorsConfig, fetchData,
    getCurrentTimeOfDay, getBrowserType, getOs, getDeviceType, getCountry, getUtm, _country,
    _profileConfigs, _floorsData, defaultValueTemplate, withTimeout, configMerged
} from '../../../modules/pubmaticRtdProvider.js';
import sinon from 'sinon';

describe('Pubmatic RTD Provider', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(conf, 'getConfig').callsFake(() => {
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

    describe('getCurrentTimeOfDay', () => {
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
                const result = getCurrentTimeOfDay();
                expect(result).to.equal(expected);
            });
        });
    });

    describe('getBrowserType', () => {
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
            expect(getBrowserType()).to.equal('9');
        });

        it('should detect Firefox', () => {
            userAgentStub.value(USER_AGENTS.firefox);
            expect(getBrowserType()).to.equal('12');
        });

        it('should detect Edge', () => {
            userAgentStub.value(USER_AGENTS.edge);
            expect(getBrowserType()).to.equal('2');
        });

        it('should detect Internet Explorer', () => {
            userAgentStub.value(USER_AGENTS.ie);
            expect(getBrowserType()).to.equal('4');
        });

        it('should detect Opera', () => {
            userAgentStub.value(USER_AGENTS.opera);
            expect(getBrowserType()).to.equal('3');
        });

        it('should return 0 for unknown browser', () => {
            userAgentStub.value(USER_AGENTS.unknown);
            expect(getBrowserType()).to.equal('0');
        });

        it('should return -1 when userAgent is null', () => {
            userAgentStub.value(null);
            expect(getBrowserType()).to.equal('-1');
        });
    });

    describe('Utility functions', () => {
        it('should set browser correctly', () => {
            expect(getBrowserType()).to.be.a('string');
        });

        it('should set OS correctly', () => {
            expect(getOs()).to.be.a('string');
        });

        it('should set device type correctly', () => {
            expect(getDeviceType()).to.be.a('string');
        });

        it('should set time of day correctly', () => {
            expect(getCurrentTimeOfDay()).to.be.a('string');
        });

        it('should set country correctly', () => {
            expect(getCountry()).to.satisfy(value => typeof value === 'string' || value === undefined);
        });

        it('should set UTM correctly', () => {
            expect(getUtm()).to.be.a('string');
            expect(getUtm()).to.be.oneOf(['0', '1']);
        });
    });

    describe('getFloorsConfig', () => {
        let floorsData, profileConfigs;
        let sandbox;
        let logErrorStub;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            logErrorStub = sandbox.stub(utils, 'logError');
            floorsData = {
                "currency": "USD",
                "floorProvider": "PM",
                "floorsSchemaVersion": 2,
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
            };
            profileConfigs = {
                'plugins': {
                    'dynamicFloors': {
                        'enabled': true,
                        'config': {
                            'enforcement': {
                                'floorDeals': false,
                                'enforceJS': false
                            },
                            'floorMin': 0.1111,
                            'skipRate': 11,
                            'defaultValues': {
                                "*|*": 0.2
                            }
                        }
                    }
                }
            }
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should return correct config structure', () => {
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result.floors).to.be.an('object');
            expect(result.floors).to.be.an('object');
            expect(result.floors).to.have.property('enforcement');
            expect(result.floors.enforcement).to.have.property('floorDeals', false);
            expect(result.floors.enforcement).to.have.property('enforceJS', false);
            expect(result.floors).to.have.property('floorMin', 0.1111);

            // Verify the additionalSchemaFields structure
            expect(result.floors.additionalSchemaFields).to.have.all.keys([
                'deviceType',
                'timeOfDay',
                'browser',
                'os',
                'country',
                'utm'
            ]);

            Object.values(result.floors.additionalSchemaFields).forEach(field => {
                expect(field).to.be.a('function');
            });
        });

        it('should return undefined when plugin is disabled', () => {
            profileConfigs.plugins.dynamicFloors.enabled = false;
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result).to.equal(undefined);
        });

        it('should initialise default values to empty object when not available', () => {
            profileConfigs.plugins.dynamicFloors.config.defaultValues = undefined;
            floorsData = undefined;
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result.floors.data).to.have.property('currency', 'USD');
            expect(result.floors.data).to.have.property('skipRate', 11);
            expect(result.floors.data.schema).to.deep.equal(defaultValueTemplate.schema);
            expect(result.floors.data.value).to.deep.equal(defaultValueTemplate.value);
        });

        it('should replace skipRate from config to data when avaialble', () => {
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result.floors.data).to.have.property('skipRate', 11);
        });

        it('should not replace skipRate from config to data when not avaialble', () => {
            delete profileConfigs.plugins.dynamicFloors.config.skipRate;
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result.floors.data).to.have.property('skipRate', 0);
        });

        it('should maintain correct function references', () => {
            const result = getFloorsConfig(floorsData, profileConfigs);

            expect(result.floors.additionalSchemaFields.deviceType).to.equal(getDeviceType);
            expect(result.floors.additionalSchemaFields.timeOfDay).to.equal(getCurrentTimeOfDay);
            expect(result.floors.additionalSchemaFields.browser).to.equal(getBrowserType);
            expect(result.floors.additionalSchemaFields.os).to.equal(getOs);
            expect(result.floors.additionalSchemaFields.country).to.equal(getCountry);
            expect(result.floors.additionalSchemaFields.utm).to.equal(getUtm);
        });

        it('should log error when profileConfigs is not an object', () => {
            profileConfigs = 'invalid';
            const result = getFloorsConfig(floorsData, profileConfigs);
            expect(result).to.be.undefined;
            expect(logErrorStub.calledWith(sinon.match(/profileConfigs is not an object or is empty/))).to.be.true;
        });
    });

    describe('fetchData for configs', () => {
        let logErrorStub;
        let fetchStub;
        let confStub;

        beforeEach(() => {
            logErrorStub = sandbox.stub(utils, 'logError');
            fetchStub = sandbox.stub(window, 'fetch');
            confStub = sandbox.stub(conf, 'setConfig');
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should successfully fetch profile configs', async () => {
            const mockApiResponse = {
                "profileName": "profie name",
                "desc": "description",
                "plugins": {
                    "dynamicFloors": {
                        "enabled": false
                    }
                }
            };

            fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200 }));

            const result = await fetchData('1234', '123', 'CONFIGS');
            expect(result).to.deep.equal(mockApiResponse);
        });

        it('should log error when JSON parsing fails', async () => {
            fetchStub.resolves(new Response('Invalid JSON', { status: 200 }));

            await fetchData('1234', '123', 'CONFIGS');
            expect(logErrorStub.called).to.be.true;
            expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching CONFIGS:');
        });

        it('should log error when response is not ok', async () => {
            fetchStub.resolves(new Response(null, { status: 500 }));

            await fetchData('1234', '123', 'CONFIGS');
            expect(logErrorStub.calledWith(sinon.match(/Error while fetching CONFIGS: Not ok/))).to.be.true;
        });

        it('should log error on network failure', async () => {
            fetchStub.rejects(new Error('Network Error'));

            await fetchData('1234', '123', 'CONFIGS');
            expect(logErrorStub.called).to.be.true;
            expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching CONFIGS');
        });
    });

    describe('fetchData for floors', () => {
        let logErrorStub;
        let fetchStub;
        let confStub;

        beforeEach(() => {
            logErrorStub = sandbox.stub(utils, 'logError');
            fetchStub = sandbox.stub(window, 'fetch');
            confStub = sandbox.stub(conf, 'setConfig');
            global._country = undefined;
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should successfully fetch and parse floor rules', async () => {
            const mockApiResponse = {
                data: {
                    currency: 'USD',
                    modelGroups: [],
                    values: {}
                }
            };

            fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200, headers: { 'country_code': 'US' } }));

            const result = await fetchData('1234', '123', 'FLOORS');
            expect(result).to.deep.equal(mockApiResponse);
            expect(_country).to.equal('US');
        });

        it('should correctly extract the first unique country code from response headers', async () => {
            fetchStub.resolves(new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'country_code': 'US,IN,US' }
            }));

            await fetchData('1234', '123', 'FLOORS');
            expect(_country).to.equal('US');
        });

        it('should set _country to undefined if country_code header is missing', async () => {
            fetchStub.resolves(new Response(JSON.stringify({}), {
                status: 200
            }));

            await fetchData('1234', '123', 'FLOORS');
            expect(_country).to.be.undefined;
        });

        it('should log error when JSON parsing fails', async () => {
            fetchStub.resolves(new Response('Invalid JSON', { status: 200 }));

            await fetchData('1234', '123', 'FLOORS');
            expect(logErrorStub.called).to.be.true;
            expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching FLOORS');
        });

        it('should log error when response is not ok', async () => {
            fetchStub.resolves(new Response(null, { status: 500 }));

            await fetchData('1234', '123', 'FLOORS');
            expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching FLOORS');
        });

        it('should log error on network failure', async () => {
            fetchStub.rejects(new Error('Network Error'));

            await fetchData('1234', '123', 'FLOORS');
            expect(logErrorStub.called).to.be.true;
            expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching FLOORS');
        });
    });

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
    
            global.configMergedPromise = Promise.resolve();
        });
    
        afterEach(() => {
            sandbox.restore(); // Restore all stubs/spies
        });
    
        it('should call continueAuction with correct hookConfig', async function () {
            configMerged();
            await pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);
    
            expect(continueAuctionStub.called).to.be.true;
            expect(continueAuctionStub.firstCall.args[0]).to.have.property('reqBidsConfigObj', reqBidsConfigObj);
            expect(continueAuctionStub.firstCall.args[0]).to.have.property('haveExited', false);
        });

        // it('should merge country data into ortb2Fragments.bidder', async function () {
        //     configMerged();
        //     global._country = 'US';
        //     pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);
    
        //     expect(reqBidsConfigObj.ortb2Fragments.bidder).to.have.property('pubmatic');
        //     // expect(reqBidsConfigObj.ortb2Fragments.bidder.pubmatic.user.ext.ctr).to.equal('US');
        // });
    
        it('should call callback once after execution', async function () {
            configMerged();
            await pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);
    
            expect(callback.called).to.be.true;
        });
    });        

    describe('withTimeout', function () {
        it('should resolve with the original promise value if it resolves before the timeout', async function () {
            const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 50));
            const result = await withTimeout(promise, 100);
            expect(result).to.equal('success');
        });

        it('should resolve with undefined if the promise takes longer than the timeout', async function () {
            const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 200));
            const result = await withTimeout(promise, 100);
            expect(result).to.be.undefined;
        });

        it('should properly handle rejected promises', async function () {
            const promise = new Promise((resolve, reject) => setTimeout(() => reject(new Error('Failure')), 50));
            try {
                await withTimeout(promise, 100);
            } catch (error) {
                expect(error.message).to.equal('Failure');
            }
        });

        it('should resolve with undefined if the original promise is rejected but times out first', async function () {
            const promise = new Promise((resolve, reject) => setTimeout(() => reject(new Error('Failure')), 200));
            const result = await withTimeout(promise, 100);
            expect(result).to.be.undefined;
        });

        it('should clear the timeout when the promise resolves before the timeout', async function () {
            const clock = sinon.useFakeTimers();
            const clearTimeoutSpy = sinon.spy(global, 'clearTimeout');

            const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 50));
            const resultPromise = withTimeout(promise, 100);
            
            clock.tick(50);
            await resultPromise;
            
            expect(clearTimeoutSpy.called).to.be.true;
            
            clearTimeoutSpy.restore();
            clock.restore();
        });
    });
});
