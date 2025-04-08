# Overview

Module Name: OneId Id System
Module Type: UserID Module
Maintainer: alexandr.dubinin@audienzz.com

# Description

[OneId](https://docs.oneid.xyz/developers-guide/oneid-sdk) user identification system

## Example configuration for publishers:

pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'oneId',
            params: {
                type: 'email',
                value: 'emailHash'
            }
        }]
    }
});


pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'oneId',
            params: {
                type: 'anonymous',
            }
        }]
    }
});
