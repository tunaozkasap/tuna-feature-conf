/**
 * All rules of the project in one table, with filters (feature, environment, qualifier, status, free text).
 * Useful for questions across features: "what is scheduled?", "what targets COUNTRY = DE?", "what's off in PROD?".
 * Rows are grouped by feature and environment, each group in evaluation order.
 *
 * Above the filters, one button per status with its count ("Scheduled 3") sets the status filter in one click.
 */
import { useState } from 'react';
import { Badge, Button, Card, Group, Modal, Select, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconFilterOff, IconPlus, IconSearch } from '@tabler/icons-react';
import { useEnvironments } from '../../api/environments';
import { useFeatures } from '../../api/features';
import { useQualifiers } from '../../api/qualifiers';
import { useRules } from '../../api/rules';
import type { Rule } from '../../api/types';
import { statusColor, statusLabel } from '../../components/Badges';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectBreadcrumbs } from '../../hooks/useProjectBreadcrumbs';
import { useProjectId } from '../../hooks/useProjectId';
import { countByStatus, ruleStatus, sortInEvaluationOrder, type RuleStatus } from '../../utils/rules';
import { RuleForm } from './RuleForm';
import { RulesTable } from './RulesTable';

const STATUSES: RuleStatus[] = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'];

export function RulesPage() {
  const projectId = useProjectId();
  const rules = useRules(projectId);
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const breadcrumbs = useProjectBreadcrumbs(projectId, { label: 'Rules' });
  // The form dialog: null = closed, {} = new rule, { rule } = edit it
  const [editor, setEditor] = useState<{ rule?: Rule } | null>(null);

  // Filters; null or '' means "any"
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [qualifierId, setQualifierId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  function matchesFilters(rule: Rule): boolean {
    if (featureId && String(rule.featureId) !== featureId) return false;
    if (environmentId && String(rule.environmentId) !== environmentId) return false;
    if (qualifierId && String(rule.qualifierId) !== qualifierId) return false;
    if (status && ruleStatus(rule) !== status) return false;
    if (search) {
      const text = [rule.featureCode, rule.qualifierCode, rule.qualifierValue, rule.featureValue, rule.description].join(' ').toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  }

  /** Feature code, then environment in the project's order, then evaluation order within each group. */
  function sortForTable(list: Rule[]): Rule[] {
    const environmentOrder = (environments.data ?? []).map((environment) => environment.id);
    const groups = new Map<string, Rule[]>();
    for (const rule of list) {
      const key = `${rule.featureCode}|${String(environmentOrder.indexOf(rule.environmentId)).padStart(3, '0')}`;
      groups.set(key, [...(groups.get(key) ?? []), rule]);
    }
    const sorted: Rule[] = [];
    for (const key of [...groups.keys()].sort()) {
      sorted.push(...sortInEvaluationOrder(groups.get(key)!));
    }
    return sorted;
  }

  const shown = sortForTable((rules.data ?? []).filter(matchesFilters));
  const statusCounts = countByStatus(rules.data ?? []);
  const anyFilter = featureId !== null || environmentId !== null || qualifierId !== null || status !== null || search !== '';

  function clearFilters() {
    setFeatureId(null);
    setEnvironmentId(null);
    setQualifierId(null);
    setStatus(null);
    setSearch('');
  }

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Rules"
        description="Every rule of the project. A rule says: in this environment, when the request's qualifier has this value, the feature gets this value."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({})}>
            New rule
          </Button>
        }
      />

      {/* One tile per status; clicking the selected one again clears the status filter */}
      <Group mb="md" gap="sm">
        {STATUSES.map((value) => (
          <UnstyledButton
            key={value}
            onClick={() => setStatus(status === value ? null : value)}
            aria-pressed={status === value}
            aria-label={`Show only ${statusLabel(value).toLowerCase()} rules`}
          >
            <Badge
              size="lg"
              radius="md"
              color={statusColor(value)}
              variant={status === value ? 'filled' : 'light'}
              rightSection={<span style={{ opacity: 0.8 }}>{statusCounts[value]}</span>}
              style={{ cursor: 'pointer' }}
            >
              {statusLabel(value)}
            </Badge>
          </UnstyledButton>
        ))}
      </Group>

      <Card padding="md" mb="md">
        <Group align="flex-end">
          <Select
            label="Feature"
            placeholder="Any"
            clearable
            searchable
            data={(features.data ?? []).map((feature) => ({ value: String(feature.id), label: feature.code }))}
            value={featureId}
            onChange={setFeatureId}
            w={240}
          />
          <Select
            label="Environment"
            placeholder="Any"
            clearable
            data={(environments.data ?? []).map((environment) => ({ value: String(environment.id), label: environment.code }))}
            value={environmentId}
            onChange={setEnvironmentId}
            w={150}
          />
          <Select
            label="Qualifier"
            placeholder="Any"
            clearable
            data={(qualifiers.data ?? []).map((qualifier) => ({ value: String(qualifier.id), label: qualifier.code }))}
            value={qualifierId}
            onChange={setQualifierId}
            w={190}
          />
          <Select
            label="Status"
            placeholder="Any"
            clearable
            data={STATUSES.map((value) => ({ value, label: statusLabel(value) }))}
            value={status}
            onChange={setStatus}
            w={140}
          />
          <TextInput
            label="Search"
            placeholder="Value, description…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            w={220}
          />
          {anyFilter && (
            <Button variant="subtle" color="gray" leftSection={<IconFilterOff size={16} />} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Group>
      </Card>

      {rules.isPending && <Loading />}
      {rules.isError && <ErrorAlert error={rules.error} />}
      {rules.data && (
        <Text size="sm" c="dimmed" mb="xs">
          {shown.length} of {rules.data.length} rules
        </Text>
      )}
      {rules.data && shown.length === 0 && (
        <EmptyState
          title={rules.data.length === 0 ? 'No rules yet' : 'No rule matches the filters'}
          description={rules.data.length === 0 ? 'Without rules every feature evaluates to its default value, false.' : undefined}
        />
      )}
      {shown.length > 0 && (
        <Card padding={0}>
          <RulesTable projectId={projectId} rules={shown} onEdit={(rule) => setEditor({ rule })} showFeature showEnvironment />
        </Card>
      )}

      <Modal opened={editor !== null} onClose={() => setEditor(null)} title={editor?.rule ? 'Edit rule' : 'New rule'} size="lg">
        {editor && (
          <RuleForm
            projectId={projectId}
            rule={editor.rule}
            initialFeatureId={featureId ? Number(featureId) : undefined}
            initialEnvironmentId={environmentId ? Number(environmentId) : undefined}
            onDone={() => setEditor(null)}
          />
        )}
      </Modal>
    </>
  );
}
