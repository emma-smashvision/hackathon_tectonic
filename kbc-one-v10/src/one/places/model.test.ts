import { describe, expect, test } from 'bun:test';
import { PEOPLE } from '../people';
import { buildPlaces, createDemoState, moveToGoal } from './model';

describe('usable places', () => {
  test('calm personas keep known income and cover without invented tenure or loan progress', () => {
    const margaret = buildPlaces(PEOPLE.margaret), nadia = buildPlaces(PEOPLE.nadia);
    expect(margaret[0].label).toBe('Home insurance recorded');
    expect(margaret.find(p => p.id === 'pension')!.label).toBe('€ 1.890/month pension');
    expect(nadia[0].label).toBe('€ 720/month mortgage');
    expect(nadia[0].progress).toBeUndefined();
    expect(nadia.find(p => p.id === 'savings')!.goals).toHaveLength(0);
    for (const places of [margaret, nadia]) {
      expect(places[0].label).not.toContain('rented');
      expect(places[0].attachments[0].state).toBe('ok');
      expect(places.flatMap(p => p.lessons).every(l => !l.missionId)).toBe(true);
    }
  });
  test('all four personas have account-backed destinations and relevant extra places', () => {
    for (const id of ['tom', 'karim', 'sofie', 'lina']) {
      const places = buildPlaces(PEOPLE[id]);
      expect(places.map(p => p.id)).toContain('savings');
      expect(places.every(p => p.lessons.length > 0)).toBe(true);
      expect(places.find(p => p.id === 'savings')!.accounts[0].balance).toBe(PEOPLE[id].household.balance);
    }
    expect(buildPlaces(PEOPLE.karim).find(p => p.id === 'business')!.goals[0].id).toBe('tax');
    expect(buildPlaces(PEOPLE.lina).find(p => p.id === 'kids')!.accounts[0].balance).toBe(3.1);
  });
  test('a goal allocation conserves money, updates its percent, and never mutates PEOPLE', () => {
    const personBefore = JSON.stringify(PEOPLE.tom), state = createDemoState(PEOPLE.tom);
    const before = JSON.stringify(state);
    const result = moveToGoal(state, 'current', 'g1', 50.25);
    expect(result.error).toBeUndefined();
    expect(result.state.accounts[0].balance).toBe(state.accounts[0].balance - 50.25);
    expect(result.state.goals[0].saved).toBe(2210.25);
    expect(result.state.goals[0].percent).toBe(2210.25 / 3000 * 100);
    expect(JSON.stringify(state)).toBe(before);
    expect(JSON.stringify(PEOPLE.tom)).toBe(personBefore);
    expect(buildPlaces(PEOPLE.tom, result.state).find(p => p.id === 'home')!.progress!.percent).toBe(result.state.goals[0].percent);
    expect(createDemoState(PEOPLE.lina).goals[0].saved).toBe(540);
  });
  test('invalid, overdrawn and overfilled allocations leave the exact state unchanged', () => {
    const state = createDemoState(PEOPLE.tom);
    for (const amount of [NaN, Infinity, -1, 0, .001, 100000, 840.01]) {
      const result = moveToGoal(state, 'current', 'g1', amount);
      expect(result.error).toBeDefined(); expect(result.state).toBe(state);
    }
    expect(moveToGoal(state, 'missing', 'g1', 10).state).toBe(state);
    expect(moveToGoal(state, 'current', 'missing', 10).state).toBe(state);
    const locked = { ...state, accounts: state.accounts.map(a => ({ ...a, locked: true })) };
    expect(moveToGoal(locked, 'current', 'g1', 10).state).toBe(locked);
    expect(moveToGoal(state, 'current', 'g1', 840).state.goals[0].percent).toBe(100);
  });
  test('mortgage principal, payment bricks and fixed rate come from Karim’s source loan', () => {
    const home = buildPlaces(PEOPLE.karim).find(p => p.id === 'home')!;
    expect(home.progress!.payments).toBe(176);
    expect(home.progress!.percent).toBeGreaterThan(49);
    expect(home.progress!.percent).toBeLessThan(50);
    expect(home.progress!.detail).toContain('240.000');
    expect(home.attachments.map(a => a.label).sort()).toEqual(['Balance insurance', 'Home insurance']);
    const beforeLoan = buildPlaces(PEOPLE.karim, undefined, { year: 2010, month: 0 })[0];
    expect(beforeLoan.progress!.payments).toBe(0);
    expect(beforeLoan.progress!.percent).toBe(0);
    const afterLoan = buildPlaces(PEOPLE.karim, undefined, { year: 2040, month: 0 })[0];
    expect(afterLoan.progress!.payments).toBe(300);
    expect(afterLoan.progress!.percent).toBeCloseTo(100);
  });
  test('renewal is human-readable, pension maximum is source data, and unknowns remain unknown', () => {
    const tom = buildPlaces(PEOPLE.tom);
    expect(tom.find(p => p.id === 'car')!.label).toContain('+8% on 2 Nov');
    expect(tom.find(p => p.id === 'pension')!.progress).toBeUndefined();
    expect(tom.find(p => p.id === 'home')!.facts.find(f => f.label.includes('Leuven'))!.value).toContain('not recorded');
    const pension = buildPlaces(PEOPLE.karim).find(p => p.id === 'pension')!;
    expect(pension.progress!.percent).toBe(870 / 1050 * 100);
    expect(buildPlaces(PEOPLE.sofie).find(p => p.id === 'home')!.progress!.percent).toBe(41300 / 60000 * 100);
    expect(buildPlaces(PEOPLE.lina, createDemoState(PEOPLE.tom)).find(p => p.id === 'savings')!.goals[0].saved).toBe(540);
  });
});
