import { expect } from 'chai';
import sinon from 'sinon';
import { getConnectionDownLink, getPageDescription, getPageTitle, getReferrerInfo } from 'libraries/pageInfosUtils/pageInfosUtils.js';

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
    let winMock;

    beforeEach(() => {
      winMock = {
        top: {
          document: {
            title: 'Top Document Title',
            querySelector: sinon.stub().returns(null)
          }
        },
        document: {
          querySelector: sinon.stub().returns(null)
        }
      }
    });

    it('should return the title from the top-level document', () => {
      const result = getPageTitle(winMock);
      expect(result).to.equal('Top Document Title');
    });

    it('should return the title from the current document if top-level document access fails', () => {
      winMock.top.document = {
        title: '',
        querySelector: sinon.stub().throws(new Error('Cross-origin restriction'))
      }
      winMock.document.querySelector = sinon.stub().returns({
        content: 'Current Document Title'
      })
      const result = getPageTitle(winMock);
      expect(result).to.equal('Current Document Title');
    });
  });

  describe('getPageDescription', () => {
    let winMock;

    beforeEach(() => {
      winMock = {
        top: {
          document: {
            querySelector: sinon.stub().returns(null)
          }
        },
        document: {
          querySelector: sinon.stub().returns(null)
        }
      }
    });

    it('should return the description from the top-level document', () => {
      winMock.top.document.querySelector.withArgs('meta[name="description"]').returns({ content: 'Top Document Description' });
      const result = getPageDescription(winMock);
      expect(result).to.equal('Top Document Description');
    });

    it('should return the description from the current document if top-level document access fails', () => {
      winMock.top.document.querySelector.throws(new Error('Cross-origin restriction'));
      winMock.document.querySelector.withArgs('meta[name="description"]').returns({ content: 'Current Document Description' });
      const result = getPageDescription(winMock);
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
