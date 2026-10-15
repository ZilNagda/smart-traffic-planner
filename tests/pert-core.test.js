'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, normalCdf, parsePredecessors } = require('../src/js/pert-core.js');

const sample = () => [
  ['A', 'Requirement analysis', '', 1, 2, 3],
  ['B', 'Feasibility', 'A', 1, 2, 3],
  ['C', 'Architecture', 'A', 2, 3, 4],
  ['D', 'Database', 'C', 1, 2, 3],
  ['E', 'UI/UX', 'C', 1, 2, 3],
  ['F', 'Traffic data', 'D', 2, 4, 6],
  ['G', 'Signal control', 'D', 3, 5, 7],
  ['H', 'Route suggestion', 'D', 2, 3, 4],
  ['I', 'Dashboard', 'E', 2, 3, 4],
  ['J', 'Integration', 'B,F,G,H,I', 1, 2, 3],
  ['K', 'Testing', 'J', 2, 3, 6],
  ['L', 'Deployment', 'K', 1, 2, 3],
].map(([id, name, pre, o, m, p]) => ({ id, name, pre, o, m, p }));

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('T1 default data: duration and critical path', () => {
  const r = compute(sample(), 21);
  close(r.duration, 19.33);
  assert.deepEqual(r.criticalPath, ['A', 'C', 'D', 'G', 'J', 'K', 'L']);
  close(r.sigma, 1.2);
});

test('T2 target 21 weeks gives about 91.7%', () => {
  close(compute(sample(), 21).probability * 100, 91.7, 0.3);
});

test('T3 target equal to duration gives about 50%', () => {
  const r = compute(sample(), 19.3333333);
  close(r.probability * 100, 50, 0.5);
});

test('slack values match hand calculation', () => {
  const r = compute(sample(), 21);
  const slack = Object.fromEntries(r.activities.map((a) => [a.id, a.slack]));
  close(slack.B, 8);
  close(slack.E, 2);
  close(slack.F, 1);
  close(slack.H, 2);
  close(slack.I, 2);
  close(slack.G, 0);
});

test('T4 raising K pessimistic time to 9 gives duration 19.83', () => {
  const rows = sample();
  rows.find((r) => r.id === 'K').p = 9;
  close(compute(rows, 21).duration, 19.83);
});

test('T5 F = 2/8/10 makes F critical and duration about 21.67', () => {
  const rows = sample();
  Object.assign(rows.find((r) => r.id === 'F'), { o: 2, m: 8, p: 10 });
  const r = compute(rows, 21);
  close(r.duration, 21.67);
  assert.ok(r.criticalPath.includes('F'));
  assert.ok(!r.criticalPath.includes('G'));
});

test('T6 circular dependency is rejected', () => {
  const rows = sample();
  rows[0].pre = 'L';
  assert.match(compute(rows, 21).error, /Circular dependency/);
});

test('T7 unknown predecessor is rejected', () => {
  const rows = sample();
  rows[1].pre = 'Z';
  assert.match(compute(rows, 21).error, /unknown predecessor "Z"/);
});

test('T8 duplicate ID is rejected', () => {
  const rows = sample();
  rows[1].id = 'A';
  assert.match(compute(rows, 21).error, /Duplicate/);
});

test('invalid time ordering and empty input are rejected', () => {
  const rows = sample();
  rows[2].o = 9;
  assert.match(compute(rows, 21).error, /O <= M <= P/);
  assert.match(compute([], 21).error, /at least one/);
});

test('helpers', () => {
  assert.deepEqual(parsePredecessors(' b, c ,,'), ['B', 'C']);
  close(normalCdf(0), 0.5, 1e-4);
  close(normalCdf(1.96), 0.975, 1e-3);
});
