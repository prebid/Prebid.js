pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'dmdId',
            storage: {
                name: 'dmd-dgid',
                type: 'cookie',
                expires: 30
            },
            params: {
                api_key: '3fdbe297-3690-4f5c-9e11-ee9186a6d77c', // provided by DMD
            }
        }]
    }
});

#### DMD ID Configuration

A reminder to publishers that a prebid rebuild is required when we release the REST API addition. DMD is  currently working on the next release, but we wanted to submit the 1st party authentication ID feature first as this feature addition is low in complexity and thought it would be better for us to learn how to contribute features to Prebid with a low complexity change.

{: .table .table-bordered .table-striped }
| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of Module | `"dmdId"` |
| storage | Required | Object |  |
| storage.name | Required | String | `dmd-dgid` |
| params | Required | Object | Container of all module params. |  |
| params.api_key | Required | String | This is your `api_key` as provided by DMD Marketing Corp. | `3fdbe297-3690-4f5c-9e11-ee9186a6d77c` |