import assert from "node:assert/strict";
import { test } from "node:test";
import { forwarded } from "./server.mjs";

const TRUSTED = new Set(["192.168.1.100", "192.168.1.101"]);

const asked = (peer, headers = {}) => ({
  socket: { remoteAddress: peer },
  headers: { host: "opus.example", ...headers },
});

test("the tunnel's word for the client is taken where the chain vouches for it", () => {
  const said = forwarded(
    asked("::ffff:192.168.1.100", {
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "10.0.0.1, 203.0.113.9",
    }),
    TRUSTED,
  );
  assert.equal(said["cf-connecting-ip"], "203.0.113.9");
  assert.equal(said["x-forwarded-for"], "203.0.113.9");
  assert.equal(said["x-forwarded-host"], "opus.example");
});

test("the house proxy's forwarded address is the client, whatever cloudflare header was written", () => {
  const said = forwarded(
    asked("192.168.1.101", { "x-forwarded-for": "192.168.1.57", "cf-connecting-ip": "203.0.113.200" }),
    TRUSTED,
  );
  assert.equal(said["cf-connecting-ip"], "192.168.1.57");
  assert.equal(said["x-forwarded-for"], "192.168.1.57");
});

test("a trusted proxy that names nobody is the client itself", () => {
  const said = forwarded(asked("192.168.1.101"), TRUSTED);
  assert.equal(said["cf-connecting-ip"], "192.168.1.101");
  assert.equal(said["x-forwarded-for"], "192.168.1.101");
});

test("anybody else is the socket, whatever they wrote", () => {
  const said = forwarded(
    asked("::ffff:192.168.1.66", { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }),
    TRUSTED,
  );
  assert.equal(said["cf-connecting-ip"], "192.168.1.66");
  assert.equal(said["x-forwarded-for"], "192.168.1.66");
  assert.equal(said["x-forwarded-proto"], "http");
});
