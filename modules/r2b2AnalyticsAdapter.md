# Overview

```
Module Name: R2B2 Analytics Adapter
Module Type: Analytics Adapter
Maintainer: dev@r2b2.cz
```

## Description

The R2B2 Analytics Adapter enables data collection for analysis and reporting purposes. Access to collected data and the ability to start data collection require prior approval from R2B2. For approval, please contact our account team on partner@r2b2.io.

## How to configure?

```
pbjs.enableAnalytics({
    provider: 'r2b2',
    options: {
        domain: 'example.com',
        configId: 1,
        configVer: 1
    }
});
```

### Options

| Name      | Scope    | Example     | Type     | Description                                                    |
|-----------|----------|-------------|----------|----------------------------------------------------------------|
| `domain`  | required | example.com | `string` | R2B2 approved domain where data collection occurs              |
| `configId` | optional | 1           | `int`    | Identifier for different configurations under the same domain (e.g., 1 for mobile, 2 for desktop) |
| `configVer` | optional | 1           | `int`    | Version number for configurations sharing the same `configId`  |
