## **lockr AIM**

Alternative Identity Manager (AIM) is a unified container for identity and data management.
With AIM’s self-service platform, publishers seamlessly integrate and activate alternative IDs like LiveRamp’s Authenticated Traffic Solution (ATS), Unified ID 2.0 (UID2), ID5 and more. The burden of due diligence and maintenance, coupled with the benefits of server-side calls result in the adoption of multiple alternative IDs, clean rooms like InfoSum and CDPs like Blueconic based on their specific needs.

### **Account Creation | AIM**

Sign up for an [Identity lockr account.](https://sso.loc.kr/console/signup)
Setup your app and activate the AIM library.
Compile Prebid with the appropriate configurations, and deploy.

### **Configuration | AIM**

First, make sure to add the lockr’s AIM submodule to your Prebid.js package with:
The following configuration parameters are available:
AIM supports all Single Sign On functions, newsletter registrations, UTM parameters, etc. For the sake of clarity, a few examples are shared below.
**Google oAuth: **
If you are using Google oAuth (_as an example_), the onSignIn function will subsequently call window.lockr.setAdditionalData function and include a raw email.

```
function onSignIn(googleUser) {
   pbjs.setConfig({
      userSync: {
         userIds: [{
            name: 'lockrAIMId',
            params: {
               email: 'john@example.com',
               appID: 'e84afc5f-4adf-4144-949f-1de5bd151fcc'
            }
         }]
      }
    });
}
```

**Facebook oAuth:**
If you are using Facebook Login (_as an example_), the statusChangeCallback function will subsequently call window.lockr.setAdditionalData function and include a raw email.

```
function statusChangeCallback(response) {
   console.log('statusChangeCallback');
   console.log(response);
   if(response.status === 'connected'){
     pbjs.setConfig({
        userSync: {
           userIds: [{
              name: 'lockrAIMId',
              params: {
                 email: 'john@example.com',
                 appID: 'e84afc5f-4adf-4144-949f-1de5bd151fcc'
              }
           }]
        }
      });
   }else{
     document.getElementById('status').innerHTML = 'Please login';
   }
}
```

**Note:** The above code can be triggered from anywhere on the domain (i.e. a subscription form).

<table>
  <tr>
   <td><strong>Param</strong>
   </td>
   <td><strong>Scope</strong>
   </td>
   <td><strong>Type</strong>
   </td>
   <td><strong>Description</strong>
   </td>
   <td><strong>Example</strong>
   </td>
  </tr>
  <tr>
   <td>name
   </td>
   <td>Required
   </td>
   <td>String
   </td>
   <td>The name of this module: <code>"lockrAIMId"</code>
   </td>
   <td><code>"lockrAIMId"</code>
   </td>
  </tr>
  <tr>
   <td>params
   </td>
   <td>Required
   </td>
   <td>Object
   </td>
   <td>Details for the configuration.
   </td>
   <td>
   </td>
  </tr>
  <tr>
   <td>params.email
   </td>
   <td>Required
   </td>
   <td>String
   </td>
   <td>Email address for identity tokens.
   </td>
   <td><code>test@example.com</code>
   </td>
  </tr>
  <tr>
   <td>params.appID
   </td>
   <td>Required
   </td>
   <td>String
   </td>
   <td>Identity lockr appID
   </td>
   <td><code>test@example.com</code>
   </td>
  </tr>
</table>

**lockr AIM Example**

```
pbjs.setConfig({
    userSync: {
       userIds: [{
          name: 'lockrAIMId',
          params: {
             email: 'test@example.com',
             appID: 'e84afc5f-4adf-4144-949f-1de5bd151fcc'
          }
       }]
    }
});
```

_Note_: lockr’s AIM self-service interface empowers publishers with the ability to pass the alternative IDs activated back to the client as local storage or as a first party cookie. Each Identity Provider can be individually set to restrict from client-side delivery and instead be retained as an authentication event within Identity lockr. In this case no data is lost, but instead maintained for automated or manual sharing to any Data Endpoint.

**Troubleshooting and Error handling:**

1. Navigate to the domain where Prebid.js Library is integrated.
2. Go to the 'Network' tab of your Developer Tools. Search for “prebid.js”
3. In the application tab, you can confirm any activated Identity Provider (if client-side storage is turned on in AIM’s Identity Provider settings).
4. Debugging:
   Enable the debug flag to true in the setConfig call:

```
pbjs.setConfig({
    debug: true,
    userSync: {
       userIds: [{
          name: 'lockrAIMId',
          params: {
             email: 'test@example.com',
             appID: 'e84afc5f-4adf-4144-949f-1de5bd151fcc'
          }
       }]
    }
});
```
