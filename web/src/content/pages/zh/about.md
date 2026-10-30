---
key: about
lang: zh
title: 关于 MoneroP2P
description: "MoneroP2P 是什么、目前的状态以及资金来源（每笔完成的兑换收取一笔手续费）。"
updated: 2026-10-24
---

**简短回答：** MoneroP2P 是一个开源项目，通过在浏览器中运行的原子交换，无需中介即可把 USDT 兑换为门罗币。它已在 Arbitrum One + Monero 上以真实资金运行（每笔兑换最多 100 USDT）；合约已通过 Halmos、Aderyn 和 Slither 验证，尚未进行外部审计。

## 我们开发什么

网页应用、智能合约、加密核心，以及做市方运行的程序。我们不保管资金，也不存储用户密钥。

## 资金来源

兑换完成时，合约收取一定比例的手续费。比例在合约部署时设定，代码中上限为 1%，任何人都无法更改。退款不收费。

## 状态

- 自 2026 年 10 月起以真实资金运行（每笔兑换最多 100 USDT），并提供测试网练习模式。
- 合约已通过 Halmos、Aderyn 和 Slither 验证，并在 Sourcify 上公开。
- 待完成：外部审计。

## 致谢

该协议基于 AthanorLabs 的工作，以及 COMIT 和 Farcaster 项目的早期研究。DLEQ 证明采用与 eigenwallet 相同的构造。

## 代码

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p)（AGPL-3.0 许可证）。
