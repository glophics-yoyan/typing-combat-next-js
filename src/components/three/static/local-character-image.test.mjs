import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../../lib/local-character-image.ts', import.meta.url), 'utf8');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: 9 } });
const exports_object = {};
runInNewContext(compiled.outputText, { exports: exports_object });
const { validateCharacterImage } = exports_object;

test('local character images accept supported formats within the size limit', () => {
    assert.equal(validateCharacterImage({ type: 'image/jpeg', size: 1024 }), null);
    assert.equal(validateCharacterImage({ type: 'image/png', size: 1024 }), null);
    assert.equal(validateCharacterImage({ type: 'image/webp', size: 1024 }), null);
});

test('local character images reject unsupported formats and oversized files', () => {
    assert.equal(validateCharacterImage({ type: 'image/gif', size: 1024 }), 'Choose a JPEG, PNG, or WebP image.');
    assert.equal(validateCharacterImage({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), 'Choose an image smaller than 10 MB.');
});
