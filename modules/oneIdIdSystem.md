# Overview

Module Name: OneId Id System
Module Type: OneId Id System
Maintainer: alexandr.dubinin@audienzz.com

# Description

OneId user identification system

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
