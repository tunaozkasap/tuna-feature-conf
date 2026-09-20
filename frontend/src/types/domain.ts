export type FeatureQualifierValueType = 'NUMERIC' | 'BOOLEAN' | 'TEXT' | 'JSON';

export interface Project {
  id: number;
  name: string;
  description: string;
}

export interface Feature {
  id: number;
  code: string;
  name: string;
  description: string;
  projectId: number;
  defaultValue?: string;
  enabled?: boolean;
}

export interface FeatureQualifier {
  id: number;
  code: string;
  name: string;
  description: string;
  priority: number;
  valueType: FeatureQualifierValueType;
  projectId: number;
}

export interface FeatureRule {
  id: number;
  featureId: number;
  qualifierId: number;
  qualifierValue: string;
  featureValue: string;
  priority?: number;
  enabled: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string;
}

export interface EvaluationResult {
  featureCode: string;
  featureName: string;
  resolvedValue: string;
  source: 'RULE_MATCH' | 'DEFAULT_VALUE' | 'DISABLED';
  matchingRule?: {
    ruleId: number;
    qualifierCode: string;
    qualifierPriority: number;
    expectedValue: string;
    receivedValue: string;
  };
  evaluationLog: string[];
}
