/**
 * A table of rules, used on the Rules page (all rules) and on a feature's page (one feature, one environment).
 * Each row reads as a sentence: "When COUNTRY is TR → true". The row's left edge has the status colour (styles.css,
 * `rule-row`), and switched-off or expired rules are faded, so the rules that count stand out.
 *
 * On a feature's page (`showOrder`) the rows are numbered steps, and a last line says what happens when no rule
 * matches: "Otherwise → false".
 */
import { ActionIcon, Anchor, Code, Group, Switch, Table, Text, Tooltip } from '@mantine/core';
import { IconArrowRight, IconPencil } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useDeleteRule, useSetRuleEnabled } from '../../api/rules';
import type { Rule } from '../../api/types';
import { EnvironmentBadge, RuleStatusBadge } from '../../components/Badges';
import { DeleteButton } from '../../components/DeleteButton';
import { formatDateTime } from '../../utils/dates';
import { ruleStatus } from '../../utils/rules';

interface RulesTableProps {
  projectId: number;
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  /** Show the feature column (off on a feature's own page). */
  showFeature?: boolean;
  /** Show the environment column (off when the rules are already grouped by environment). */
  showEnvironment?: boolean;
  /**
   * Number the rows 1, 2, 3: the order evaluations check them in (the rules must be sorted that way), and end with
   * the "Otherwise → false" line.
   */
  showOrder?: boolean;
}

export function RulesTable({ projectId, rules, onEdit, showFeature = false, showEnvironment = false, showOrder = false }: RulesTableProps) {
  const setEnabled = useSetRuleEnabled(projectId);
  const deleteRule = useDeleteRule(projectId);

  // How many columns the "Otherwise" line spans: everything after the number
  const columnCount = 7 + (showFeature ? 1 : 0) + (showEnvironment ? 1 : 0);

  return (
    <Table.ScrollContainer minWidth={1100}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {showOrder && <Table.Th w={56}>Step</Table.Th>}
            {showFeature && <Table.Th>Feature</Table.Th>}
            {showEnvironment && <Table.Th>Environment</Table.Th>}
            <Table.Th>When</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th>Priority</Table.Th>
            <Table.Th>Active period</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>On</Table.Th>
            <Table.Th w={90} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rules.map((rule, index) => (
            // data-status gives the row its coloured edge (styles.css)
            <Table.Tr key={rule.id} className="rule-row" data-status={ruleStatus(rule)}>
              {showOrder && (
                <Table.Td>
                  <span className="step-number">{index + 1}</span>
                </Table.Td>
              )}
              {showFeature && (
                <Table.Td>
                  <Anchor component={Link} to={`/projects/${projectId}/features/${rule.featureId}`} ff="monospace" size="sm">
                    {rule.featureCode}
                  </Anchor>
                </Table.Td>
              )}
              {showEnvironment && (
                <Table.Td>
                  <EnvironmentBadge code={rule.environmentCode} />
                </Table.Td>
              )}
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  <Tooltip label={`${rule.qualifierName ?? rule.qualifierCode}, qualifier priority ${rule.qualifierPriority ?? 0}`}>
                    <Text ff="monospace" size="sm" fw={600}>
                      {rule.qualifierCode}
                    </Text>
                  </Tooltip>
                  <Text size="sm" c="dimmed">
                    is
                  </Text>
                  <ValueText value={rule.qualifierValue} />
                </Group>
                {rule.description && (
                  <Text size="xs" c="dimmed" mt={2}>
                    {rule.description}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  <IconArrowRight size={14} color="var(--app-subtle-text)" />
                  <ValueText value={rule.featureValue} strong />
                </Group>
              </Table.Td>
              <Table.Td>{rule.priority ?? 0}</Table.Td>
              <Table.Td>
                <ActivePeriod rule={rule} />
              </Table.Td>
              <Table.Td>
                <RuleStatusBadge rule={rule} />
              </Table.Td>
              <Table.Td>
                <Switch
                  aria-label={`Rule ${rule.id} switched on`}
                  checked={rule.enabled === true}
                  onChange={(event) => setEnabled.mutate({ id: rule.id, enabled: event.currentTarget.checked })}
                />
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  <Tooltip label="Edit">
                    <ActionIcon variant="subtle" aria-label={`Edit rule ${rule.id}`} onClick={() => onEdit(rule)}>
                      <IconPencil size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <DeleteButton what={`this rule (${rule.qualifierCode} is ${rule.qualifierValue})`} onConfirm={() => deleteRule.mutateAsync(rule.id)} />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        {showOrder && (
          <Table.Tfoot>
            <Table.Tr className="fallback-row">
              <Table.Td>
                <span className="step-number">∗</span>
              </Table.Td>
              <Table.Td colSpan={columnCount}>
                <Group gap={6}>
                  <Text size="sm" fw={600}>
                    Otherwise
                  </Text>
                  <Text size="sm" c="dimmed">
                    (no active rule matches the request)
                  </Text>
                  <IconArrowRight size={14} color="var(--app-subtle-text)" />
                  <Code>false</Code>
                </Group>
              </Table.Td>
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </Table.ScrollContainer>
  );
}

/**
 * A value in monospace; long values (JSON) are cut short with the full text in a tooltip. `strong` colours it, for the
 * feature's value (the result of the rule).
 */
function ValueText({ value, strong = false }: { value: string; strong?: boolean }) {
  const short = value.length > 32 ? value.slice(0, 32) + '…' : value;
  const code = (
    <Code
      fw={strong ? 600 : undefined}
      style={strong ? { background: 'var(--mantine-color-brand-light)', color: 'var(--mantine-color-brand-light-color)' } : undefined}
    >
      {short}
    </Code>
  );
  if (short === value) {
    return code;
  }
  return (
    <Tooltip label={value} multiline maw={480}>
      {code}
    </Tooltip>
  );
}

function ActivePeriod({ rule }: { rule: Rule }) {
  if (!rule.effectiveFrom && !rule.effectiveTo) {
    return (
      <Text size="sm" c="dimmed">
        Always
      </Text>
    );
  }
  return (
    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
      {rule.effectiveFrom ? `from ${formatDateTime(rule.effectiveFrom)}` : ''}
      {rule.effectiveFrom && rule.effectiveTo ? <br /> : null}
      {rule.effectiveTo ? `until ${formatDateTime(rule.effectiveTo)}` : ''}
    </Text>
  );
}
