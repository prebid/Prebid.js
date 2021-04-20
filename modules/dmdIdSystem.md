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