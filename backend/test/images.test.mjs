import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType } from '../src/lib/images.js';

test('detectImageType reads magic bytes and rejects anything else', () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpeg');
  assert.equal(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'png');
  assert.equal(detectImageType(Buffer.from('RIFF1234WEBPVP8 ')), 'webp');
  assert.equal(detectImageType(Buffer.from('<html><script>'), 'utf8'), null);
  assert.equal(detectImageType(Buffer.from('GIF89a1234567')), null);
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
  assert.equal(detectImageType(undefined), null);
});
