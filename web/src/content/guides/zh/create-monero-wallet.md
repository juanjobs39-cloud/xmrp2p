---
key: monero-wallet
lang: zh
slug: how-to-create-a-monero-wallet
title: 如何创建门罗币钱包
description: "手机和电脑上的门罗币钱包选择、如何创建钱包、安全保管助记词并获取地址。包括用于测试的 stagenet。"
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: 创建门罗币钱包
  steps:
    - name: 选择钱包
      text: 从钱包官网或 getmonero.org 上的列表下载钱包。
    - name: 创建新钱包
      text: 选择创建新钱包，并设置本地密码。
    - name: 备份助记词
      text: 按顺序把助记词抄写在纸上，并离线存放在安全的地方。
    - name: 复制你的地址
      text: 在「接收」页面复制你的地址。使用 MoneroP2P 练习模式时，请使用 stagenet 钱包。
---

**简短回答：** 从官网下载门罗币钱包，创建新钱包，把助记词抄在纸上，然后在「接收」中复制地址。使用 MoneroP2P 练习模式需要一个 **stagenet** 钱包（门罗币的测试网络），部分电脑钱包可以选择。

## 常见选择

| 钱包 | 平台 | 说明 |
|---|---|---|
| Monero GUI 和 CLI（官方） | Windows、macOS、Linux | 门罗币项目出品；支持 stagenet |
| Feather Wallet | Windows、macOS、Linux | 轻量级电脑钱包；支持 stagenet |
| Cake Wallet | Android、iOS、电脑 | 在手机上很受欢迎 |
| 其他 | 多种 | 最新列表见 getmonero.org |

> 请务必从各钱包的官网下载，如果项目公布了签名，请进行验证。小心应用商店里的仿冒应用。

## 分步操作

1. 从官网**安装钱包**。
2. **创建新钱包。** 它会要求设置密码：密码保护的是这台设备上的文件，并不是你的助记词。
3. **备份助记词。** 它是一组单词（经典格式为 25 个，部分钱包使用的 Polyseed 格式为 16 个）。按顺序抄在纸上。谁拥有这些单词，谁就控制你的资金。
4. 如果钱包显示了**恢复高度**，请记下来：它能加快恢复速度。
5. 在「接收」中**复制你的地址**。门罗币真实网络上的主地址以 `4` 开头，子地址以 `8` 开头。在 stagenet 上则以 `5` 或 `7` 开头。

## 用于 MoneroP2P 练习模式（stagenet）

- 在 Monero GUI 或 Feather 中，创建钱包时选择 **stagenet**（在设置中或启动时）。
- stagenet 上的 XMR 没有价值；可以从 stagenet 水龙头领取。
- 在练习模式下，MoneroP2P 应用只接受 stagenet 地址。

## 良好习惯

- 永远不要分享你的助记词，对客服也不行。
- 如果想要更多隐私，每次兑换使用新的地址或子地址。
- 收到 XMR 后，网络需要约 10 个确认（约 20 分钟）才能花费。

下一篇：[什么是门罗币，它与比特币有何不同](/zh/guides/what-is-monero/)。
