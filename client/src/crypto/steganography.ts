/**
 * Text steganography using zero-width Unicode characters.
 *
 * Encodes arbitrary data as invisible characters hidden inside a cover text.
 * Uses 4 zero-width chars to represent 2 bits each, building bytes from the input.
 *
 * U+200B (ZWSP)  = 00
 * U+200C (ZWNJ)  = 01
 * U+200D (ZWJ)   = 10
 * U+FEFF (BOM)   = 11
 */

const ZW_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
const MARKER = "\u200B\uFEFF\u200B\uFEFF"; // start/end marker to find hidden data

function textToBits(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  return bits;
}

function bitsToText(bits: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function bitsToZeroWidth(bits: string): string {
  let result = "";
  for (let i = 0; i < bits.length; i += 2) {
    const pair = bits.slice(i, i + 2).padEnd(2, "0");
    result += ZW_CHARS[parseInt(pair, 2)];
  }
  return result;
}

function zeroWidthToBits(zw: string): string {
  let bits = "";
  for (const char of zw) {
    const idx = ZW_CHARS.indexOf(char);
    if (idx !== -1) {
      bits += idx.toString(2).padStart(2, "0");
    }
  }
  return bits;
}

export function hideInText(secret: string, coverText: string): string {
  const bits = textToBits(secret);
  const hidden = MARKER + bitsToZeroWidth(bits) + MARKER;
  const mid = Math.floor(coverText.length / 2);
  return coverText.slice(0, mid) + hidden + coverText.slice(mid);
}

export function extractFromText(stegoText: string): string | null {
  const parts = stegoText.split(MARKER);
  if (parts.length < 3) return null;
  const hidden = parts[1];
  const bits = zeroWidthToBits(hidden);
  try {
    return bitsToText(bits);
  } catch {
    return null;
  }
}

export function containsHidden(text: string): boolean {
  return text.includes(MARKER);
}
