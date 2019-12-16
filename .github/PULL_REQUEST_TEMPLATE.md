<!--
Thank you for your pull request. Please make sure this PR is scoped to one change, and that any added or changed code includes tests with greater than 80% code coverage. See https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md#testing-prebidjs for documentation on testing Prebid.js.
-->

## Type of change
<!-- Remove items that don't apply and/or select an item by changing [ ] to [x] -->
- [ ] Bugfix
- [ ] Feature
- [ ] New bidder adapter  <!--  IMPORTANT: if checking here, also submit your bidder params documentation here https://github.com/prebid/prebid.github.io/tree/master/dev-docs/bidders --> 
- [ ] Code style update (formatting, local variables)
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Build related changes
- [ ] CI related changes
- [ ] Does this change affect user-facing APIs or examples documented on http://prebid.org?
- [ ] Other

## Description of change
<!-- Describe the change proposed in this pull request -->

<!-- For new bidder adapters, please provide the following -->
- test parameters for validating bids
```
{
  bidder: '<bidder name>',
  params: {
    // ...
  }
}
```

Be sure to test the integration with your adserver using the [Hello World](/integrationExamples/gpt/hello_world.html) sample page.

- contact email of the adapter’s maintainer
- [ ] official adapter submission

For any changes that affect user-facing APIs or example code documented on http://prebid.org, please provide:

- A link to a PR on the docs repo at https://github.com/prebid/prebid.github.io/

## Other information
<!-- References to related PR or issue #s, @mentions of the person or team responsible for reviewing changes, etc. -->
