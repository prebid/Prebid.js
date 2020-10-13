## Summary
We take PR review seriously. Please read https://medium.com/@mrjoelkemp/giving-better-code-reviews-16109e0fdd36#.xa8lc4i23 to understand how a PR review should be conducted. Be rational and strict in your review, make sure you understand exactly what the submitter's intent is. Anyone in the community can review a PR, but a Prebid Org member is also required. A Prebid Org member should take ownership of a PR and do the initial review.

If the PR is for a standard bid adapter or a standard analytics adapter, just the one review from a core member is sufficient. The reviewer will check against [required conventions](http://prebid.org/dev-docs/bidder-adaptor.html#required-adapter-conventions) and may merge the PR after approving and confirming that the documentation PR against prebid.org is open and linked to the issue.

For modules and core platform updates, the initial reviewer should request an additional team member to review as a sanity check. Merge should only happen when the PR has 2 `LGTM` from the core team and a documentation PR if required.

### General PR review Process
- Checkout the branch (these instructions are available on the github PR page as well).
- Verify PR is a single change type. Example, refactor OR bugfix. If more than 1 type, ask submitter to break out requests.
- Verify code under review has at least 80% unit test coverage. If legacy code has no unit test coverage, ask for unit tests to be included in the PR.
- Verify tests are green in Travis-ci + local build by running `gulp serve` | `gulp test`
- Verify no code quality violations are present from linting (should be reported in terminal)
- Review for obvious errors or bad coding practice / use best judgement here.
- If the change is a new feature / change to core prebid.js - review the change with a Tech Lead on the project and make sure they agree with the nature of change.
- If the change results in needing updates to docs (such as public API change, module interface etc), add a label for "needs docs" and inform the submitter they must submit a docs PR to update the appropriate area of Prebid.org **before the PR can merge**. Help them with finding where the docs are located on prebid.org if needed. 
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
- If all above is good, add a `LGTM` comment and request 1 additional core member to review.
- Once there is 2 `LGTM` on the PR, merge to master
- Ask the submitter to add a PR for documentation if applicable.
- Add a line into the [draft release](https://github.com/prebid/Prebid.js/releases) notes for this submission. If no draft release is available, create one using [this template]( https://gist.github.com/mkendall07/c3af6f4691bed8a46738b3675cb5a479)
- Add the PR to the appropriate project board (I.E. 1.23.0 Release) for the week, [see](https://github.com/prebid/Prebid.js/projects)

### New Adapter or updates to adapter process
- Follow steps above for general review process. In addition, please verify the following:
- Verify that bidder has submitted valid bid params and that bids are being received.
- Verify that bidder is not manipulating the prebid.js auction in any way or doing things that go against the principles of the project. If unsure check with the Tech Lead.
- Verify that code re-use is being done properly and that changes introduced by a bidder don't impact other bidders.
- If the adapter being submitted is an alias type, check with the bidder contact that is being aliased to make sure it's allowed.
- All required global and bidder-adapter rules defined in the [Module Rules](https://docs.prebid.org/dev-docs/module-rules.html) must be followed. Please review these rules often - we depend on reviewers to enforce them.
- All bidder parameter conventions must be followed:
    - Video params must be read from AdUnit.mediaTypes.video when available; however bidder config can override the ad unit. 
    - First party data must be read from [`fpd.context` and `fpd.user`](https://docs.prebid.org/dev-docs/publisher-api-reference.html#setConfig-fpd).
    - Adapters that accept a floor parameter must also support the [floors module](https://docs.prebid.org/dev-docs/modules/floors.html) -- look for a call to the `getFloors()` function.
    - Adapters cannot accept an schain parameter. Rather, they must look for the schain parameter at bidRequest.schain.
    - The bidRequest page referrer must checked in addition to any bidder-specific parameter.
    - If they're getting the COPPA flag, it must come from config.getConfig('coppa');

- After a new adapter is approved, let the submitter know they may open a PR in the [headerbid-expert repository](https://github.com/prebid/headerbid-expert) to have their adapter recognized by the [Headerbid Expert extension](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop). The PR should be to the [bidder patterns file](https://github.com/prebid/headerbid-expert/blob/master/bidderPatterns.js), adding an entry with their adapter's name and the url the adapter uses to send and receive bid responses.

## Ticket Coordinator

Each week, Prebid Org assigns one person to keep an eye on incoming issues and PRs. Every Monday morning a reminder is
sent to the prebid-js slack channel with a link to the spreadsheet. If you're on rotation, please check that list each
Monday to see if you're on-duty.

When on-duty:
- Review issues and PRs at least once per weekday for new items. Encourage a 48 "SLA" on PRs/issues assigned. Aim for touchpoint once every 48/hours. 
- For PRs: assign PRs to individuals on the **PR review list**. Try to be equitable -- not all PRs are created equally. Use the "Assigned" field and add the "Needs Review" label.
- For Issues: try to address questions and troubleshooting requests on your own, assigning them to others as needed. Please add labels as appropriate (I.E. bug, question, backlog etc).
- Issues that are questions or troubleshooting requests may be closed if the originator doesn't respond within a week to requests for confirmation or details.
- Issues that are bug reports should be left open and assigned to someone in PR rotation to confirm or deny the bug status.
- It's polite to check with others before assigning them extra-large tasks.
- If possible, check in on older PRs and Issues and see if they can be unstuck.
- Perform the weekly Prebid.js release per instructions at https://github.com/prebid/Prebid.js/blob/master/RELEASE_SCHEDULE.md . This generally takes place on Tues or Weds.
