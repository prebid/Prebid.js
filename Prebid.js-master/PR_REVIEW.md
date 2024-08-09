## Summary

We take PR review seriously. Please read https://medium.com/@mrjoelkemp/giving-better-code-reviews-16109e0fdd36#.xa8lc4i23 to understand how a PR review should be conducted. Be rational and strict in your review, make sure you understand exactly what the submitter's intent is. Anyone in the community can review a PR, but a Prebid Org member is also required. A Prebid Org member should take ownership of a PR and do the initial review.

If the PR is for a standard bid adapter or a standard analytics adapter, just the one review from a core member is sufficient. The reviewer will check against [required conventions](http://prebid.org/dev-docs/bidder-adaptor.html#required-adapter-conventions) and may merge the PR after approving and confirming that the documentation PR against prebid.org is open and linked to the issue.

For modules and core platform updates, the initial reviewer should request an additional team member to review as a sanity check. Merge should only happen when the PR has 2 `LGTM` from the core team and a documentation PR if required.

### Running Tests and Verifying Integrations

General gulp commands include separate commands for serving the codebase on a built in webserver, creating code coverage reports and allowing serving integration examples. The `review-start` gulp command combinese those into one command.

- Run `gulp review-start`, adding the host parameter `gulp review-start --host=0.0.0.0` will bind to all IPs on the machine
    - A page will open which provides a hub for common reviewer tools.
    - If you need to manually access the tools:
        - Navigate to build/coverage/lcov-report/index.html to view coverage
        - Navigate to integrationExamples/gpt/hellow_world.html for basic integration testing
        - The hello_world.html and other examples can be edited and used as needed to verify functionality

### General PR review Process

- All required global and bidder-adapter rules defined in the [Module Rules](https://docs.prebid.org/dev-docs/module-rules.html) must be followed. Please review these rules often - we depend on reviewers to enforce them.
- Checkout the branch (these instructions are available on the GitHub PR page as well).
- Verify PR is a single change type. Example, refactor OR bugfix. If more than 1 type, ask submitter to break out requests.
- Verify code under review has at least 80% unit test coverage. If legacy code doesn't have enough unit test coverage, require that additional unit tests to be included in the PR.
- Verify tests are green in Travis-ci + local build by running `gulp serve` | `gulp test`
- Verify no code quality violations are present from linting (should be reported in terminal)
- Make sure the code is not setting cookies or localstorage directly -- it must use the `StorageManager`.
- Review for obvious errors or bad coding practice / use best judgement here.
- If the change is a new feature / change to core prebid.js - review the change with a Tech Lead on the project and make sure they agree with the nature of change.
- If the change results in needing updates to docs (such as public API change, module interface etc), add a label for "needs docs" and inform the submitter they must submit a docs PR to update the appropriate area of Prebid.org **before the PR can merge**. Help them with finding where the docs are located on prebid.org if needed. 
- If all above is good, add a `LGTM` comment and, if the change is in PBS-core or is an important module like the prebidServerBidAdapter, request 1 additional core member to review.
- Once there are 2 `LGTM` on the PR, merge to master
- The [draft release](https://github.com/prebid/Prebid.js/releases) notes are managed by [release drafter](https://github.com/release-drafter/release-drafter). To get the PR added to the release notes do the steps below. A GitHub action will use that information to build the release notes.
    - Adjust the PR Title to be appropriate for release notes
    - Add a label for `feature`, `maintenance`, `fix`, `bugfix` or `bug` to categorize the PR
    - Add a SemVer label of `major`, `minor` or `patch` to indicate the scope of change    

### Reviewing a New or Updated Bid Adapter

Documentation: https://docs.prebid.org/dev-docs/bidder-adaptor.html

Follow steps above for general review process. In addition, please verify the following:
- Verify the biddercode and aliases are valid:
    - Lower case alphanumeric with the only special character allowed is underscore.
    - The bidder code should be unique for the first 6 characters
    - Reserved words that cannot be used as bidder names: all, context, data, general, prebid, and skadn
- Verify that bidder has submitted valid bid params and that bids are being received.
- Verify that bidder is not manipulating the prebid.js auction in any way or doing things that go against the principles of the project. If unsure check with the Tech Lead.
- Verify that code re-use is being done properly and that changes introduced by a bidder don't impact other bidders.
- If the adapter being submitted is an alias type, check with the bidder contact that is being aliased to make sure it's allowed.
- All bidder parameter conventions must be followed:
    - Video params must be read from AdUnit.mediaTypes.video when available; however bidder config can override the ad unit. 
    - First party data must be read from [getConfig('ortb2');](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-fpd).
    - Adapters that accept a floor parameter must also support the [floors module](https://docs.prebid.org/dev-docs/modules/floors.html) -- look for a call to the `getFloor()` function.
    - Adapters cannot accept an schain parameter. Rather, they must look for the schain parameter at bidRequest.schain.
    - The bidderRequest.refererInfo.referer must be checked in addition to any bidder-specific parameter.
    - If they're getting the COPPA flag, it must come from config.getConfig('coppa');
    - Page position must come from bidrequest.mediaTypes.banner.pos or bidrequest.mediaTypes.video.pos
    - Global OpenRTB fields should come from [getConfig('ortb2');](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-fpd):
        - bcat, battr, badv
    - Impression-specific OpenRTB fields should come from bidrequest.ortb2imp
        - instl
- Below are some examples of bidder specific updates that should require docs update (in their dev-docs/bidders/BIDDER.md file):
    - If they support the GDPR consentManagement module and TCF1, add `gdpr_supported: true`
    - If they support the GDPR consentManagement module and TCF2, add `tcf2_supported: true`
    - If they support the US Privacy consentManagementUsp module, add `usp_supported: true`
    - If they support one or more userId modules, add `userId: (list of supported vendors)`
    - If they support video and/or native mediaTypes add `media_types: video, native`. Note that display is added by default. If you don't support display, add "no-display" as the first entry, e.g. `media_types: no-display, native`
    - If they support COPPA, add `coppa_supported: true`
    - If they support SChain, add `schain_supported: true`
    - If their bidder doesn't work well with safeframed creatives, add `safeframes_ok: false`. This will alert publishers to not use safeframed creatives when creating the ad server entries for their bidder.
    - If they're setting a deal ID in some scenarios, add `bidder_supports_deals: true`
    - If they have an IAB Global Vendor List ID, add `gvl_id: ID`. There's no default.
- After a new adapter is approved, let the submitter know they may open a PR in the [headerbid-expert repository](https://github.com/prebid/headerbid-expert) to have their adapter recognized by the [Headerbid Expert extension](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop). The PR should be to the [bidder patterns file](https://github.com/prebid/headerbid-expert/blob/master/bidderPatterns.js), adding an entry with their adapter's name and the url the adapter uses to send and receive bid responses.

### Reviewing a New or Updated Analytics Adapter

Documentation: https://docs.prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html

No additional steps above the general review process and making sure it conforms to the [Module Rules](https://docs.prebid.org/dev-docs/module-rules.html).

Make sure there's a docs pull request

### Reviewing a New or Updated User ID Sub-Module

Documentation: https://docs.prebid.org/dev-docs/modules/userId.html#id-providers

Follow steps above for general review process. In addition:
- Try running the new user ID module with a basic config and confirm it hits the endpoint and stores the results.
- the filename should be camel case ending with `IdSystem` (e.g. `myCompanyIdSystem.js`)
- the `const MODULE_NAME` value should be camel case ending with `Id` (e.g. `myCompanyId` )
- the response of the `decode` method should be an object with the key being ideally camel case similar to the module name and ending in `id` or `Id`, but in some cases this value is a shortened name and sometimes with the `id` part being all lowercase, provided there are no other uppercase letters. if there's no id or it's an invalid object, the response should be `undefined`. example "valid" values (although this is more style than a requirement)
   - `mcid`
   - `mcId`
   - `myCompanyId`
- make sure they've added references of their new module everywhere required:
  - modules/.submodules.json
  - modules/userId/eids.js
  - modules/userId/eids.md
  - modules/userId/userId.md
- tests can go either within the userId_spec.js file or in their own _spec file if they wish
- GVLID is recommended in the *IdSystem file if they operate in EU
- make sure example configurations align to the actual code (some modules use the userId storage settings and allow pub configuration, while others handle reading/writing cookies on their own, so should not include the storage params in examples)
- the 3 available methods (getId, extendId, decode) should be used as they were intended
  - decode (required method) should not be making requests to retrieve a new ID, it should just be decoding a response
  - extendId (optional method) should not be making requests to retrieve a new ID, it should just be adding additional data to the id object
  - getId (required method) should be the only method that gets a new ID (from ajax calls or a cookie/local storage). this ensures that decode and extend do not unnecessarily delay the auction in places where it is not expected.
- in the eids.js file, the source should be the actual domain of the provider, not a made up domain.
- in the eids.js file, the key in the array should be the same value as the key in the decode function
- make sure all supported config params align in the submodule js file and the docs / examples
- make sure there's a docs pull request

### Reviewing a New or Updated Real-Time-Data Sub-Module

Documentation: https://docs.prebid.org/dev-docs/add-rtd-submodule.html

Follow steps above for general review process. In addition:

- The RTD Provider must include a `providerRtdProvider.md` file. This file must have example parameters and document a sense of what to expect: what should change in the bidrequest, or what targeting data should be added?
- Try running the new sub-module and confirm the provided test parameters.
- Confirm that the module
  - is not loading external code. If it is, escalate to the #prebid-js Slack channel. 
  - is reading `config` from the function signature rather than calling `getConfig`.
  - is sending data to the bid request only as either First Party Data or in bidRequest.rtd.RTDPROVIDERCODE.
  - is making HTTPS requests as early as possible, but not more often than needed.
  - doesn't force bid adapters to load additional code.
- Consider whether the kind of data the module is obtaining could have privacy implications. If so, make sure they're utilizing the `consent` data passed to them.
- Make sure there's a docs pull request

## Ticket Coordinator

Each week, Prebid Org assigns one person to keep an eye on incoming issues and PRs. Every Monday morning a reminder is sent to the prebid-js slack channel with a link to the spreadsheet. If you're on rotation, please check that list each Monday to see if you're on-duty.

When on-duty:
- Review issues and PRs at least once per weekday for new items. Encourage a 48 "SLA" on PRs/issues assigned. Aim for touchpoint once every 48/hours. 
- For PRs: assign PRs to individuals on the **PR review list**. Try to be equitable -- not all PRs are created equally. Use the "Assigned" field and add the "Needs Review" label.
- For Issues: try to address questions and troubleshooting requests on your own, assigning them to others as needed. Please add labels as appropriate (I.E. bug, question, backlog etc).
- Issues that are questions or troubleshooting requests may be closed if the originator doesn't respond within a week to requests for confirmation or details.
- Issues that are bug reports should be left open and assigned to someone in PR rotation to confirm or deny the bug status.
- It's polite to check with others before assigning them extra-large tasks.
- If possible, check in on older PRs and Issues and see if they can be unstuck.
- Perform the weekly Prebid.js release per instructions at https://github.com/prebid/Prebid.js/blob/master/RELEASE_SCHEDULE.md . This generally takes place on Tues or Weds.
