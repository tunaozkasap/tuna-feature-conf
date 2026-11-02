/**
 * One project at a glance:
 *  - "Get started" steps while the project is missing environments, qualifiers, features or rules,
 *  - counts of features, rules (by status, with a coloured bar), environments and qualifiers,
 *  - a grid of features × environments with the number of active rules in each cell, so gaps stand out; a cell links
 *    to that feature's rules in that environment,
 *  - rules that start soon (scheduled) and rules that end soon.
 */
import { Anchor, Badge, Button, Card, Code, Group, Progress, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import {
  IconCalendarDue,
  IconCalendarEvent,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconFilter,
  IconFlag,
  IconListDetails,
  IconServer,
  type Icon,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useFeatures } from '../../api/features';
import { useProjects } from '../../api/projects';
import { useQualifiers } from '../../api/qualifiers';
import { useRules } from '../../api/rules';
import type { Environment, Feature, Rule } from '../../api/types';
import { EnvironmentBadge, statusColor, statusLabel } from '../../components/Badges';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectBreadcrumbs } from '../../hooks/useProjectBreadcrumbs';
import { useProjectId } from '../../hooks/useProjectId';
import { formatDateTime } from '../../utils/dates';
import { countByStatus, ruleStatus, type RuleStatus } from '../../utils/rules';

const STATUSES: RuleStatus[] = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'];

export function ProjectOverviewPage() {
  const projectId = useProjectId();
  const projects = useProjects();
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const rules = useRules(projectId);
  const breadcrumbs = useProjectBreadcrumbs(projectId);

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
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={project.name}
        description={project.description}
        actions={
          <Button component={Link} to={`${base}/evaluate`} variant="light">
            Try an evaluation
          </Button>
        }
      />

      <GetStarted
        base={base}
        environments={environments.data.length}
        qualifiers={qualifiers.data.length}
        features={features.data.length}
        rules={rules.data.length}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatCard label="Features" value={features.data.length} link={`${base}/features`} icon={IconFlag} color="brand">
          {featuresWithoutRules.length > 0 ? `${featuresWithoutRules.length} without any rule` : 'All have rules'}
        </StatCard>
        <StatCard
          label="Rules"
          value={rules.data.length}
          link={`${base}/rules`}
          icon={IconListDetails}
          color="teal"
          extra={<StatusBar counts={statusCounts} total={rules.data.length} />}
        >
          {statusCounts.ACTIVE} active · {statusCounts.SCHEDULED} scheduled · {statusCounts.EXPIRED} expired · {statusCounts.DISABLED} disabled
        </StatCard>
        <StatCard label="Environments" value={environments.data.length} link={`${base}/environments`} icon={IconServer} color="orange">
          {environments.data.map((environment) => environment.code).join(', ') || 'None yet'}
        </StatCard>
        <StatCard label="Qualifiers" value={qualifiers.data.length} link={`${base}/qualifiers`} icon={IconFilter} color="grape">
          {qualifiers.data.slice(0, 4).map((qualifier) => qualifier.code).join(', ') || 'None yet'}
          {qualifiers.data.length > 4 ? ', …' : ''}
        </StatCard>
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Title order={4} mb={4}>
              Active rules per feature and environment
            </Title>
            <Text size="sm" c="dimmed" maw={720}>
              Each cell counts the rules that evaluations use right now; click it to see them. An empty cell means the
              feature is false for every request in that environment.
            </Text>
          </div>
          <Group gap="xs" visibleFrom="sm">
            <Badge variant="filled" color="teal">
              n
            </Badge>
            <Text size="xs" c="dimmed">
              active
            </Text>
            <Badge variant="outline" color="gray">
              0 / n
            </Badge>
            <Text size="xs" c="dimmed">
              none active
            </Text>
          </Group>
        </Group>
        {features.data.length === 0 ? (
          <EmptyState title="No features yet" />
        ) : (
          <CoverageGrid projectId={projectId} features={features.data} environments={environments.data} rules={rules.data} />
        )}
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} mt="xl">
        <UpcomingRules
          projectId={projectId}
          title="Starting soon"
          empty="No scheduled rules."
          rules={rules.data.filter((rule) => ruleStatus(rule) === 'SCHEDULED')}
          dateOf={(rule) => rule.effectiveFrom}
          dateLabel="starts"
          icon={IconCalendarEvent}
        />
        <UpcomingRules
          projectId={projectId}
          title="Ending soon"
          empty="No active rule has an end date."
          rules={rules.data.filter((rule) => ruleStatus(rule) === 'ACTIVE' && rule.effectiveTo)}
          dateOf={(rule) => rule.effectiveTo}
          dateLabel="ends"
          icon={IconCalendarDue}
        />
      </SimpleGrid>
    </>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  link: string;
  icon: Icon;
  color: string;
  /** Shown under the text, e.g. the rules' status bar. */
  extra?: ReactNode;
  children: ReactNode;
}

/** A count with an icon; the whole card is a link to the screen with those items. */
function StatCard({ label, value, link, icon: StatIcon, color, extra, children }: StatCardProps) {
  return (
    <Card padding="lg" component={Link} to={link} className="clickable-card">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
            {label}
          </Text>
          <Text fz={34} fw={700} lh={1.2} style={{ letterSpacing: '-0.02em' }}>
            {value}
          </Text>
        </div>
        <ThemeIcon variant="light" color={color} size={40} radius="md">
          <StatIcon size={22} />
        </ThemeIcon>
      </Group>
      <Text size="sm" c="dimmed" mt={4}>
        {children}
      </Text>
      {extra}
    </Card>
  );
}

/** The rules' statuses as one bar: a coloured part per status, as wide as its share (colours as RuleStatusBadge). */
function StatusBar({ counts, total }: { counts: Record<RuleStatus, number>; total: number }) {
  if (total === 0) {
    return null;
  }
  return (
    <Progress.Root size={6} mt="sm" aria-hidden>
      {STATUSES.map((status) => (
        <Tooltip key={status} label={`${counts[status]} ${statusLabel(status).toLowerCase()}`}>
          <Progress.Section value={(counts[status] / total) * 100} color={statusColor(status)} />
        </Tooltip>
      ))}
    </Progress.Root>
  );
}

interface GetStartedProps {
  base: string;
  environments: number;
  qualifiers: number;
  features: number;
  rules: number;
}

/**
 * The four steps a new project needs, in order, each ticked once done. Shown only while a step is missing, so an
 * empty project tells you what to do next instead of showing zeros.
 */
function GetStarted({ base, environments, qualifiers, features, rules }: GetStartedProps) {
  const steps = [
    { done: environments > 0, label: 'Add environments', detail: 'Where the application runs, e.g. DEV and PROD.', link: `${base}/environments` },
    { done: qualifiers > 0, label: 'Add qualifiers', detail: 'What rules match on, e.g. COUNTRY or USER_ID.', link: `${base}/qualifiers` },
    { done: features > 0, label: 'Add features', detail: 'The switches the application asks for.', link: `${base}/features` },
    { done: rules > 0, label: 'Add rules', detail: 'Which value a feature gets, per environment.', link: `${base}/rules` },
  ];
  let doneCount = 0;
  for (const step of steps) {
    if (step.done) doneCount += 1;
  }
  if (doneCount === steps.length) {
    return null;
  }
  return (
    <Card padding="lg" mb="xl" style={{ borderColor: 'var(--mantine-color-brand-3)' }}>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4}>Get started</Title>
          <Text size="sm" c="dimmed">
            {doneCount} of {steps.length} steps done. Each step needs the one before it.
          </Text>
        </div>
        <Progress value={(doneCount / steps.length) * 100} w={160} size="sm" aria-label="Setup progress" />
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {steps.map((step) => (
          <Group key={step.label} gap="sm" align="flex-start" wrap="nowrap">
            {step.done ? (
              <IconCircleCheckFilled size={22} color="var(--mantine-color-teal-6)" />
            ) : (
              <IconCircleDashed size={22} color="var(--app-subtle-text)" />
            )}
            <div>
              <Anchor component={Link} to={step.link} fw={600} size="sm" td={step.done ? 'line-through' : undefined} c={step.done ? 'dimmed' : undefined}>
                {step.label}
              </Anchor>
              <Text size="xs" c="dimmed">
                {step.detail}
              </Text>
            </div>
          </Group>
        ))}
      </SimpleGrid>
    </Card>
  );
}

function CoverageGrid({ projectId, features, environments, rules }: { projectId: number; features: Feature[]; environments: Environment[]; rules: Rule[] }) {
  return (
    <Table.ScrollContainer minWidth={600}>
      <Table withTableBorder withColumnBorders verticalSpacing={6} highlightOnHover={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Feature</Table.Th>
            {environments.map((environment) => (
              <Table.Th key={environment.id} ta="center">
                <EnvironmentBadge code={environment.code} />
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
                      <Tooltip label={`${active} active of ${cellRules.length} rule(s) in ${environment.code}: click to see them`}>
                        <Link
                          className="heat-cell"
                          to={`/projects/${projectId}/features/${feature.id}?environment=${encodeURIComponent(environment.code)}`}
                          aria-label={`${feature.code} in ${environment.code}: ${active} active of ${cellRules.length}`}
                        >
                          <Badge variant={active > 0 ? 'filled' : 'outline'} color={active > 0 ? 'teal' : 'gray'} style={{ cursor: 'pointer' }}>
                            {active}
                            {active !== cellRules.length ? ` / ${cellRules.length}` : ''}
                          </Badge>
                        </Link>
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
  icon: Icon;
}

/** Rules sorted by a date, soonest first. */
function UpcomingRules({ projectId, title, empty, rules, dateOf, dateLabel, icon: DateIcon }: UpcomingRulesProps) {
  const sorted = [...rules].sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))));
  return (
    <Card padding="lg">
      <Title order={5} mb="md">
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
                <EnvironmentBadge code={rule.environmentCode} size="sm" />
              </Group>
              <Text size="xs" c="dimmed">
                {rule.qualifierCode} is <Code>{rule.qualifierValue.length > 30 ? rule.qualifierValue.slice(0, 30) + '…' : rule.qualifierValue}</Code>
                {rule.description ? ` · ${rule.description}` : ''}
              </Text>
            </div>
            <Group gap={6} wrap="nowrap">
              <DateIcon size={16} />
              <Text size="sm" ta="right" style={{ whiteSpace: 'nowrap' }}>
                {dateLabel} {formatDateTime(dateOf(rule))}
              </Text>
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
