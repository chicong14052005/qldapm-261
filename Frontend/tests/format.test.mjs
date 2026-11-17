import test from "node:test";
import assert from "node:assert/strict";
import { money, padStatNumber } from "../src/lib/format.ts";

test("money formats Vietnamese Dong without decimals and handles nullish values", () => {
  assert.match(money(159000), /159\.000/);
  assert.match(money(null), /0/);
  assert.match(money(undefined), /0/);
});

test("padStatNumber pads single-digit counts with a leading zero", () => {
  assert.equal(padStatNumber(5), "05");
  assert.equal(padStatNumber(12), "12");
});

