import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { addressMessage, checkContact, isNickInput, parseNick, parsePayQuery, payQuery, signAddress, verifyAddress } from "../src/p2p/pay.ts";

// Llaves generadas en cada corrida: ninguna vive en el repositorio.
const alice = privateKeyToAccount(generatePrivateKey());
const mallory = privateKeyToAccount(generatePrivateKey());
const EVM = "0x000000000000000000000000000000000000dEaD";

test("una dirección firmada por la cuenta se verifica", async () => {
  const r = await signAddress(alice, "mainnet", "evm", EVM, 1_800_000_000);
  assert.equal(await verifyAddress(alice.address, "mainnet", r), true);
  // No importa cómo venga escrita la llave del usuario.
  assert.equal(await verifyAddress(alice.address.toLowerCase(), "mainnet", r), true);
});

test("si el servidor cambia la dirección, la firma deja de valer", async () => {
  const r = await signAddress(alice, "mainnet", "evm", EVM, 1_800_000_000);
  assert.equal(await verifyAddress(alice.address, "mainnet", { ...r, address: mallory.address }), false);
});

test("una firma de otra cuenta no pasa por la de la víctima", async () => {
  const forged = await signAddress(mallory, "mainnet", "evm", mallory.address, 1_800_000_000);
  assert.equal(await verifyAddress(alice.address, "mainnet", forged), false);
});

test("la firma no sirve en otra red, otra moneda ni con otra fecha", async () => {
  const r = await signAddress(alice, "stagenet", "evm", EVM, 1_800_000_000);
  assert.equal(await verifyAddress(alice.address, "mainnet", r), false);
  assert.equal(await verifyAddress(alice.address, "stagenet", { ...r, asset: "xmr" }), false);
  assert.equal(await verifyAddress(alice.address, "stagenet", { ...r, at: r.at + 1 }), false);
});

test("firmas rotas o basura: inválidas, sin lanzar", async () => {
  const r = await signAddress(alice, "mainnet", "evm", EVM, 1_800_000_000);
  for (const sig of ["0x", "0x" + "00".repeat(65), "hola", r.sig.slice(0, -2)]) assert.equal(await verifyAddress(alice.address, "mainnet", { ...r, sig: sig as `0x${string}` }), false, sig);
  assert.equal(await verifyAddress(alice.address, "mainnet", { ...r, at: 1.5 }), false);
});

test("el mensaje firmado es estable (lo arma igual el servidor)", () => {
  assert.equal(
    addressMessage("0xABCDEF0000000000000000000000000000000001", "mainnet", "xmr", "4Addr", 123),
    "MoneroP2P receive-by-nickname v1\nuser: 0xabcdef0000000000000000000000000000000001\nnetwork: mainnet\nasset: xmr\naddress: 4Addr\nat: 123",
  );
});

test("apodos", () => {
  assert.equal(parseNick("@Satoshi_mx"), "Satoshi_mx");
  assert.equal(parseNick("  pedro.g-1 "), "pedro.g-1");
  for (const bad of ["", "@", "ab", "con espacio", "a".repeat(21), "ñandú", "0x<script>"]) assert.equal(parseNick(bad), null, bad);
  assert.equal(isNickInput(" @juan"), true);
  assert.equal(isNickInput("0x000000000000000000000000000000000000dEaD"), false);
});

test("contactos: nuevo, conocido o el apodo ahora es de otra cuenta", () => {
  const contacts = { satoshi: { id: alice.address, nickname: "Satoshi", since: 1 } };
  assert.equal(checkContact(undefined, "Satoshi", alice.address), "new");
  assert.equal(checkContact(contacts, "otro", alice.address), "new");
  assert.equal(checkContact(contacts, "SATOSHI", alice.address.toLowerCase()), "known");
  assert.equal(checkContact(contacts, "satoshi", mallory.address), "changed");
});

test("enlace de cobro: ida y vuelta, e ignora lo que no tiene forma válida", () => {
  assert.equal(payQuery({ to: "juan", coin: "usdt", amount: "50" }), "?to=@juan&coin=usdt&amount=50");
  assert.deepEqual(parsePayQuery(payQuery({ to: "juan", coin: "usdt", amount: "50" })), { to: "juan", coin: "usdt", amount: "50" });
  assert.deepEqual(parsePayQuery("?to=juan&amount=1,5"), { to: "juan", amount: "1.5" });
  assert.deepEqual(parsePayQuery("to=%40juan&coin=doge&amount=-3"), { to: "juan" });
  assert.deepEqual(parsePayQuery("?to=@juan&amount=1e9"), { to: "juan" });
  assert.equal(parsePayQuery("?coin=usdt"), null);
  assert.equal(parsePayQuery("?to=<img>"), null);
});
