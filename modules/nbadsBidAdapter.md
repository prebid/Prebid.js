# 概览

```
Module Name: nbads(NexBids) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tangyongchun@tingxue.net
```

# 说明

`nbads(NexBids)` 是 NexBids SSP 的 Prebid.js 适配器，bidder code 为 `nbads`。
通过 OpenRTB 2.6 接入 NexBids 网关，支持 Banner、Video 和 Native。

每个发行方发送一份请求。网关按页面 `Origin` 校验登记域名、发行方和广告位，
在服务端补齐 IP、地区及设备信息，返回每个曝光的胜出广告并完成价格宏替换。
网关代发上游赢标、计费通知；适配器在 `onBidBillable` 中通过 Prebid 公共 Ajax 接口
发送签名曝光地址，使用 `GET`、`keepalive: true` 和 `withCredentials: false`。
Prebid 核心对同一出价对象的重复计费事件去重，网关对同一曝光的追踪请求去重。
Video、Native 的素材中还包含同一个曝光地址，由播放器或原生渲染器触发。

# 广告格式

- **Banner**：通过 `mediaTypes.banner.sizes` 声明尺寸。
- **Video**：通过 `mediaTypes.video.playerSize` 声明尺寸，其他标准 OpenRTB 视频字段原样传递。
  支持 `instream`、`outstream`；适配器不提供播放器，Outstream 需要发行方配置 `renderer`。
- **Native**：通过 `mediaTypes.native.ortb` 声明资产，响应为 `native.ortb`，
  网关点击追踪地址追加到 `link.clicktrackers`。
- **多格式广告位**：网关按已登记的格式，从 Banner、Video、Native 中选取一种竞价。

# 竞价参数

| 参数 | 必填 | 说明 | 示例 | 类型 |
|---|---|---|---|---|
| `publisherId` | 是 | NexBids 分配的发行方 ID | `'Pub-d253acc11ce4b315'` | `string` |
| `adUnitCode` | 是 | 后台登记的完整广告位代码，对应 `imp.tagid` | `'Unit-59c572bf7ac1ebb1'` | `string` |

# 配置

```javascript
pbjs.setConfig({
  nbads: {
    env: 'prod' // Prebid 审核使用线上环境，也是默认值。
  }
});
```

生产地址为 `https://us.nexbids.com`，测试地址为 `https://test.ssp.nexbids.com`。
仅支持这两个固定 HTTPS 地址，不接受自定义端点。

对外使用 `nbads` 命名；网关响应协议仍为 `ext.nexbids.pixel`、`ext.nexbids.click`，
域名、发行方和广告位标识继续使用 NexBids 的现有值。

# Prebid 审核参数

审核使用生产网关 `https://us.nexbids.com`，配置 `nbads.env: 'prod'`。
三个广告位共用发行方 `Pub-d253acc11ce4b315`；广告位代码必须包含 `Unit-` 前缀。

| 类型 | 广告位 | 尺寸或格式 |
|---|---|---|
| Banner | `Unit-59c572bf7ac1ebb1` | 320×50 |
| Video | `Unit-570416538ad202ef` | 1280×720 |
| Native | `Unit-156842bb1da61c0f` | 图片原生，自适应 |

用户确认的审核站点域名为 `test.ssp.nexbids.com`，页面来源需匹配该发行方白名单。这些参数用于生产环境，不要切换到 `env: 'test'`。
需求还需覆盖审核者所在地区；HTTP 204 仅表示没有出价，不能证明展示和计费链路正常。

```javascript
pbjs.setConfig({ nbads: { env: 'prod' } });

var bannerAdUnit = {
  code: 'div-nbads-320x50',
  mediaTypes: {
    banner: {
      sizes: [[320, 50]]
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-59c572bf7ac1ebb1'
    }
  }]
};

var videoAdUnit = {
  code: 'div-nbads-video',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[1280, 720]],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      plcmt: 1
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-570416538ad202ef'
    }
  }]
};

var nativeAdUnit = {
  code: 'div-nbads-native',
  mediaTypes: {
    native: {
      ortb: {
        ver: '1.2',
        assets: [
          { id: 1, required: 1, title: { len: 90 } },
          { id: 2, required: 1, img: { type: 3, w: 300, h: 157 } },
          { id: 3, required: 0, data: { type: 2 } }
        ]
      }
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-156842bb1da61c0f'
    }
  }]
};
```


# 注意事项

- 创意的可见性测量依赖同源 iframe；不要在 SafeFrame 或其他跨域 iframe 中展示。
- `publisherId` 是标识符，不是密钥。网关按页面来源和已登记域名校验请求。
- 没有 IAB GVL ID，不声明 TCF-EU 支持。隐私信号、供应链和第一方数据使用 Prebid 标准字段。

使用 `pbjs.renderAd` 展示原生模板时，Prebid 构建还需包含 `nativeRendering` 模块。
`onBidBillable` 由 Prebid 判定可计费时触发；若要求成功渲染后才计费，应配置
`adUnit.deferBilling: true`，并在当前广告的 `adRenderSucceeded` 后调用 `pbjs.triggerBilling`。
同步渲染的成功事件可能早于核心登记赢标，应通过微任务等到当前调用栈结束后再调用 `triggerBilling`，并检查请求仍有效。
视频则在播放器开始播放时触发；不要将 `bidWon` 或通用的 `billableEvent` 当成展示成功的证明。
