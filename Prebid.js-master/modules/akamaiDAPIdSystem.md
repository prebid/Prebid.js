# Akamai Data Activation Platform Audience Segment ID Targeting

The Akamai Data Activation Platform (DAP) is a privacy-first system that protects end-user privacy by only allowing them to be targeted as part of a larger cohort.  DAP views hiding individuals in large cohorts as the best mechanism to prevent unauthorized tracking.

The integration of DAP into Prebid.JS consists of creating a UserID plugin that interacts with the DAP API.  The UserID module tokenizes the end-user identity into an ephemeral, secure pseudonymization called a dapId.  The dapId is then supplied to the bid-stream where the SSP partner looks up cohort membership for that token, and supplies the cohorts to the rest of the bid-stream.

In this system, no end-user identifier is supplied to the bid-stream, only cohorts.  This is a foundational privacy principle DAP is built upon.

## Onboarding

Please reach out to your Akamai account representative(Prebid@akamai.com) to get provisioned on the DAP platform.

## DAP Configuration

First, make sure to add the DAP submodule to your Prebid.js package with:

```
gulp build --modules=akamaiDAPIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'akamaiDAPId',
      params: {
        apiHostname: '<see your Akamai account rep>',
        domain: 'your-domain.com',
        type: 'email' | 'mobile' | ... | 'dap-signature:1.0.0',
        identity: ‘your@email.com’ | ‘6175551234' | ...',
        apiVersion: 'v1' | 'x1',
        attributes: '{ "cohorts": [ "3:14400", "5:14400", "7:0" ],"first_name": "...","last_name": "..." }'
      },
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```

In order to make use of v1 APIs, "apiVersion" needs to explicitly mentioned as 'v1'. The "apiVersion" defaults to x1 if not specified.
"attributes" can be configured in x1 API only and not v1 APIs. Please ensure that the "attributes" value is in same format as shown above.

Refer to the sample integration example present at below location
Prebid.js/integrationExamples/gpt/akamaidap_email_example.html
Prebid.js/integrationExamples/gpt/akamaidap_signature_example.html
Prebid.js/integrationExamples/gpt/akamaidap_x1_example.html
