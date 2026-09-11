import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { writeFileSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleMediaRequest } from './mediaProtocol'

const TEST_FILE = join(tmpdir(), 'range-test-file.bin')
const MISSING_FILE = join(tmpdir(), 'range-test-file-does-not-exist.bin')
const SIZE = 1000

beforeAll(() => {
  const data = Buffer.alloc(SIZE)
  for (let i = 0; i < SIZE; i++) data[i] = i % 256
  writeFileSync(TEST_FILE, data)
})

afterAll(() => {
  unlinkSync(TEST_FILE)
})

function urlFor(): string {
  return pathToFileURL(TEST_FILE).toString().replace('file://', 'vmfile://')
}

async function readAll(res: Response): Promise<Buffer> {
  const buf = await res.arrayBuffer()
  return Buffer.from(buf)
}

describe('handleMediaRequest (vmfile:// protocol, Range support)', () => {
  it('returns the full file with 200 when no Range header is sent', async () => {
    const req = new Request(urlFor())
    const res = await handleMediaRequest(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    const body = await readAll(res)
    expect(body.length).toBe(SIZE)
    expect(body[0]).toBe(0)
    expect(body[999]).toBe(999 % 256)
  })

  it('returns exactly the requested byte range with 206 Partial Content', async () => {
    const req = new Request(urlFor(), { headers: { Range: 'bytes=100-199' } })
    const res = await handleMediaRequest(req)
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe(`bytes 100-199/${SIZE}`)
    expect(res.headers.get('content-length')).toBe('100')
    const body = await readAll(res)
    expect(body.length).toBe(100)
    expect(body[0]).toBe(100 % 256)
    expect(body[99]).toBe(199 % 256)
  })

  it('handles an open-ended range (bytes=500-) correctly, simulating a seek near the end', async () => {
    const req = new Request(urlFor(), { headers: { Range: 'bytes=500-' } })
    const res = await handleMediaRequest(req)
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe(`bytes 500-999/${SIZE}`)
    const body = await readAll(res)
    expect(body.length).toBe(500)
    expect(body[0]).toBe(500 % 256)
    expect(body[body.length - 1]).toBe(999 % 256)
  })

  it('returns 404 for a file that does not exist', async () => {
    const req = new Request(pathToFileURL(MISSING_FILE).toString().replace('file://', 'vmfile://'))
    const res = await handleMediaRequest(req)
    expect(res.status).toBe(404)
  })
})
