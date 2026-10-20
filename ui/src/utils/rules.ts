/**
 * Rule logic the screens need, written to match the backend exactly:
 *  - `ruleStatus` mirrors FeatureRuleEntity.isEffective (persistence module),
 *  - `sortInEvaluationOrder` mirrors EvaluationService.EVALUATION_ORDER (service module).
 * If one of those changes in Java, change it here too.
 */
import type { Rule } from '../api/types';

/**
 * ACTIVE: used by evaluations right now.
 * DISABLED: switched off.
 * SCHEDULED: switched on, but its start time is still in the future.
 * EXPIRED: switched on, but its end time has passed.
 */
export type RuleStatus = 'ACTIVE' | 'DISABLED' | 'SCHEDULED' | 'EXPIRED';

export function ruleStatus(rule: Rule, now: Date = new Date()): RuleStatus {
  if (rule.enabled !== true) {
    return 'DISABLED';
  }
  if (rule.effectiveFrom && now < new Date(rule.effectiveFrom)) {
    return 'SCHEDULED';
  }
  if (rule.effectiveTo && now > new Date(rule.effectiveTo)) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

/**
 * The order in which the backend checks rules: higher qualifier priority first, then higher rule priority.
 * The first rule whose qualifier value matches the request decides the feature's value.
 */
export function sortInEvaluationOrder(rules: Rule[]): Rule[] {
  const sorted = [...rules];
  sorted.sort((a, b) => {
    const qualifierOrder = (b.qualifierPriority ?? 0) - (a.qualifierPriority ?? 0);
    if (qualifierOrder !== 0) {
      return qualifierOrder;
    }
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
  return sorted;
}

/** How many rules have each status, e.g. `{ ACTIVE: 12, DISABLED: 1, SCHEDULED: 2, EXPIRED: 0 }`. */
export function countByStatus(rules: Rule[], now: Date = new Date()): Record<RuleStatus, number> {
  const counts: Record<RuleStatus, number> = { ACTIVE: 0, DISABLED: 0, SCHEDULED: 0, EXPIRED: 0 };
  for (const rule of rules) {
    counts[ruleStatus(rule, now)] += 1;
  }
  return counts;
}
