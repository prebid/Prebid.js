import {expect} from 'chai/index.js';
import {findRootDomain, coreStorage} from 'src/fpd/rootDomain.js';

describe('findRootDomain', function () {
  let sandbox, cookies, rejectDomain;

  beforeEach(function () {
    findRootDomain.clear();
    cookies = {};
    rejectDomain = '';
    sandbox = sinon.createSandbox();
    sandbox.stub(coreStorage, 'cookiesAreEnabled').returns(true);
    sandbox.stub(coreStorage, 'setCookie').callsFake((cookie, value, expiration, sameSite, domain) => {
      if (rejectDomain !== domain) {
        if (new Date(expiration) <= Date.now()) {
          delete cookies[cookie];
        } else {
          cookies[cookie] = value;
        }
      }
    })
    sandbox.stub(coreStorage, 'getCookie').callsFake((cookie) => {
      return cookies[cookie]
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  after(() => {
    findRootDomain.clear();
  })

  it('should just find the root domain', function () {
    rejectDomain = 'co.uk';
    var domain = findRootDomain('sub.realdomain.co.uk');
    expect(domain).to.be.eq('realdomain.co.uk');
    expect(cookies).to.eql({});
  });

  it('should find the full domain when no subdomain is present', function () {
    rejectDomain = 'co.uk';
    var domain = findRootDomain('realdomain.co.uk');
    expect(domain).to.be.eq('realdomain.co.uk');
    expect(cookies).to.eql({});
  });

  it('should return domain as-is if cookies are disabled', () => {
    coreStorage.cookiesAreEnabled.returns(false);
    expect(findRootDomain('sub.example.com')).to.eql('sub.example.com');
    sinon.assert.notCalled(coreStorage.setCookie);
  });

  it('should memoize default value', () => {
    const domain = findRootDomain();
    expect(domain.length > 0).to.be.true;
    expect(findRootDomain()).to.eql(domain);
    sinon.assert.calledOnce(coreStorage.getCookie);
  });
});
