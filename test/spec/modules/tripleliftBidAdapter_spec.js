    it('should not reuse GDPR consent from a previous auction', function() {
      const consentedRequest = {
        ...bidderRequest,
        gdprConsent: {
          gdprApplies: true,
          consentString: GDPR_CONSENT_STR
        }
      };

      const firstUrl = spec.buildRequests(bidRequests, consentedRequest)[0].url;
      expect(firstUrl).to.contain('gdpr=true');
      expect(firstUrl).to.contain('cmp_cs=' + GDPR_CONSENT_STR);

      const secondRequest = { ...bidderRequest };
      delete secondRequest.gdprConsent;
      const secondUrl = spec.buildRequests(bidRequests, secondRequest)[0].url;
      expect(secondUrl).not.to.match(/(?:\?|&)gdpr=/);
      expect(secondUrl).not.to.match(/(?:\?|&)cmp_cs=/);

      const sync = spec.getUserSyncs({ iframeEnabled: true })[0];
      expect(sync.url).not.to.match(/(?:\?|&)gdpr=/);
      expect(sync.url).not.to.match(/(?:\?|&)cmp_cs=/);
    });

    it('should return us_privacy param when CCPA info is available', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const url = request.url;
      expect(url).to.match(/(\?|&)us_privacy=1YYY/);
    });

    it('should return coppa param when COPPA config is set to true', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      config.getConfig.restore();