import { Project, Feature, FeatureQualifier, FeatureRule, EvaluationResult } from '../types/domain';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Retail Banking Portal',
    description: 'Core web and mobile consumer banking experience',
  },
  {
    id: 2,
    name: 'Merchant Checkout API',
    description: 'E-commerce payment gateway and merchant configurations',
  },
];

export const INITIAL_QUALIFIERS: FeatureQualifier[] = [
  {
    id: 1,
    code: 'USER_ID',
    name: 'User Identifier',
    description: 'Exact customer user ID for canary and direct targeting',
    priority: 100,
    valueType: 'TEXT',
    projectId: 1,
  },
  {
    id: 2,
    code: 'USER_SEGMENT',
    name: 'User Segment',
    description: 'Target demographic tier (e.g. VIP, PREMIUM, RETAIL, BETA)',
    priority: 80,
    valueType: 'TEXT',
    projectId: 1,
  },
  {
    id: 3,
    code: 'REQUEST_CHANNEL',
    name: 'Request Channel',
    description: 'Originating client application (e.g. IOS, ANDROID, WEB_PORTAL)',
    priority: 60,
    valueType: 'TEXT',
    projectId: 1,
  },
  {
    id: 4,
    code: 'APP_VERSION',
    name: 'App Version',
    description: 'Client app semver string',
    priority: 40,
    valueType: 'TEXT',
    projectId: 1,
  },
  {
    id: 5,
    code: 'AGREEMENT_NO',
    name: 'Agreement Number',
    description: 'Loan or account agreement identifier',
    priority: 90,
    valueType: 'TEXT',
    projectId: 1,
  },
  {
    id: 6,
    code: 'MERCHANT_CATEGORY',
    name: 'Merchant Category Code',
    description: 'MCC grouping for payment processing overrides',
    priority: 70,
    valueType: 'NUMERIC',
    projectId: 2,
  },
];

export const INITIAL_FEATURES: Feature[] = [
  {
    id: 1,
    code: 'NEW_DASHBOARD_V2',
    name: 'New Dashboard Experience',
    description: 'Enables redesigned high-performance account overview widget',
    projectId: 1,
    defaultValue: 'false',
    enabled: true,
  },
  {
    id: 2,
    code: 'INSTANT_TRANSFER_LIMIT',
    name: 'Instant Transfer Max Limit',
    description: 'Maximum permitted instant outbound transfer amount ($)',
    projectId: 1,
    defaultValue: '5000',
    enabled: true,
  },
  {
    id: 3,
    code: 'AI_FINANCIAL_INSIGHTS',
    name: 'AI Smart Insights Banner',
    description: 'Enables predictive AI spending and budgeting advisor',
    projectId: 1,
    defaultValue: '{"enabled": false, "model": "v1"}',
    enabled: true,
  },
  {
    id: 4,
    code: 'ONE_CLICK_CHECKOUT',
    name: 'One-Click Fast Checkout',
    description: 'Streamlined tokenized 1-click checkout flow for merchants',
    projectId: 2,
    defaultValue: 'false',
    enabled: true,
  },
];

export const INITIAL_RULES: FeatureRule[] = [
  {
    id: 1,
    featureId: 1,
    qualifierId: 1,
    qualifierValue: 'usr_alpha_99',
    featureValue: 'true',
    priority: 10,
    enabled: true,
    description: 'Canary tester override for lead architect',
  },
  {
    id: 2,
    featureId: 1,
    qualifierId: 2,
    qualifierValue: 'VIP',
    featureValue: 'true',
    priority: 5,
    enabled: true,
    description: 'Enable Dashboard V2 for all VIP private banking clients',
  },
  {
    id: 3,
    featureId: 1,
    qualifierId: 3,
    qualifierValue: 'IOS',
    featureValue: 'true',
    priority: 1,
    enabled: true,
    description: 'Enable Dashboard V2 for all iOS mobile users',
  },
  {
    id: 4,
    featureId: 2,
    qualifierId: 2,
    qualifierValue: 'VIP',
    featureValue: '50000',
    priority: 5,
    enabled: true,
    description: 'Boost transfer limit to $50,000 for VIP customers',
  },
  {
    id: 5,
    featureId: 2,
    qualifierId: 5,
    qualifierValue: 'AGR-PREMIUM-77',
    featureValue: '100000',
    priority: 9,
    enabled: true,
    description: 'Corporate agreement override for $100k limit',
  },
  {
    id: 6,
    featureId: 3,
    qualifierId: 2,
    qualifierValue: 'BETA',
    featureValue: '{"enabled": true, "model": "gemini-pro-v2", "maxTokens": 4096}',
    priority: 1,
    enabled: true,
    description: 'Beta cohort rollout for AI advisor',
  },
];

/**
 * Real-time feature evaluation engine:
 * Evaluates incoming request parameters against features, qualifiers, and rules.
 * Respects qualifier priority and rule priority.
 */
export function evaluateFeature(
  feature: Feature,
  rules: FeatureRule[],
  qualifiers: FeatureQualifier[],
  requestContext: Record<string, string>
): EvaluationResult {
  const logs: string[] = [];
  logs.push(`Evaluating feature '${feature.code}' (ID: ${feature.id})`);

  if (feature.enabled === false) {
    logs.push(`Feature is globally disabled. Returning default: '${feature.defaultValue ?? 'false'}'`);
    return {
      featureCode: feature.code,
      featureName: feature.name,
      resolvedValue: feature.defaultValue ?? 'false',
      source: 'DISABLED',
      evaluationLog: logs,
    };
  }

  // Filter enabled and effective rules for this feature
  const now = new Date();
  const featureRules = rules.filter((r) => {
    if (!r.enabled || r.featureId !== feature.id) return false;
    if (r.effectiveFrom && new Date(r.effectiveFrom) > now) return false;
    if (r.effectiveTo && new Date(r.effectiveTo) < now) return false;
    return true;
  });
  logs.push(`Found ${featureRules.length} active and effective rule(s) for this feature`);

  // Map qualifier metadata
  const qualifierMap = new Map<number, FeatureQualifier>();
  qualifiers.forEach((q) => qualifierMap.set(q.id, q));

  // Sort candidate rules by qualifier priority (descending), then rule priority (descending)
  const sortedRules = [...featureRules].sort((a, b) => {
    const qA = qualifierMap.get(a.qualifierId);
    const qB = qualifierMap.get(b.qualifierId);
    const qPriorityA = qA ? qA.priority : 0;
    const qPriorityB = qB ? qB.priority : 0;

    if (qPriorityA !== qPriorityB) {
      return qPriorityB - qPriorityA; // Higher qualifier priority first
    }
    return (b.priority ?? 0) - (a.priority ?? 0); // Higher rule priority first
  });

  for (const rule of sortedRules) {
    const qualifier = qualifierMap.get(rule.qualifierId);
    if (!qualifier) continue;

    const requestVal = requestContext[qualifier.code]?.trim();
    logs.push(
      `Checking Rule #${rule.id} [Qualifier: ${qualifier.code}, Expected: '${rule.qualifierValue}', Request Value: '${requestVal ?? '<missing>'}'] (Qualifier Priority: ${qualifier.priority})`
    );

    if (requestVal && requestVal.toLowerCase() === rule.qualifierValue.trim().toLowerCase()) {
      logs.push(`>> MATCH FOUND on Rule #${rule.id}! Resolved value: '${rule.featureValue}'`);
      return {
        featureCode: feature.code,
        featureName: feature.name,
        resolvedValue: rule.featureValue,
        source: 'RULE_MATCH',
        matchingRule: {
          ruleId: rule.id,
          qualifierCode: qualifier.code,
          qualifierPriority: qualifier.priority,
          expectedValue: rule.qualifierValue,
          receivedValue: requestVal,
        },
        evaluationLog: logs,
      };
    }
  }

  logs.push(`No rules matched the request context. Fallback to default value: '${feature.defaultValue ?? 'false'}'`);
  return {
    featureCode: feature.code,
    featureName: feature.name,
    resolvedValue: feature.defaultValue ?? 'false',
    source: 'DEFAULT_VALUE',
    evaluationLog: logs,
  };
}
