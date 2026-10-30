---
key: about
lang: ko
title: MoneroP2P 소개
description: "MoneroP2P가 무엇인지, 현재 상태, 그리고 운영 자금을 마련하는 방법(완료된 스왑마다 받는 수수료)."
updated: 2026-10-24
---

**짧은 답:** MoneroP2P는 브라우저에서 실행되는 아토믹 스왑으로 중개자 없이 USDT를 모네로로 바꾸는 오픈 소스 프로젝트입니다. Arbitrum One + Monero에서 실제 자금으로 운영 중이며(스왑 1회당 최대 100 USDT), 컨트랙트는 Halmos, Aderyn, Slither로 검증했지만 외부 감사는 아직 받지 않았습니다.

## 만드는 것

웹 앱, 스마트 컨트랙트, 암호화 핵심 모듈, 그리고 메이커가 돌리는 프로그램입니다. 저희는 자금을 보관하지 않으며 사용자 키도 저장하지 않습니다.

## 운영 자금

스왑이 완료되면 컨트랙트가 일정 비율의 수수료를 받습니다. 비율은 컨트랙트 배포 때 정해지며 코드상 상한이 1%이고 누구도 바꿀 수 없습니다. 환불에는 수수료가 없습니다.

## 현황

- 2026년 10월부터 실제 자금으로 운영 중(스왑 1회당 최대 100 USDT)이며, 테스트넷 연습 모드도 있습니다.
- 컨트랙트는 Halmos, Aderyn, Slither로 검증했고 Sourcify에 공개했습니다.
- 예정: 외부 감사.

## 크레딧

이 프로토콜은 AthanorLabs의 작업과 COMIT, Farcaster 프로젝트의 선행 연구를 바탕으로 합니다. DLEQ 증명은 eigenwallet과 같은 구성을 씁니다.

## 코드

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p)(AGPL-3.0 라이선스).
