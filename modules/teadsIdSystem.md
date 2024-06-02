# Overview

Module Name: Teads Id System
Module Type: User Id System
Maintainer: innov-ssp@teads.com

# Description

Teads user identification system. GDPR & CCPA compliant.

## Example configuration for publishers:

    pbjs.setConfig({
        userSync: {
            userIds: [{
                name: 'teadsId',
                params: {
                    pubId: 1234
                }
            }]
        }
    });
