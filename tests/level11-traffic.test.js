import { test, expect } from 'bun:test';
import { update } from '../scripts/l11-traffic.js';

test('Level 11 traffic scans at 10 Hz and brakes using current positions between scans', () => {
  const car = { id: 'car', state: { dir: 1 }, session: {}, feetPosition: { x: -3.2, y: 0.14, z: 0 } };
  const lead = { id: 'lead', feetPosition: { ...car.feetPosition, z: 13 } };
  let now = 1000, scans = 0;
  const ctx = { self: car, place: { state: {}, players: [] }, now: () => now,
    query() { scans++; return [car, lead]; }, getObject: id => id === lead.id ? lead : undefined };
  update(ctx, 1 / 60);
  expect(scans).toBe(1);
  car.session.m.v = 2;
  lead.feetPosition.z = car.feetPosition.z + 5;
  now += 16;
  update(ctx, 1 / 60);
  expect(scans).toBe(1);
  expect(car.session.m.v).toBeLessThan(2);
  now = 1100;
  update(ctx, 1 / 60);
  expect(scans).toBe(2);
  car.feetPosition.z = 77.99;
  now += 16;
  update(ctx, 1 / 60);
  expect(car.feetPosition.z).toBe(-78);
  now += 16;
  update(ctx, 1 / 60);
  expect(scans).toBe(3);
});
