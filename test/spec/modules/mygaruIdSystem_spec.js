import { mygaruIdSubmodule } from 'modules/mygaruIdSystem.js';
import { server } from '../../mocks/xhr';

describe('MygaruID module', function () {
  it('should respond with async callback and get valid id', async () => {
    const callBackSpy = sinon.spy();
    const expectedUrl = `https://ident.mygaru.com/v2/id?gdprApplies=0`;
    const result = mygaruIdSubmodule.getId({});

    expect(result.callback).to.be.an('function');
    const promise = result.callback(callBackSpy);

    const request = server.requests[0];
    expect(request.url).to.be.eq(expectedUrl);

    request.respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ iuid: '123' })
    );
    await promise;

    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.calledWith({mygaruId: '123'})).to.be.true;
  });
  it('should not fail on error', async () => {
    const callBackSpy = sinon.spy();
    const expectedUrl = `https://ident.mygaru.com/v2/id?gdprApplies=0`;
    const result = mygaruIdSubmodule.getId({});

    expect(result.callback).to.be.an('function');
    const promise = result.callback(callBackSpy);

    const request = server.requests[0];
    expect(request.url).to.be.eq(expectedUrl);

    request.respond(
      500,
      {},
      ''
    );
    await promise;

    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.calledWith({mygaruId: undefined})).to.be.true;
  });

  it('should not modify while decoding', () => {
    const id = '222';
    const newId = mygaruIdSubmodule.decode(id)

    expect(id).to.eq(newId);
  })
  it('should buildUrl with consent data', () => {
    const result = mygaruIdSubmodule.getId({}, {
      gdpr: {
        gdprApplies: true,
        consentString: 'consentString'
      }
    });

    expect(result.url).to.eq('https://ident.mygaru.com/v2/id?gdprApplies=1&gdprConsentString=consentString');
  })
});
