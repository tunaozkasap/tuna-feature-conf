/**
 * One project at a glance:
 *  - counts of features, rules (by status), environments and qualifiers,
 *  - a grid of features × environments with the number of active rules in each cell, so gaps stand out,
 *  - rules that start soon (scheduled) and rules that end soon.
 */
import { Anchor, Badge, Card, Code, Group, SimpleGrid, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useFeatures } from '../../api/features';
import { useProjects } from '../../api/projects';
import { useQualifiers } from '../../api/qualifiers';
import { useRules } from '../../api/rules';
import type { Environment, Feature, Rule } from '../../api/types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectId } from '../../hooks/useProjectId';
import { formatDateTime } from '../../utils/dates';
import { countByStatus, ruleStatus } from '../../utils/rules';

export function ProjectOverviewPage() {
  const projectId = useProjectId();
  const projects = useProjects();
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const rules = useRules(projectId);

  const queries = [projects, features, environments, qualifiers, rules];
  const failed = queries.find((query) => query.isError);
  if (failed) return <ErrorAlert error={failed.error} />;
  if (!projects.data || !features.data || !environments.data || !qualifiers.data || !rules.data) return <Loading />;

  const project = projects.data.find((candidate) => candidate.id === projectId);
  if (!project) {
    return <EmptyState title="Project not found" description="It may have been deleted. Pick another project at the top." />;
  }

  const statusCounts = countByStatus(rules.data);
  const featuresWithoutRules = features.data.filter((feature) => !rules.data.some((rule) => rule.featureId === feature.id));
  const base = `/projects/${projectId}`;

  return (
    <>
      <PageHeader title={project.name} description={project.description} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard label="Features" value={features.data.length} link={`${base}/features`}>
          {featuresWithoutRules.length > 0 ? `${featuresWithoutRules.length} without any rule` : 'All have rules'}
        </StatCard>
        <StatCard label="Rules" value={rules.data.length} link={`${base}/rules`}>
          {statusCounts.ACTIVE} active · {statusCounts.SCHEDULED} scheduled · {statusCounts.EXPIRED} expired · {statusCounts.DISABLED} disabled
        </StatCard>
        <StatCard label="Environments" value={environments.data.length} link={`${base}/environments`}>
          {environments.data.map((environment) => environment.code).join(', ') || 'None yet'}
        </StatCard>
        <StatCard label="Qualifiers" value={qualifiers.data.length} link={`${base}/qualifiers`}>
          {qualifiers.data.slice(0, 4).map((qualifier) => qualifier.code).join(', ') || 'None yet'}
          {qualifiers.data.length > 4 ? ', …' : ''}
        </StatCard>
      </SimpleGrid>

      <Title order={4} mb={4}>
        Active rules per feature and environment
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        Each cell counts the rules that evaluations use right now. An empty cell means the feature is false for every
        request in that environment.
      </Text>
      {features.data.length === 0 ? (
        <EmptyState title="No features yet" />
      ) : (
        <CoverageGrid projectId={projectId} features={features.data} environments={environments.data} rules={rules.data} />
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} mt="xl">
        <UpcomingRules
          projectId={projectId}
          title="Starting soon"
          empty="No scheduled rules."
          rules={rules.data.filter((rule) => ruleStatus(rule) === 'SCHEDULED')}
          dateOf={(rule) => rule.effectiveFrom}
          dateLabel="starts"
        />
        <UpcomingRules
          projectId={projectId}
          title="Ending soon"
          empty="No active rule has an end date."
          rules={rules.data.filter((rule) => ruleStatus(rule) === 'ACTIVE' && rule.effectiveTo)}
          dateOf={(rule) => rule.effectiveTo}
          dateLabel="ends"
        />
      </SimpleGrid>
    </>
  );
}

function StatCard({ label, value, link, children }: { label: string; value: number; link: string; children: ReactNode }) {
  return (
    <Card withBorder padding="lg" component={Link} to={link} style={{ textDecoration: 'none' }}>
      <Text size="sm" c="dimmed" fw={600} tt="uppercase">
        {label}
      </Text>
      <Text fz={32} fw={700}>
        {value}
      </Text>
      <Text size="sm" c="dimmed">
        {children}
      </Text>
    </Card>
  );
}

function CoverageGrid({ projectId, features, environments, rules }: { projectId: number; features: Feature[]; environments: Environment[]; rules: Rule[] }) {
  return (
    <Table.ScrollContainer minWidth={600}>
      <Table withTableBorder withColumnBorders verticalSpacing={6}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Feature</Table.Th>
            {environments.map((environment) => (
              <Table.Th key={environment.id} ta="center">
                {environment.code}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {features.map((feature) => (
            <Table.Tr key={feature.id}>
              <Table.Td>
                <Anchor component={Link} to={`/projects/${projectId}/features/${feature.id}`} ff="monospace" size="sm">
                  {feature.code}
                </Anchor>
              </Table.Td>
              {environments.map((environment) => {
                const cellRules = rules.filter((rule) => rule.featureId === feature.id && rule.environmentId === environment.id);
                const active = cellRules.filter((rule) => ruleStatus(rule) === 'ACTIVE').length;
                return (
                  <Table.Td key={environment.id} ta="center">
                    {cellRules.length === 0 ? (
                      <Text c="dimmed">–</Text>
                    ) : (
                      <Tooltip label={`${active} active of ${cellRules.length} rule(s)`}>
                        <Badge variant={active > 0 ? 'filled' : 'outline'} color={active > 0 ? 'teal' : 'gray'}>
                          {active}
                          {active !== cellRules.length ? ` / ${cellRules.length}` : ''}
                        </Badge>
                      </Tooltip>
                    )}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface UpcomingRulesProps {
  projectId: number;
  title: string;
  empty: string;
  rules: Rule[];
  dateOf: (rule: Rule) => string | undefined;
  dateLabel: string;
}

/** Rules sorted by a date, soonest first. */
function UpcomingRules({ projectId, title, empty, rules, dateOf, dateLabel }: UpcomingRulesProps) {
  const sorted = [...rules].sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))));
  return (
    <Card withBorder padding="lg">
      <Title order={5} mb="sm">
        {title}
      </Title>
      {sorted.length === 0 && (
        <Text size="sm" c="dimmed">
          {empty}
        </Text>
      )}
      <Stack gap="sm">
        {sorted.slice(0, 8).map((rule) => (
          <Group key={rule.id} justify="space-between" wrap="nowrap">
            <div>
              <Group gap={6}>
                <Anchor component={Link} to={`/projects/${projectId}/features/${rule.featureId}`} ff="monospace" size="sm" fw={600}>
                  {rule.featureCode}
                </Anchor>
                <Badge size="sm" variant="light">
                  {rule.environmentCode}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {rule.qualifierCode} is <Code>{rule.qualifierValue.length > 30 ? rule.qualifierValue.slice(0, 30) + '…' : rule.qualifierValue}</Code>
                {rule.description ? ` · ${rule.description}` : ''}
              </Text>
            </div>
            <Text size="sm" ta="right" style={{ whiteSpace: 'nowrap' }}>
              {dateLabel} {formatDateTime(dateOf(rule))}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
