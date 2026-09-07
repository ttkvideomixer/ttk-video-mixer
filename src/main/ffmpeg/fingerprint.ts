import { spawn } from 'node:child_process'
import { getFfmpegPath } from './binaries'

const HASH_SIZE = 8 // 8x8 grayscale samples per frame
const POPCOUNT_4BIT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]

function extractGrayFrame(filePath: string, timestampSeconds: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', timestampSeconds.toFixed(3),
      '-i', filePath,
      '-frames:v', '1',
      '-vf', `scale=${HASH_SIZE}:${HASH_SIZE}:flags=area,format=gray`,
      '-f', 'rawvideo',
      '-'
    ]
    const child = spawn(getFfmpegPath(), args, { windowsHide: true })
    const chunks: Buffer[] = []
    child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('error', reject)
    child.on('close', () => {
      const buffer = Buffer.concat(chunks)
      if (buffer.length < HASH_SIZE * HASH_SIZE) {
        reject(new Error('Nao foi possivel extrair frame para fingerprint visual.'))
      } else {
        resolve(buffer.subarray(0, HASH_SIZE * HASH_SIZE))
      }
    })
  })
}

export function averageHashHex(pixels: Buffer): string {
  let sum = 0
  for (const value of pixels) sum += value
  const average = sum / pixels.length

  let hex = ''
  for (let i = 0; i < pixels.length; i += 4) {
    let nibble = 0
    for (let bit = 0; bit < 4; bit++) {
      nibble = (nibble << 1) | (pixels[i + bit] >= average ? 1 : 0)
    }
    hex += nibble.toString(16)
  }
  return hex
}

/**
 * Lightweight perceptual fingerprint: samples 3 frames (20%/50%/80% of the
 * video), each reduced to an 8x8 grayscale average-hash, concatenated into
 * one string. Two renders with the same fingerprint (or a very small
 * Hamming distance) are visually near-identical.
 */
export async function computeVisualFingerprint(filePath: string, durationSeconds: number): Promise<string> {
  const safeDuration = durationSeconds > 0 ? durationSeconds : 3
  const timestamps = [0.2, 0.5, 0.8].map((fraction) =>
    Math.min(safeDuration - 0.05, Math.max(0.05, safeDuration * fraction))
  )

  const hashes: string[] = []
  for (const timestamp of timestamps) {
    hashes.push(averageHashHex(await extractGrayFrame(filePath, timestamp)))
  }
  return hashes.join('')
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER
  let distance = 0
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    distance += POPCOUNT_4BIT[xor]
  }
  return distance
}
