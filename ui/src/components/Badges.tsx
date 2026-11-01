/** Small coloured labels used across the screens. One colour per meaning, the same everywhere. */
import { Badge, Tooltip, type BadgeProps } from '@mantine/core';
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

/** Active / Scheduled / Expired / Disabled, with a coloured dot and the reason in a tooltip. */
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
      <Badge color={STATUS_COLORS[status]} variant="dot">
        {STATUS_LABELS[status]}
      </Badge>
    </Tooltip>
  );
}

export function statusLabel(status: RuleStatus): string {
  return STATUS_LABELS[status];
}

export function statusColor(status: RuleStatus): string {
  return STATUS_COLORS[status];
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

/**
 * Colours for environment badges. Well-known codes get a fixed colour (PROD is always red, so it is never confused with
 * a test environment); any other code gets a colour from the list, picked from its letters, so it's the same everywhere.
 */
const KNOWN_ENVIRONMENT_COLORS: Record<string, string> = {
  PROD: 'red',
  PRODUCTION: 'red',
  LIVE: 'red',
  STAGING: 'orange',
  STAGE: 'orange',
  PREPROD: 'orange',
  UAT: 'yellow',
  QA: 'violet',
  TEST: 'violet',
  DEV: 'cyan',
  DEVELOPMENT: 'cyan',
  LOCAL: 'gray',
};
const OTHER_ENVIRONMENT_COLORS = ['indigo', 'pink', 'lime', 'grape', 'blue', 'green'];

export function environmentColor(code: string): string {
  const known = KNOWN_ENVIRONMENT_COLORS[code.toUpperCase()];
  if (known) {
    return known;
  }
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    sum += code.charCodeAt(i);
  }
  return OTHER_ENVIRONMENT_COLORS[sum % OTHER_ENVIRONMENT_COLORS.length];
}

/** An environment code (DEV, PROD, ...) in its own colour. */
export function EnvironmentBadge({ code, ...props }: { code: string } & BadgeProps) {
  return (
    <Badge color={environmentColor(code)} variant="light" {...props}>
      {code}
    </Badge>
  );
}

/** Where an evaluation's value came from: a matching rule, or the default because no rule matched. */
export function SourceBadge({ source }: { source?: string }) {
  if (source === 'RULE_MATCH') {
    return (
      <Badge color="teal" variant="light" size="lg">
        Rule matched
      </Badge>
    );
  }
  return (
    <Badge color="gray" variant="light" size="lg">
      Default value (no rule matched)
    </Badge>
  );
}
