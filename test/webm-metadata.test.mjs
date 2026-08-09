import assert from "node:assert/strict";
import { test } from "node:test";
import { probeWebm } from "../skills/remixx-report/scripts/webm-metadata.mjs";

function element(id, payload) {
  if (payload.byteLength > 126) throw new Error("test EBML payload too large");
  return Buffer.concat([
    Buffer.from(id),
    Buffer.from([0x80 | payload.byteLength]),
    Buffer.from(payload),
  ]);
}

function webm(codec = "V_VP8", durationMs = 10_000) {
  const duration = Buffer.alloc(8);
  duration.writeDoubleBE(durationMs);
  const info = element(
    [0x15, 0x49, 0xa9, 0x66],
    element([0x44, 0x89], duration),
  );
  const video = element(
    [0xe0],
    Buffer.concat([
      element([0xb0], Uint8Array.of(0x05, 0xa0)),
      element([0xba], Uint8Array.of(0x03, 0x84)),
    ]),
  );
  const entry = element(
    [0xae],
    Buffer.concat([
      element([0x83], Uint8Array.of(1)),
      element([0x86], Buffer.from(codec)),
      video,
    ]),
  );
  return Buffer.concat([
    element([0x1a, 0x45, 0xdf, 0xa3], element([0x42, 0x86], Uint8Array.of(1))),
    element(
      [0x18, 0x53, 0x80, 0x67],
      Buffer.concat([info, element([0x16, 0x54, 0xae, 0x6b], entry)]),
    ),
  ]);
}

test("reads exact Playwright-compatible VP8 metadata from emitted bytes", () => {
  assert.deepEqual(probeWebm(webm()), {
    codec: "vp8",
    durationMs: 10_000,
    height: 900,
    mime: "video/webm",
    width: 1440,
  });
});

test("rejects unsupported codecs and overlong recordings", () => {
  assert.throws(() => probeWebm(webm("V_AV1")), /VP8 or VP9/);
  assert.throws(() => probeWebm(webm("V_VP9", 20_001)), /duration/);
});
