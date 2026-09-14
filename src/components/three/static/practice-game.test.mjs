import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../../lib/game-engine.ts', import.meta.url), 'utf8');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: 9 } });
const exports_object = {};
runInNewContext(compiled.outputText, { exports: exports_object });
const {
    advancePracticeCountdown,
    calculateAccuracy,
    calculateWpm,
    createPracticeGameState,
    finishPracticeIfComplete,
    processKeystroke,
} = exports_object;

function createQuote(text = 'ab') {
    return { id: text, text, author: 'Test', difficulty: 1, charCount: text.length };
}

test('practice initializes an inert target and activates after the countdown', () => {
    const state = createPracticeGameState(createQuote(), 4000);
    assert.equal(state.status, 'countdown');
    assert.equal(state.startTime, 4000);
    assert.equal(state.opponentState.position, 0);
    assert.equal(state.opponentState.wpm, 0);
    assert.equal(advancePracticeCountdown(state, 3999), state);
    assert.equal(advancePracticeCountdown(state, 4000).status, 'active');
});

test('practice records typing accuracy and only completes after the quote', () => {
    let state = advancePracticeCountdown(createPracticeGameState(createQuote(), 1), 1);
    state = processKeystroke(state, 'a', true);
    assert.equal(state.myState.position, 1);
    state = processKeystroke(state, 'x', false);
    assert.equal(state.myState.position, 1);
    assert.equal(state.myState.totalKeystrokes, 2);
    assert.equal(state.myState.correctKeystrokes, 1);
    assert.equal(finishPracticeIfComplete(state, 10), state);
    state = processKeystroke(state, 'b', true);
    state = finishPracticeIfComplete(state, 25);
    assert.equal(state.status, 'finished');
    assert.equal(state.winner, 'me');
    assert.equal(state.endTime, 25);
    assert.equal(calculateAccuracy(2, 3), 2 / 3);
    assert.equal(calculateWpm(10, 60000), 2);
});

test('starting another practice run resets session progress', () => {
    let completed_state = advancePracticeCountdown(createPracticeGameState(createQuote('a'), 1), 1);
    completed_state = finishPracticeIfComplete(processKeystroke(completed_state, 'a', true), 5);
    const reset_state = createPracticeGameState(createQuote('new'), 100);
    assert.equal(completed_state.status, 'finished');
    assert.equal(reset_state.status, 'countdown');
    assert.equal(reset_state.myState.position, 0);
    assert.equal(reset_state.myState.totalKeystrokes, 0);
    assert.equal(reset_state.winner, null);
    assert.equal(reset_state.endTime, null);
});
