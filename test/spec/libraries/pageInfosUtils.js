import { expect } from 'chai';
import sinon from 'sinon';
import { getReferrerInfo, getPageTitle, getPageDescription, getConnectionDownLink } from './pageInfosUtils';

describe('pageInfosUtils', () => {
  describe('getReferrerInfo', () => {
    it('should return the referrer URL if available', () => {
      const bidderRequest = {
        refererInfo: {
          page: 'http://example.com'
        }
      };
      const result = getReferrerInfo(bidderRequest);
      expect(result).to.equal('http://example.com');
    });

    it('should return an empty string if referrer URL is not available', () => {
      const bidderRequest = {};
      const result = getReferrerInfo(bidderRequest);
      expect(result).to.equal('');
    });
  });

  describe('getPageTitle', () => {
    let topDocumentStub, documentStub;

    beforeEach(() => {
      topDocumentStub = sinon.stub(window.top, 'document').value({
        title: 'Top Document Title',
        querySelector: sinon.stub().returns(null)
      });
      documentStub = sinon.stub(document, 'querySelector').returns(null);
    });

    afterEach(() => {
      topDocumentStub.restore();
      documentStub.restore();
    });

    it('should return the title from the top-level document', () => {
      const result = getPageTitle();
      expect(result).to.equal('Top Document Title');
    });

    it('should return the title from the current document if top-level document access fails', () => {
      topDocumentStub.value({
        title: '',
        querySelector: sinon.stub().throws(new Error('Cross-origin restriction'))
      });
      documentStub.returns({ content: 'Current Document Title' });
      const result = getPageTitle();
      expect(result).to.equal('Current Document Title');
    });
  });

  describe('getPageDescription', () => {
    let topDocumentStub, documentStub;

    beforeEach(() => {
      topDocumentStub = sinon.stub(window.top, 'document').value({
        querySelector: sinon.stub().returns(null)
      });
      documentStub = sinon.stub(document, 'querySelector').returns(null);
    });

    afterEach(() => {
      topDocumentStub.restore();
      documentStub.restore();
    });

    it('should return the description from the top-level document', () => {
      topDocumentStub.querySelector.withArgs('meta[name="description"]').returns({ content: 'Top Document Description' });
      const result = getPageDescription();
      expect(result).to.equal('Top Document Description');
    });

    it('should return the description from the current document if top-level document access fails', () => {
      topDocumentStub.querySelector.throws(new Error('Cross-origin restriction'));
      documentStub.withArgs('meta[name="description"]').returns({ content: 'Current Document Description' });
      const result = getPageDescription();
      expect(result).to.equal('Current Document Description');
    });
  });

  describe('getConnectionDownLink', () => {
    it('should return the downlink speed if available', () => {
      const nav = {
        connection: {
          downlink: 10
        }
      };
      const result = getConnectionDownLink(nav);
      expect(result).to.equal('10');
    });

    it('should return an empty string if downlink speed is not available', () => {
      const nav = {};
      const result = getConnectionDownLink(nav);
      expect(result).to.equal('');
    });
  });
});
