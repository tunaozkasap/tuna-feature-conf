/** Small coloured labels used across the screens. One colour per meaning, the same everywhere. */
import { Badge, Tooltip } from '@mantine/core';
import type { QualifierValueType, Rule } from '../api/types';
import { formatDateTime } from '../utils/dates';
import { ruleStatus, type RuleStatus } from '../utils/rules';

const STATUS_COLORS: Record<RuleStatus, string> = {
  ACTIVE: 'teal',
  SCHEDULED: 'blue',
  EXPIRED: 'gray',
  DISABLED: 'red',
};

const STATUS_LABELS: Record<RuleStatus, string> = {
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled',
};

/** Active / Scheduled / Expired / Disabled, with the reason in a tooltip. */
export function RuleStatusBadge({ rule }: { rule: Rule }) {
  const status = ruleStatus(rule);
  let reason = 'Used by evaluations right now.';
  if (status === 'DISABLED') {
    reason = 'Switched off: evaluations skip it.';
  } else if (status === 'SCHEDULED') {
    reason = `Starts ${formatDateTime(rule.effectiveFrom)}.`;
  } else if (status === 'EXPIRED') {
    reason = `Ended ${formatDateTime(rule.effectiveTo)}.`;
  }
  return (
    <Tooltip label={reason}>
      <Badge color={STATUS_COLORS[status]} variant="light">
        {STATUS_LABELS[status]}
      </Badge>
    </Tooltip>
  );
}

export function statusLabel(status: RuleStatus): string {
  return STATUS_LABELS[status];
}

const VALUE_TYPE_COLORS: Record<QualifierValueType, string> = {
  TEXT: 'gray',
  NUMERIC: 'grape',
  BOOLEAN: 'orange',
  JSON: 'cyan',
};

export function ValueTypeBadge({ valueType }: { valueType: QualifierValueType }) {
  return (
    <Badge color={VALUE_TYPE_COLORS[valueType]} variant="outline">
      {valueType}
    </Badge>
  );
}

/** Where an evaluation's value came from: a matching rule, or the default because no rule matched. */
export function SourceBadge({ source }: { source?: string }) {
  if (source === 'RULE_MATCH') {
    return <Badge color="teal">Rule matched</Badge>;
  }
  return <Badge color="gray">Default value (no rule matched)</Badge>;
}
