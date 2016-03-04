describe('wideorbit adapter tests', function () {

    var expect = require('chai').expect;
    var urlParse = require('url-parse');
    
    // FYI: querystringify will perform encoding/decoding
    var querystringify = require('querystringify');

    var adapter = require('src/adapters/wideorbit');
    var adLoader = require('src/adloader');

    describe('bidUrl', function () {

        var spyLoadScript;

        beforeEach(function () {
            spyLoadScript = sinon.spy(adLoader, 'loadScript');
        });

        afterEach(function () {
            spyLoadScript.restore();
        });

        it('should be called only once', function () {

            var params = {
                bidderCode: 'wideorbit',
                bids: [
                    {
                        bidder: 'wideorbit',
                        params: {
                            pbId: 1,
                            pId: 101
                        },
                        placementCode: 'div-gpt-ad-12345-1'
                    },
                    {
                        bidder: 'wideorbit',
                        params: {
                            pbId: 1,
                            site: 'Site 1',
                            page: 'Page 1',
                            width: 100,
                            height: 200,
                            subPublisher: 'Sub Publisher 1'
                        },
                        placementCode: 'div-gpt-ad-12345-2'
                    }
                ]
            };

            adapter().callBids(params);

            sinon.assert.calledOnce(spyLoadScript);

        });

        it('should fix parameters name', function () {

            var params = {
                bidderCode: 'wideorbit',
                bids: [
                    {
                        bidder: 'wideorbit',
                        params: {
                            PBiD: 1,
                            PID: 101
                        },
                        placementCode: 'div-gpt-ad-12345-1'
                    },
                    {
                        bidder: 'wideorbit',
                        params: {
                            pbid: 1,
                            SiTe: 'Site 1',
                            Page: 'Page 1',
                            widTH: 100,
                            HEIGHT: 200,
                            SUBPublisher: 'Sub Publisher 1'
                        },
                        placementCode: 'div-gpt-ad-12345-2'
                    }
                ]
            };

            adapter().callBids(params);

            var bidUrl = spyLoadScript.getCall(0).args[0];

            sinon.assert.calledWith(spyLoadScript, bidUrl);

            var parsedBidUrl = urlParse(bidUrl);
            var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

            expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
            expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
            expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
            expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
            expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
            expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
            expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
            expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
            expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
            expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.parent.pbjs.handleWideOrbitCallback');
            expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
            expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
            expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');

            expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
            expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('0');
            expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('');

            expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
            expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
            expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('');

            expect(parsedBidUrlQueryString).to.have.property('pId0').and.to.equal('101');
            expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');

            expect(parsedBidUrlQueryString).to.have.property('wsName1').and.to.equal('Site 1');
            expect(parsedBidUrlQueryString).to.have.property('wName1').and.to.equal('Page 1');
            expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('1');
            expect(parsedBidUrlQueryString).to.have.property('bfDim1').and.to.equal('100x200');
            expect(parsedBidUrlQueryString).to.have.property('subp1').and.to.equal('Sub Publisher 1');

        });

        describe('placement by name', function () {

            it('should be called with specific parameters for two bids', function () {

                var params = {
                    bidderCode: 'wideorbit',
                    bids: [
                        {
                            bidder: 'wideorbit',
                            params: {
                                pbId: 1,
                                site: 'Site 1',
                                page: 'Page 1',
                                width: 100,
                                height: 200,
                                subPublisher: 'Sub Publisher 1',
                                atf: true
                            },
                            placementCode: 'div-gpt-ad-12345-1'
                        },
                        {
                            bidder: 'wideorbit',
                            params: {
                                pbId: 1,
                                site: 'Site 2',
                                page: 'Page 2',
                                width: 200,
                                height: 300,
                                rank: 123,
                                ecpm: 1.8
                            },
                            placementCode: 'div-gpt-ad-12345-2'
                        }
                    ]
                };

                adapter().callBids(params);

                var bidUrl = spyLoadScript.getCall(0).args[0];

                sinon.assert.calledWith(spyLoadScript, bidUrl);

                var parsedBidUrl = urlParse(bidUrl);
                var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

                expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
                expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
                expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
                expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
                expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
                expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
                expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
                expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.parent.pbjs.handleWideOrbitCallback');
                expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
                expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');

                expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
                expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('1001');
                expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('');

                expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
                expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('1.8');

                expect(parsedBidUrlQueryString).to.have.property('wsName0').and.to.equal('Site 1');
                expect(parsedBidUrlQueryString).to.have.property('wName0').and.to.equal('Page 1');
                expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('bfDim0').and.to.equal('100x200');
                expect(parsedBidUrlQueryString).to.have.property('subp0').and.to.equal('Sub Publisher 1');

                expect(parsedBidUrlQueryString).to.have.property('wsName1').and.to.equal('Site 2');
                expect(parsedBidUrlQueryString).to.have.property('wName1').and.to.equal('Page 2');
                expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('123');
                expect(parsedBidUrlQueryString).to.have.property('bfDim1').and.to.equal('200x300');
                expect(parsedBidUrlQueryString).to.have.property('subp1').and.to.equal('');

            });

        });

        describe('placement by id', function () {

            it('should be called with specific parameters for two bids', function () {

                var params = {
                    bidderCode: 'wideorbit',
                    bids: [
                        {
                            bidder: 'wideorbit',
                            params: {
                                pbId: 1,
                                pId: 101,
                                atf: true,
                                ecpm: 0.8
                            },
                            placementCode: 'div-gpt-ad-12345-1'
                        },
                        {
                            bidder: 'wideorbit',
                            params: {
                                pbId: 1,
                                pId: 102,
                                rank: 123
                            },
                            placementCode: 'div-gpt-ad-12345-2'
                        }
                    ]
                };

                adapter().callBids(params);

                var bidUrl = spyLoadScript.getCall(0).args[0];

                sinon.assert.calledWith(spyLoadScript, bidUrl);

                var parsedBidUrl = urlParse(bidUrl);
                var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

                expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
                expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
                expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
                expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
                expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
                expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
                expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
                expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.parent.pbjs.handleWideOrbitCallback');
                expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
                expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');

                expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
                expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('1001');
                expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('0.8');

                expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
                expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
                expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('');

                expect(parsedBidUrlQueryString).to.have.property('pId0').and.to.equal('101');
                expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');

                expect(parsedBidUrlQueryString).to.have.property('pId1').and.to.equal('102');
                expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('123');

            });

        });

    });

});
  