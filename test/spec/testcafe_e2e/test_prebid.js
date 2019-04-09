/* eslint-disable */
import { Selector, RequestLogger } from 'testcafe';

const logger     = RequestLogger('http://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png');

fixture('Prebid')
    .page(`http://test.localhost:9999/test/spec/testcafe_e2e/pages/hello_world_banner.html`);

test.requestHooks(logger)
    (`image loading`, async (t) => {
        await t
        .wait(15000)
        .expect(logger.contains(record => record.response.statusCode === 200)).ok();
});