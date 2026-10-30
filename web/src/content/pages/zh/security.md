---
key: security
lang: zh
title: MoneroP2P 的安全性
description: "为什么没有人托管你的资金、退款如何运作、有哪些风险以及如何验证代码。已通过 Halmos、Aderyn 和 Slither 验证。"
updated: 2026-10-27
---

**简短回答：** 在 MoneroP2P 上没有人托管资金。你的 USDT 存放在一个只按公开规则放款的合约中，XMR 存放在一个没有两半密钥谁也动不了的地址里。平台在 Arbitrum One + Monero 上以真实资金运行，**合约强制每笔兑换最多 100 USDT**。合约已通过 Halmos、Aderyn 和 Slither 验证，源码已在 Sourcify 公开；尚未进行外部审计，因此每笔兑换都设有上限。

## 为什么没有人托管你的资金

- **USDT** 存放在专为你这笔兑换创建的合约中。它没有管理员功能：除了 `claim` 和 `refund`，我们和做市方都无法取出。
- **XMR** 存放在共享地址中。没有你的那一半密钥，做市方无法取回；没有他的那一半，你也取不走。
- **你的密钥**在浏览器中生成，从不发送到我们的服务器。服务器会拒绝任何包含完整私钥的消息。

## 退款如何运作

| 情况 | 结果 |
|---|---|
| 做市方没有存入 XMR | 你在 t0 之前退款（应用会提示你） |
| 做市方存入的 XMR 不足 | 你不要确认，并在 t0 之前退款 |
| 你已确认但做市方没有领取 | 你从 t1 起退款 |
| 你关闭了标签页 | 带着[恢复文件](/zh/guides/what-to-do-if-you-closed-the-tab/)回来 |

## 你应了解的风险

1. **期限。** 如果 XMR 没到账而你没有及时退款，可能会损失 USDT。应用会提醒你，但前提是它保持打开，或你带着文件回来。
2. **恢复文件。** 没有它和它的密码，你既无法领取 XMR 也无法退款。我们无法替你找回。
3. **USDT 冻结。** Tether 可以冻结地址。每笔兑换使用独立合约，但风险仍然存在。
4. **尚无外部审计。** 合约已通过自动化验证（Halmos、Aderyn、Slither），但软件仍可能存在缺陷。每笔 100 USDT 的上限限制了单笔兑换的风险。
5. **隐私。** 门罗币节点代理能看到你的浏览器查询了什么。你可以使用自己的节点。

## 我们如何保护应用

- 严格的 **Content Security Policy**：应用只运行自己的代码。
- 脚本和样式使用 **Subresource Integrity**，加密核心在使用前会校验完整性。
- **没有第三方脚本**，没有分析工具，没有 Cookie。
- **可验证的构建：** 我们为每个文件公布 `SHA256SUMS`，并在 IPFS 上提供副本。

## 审计

合约已用免费开源工具验证：**Halmos**（符号验证，7/7 项性质对所有输入均已证明）、**Aderyn**（0 个高危问题）和 **Slither**（无中危或高危问题）。源码已在 **Sourcify** 验证（完全匹配）。报告：[docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md)。外部审计尚待进行；准备好的范围见 [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md)。

## 源代码与漏洞报告

开源（AGPL-3.0）：[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p)。如需报告漏洞，请按 `SECURITY.md` 的说明使用 GitHub 私密报告。
