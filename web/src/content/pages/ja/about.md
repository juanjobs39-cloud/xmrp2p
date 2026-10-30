---
key: about
lang: ja
title: MoneroP2Pについて
description: "MoneroP2Pとは何か、現在の状況、そして運営資金の仕組み（完了したスワップごとの手数料）。"
updated: 2026-10-24
---

**要点：** MoneroP2Pは、ブラウザで動くアトミックスワップを使い、仲介者なしでUSDTをMoneroに交換するためのオープンソースプロジェクトです。Arbitrum One + Moneroで実際の資金を使って稼働しており（1回のスワップは最大100 USDT）、コントラクトはHalmos、Aderyn、Slitherで検証済みですが、外部監査はまだです。

## 開発しているもの

Webアプリ、スマートコントラクト、暗号処理のコア、そしてメイカーが動かすプログラムです。私たちは資金を預からず、ユーザーの鍵も保存しません。

## 運営資金

スワップが完了したとき、コントラクトが一定割合の手数料を受け取ります。割合はコントラクトのデプロイ時に決まり、コード上で1%が上限で、誰も変更できません。返金には手数料がかかりません。

## 状況

- 2026年10月から実際の資金で稼働中（1回のスワップは最大100 USDT）。テストネットの練習モードもあります。
- コントラクトはHalmos、Aderyn、Slitherで検証し、Sourcifyで公開済みです。
- 今後の予定：外部監査。

## クレジット

このプロトコルはAthanorLabsの成果と、COMITおよびFarcasterプロジェクトの先行研究に基づいています。DLEQ証明にはeigenwalletと同じ構成を使っています。

## コード

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p)（AGPL-3.0ライセンス）。
