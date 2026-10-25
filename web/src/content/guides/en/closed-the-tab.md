---
key: closed-tab
lang: en
slug: what-to-do-if-you-closed-the-tab
title: What to do if you closed the tab mid-swap
description: "How to resume an MoneroP2P swap with your recovery file, what happens with deadlines t0 and t1 and when you must refund."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Resume a swap with the recovery file
  totalTime: PT5M
  steps:
    - name: Open the app
      text: Open the MoneroP2P app in any browser, ideally on the same device.
    - name: Choose Resume
      text: Click "Resume" and upload your recovery file (or use the copy in this browser if you saved it here).
    - name: Enter your password
      text: Type the password you used to encrypt the file.
    - name: Follow the action the app shows
      text: The app reads the contract state and tells you whether to confirm, wait, refund or receive the XMR.
---

**Short answer:** reopen the app, click "Resume", upload your recovery file and enter your password. The app will read the contract and tell you what to do. **Do it as soon as possible:** if the XMR was not verified and deadline t0 is close, you must refund in time.

## What happens while the tab is closed

Nothing is lost right away, but the contract clock keeps running:

| Moment | What can happen | What you do when you return |
|---|---|---|
| Before t0 | The maker may have locked the XMR | The app verifies it; you confirm or refund |
| Between t0 and t1 | The maker can claim (if they locked the XMR) | If they claimed, the app sends you the XMR |
| After t1 | If the maker did not claim | You refund your USDT |

**The risk:** if you do not come back before t0 and the maker did *not* lock the XMR, the contract still lets them claim between t0 and t1. That is why coming back soon, or not closing the tab, matters.

## If the maker already claimed

When claiming, the maker revealed their key half on-chain. With your recovery file the app rebuilds the full key and sends the XMR to your address, even days later. There is no deadline for this.

## If you lost the file

- If you use **the same browser** and did not clear its data, the app kept an encrypted copy: click "Resume" and enter your password without uploading a file.
- If you lost the file **and** the browser, there is no way to recover your key half. We do not have it.

## Tips

- Keep the file in two places (for example, your computer and a USB stick).
- Use a password you can remember.
- If you can, leave the tab open until the swap finishes.

Next: [how to swap USDT for Monero without intermediaries](/en/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
