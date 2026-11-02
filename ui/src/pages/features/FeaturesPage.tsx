/**
 * The project's features with a search box. For each feature it shows in which environments it has rules and how
 * many are active, so features that aren't configured anywhere stand out. Click a feature to see and edit its rules.
 */
import { useState } from 'react';
import { Anchor, Badge, Button, Card, Group, Kbd, Modal, Table, Text, TextInput, ThemeIcon, Tooltip } from '@mantine/core';
import { IconFlag, IconPlus, IconSearch } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useFeatures } from '../../api/features';
import { useRules } from '../../api/rules';
import type { Feature, Rule } from '../../api/types';
import { environmentColor } from '../../components/Badges';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectBreadcrumbs } from '../../hooks/useProjectBreadcrumbs';
import { useProjectId } from '../../hooks/useProjectId';
import { ruleStatus } from '../../utils/rules';
import { FeatureForm } from './FeatureForm';

export function FeaturesPage() {
  const projectId = useProjectId();
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const rules = useRules(projectId);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const breadcrumbs = useProjectBreadcrumbs(projectId, { label: 'Features' });

  const shown = (features.data ?? []).filter((feature) =>
    [feature.code, feature.name, feature.description].join(' ').toLowerCase().includes(search.toLowerCase()),
  );

  function rulesOf(feature: Feature): Rule[] {
    return (rules.data ?? []).filter((rule) => rule.featureId === feature.id);
  }

  const newButton = (
    <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
      New feature
    </Button>
  );

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Features"
        description="The switches and settings the application asks for. A feature's value comes from its rules; with no matching rule it is false."
        actions={newButton}
      />

      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search by code, name or description"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={420}
          maw="100%"
          aria-label="Search features"
        />
        <Text size="xs" c="dimmed" visibleFrom="sm">
          Tip: <Kbd size="xs">Ctrl</Kbd> + <Kbd size="xs">K</Kbd> jumps to any feature from anywhere
        </Text>
      </Group>

      {/* The table shows each feature's rules per environment, so it waits for those too (else: "No rules yet") */}
      {(features.isPending || environments.isPending || rules.isPending) && <Loading />}
      {features.isError && <ErrorAlert error={features.error} />}
      {environments.isError && <ErrorAlert error={environments.error} />}
      {rules.isError && <ErrorAlert error={rules.error} />}
      {features.data?.length === 0 && <EmptyState title="No features yet" description="Create a feature, then add rules for it per environment." action={newButton} />}
      {features.data && features.data.length > 0 && shown.length === 0 && <EmptyState title="No feature matches the search" />}

      {environments.data && rules.data && shown.length > 0 && (
        <Card padding={0}>
          <Table verticalSpacing="md" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Active rules per environment</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((feature) => (
                <Table.Tr key={feature.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectId}/features/${feature.id}`)}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon variant="light" radius="md" size="md">
                        <IconFlag size={16} />
                      </ThemeIcon>
                      <Anchor component={Link} to={`/projects/${projectId}/features/${feature.id}`} ff="monospace" fw={600} onClick={(event) => event.stopPropagation()}>
                        {feature.code}
                      </Anchor>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{feature.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {feature.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <EnvironmentCoverage rules={rulesOf(feature)} environmentCodes={(environments.data ?? []).map((environment) => environment.code)} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal opened={creating} onClose={() => setCreating(false)} title="New feature">
        {creating && (
          <FeatureForm
            projectId={projectId}
            onDone={(saved) => {
              setCreating(false);
              // A new feature has no rules yet: go straight to its page to add them
              if (saved) navigate(`/projects/${projectId}/features/${saved.id}`);
            }}
          />
        )}
      </Modal>
    </>
  );
}

/** One badge per environment: "PROD 3" in PROD's colour when it has 3 active rules there; grey when it has none. */
function EnvironmentCoverage({ rules, environmentCodes }: { rules: Rule[]; environmentCodes: string[] }) {
  if (rules.length === 0) {
    return (
      <Badge color="orange" variant="light">
        No rules yet
      </Badge>
    );
  }
  return (
    <Group gap={6}>
      {environmentCodes.map((code) => {
        const inEnvironment = rules.filter((rule) => rule.environmentCode === code);
        const active = inEnvironment.filter((rule) => ruleStatus(rule) === 'ACTIVE').length;
        return (
          <Tooltip key={code} label={`${code}: ${active} active of ${inEnvironment.length} rule(s)`}>
            <Badge variant={active > 0 ? 'light' : 'outline'} color={active > 0 ? environmentColor(code) : 'gray'}>
              {code} {inEnvironment.length > 0 ? active : '–'}
            </Badge>
          </Tooltip>
        );
      })}
    </Group>
  );
}
