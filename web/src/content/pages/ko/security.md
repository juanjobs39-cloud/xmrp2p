---
key: security
lang: ko
title: MoneroP2P 보안
description: "왜 아무도 자금을 보관하지 않는지, 환불은 어떻게 되는지, 어떤 위험이 있는지, 코드를 어떻게 검증하는지. Halmos, Aderyn, Slither로 검증."
updated: 2026-10-27
---

**짧은 답:** MoneroP2P에서는 아무도 자금을 보관하지 않습니다. USDT는 공개 규칙에 따라서만 돈을 내주는 컨트랙트에 있고, XMR은 키의 두 절반이 모두 없으면 누구도 옮길 수 없는 주소에 있습니다. Arbitrum One + Monero에서 실제 자금으로 운영되며, **컨트랙트가 스왑 1회당 최대 100 USDT로 제한**합니다. 컨트랙트는 Halmos, Aderyn, Slither로 검증했고 소스는 Sourcify에 공개했습니다. 외부 감사는 아직이라 스왑마다 상한을 둡니다.

## 아무도 자금을 보관하지 않는 이유

- **USDT**는 여러분의 스왑 전용 컨트랙트에 있습니다. 관리자 기능이 없어서 `claim`과 `refund` 외에는 저희도 메이커도 꺼낼 수 없습니다.
- **XMR**은 공유 주소에 있습니다. 메이커는 여러분의 키 절반 없이 되가져갈 수 없고, 여러분도 메이커의 절반 없이는 가져갈 수 없습니다.
- **여러분의 키**는 브라우저에서 만들어지며 저희 서버로 보내지지 않습니다. 서버는 완전한 개인 키가 담긴 메시지를 모두 거부합니다.

## 환불 방식

| 상황 | 결과 |
|---|---|
| 메이커가 XMR을 입금하지 않음 | t0 전에 환불(앱이 안내) |
| 메이커가 XMR을 적게 입금함 | 확인하지 않고 t0 전에 환불 |
| 확인했는데 메이커가 수령하지 않음 | t1부터 환불 |
| 탭을 닫음 | [복구 파일](/ko/guides/what-to-do-if-you-closed-the-tab/)을 가지고 돌아오기 |

## 알아야 할 위험

1. **기한.** XMR이 오지 않았는데 제때 환불하지 않으면 USDT를 잃을 수 있습니다. 앱이 알려 주지만, 앱이 열려 있거나 파일을 가지고 돌아와야 합니다.
2. **복구 파일.** 이 파일과 비밀번호가 없으면 XMR을 받을 수도, 환불할 수도 없습니다. 저희가 대신 찾아 드릴 수 없습니다.
3. **USDT 동결.** 테더는 주소를 동결할 수 있습니다. 스왑마다 별도의 컨트랙트를 쓰지만 위험은 존재합니다.
4. **아직 없는 외부 감사.** 컨트랙트는 자동 검증(Halmos, Aderyn, Slither)을 통과했지만 소프트웨어에는 여전히 버그가 있을 수 있습니다. 스왑 1회당 100 USDT 상한이 한 번의 스왑이 감수하는 위험을 제한합니다.
5. **개인정보.** 모네로 노드 프록시는 브라우저가 무엇을 조회하는지 볼 수 있습니다. 직접 운영하는 노드를 쓸 수 있습니다.

## 앱을 보호하는 방법

- 엄격한 **Content Security Policy**: 앱은 자신의 코드만 실행합니다.
- 스크립트와 스타일에 **Subresource Integrity**를 적용하고, 암호화 핵심 모듈은 사용 전에 무결성을 검증합니다.
- **제3자 스크립트 없음**, 분석 도구 없음, 쿠키 없음.
- **검증 가능한 빌드:** 모든 파일의 `SHA256SUMS`와 IPFS 사본을 공개합니다.

## 감사

컨트랙트는 무료 공개 도구로 검증했습니다: **Halmos**(심볼릭 검증, 모든 입력에 대해 7/7 속성 증명), **Aderyn**(심각도 높음 0건), **Slither**(심각도 중간·높음 없음). 소스는 **Sourcify**에서 검증되었습니다(완전 일치). 보고서: [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). 외부 감사는 아직이며, 준비된 범위는 [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md)에 있습니다.

## 소스 코드와 제보

오픈 소스(AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). 취약점을 제보하려면 `SECURITY.md`에 설명된 대로 GitHub 비공개 제보를 이용하세요.
