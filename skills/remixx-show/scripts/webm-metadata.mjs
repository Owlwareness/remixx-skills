// Bounded, dependency-free WebM metadata probe. Declared width, height and duration must come from
// the emitted bytes, not wall-clock capture timing or the requested viewport.

function variableInteger(bytes, offset, keepMarker) {
  const first = bytes[offset];
  if (!first) throw new Error("Invalid WebM variable integer");
  let marker = 0x80;
  let length = 1;
  while (length <= 8 && (first & marker) === 0) {
    marker >>= 1;
    length += 1;
  }
  if (length > 8 || offset + length > bytes.length) {
    throw new Error("Truncated WebM variable integer");
  }
  let value = BigInt(keepMarker ? first : first & (marker - 1));
  for (let index = 1; index < length; index += 1) {
    value = (value << 8n) | BigInt(bytes[offset + index]);
  }
  const unknown = !keepMarker && value === (1n << BigInt(length * 7)) - 1n;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("WebM element is too large");
  }
  return { length, unknown, value: Number(value) };
}

function elements(bytes, start, end) {
  const result = [];
  let offset = start;
  while (offset < end) {
    const id = variableInteger(bytes, offset, true);
    const size = variableInteger(bytes, offset + id.length, false);
    const dataStart = offset + id.length + size.length;
    const elementEnd = size.unknown ? end : dataStart + size.value;
    if (dataStart > end || elementEnd > end || elementEnd <= offset) {
      throw new Error("Invalid WebM element bounds");
    }
    result.push({ id: id.value, dataStart, end: elementEnd });
    offset = elementEnd;
  }
  return result;
}

function required(values, id, name) {
  const value = values.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`WebM is missing ${name}`);
  return value;
}

function unsigned(bytes, element) {
  const length = element.end - element.dataStart;
  if (length < 1 || length > 8) throw new Error("Invalid WebM integer");
  let value = 0n;
  for (let offset = element.dataStart; offset < element.end; offset += 1) {
    value = (value << 8n) | BigInt(bytes[offset]);
  }
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("WebM integer is too large");
  }
  return Number(value);
}

function floating(bytes, element) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = element.end - element.dataStart;
  if (length === 4) return view.getFloat32(element.dataStart);
  if (length === 8) return view.getFloat64(element.dataStart);
  throw new Error("Invalid WebM floating-point value");
}

function text(bytes, element) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    bytes.subarray(element.dataStart, element.end),
  );
}

export function probeWebm(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 40) {
    throw new Error("WebM is truncated");
  }
  const top = elements(bytes, 0, bytes.length);
  required(top, 0x1a45dfa3, "EBML header");
  const segment = required(top, 0x18538067, "Segment");
  const segmentChildren = elements(bytes, segment.dataStart, segment.end);
  const info = required(segmentChildren, 0x1549a966, "Info");
  const infoChildren = elements(bytes, info.dataStart, info.end);
  const duration = floating(bytes, required(infoChildren, 0x4489, "Duration"));
  const scaleElement = infoChildren.find((element) => element.id === 0x2ad7b1);
  const timecodeScale = scaleElement
    ? unsigned(bytes, scaleElement)
    : 1_000_000;
  const durationMs = Math.round((duration * timecodeScale) / 1_000_000);
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 20_000) {
    throw new Error("WebM duration exceeds the limit");
  }

  const tracks = required(segmentChildren, 0x1654ae6b, "Tracks");
  const entries = elements(bytes, tracks.dataStart, tracks.end).filter(
    (element) => element.id === 0xae,
  );
  for (const entry of entries) {
    const fields = elements(bytes, entry.dataStart, entry.end);
    const type = fields.find((field) => field.id === 0x83);
    if (!type || unsigned(bytes, type) !== 1) continue;
    const codecId = text(bytes, required(fields, 0x86, "CodecID"));
    const codec =
      codecId === "V_VP8" ? "vp8" : codecId === "V_VP9" ? "vp9" : null;
    if (!codec) throw new Error("WebM video codec must be VP8 or VP9");
    const video = required(fields, 0xe0, "Video");
    const videoFields = elements(bytes, video.dataStart, video.end);
    const width = unsigned(bytes, required(videoFields, 0xb0, "PixelWidth"));
    const height = unsigned(bytes, required(videoFields, 0xba, "PixelHeight"));
    if (!width || !height || width * height > 16_000_000) {
      throw new Error("WebM dimensions exceed the pixel limit");
    }
    return { codec, durationMs, height, mime: "video/webm", width };
  }
  throw new Error("WebM has no decodable video track");
}
