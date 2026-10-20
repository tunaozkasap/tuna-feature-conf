import { describe, expect, test } from 'vitest';
import type { Rule } from '../api/types';
import { countByStatus, ruleStatus, sortInEvaluationOrder } from './rules';

const NOW = new Date('2026-10-20T12:00:00Z');

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 1,
    featureId: 10,
    featureCode: 'NEW_CHECKOUT',
    environmentId: 20,
    environmentCode: 'PROD',
    qualifierId: 30,
    qualifierCode: 'COUNTRY',
    qualifierValue: 'NL',
    featureValue: 'true',
    enabled: true,
    ...overrides,
  };
}

describe('ruleStatus', () => {
  test('an enabled rule without dates is active', () => {
    expect(ruleStatus(rule(), NOW)).toBe('ACTIVE');
  });

  test('a rule that is not switched on is disabled, whatever its dates', () => {
    expect(ruleStatus(rule({ enabled: false }), NOW)).toBe('DISABLED');
    expect(ruleStatus(rule({ enabled: undefined }), NOW)).toBe('DISABLED');
    expect(ruleStatus(rule({ enabled: false, effectiveFrom: '2027-01-01T00:00:00Z' }), NOW)).toBe('DISABLED');
  });

  test('a rule whose start is still ahead is scheduled', () => {
    expect(ruleStatus(rule({ effectiveFrom: '2026-10-20T12:00:01Z' }), NOW)).toBe('SCHEDULED');
  });

  test('a rule whose end has passed is expired', () => {
    expect(ruleStatus(rule({ effectiveTo: '2026-10-20T11:59:59Z' }), NOW)).toBe('EXPIRED');
  });

  test('a rule is active from its start up to its end, both included', () => {
    const edges = { effectiveFrom: '2026-10-20T12:00:00Z', effectiveTo: '2026-10-20T12:00:00Z' };
    expect(ruleStatus(rule(edges), NOW)).toBe('ACTIVE');
    expect(ruleStatus(rule({ effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: '2027-01-01T00:00:00Z' }), NOW)).toBe(
      'ACTIVE',
    );
  });
});

describe('sortInEvaluationOrder', () => {
  test('orders by qualifier priority, then rule priority, both highest first', () => {
    const rules = [
      rule({ id: 1, qualifierPriority: 1, priority: 5 }),
      rule({ id: 2, qualifierPriority: 10, priority: 0 }),
      rule({ id: 3, qualifierPriority: 10, priority: 3 }),
      rule({ id: 4, qualifierPriority: 1, priority: 9 }),
    ];
    expect(sortInEvaluationOrder(rules).map((r) => r.id)).toEqual([3, 2, 4, 1]);
  });

  test('a missing priority counts as 0', () => {
    const rules = [
      rule({ id: 1, qualifierPriority: -1 }),
      rule({ id: 2 }),
      rule({ id: 3, qualifierPriority: 0, priority: 1 }),
    ];
    expect(sortInEvaluationOrder(rules).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  test('keeps the input order for equal priorities and leaves the input untouched', () => {
    const rules = [rule({ id: 1, priority: 0 }), rule({ id: 2, priority: 7 }), rule({ id: 3, priority: 0 })];
    expect(sortInEvaluationOrder(rules).map((r) => r.id)).toEqual([2, 1, 3]);
    expect(rules.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('countByStatus', () => {
  test('counts every status, including the ones no rule has', () => {
    const rules = [
      rule({ id: 1 }),
      rule({ id: 2 }),
      rule({ id: 3, enabled: false }),
      rule({ id: 4, effectiveFrom: '2027-01-01T00:00:00Z' }),
    ];
    expect(countByStatus(rules, NOW)).toEqual({ ACTIVE: 2, DISABLED: 1, SCHEDULED: 1, EXPIRED: 0 });
  });

  test('no rules, all zero', () => {
    expect(countByStatus([], NOW)).toEqual({ ACTIVE: 0, DISABLED: 0, SCHEDULED: 0, EXPIRED: 0 });
  });
});
