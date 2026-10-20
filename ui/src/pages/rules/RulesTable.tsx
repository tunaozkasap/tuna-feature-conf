/**
 * A table of rules, used on the Rules page (all rules) and on a feature's page (one feature, one environment).
 * Each row reads as a sentence: "When COUNTRY is TR, the value is true".
 */
import { ActionIcon, Anchor, Badge, Code, Group, Switch, Table, Text, Tooltip } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useDeleteRule, useSetRuleEnabled } from '../../api/rules';
import type { Rule } from '../../api/types';
import { RuleStatusBadge } from '../../components/Badges';
import { DeleteButton } from '../../components/DeleteButton';
import { formatDateTime } from '../../utils/dates';

interface RulesTableProps {
  projectId: number;
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  /** Show the feature column (off on a feature's own page). */
  showFeature?: boolean;
  /** Show the environment column (off when the rules are already grouped by environment). */
  showEnvironment?: boolean;
  /** Number the rows 1, 2, 3: the order evaluations check them in (the rules must be sorted that way). */
  showOrder?: boolean;
}

export function RulesTable({ projectId, rules, onEdit, showFeature = false, showEnvironment = false, showOrder = false }: RulesTableProps) {
  const setEnabled = useSetRuleEnabled(projectId);
  const deleteRule = useDeleteRule(projectId);

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {showOrder && <Table.Th w={40}>#</Table.Th>}
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
            <Table.Tr key={rule.id}>
              {showOrder && (
                <Table.Td>
                  <Text c="dimmed">{index + 1}</Text>
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
                  <Badge variant="light">{rule.environmentCode}</Badge>
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
                <ValueText value={rule.featureValue} />
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
      </Table>
    </Table.ScrollContainer>
  );
}

/** A value in monospace; long values (JSON) are cut short with the full text in a tooltip. */
function ValueText({ value }: { value: string }) {
  const short = value.length > 40 ? value.slice(0, 40) + '…' : value;
  if (short === value) {
    return <Code>{value}</Code>;
  }
  return (
    <Tooltip label={value} multiline maw={480}>
      <Code>{short}</Code>
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
    <Text size="sm">
      {rule.effectiveFrom ? `from ${formatDateTime(rule.effectiveFrom)}` : ''}
      {rule.effectiveFrom && rule.effectiveTo ? <br /> : null}
      {rule.effectiveTo ? `until ${formatDateTime(rule.effectiveTo)}` : ''}
    </Text>
  );
}
