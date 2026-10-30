---
key: monero-wallet
lang: ko
slug: how-to-create-a-monero-wallet
title: 모네로 지갑 만드는 법
description: "휴대폰과 컴퓨터용 모네로 지갑 선택지, 만드는 법, 시드를 안전하게 보관하는 법, 주소 얻는 법. 테스트용 stagenet 포함."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: 모네로 지갑 만들기
  steps:
    - name: 지갑 고르기
      text: 공식 사이트나 getmonero.org 목록에서 지갑을 내려받으세요.
    - name: 새 지갑 만들기
      text: 새 지갑 만들기를 고르고 기기용 비밀번호를 정하세요.
    - name: 시드 백업하기
      text: 시드를 순서대로 종이에 적어 오프라인의 안전한 곳에 보관하세요.
    - name: 주소 복사하기
      text: «받기» 화면에서 주소를 복사하세요. MoneroP2P 연습 모드에는 stagenet 지갑을 쓰세요.
---

**짧은 답:** 공식 사이트에서 모네로 지갑을 내려받아 새 지갑을 만들고, 시드를 종이에 적은 뒤 «받기»에서 주소를 복사하세요. MoneroP2P 연습 모드에는 **stagenet**(모네로 테스트 네트워크) 지갑이 필요하며, 일부 컴퓨터용 지갑에서 고를 수 있습니다.

## 잘 알려진 선택지

| 지갑 | 플랫폼 | 참고 |
|---|---|---|
| Monero GUI와 CLI(공식) | Windows, macOS, Linux | 모네로 프로젝트 제작. stagenet 지원 |
| Feather Wallet | Windows, macOS, Linux | 가벼운 컴퓨터용 지갑. stagenet 지원 |
| Cake Wallet | Android, iOS, 컴퓨터 | 휴대폰에서 인기 |
| 기타 | 다양함 | 최신 목록은 getmonero.org에서 확인 |

> 항상 각 지갑의 공식 사이트에서 내려받고, 서명을 공개한다면 검증하세요. 앱 스토어의 가짜 앱을 조심하세요.

## 단계별 안내

1. 공식 사이트에서 **지갑을 설치**합니다.
2. **새 지갑을 만듭니다.** 비밀번호를 묻는데, 이는 이 기기의 파일을 보호하는 것이지 시드가 아닙니다.
3. **시드를 백업합니다.** 단어 목록입니다(기존 형식은 25개, 일부 지갑이 쓰는 Polyseed 형식은 16개). 순서대로 종이에 적으세요. 이 단어를 가진 사람이 자금을 통제합니다.
4. 지갑에 **복구 높이**가 표시되면 적어 두세요. 복구가 빨라집니다.
5. «받기»에서 **주소를 복사**합니다. 실제 네트워크의 모네로 기본 주소는 `4`로, 하위 주소는 `8`로 시작합니다. stagenet에서는 `5`나 `7`로 시작합니다.

## MoneroP2P 연습 모드용(stagenet)

- Monero GUI나 Feather에서 지갑을 만들 때(설정 또는 시작 화면에서) **stagenet**을 고르세요.
- stagenet XMR에는 가치가 없으며, stagenet 포싯에서 받을 수 있습니다.
- 연습 모드에서 MoneroP2P 앱은 stagenet 주소만 받습니다.

## 좋은 습관

- 시드는 누구에게도, 고객 지원에도 알려 주지 마세요.
- 개인정보를 더 지키고 싶다면 스왑마다 새 주소나 하위 주소를 쓰세요.
- XMR을 받으면 쓸 수 있기까지 약 10컨펌(약 20분)이 필요합니다.

다음: [모네로란 무엇이고 비트코인과 어떻게 다른가](/ko/guides/what-is-monero/).
