import {domainOverrideToRootDomain} from 'libraries/domainOverrideToRootDomain/index.js';
import {getStorageManager} from 'src/storageManager.js';
import {MODULE_TYPE_UID} from '../../../../src/activities/modules';

const storage = getStorageManager({ moduleName: 'test', moduleType: MODULE_TYPE_UID });
const domainOverride = domainOverrideToRootDomain(storage, 'test');

describe('domainOverride', () => {
  let sandbox, domain, cookies, rejectCookiesFor;
  let setCookieStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(document, 'domain').get(() => domain);
    cookies = {};
    sandbox.stub(storage, 'getCookie').callsFake((key) => cookies[key]);
    rejectCookiesFor = null;
    setCookieStub = sandbox.stub(storage, 'setCookie').callsFake((key, value, expires, sameSite, domain) => {
      if (domain !== rejectCookiesFor) {
        if (expires != null) {
          expires = new Date(expires);
        }
        if (expires == null || expires > Date.now()) {
          cookies[key] = value;
        } else {
          delete cookies[key];
        }
      }
    });
  });

  afterEach(() => sandbox.restore())

  it('test cookies include the module name', () => {
    domain = 'greatpublisher.com'
    rejectCookiesFor = 'greatpublisher.com'

    // stub Date.now() to return a constant value
    sandbox.stub(Date, 'now').returns(1234567890)

    const randomName = `adapterV${(Math.random() * 1e8).toString(16)}`
    const localDomainOverride = domainOverrideToRootDomain(storage, randomName)

    const time = Date.now();
    localDomainOverride();

    sandbox.assert.callCount(setCookieStub, 2)
    sandbox.assert.calledWith(setCookieStub, `_gd${time}_${randomName}`, '1', undefined, undefined, 'greatpublisher.com')
  });

  it('will return the root domain when given a subdomain', () => {
    const test_domains = [
      'deeply.nested.subdomain.for.greatpublisher.com',
      'greatpublisher.com',
      'subdomain.greatpublisher.com',
      'a-subdomain.greatpublisher.com',
    ];

    test_domains.forEach((testDomain) => {
      domain = testDomain
      rejectCookiesFor = 'com'
      expect(domainOverride()).to.equal('greatpublisher.com');
    });
  });

  it(`If we can't set cookies on the root domain, we'll return the subdomain`, () => {
    domain = 'subdomain.greatpublisher.com'
    rejectCookiesFor = 'greatpublisher.com'
    expect(domainOverride()).to.equal('subdomain.greatpublisher.com');
  });

  it('Will return undefined if we can\'t set cookies on the root domain or the subdomain', () => {
    domain = 'subdomain.greatpublisher.com'
    rejectCookiesFor = 'subdomain.greatpublisher.com'
    expect(domainOverride()).to.equal(undefined);
  });
});
