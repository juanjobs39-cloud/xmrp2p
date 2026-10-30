---
key: usdt-networks
lang: zh
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20、ERC-20 还是 L2：该用哪个"
description: "Tron（TRC-20）、以太坊（ERC-20）和 Arbitrum 等二层网络上的 USDT 有何不同：手续费、速度、兼容性和风险。"
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**简短回答：** 它们都是 Tether 的同一种数字美元，只是在彼此不互通的不同网络上。兑换时，请使用你的 USDT 已经所在、且服务已启用的网络。二层网络（如 Arbitrum）通常比以太坊便宜，Tron 在拉丁美洲使用很广，但手续费会随时间变化：发送前请在钱包中查看。

## 主要区别

| | Tron（TRC-20） | 以太坊（ERC-20） | Arbitrum 及其他 L2 |
|---|---|---|---|
| 地址格式 | 以 `T` 开头 | `0x…` | `0x…`（与以太坊相同） |
| 手续费币种 | TRX（能量和带宽） | ETH | ETH（在 L2 上） |
| 典型成本 | 不固定；取决于可用能量 | 通常最高 | 通常较低 |
| 常用钱包 | TronLink 等 | MetaMask 及兼容钱包 | MetaMask 及兼容钱包 |
| Tether 能冻结吗？ | 能 | 能 | 能 |

> 我们不给出手续费数字，因为它们随拥堵程度和各网络的决策而变化。签名前，钱包会显示确切成本。

## 它们是同一种币吗？

价值相同，网络不同。Tron 上的 USDT 不能直接发送到以太坊地址：需要通过交易所或跨链桥。选错网络是[最常见的错误](/zh/guides/common-mistakes-when-sending-crypto/)之一。

## MoneroP2P 使用哪个网络？

- **目前：** Arbitrum One，其 USDT（USD₮0）允许用签名授权存入，无需额外的授权交易。练习模式使用 Arbitrum Sepolia（测试网）。
- **评估中：** Tron。合约已能为 Tron 编译，但仍需在其测试网上测试；Tron 有一些特殊之处（例如其 USDT 在转账时返回非预期的值），合约已做了处理。

## 如何选择

1. **你的 USDT 现在在哪里？** 跨网络转移需要手续费和时间。
2. **你有手续费币种吗？** 没有 ETH（或 TRX）就无法签名。
3. **服务支持什么？** 只使用应用中已启用的网络。
4. **你需要多快？** L2 几秒内确认；门罗币确认 XMR 需要更久。

## 所有网络共同的风险

Tether 可以在所有这些网络上冻结地址。MoneroP2P 每笔兑换使用独立合约，因此一次冻结不会影响其他兑换，但风险仍然存在。请阅读[风险提示](/zh/risk-notice/)。
