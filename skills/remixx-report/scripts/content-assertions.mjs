// Pure content-assertion logic for browser captures, split out of capture_browser_demo.mjs so it
// can be unit tested without a browser, an ffmpeg or a network.
//
// Why this exists: every structural gate in the staging pipeline validates form. Byte length,
// sha256, mime, width, height and duration are all satisfied by a recording of an empty div. Three
// blank WebMs passed every one of them and reached `ingest_status: ready`. These functions are the
// content half of that gate, and they are deliberately dependency-free.

import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Decode a non-interlaced 8-bit greyscale PNG (colour type 0) to a flat pixel buffer.
 *
 * Remotion's bundled ffmpeg has no rawvideo muxer and sharp is not resolvable from the skill
 * script's location under pnpm's layout, so frames are extracted as grey PNGs and unfiltered here
 * with nothing but node:zlib.
 */
export const decodeGrayPng = (buffer) => {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error("frame is not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || colorType !== 0 || interlace !== 0) {
        throw new Error(
          `expected non-interlaced 8-bit greyscale PNG, got bitDepth ${bitDepth} colorType ${colorType} interlace ${interlace}`,
        );
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (width <= 0 || height <= 0) throw new Error("PNG has no IHDR dimensions");
  if (idat.length === 0) throw new Error("PNG has no IDAT data");

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width + 1;
  if (raw.length < stride * height) {
    throw new Error("PNG pixel data is truncated");
  }
  const pixels = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * stride];
    const rowIn = raw.subarray(y * stride + 1, y * stride + 1 + width);
    const rowOut = pixels.subarray(y * width, (y + 1) * width);
    const rowUp =
      y > 0 ? pixels.subarray((y - 1) * width, y * width) : undefined;
    for (let x = 0; x < width; x += 1) {
      const value = rowIn[x];
      const left = x > 0 ? rowOut[x - 1] : 0;
      const up = rowUp ? rowUp[x] : 0;
      const upLeft = rowUp && x > 0 ? rowUp[x - 1] : 0;
      let result;
      if (filter === 0) result = value;
      else if (filter === 1) result = value + left;
      else if (filter === 2) result = value + up;
      else if (filter === 3) result = value + ((left + up) >> 1);
      else if (filter === 4) {
        const predicted = left + up - upLeft;
        const dLeft = Math.abs(predicted - left);
        const dUp = Math.abs(predicted - up);
        const dUpLeft = Math.abs(predicted - upLeft);
        result =
          value +
          (dLeft <= dUp && dLeft <= dUpLeft
            ? left
            : dUp <= dUpLeft
              ? up
              : upLeft);
      } else {
        throw new Error(`unsupported PNG row filter ${filter}`);
      }
      rowOut[x] = result & 0xff;
    }
  }
  return { width, height, pixels };
};

/**
 * Reduce sampled frames to the two numbers that distinguish a real recording from a blank one:
 * the greatest per-frame spread, and the greatest change between consecutive frames.
 */
export const summariseFrames = (framePixels) => {
  if (!Array.isArray(framePixels) || framePixels.length < 1) {
    throw new Error(
      "the recording yielded no decodable frames; it is not a usable video",
    );
  }
  const stats = framePixels.map((pixels) => {
    let sum = 0;
    for (const value of pixels) sum += value;
    const mean = sum / pixels.length;
    let variance = 0;
    for (const value of pixels) variance += (value - mean) ** 2;
    return { mean, stdDev: Math.sqrt(variance / pixels.length) };
  });

  let maxInterFrameDelta = 0;
  for (let index = 1; index < framePixels.length; index += 1) {
    const previous = framePixels[index - 1];
    const current = framePixels[index];
    if (previous.length !== current.length) continue;
    let delta = 0;
    for (let offset = 0; offset < current.length; offset += 1) {
      delta += Math.abs(current[offset] - previous[offset]);
    }
    maxInterFrameDelta = Math.max(maxInterFrameDelta, delta / current.length);
  }

  return {
    frameCount: framePixels.length,
    peakStdDev: Number(
      Math.max(...stats.map((frame) => frame.stdDev)).toFixed(4),
    ),
    maxInterFrameDelta: Number(maxInterFrameDelta.toFixed(4)),
  };
};

/**
 * Assertion 2 -- playback position must genuinely advance while recording.
 *
 * Positive deltas are accumulated rather than comparing the first sample to the last, because a
 * looping or seeking stream wraps currentTime backwards and would otherwise read as frozen.
 */
export const assertPlaybackAdvanced = (samples, { minPlaybackAdvanceMs }) => {
  if (!Array.isArray(samples) || samples.length < 2) {
    throw new Error(
      "playback was sampled fewer than twice; cannot prove the stream advanced",
    );
  }
  let advancedMs = 0;
  let wraps = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const delta =
      (samples[index].currentTime - samples[index - 1].currentTime) * 1000;
    if (delta > 0) advancedMs += delta;
    else if (delta < 0) wraps += 1;
  }
  const pausedSamples = samples.filter((sample) => sample.paused).length;
  if (!(advancedMs >= minPlaybackAdvanceMs)) {
    throw new Error(
      `<video> currentTime advanced ${advancedMs.toFixed(0)}ms over ` +
        `${samples.length} samples (${pausedSamples} paused), below the required ` +
        `${minPlaybackAdvanceMs}ms. The player was open but frozen, so the recording has no ` +
        `motion in it.`,
    );
  }
  return {
    advancedMs: Number(advancedMs.toFixed(1)),
    samples: samples.length,
    pausedSamples,
    wraps,
  };
};

/**
 * Assertion 3 -- the emitted file must contain something, and something that changes.
 */
export const assertFrameContent = (
  stats,
  { minFrameStdDev, minInterFrameDelta, expectStaticPage },
) => {
  if (stats.peakStdDev < minFrameStdDev) {
    throw new Error(
      `every sampled frame is near-uniform (peak stdDev ${stats.peakStdDev} < ` +
        `${minFrameStdDev}) across ${stats.frameCount} frames. This is a blank recording.`,
    );
  }
  if (!expectStaticPage && stats.maxInterFrameDelta < minInterFrameDelta) {
    throw new Error(
      `no frame-to-frame change detected (max mean delta ${stats.maxInterFrameDelta} < ` +
        `${minInterFrameDelta}) across ${stats.frameCount} frames. The recording is a still ` +
        `image. If that is intended, set content.expectStaticPage.`,
    );
  }
  return stats;
};

/**
 * Assertion 1's verdict, split from the DOM probe so it can be tested without a browser.
 */
export const assertVideoState = (state, selector, { minReadyState }) => {
  if (state.notAVideo) {
    throw new Error(
      `content.videoSelector ${selector} matched <${String(
        state.tag,
      ).toLowerCase()}>, not a <video>.`,
    );
  }
  if (state.error !== null && state.error !== undefined) {
    throw new Error(
      `<video> reported MediaError code ${state.error} for ${selector}.`,
    );
  }
  if (state.readyState < minReadyState) {
    throw new Error(
      `<video> readyState ${state.readyState} is below the required ${minReadyState} ` +
        `(networkState ${state.networkState}). The stream never became playable, so a recording ` +
        `would capture an empty player.`,
    );
  }
  if (!(state.videoWidth > 0) || !(state.videoHeight > 0)) {
    throw new Error(
      `<video> has no intrinsic dimensions (${state.videoWidth}x${state.videoHeight}); ` +
        `no frames are being decoded.`,
    );
  }
  return state;
};
