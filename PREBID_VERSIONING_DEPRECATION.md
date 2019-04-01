# Prebid versioning and deprecation policy

## Goals
Provide clear definitions and policy around versioning and breaking changes to APIs that are both publisher and demand partner facing.

 - Limit the number of breaking changes.
 - Ensure significant time for updates for breaking changes so that publisher or demand partners do not break.
 - Provide a path to deprecation and reduce technical debt and increase security.
 - Major versions should not be changed more than once per 30 days.

## Versioning

Follow semantic versioning so that all breaking changes occur within a major release. A breaking change includes both demand partner internal APIs* and publisher facing APIs (global APIs).

*Demand partner APIs may be excluded from breaking change policy at the core teams discretion if the changes are made so to be transparent to the bidders (such as internal refactoring).

## Deprecation process

 - Open an issue with an "intent to implement" and "API impact" labels.
 - Allow 2 weeks for discussion.
 - Announce breaking change to the mailing list (TBD needs to be created).
 - At least 2 core members needs to provide explicit approval for the deprecation.
 - Open a PR against current master for console warning for possible breakage.
 - Support the previous major version for a minimum of 30 days.
 - Coordinate with the core team to ensure clean merging into feature branch if applicable (future major version branch).
