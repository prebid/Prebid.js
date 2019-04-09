/* eslint-disable */
import { Selector, RequestLogger } from 'testcafe';

const logger     = RequestLogger('http://vcdn.adnxs.com/p/creative-image/51/ce/b1/ba/51ceb1ba-a5ff-4350-8e5c-f4f75d0d799f.png');

fixture('Prebid')
    .page(`http://test.localhost:9999/test/spec/testcafe_e2e/pages/hello_world_banner_sf.html`);

test.requestHooks(logger)
    (`image loading`, async (t) => {
        await t
        .wait(15000)
        .expect(logger.contains(record => record.response.statusCode === 200)).ok();
});