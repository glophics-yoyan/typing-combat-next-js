import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../combat-timeline.ts', import.meta.url), 'utf8');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: 9 } });
const exports_object = {};
runInNewContext(compiled.outputText, { exports: exports_object });
const { createTimeline, advanceTimeline, getWordAttacks, fighterPositions } = exports_object;

function createSnapshot() {
    return { quote_text: 'One, two! three four five six seven eight.', connected: true, status: 'active', winner: null, paused: false, players: [{ position: 0, mistakes: 0, hp: 100 }, { position: 0, mistakes: 0, hp: 100 }] };
}

test('words preserve punctuation, cycle attacks, and include the final word', () => {
    const words = getWordAttacks('One,  two!\nthree four');
    assert.equal(words.map((word) => word.kind).join(','), 'jab,cross,kick,throw');
    assert.equal(words[0].word, 'One,');
    assert.equal(words[3].end, 21);
});

test('both sides trigger combos and impact exactly once', () => {
    for (const side of [0, 1]) {
        const timeline = createTimeline();
        const snapshot = createSnapshot();
        advanceTimeline(timeline, snapshot, 0);
        for (let index = 0; index < 4; index++) {
            snapshot.players[side].position = timeline.words[index].end;
            const now = index + 1;
            advanceTimeline(timeline, snapshot, now);
            assert.equal(timeline.fighters[side].attack.kind, ['jab', 'cross', 'kick', 'throw'][index]);
            advanceTimeline(timeline, snapshot, now + .57);
            advanceTimeline(timeline, snapshot, now + .58);
            advanceTimeline(timeline, snapshot, now + .9);
        }
        assert.equal(timeline.fighters[1 - side].hits, 4);
    }
});

test('network bursts retain at most two pending actions', () => {
    const timeline = createTimeline();
    const snapshot = createSnapshot();
    advanceTimeline(timeline, snapshot, 0);
    snapshot.players[0].position = 4;
    advanceTimeline(timeline, snapshot, .1);
    snapshot.players[0].position = snapshot.quote_text.length;
    advanceTimeline(timeline, snapshot, .2);
    assert.equal(timeline.fighters[0].queue.length, 2);
    assert.equal(timeline.fighters[0].attack.started_at, .1);
    advanceTimeline(timeline, snapshot, .3);
    assert.equal(timeline.fighters[0].attack.started_at, .1);
});

test('mistakes suppress charge without changing HP or position', () => {
    const timeline = createTimeline();
    const snapshot = createSnapshot();
    advanceTimeline(timeline, snapshot, 0);
    snapshot.players[0].position = 1;
    advanceTimeline(timeline, snapshot, .1);
    assert.ok(timeline.fighters[0].charge_until > .1);
    snapshot.players[0].mistakes = 1;
    advanceTimeline(timeline, snapshot, .2);
    assert.equal(timeline.fighters[0].charge_until, 0);
    assert.equal(snapshot.players[0].hp, 100);
    assert.equal(snapshot.players[0].position, 1);
});

test('reconnect and entry baseline do not replay historical words', () => {
    const timeline = createTimeline();
    const snapshot = createSnapshot();
    snapshot.players[0].position = 15;
    advanceTimeline(timeline, snapshot, 0);
    assert.equal(timeline.fighters[0].attack, null);
    snapshot.connected = false;
    advanceTimeline(timeline, snapshot, .1);
    snapshot.players[0].position = 25;
    snapshot.connected = true;
    advanceTimeline(timeline, snapshot, .2);
    assert.equal(timeline.fighters[0].queue.length, 0);
    assert.equal(timeline.fighters[0].attack, null);
});

test('final word can strike on finish, but queues and paused effects clear', () => {
    const timeline = createTimeline();
    const snapshot = createSnapshot();
    advanceTimeline(timeline, snapshot, 0);
    snapshot.players[0].position = snapshot.quote_text.length;
    snapshot.status = 'finished';
    snapshot.winner = 'me';
    advanceTimeline(timeline, snapshot, .1);
    assert.equal(timeline.fighters[0].attack.word, 'eight.');
    assert.equal(timeline.fighters[0].queue.length, 0);
    snapshot.paused = true;
    advanceTimeline(timeline, snapshot, .2);
    assert.equal(timeline.fighters[0].attack, null);
    assert.equal(timeline.fighters[1].hit_at, -10);
});

test('sustained bursts stay bounded and stop after disconnect', () => {
    const timeline = createTimeline();
    const snapshot = createSnapshot();
    snapshot.quote_text = 'word '.repeat(2000);
    advanceTimeline(timeline, snapshot, 0);
    for (let index = 1; index < 5000; index++) {
        snapshot.players[0].position = index;
        advanceTimeline(timeline, snapshot, index * .01);
        assert.ok(timeline.fighters[0].queue.length <= 2);
    }
    snapshot.connected = false;
    advanceTimeline(timeline, snapshot, 51);
    assert.equal(timeline.fighters[0].attack, null);
    assert.equal(timeline.fighters[0].queue.length, 0);
});

test('simultaneous lunges and pressure never overlap or leave the arena', () => {
    for (const pressure of [-10, -1, 0, 1, 10]) {
        for (const lunge of [0, .5, 1]) {
            const [left, right] = fighterPositions(pressure, lunge, lunge, 1, 1);
            assert.ok(right - left >= 1.65 - Number.EPSILON);
            assert.ok(left >= -2.9 && right <= 2.9);
        }
    }
});
