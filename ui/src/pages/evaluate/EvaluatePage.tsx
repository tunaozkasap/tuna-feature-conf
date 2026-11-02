/**
 * The evaluation tester: pick a feature and an environment, fill in the request context (one field per qualifier),
 * and see what value the backend resolves, which rule decided it and every step it took.
 *
 * It sends exactly what an application would send to POST /api/evaluations/evaluate; the request is shown under
 * the form, as JSON or as a curl command, so it can be copied into code. The result shows the request id, to find the
 * call's evidence line. "Compare across environments" sends the same request once per environment and lists the
 * answers side by side.
 *
 * The address can preselect the feature and environment: /projects/1/evaluate?feature=NEW_CHECKOUT&environment=PROD
 */
import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Card,
  Code,
  CopyButton,
  Grid,
  Group,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowsDiff, IconCheck, IconCopy, IconPlayerPlay, IconPoint, IconTargetArrow } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useEvaluateFeature, useEvaluateInAllEnvironments, type Evaluation } from '../../api/evaluation';
import { useFeatures } from '../../api/features';
import { useQualifiers } from '../../api/qualifiers';
import type { EvaluationInput } from '../../api/types';
import { EnvironmentBadge, SourceBadge } from '../../components/Badges';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { QualifierValueInput } from '../../components/QualifierValueInput';
import { useProjectBreadcrumbs } from '../../hooks/useProjectBreadcrumbs';
import { useProjectId } from '../../hooks/useProjectId';

export function EvaluatePage() {
  const projectId = useProjectId();
  const [searchParams] = useSearchParams();
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const evaluate = useEvaluateFeature();
  const compare = useEvaluateInAllEnvironments();
  const breadcrumbs = useProjectBreadcrumbs(projectId, { label: 'Evaluate' });

  const [featureCode, setFeatureCode] = useState<string | null>(searchParams.get('feature'));
  const [environmentCode, setEnvironmentCode] = useState<string | null>(searchParams.get('environment'));
  // The request context: qualifier code → value. An empty value means "not sent".
  const [context, setContext] = useState<Record<string, string>>({});

  if (features.isPending || environments.isPending || qualifiers.isPending) return <Loading />;
  if (features.isError) return <ErrorAlert error={features.error} />;
  if (environments.isError) return <ErrorAlert error={environments.error} />;
  if (qualifiers.isError) return <ErrorAlert error={qualifiers.error} />;

  // Default to the first environment until the user picks one
  const environment = environmentCode ?? environments.data[0]?.code ?? null;

  /** Exactly what is sent to the backend: only the qualifiers that have a value. */
  function buildRequest(): EvaluationInput {
    const requestContext: Record<string, string> = {};
    for (const [code, value] of Object.entries(context)) {
      if (value.trim() !== '') {
        requestContext[code] = value;
      }
    }
    return { featureCode: featureCode ?? '', projectId, environmentCode: environment ?? '', requestContext };
  }

  const request = buildRequest();
  const requestJson = JSON.stringify({ data: request }, null, 2);
  // The same request as a command line; single quotes in the body are escaped for the shell
  const curl =
    `curl -X POST '${window.location.origin}/api/evaluations/evaluate' \\\n` +
    `  -H 'Content-Type: application/json' \\\n` +
    `  -d '${JSON.stringify({ data: request }).replace(/'/g, "'\\''")}'`;
  const environmentCodes = environments.data.map((item) => item.code);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Evaluate a feature"
        description="See what a feature resolves to for a request, and why. This sends the same request an application would."
      />

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card padding="lg">
            <Stack>
              <Select
                label="Feature"
                placeholder="Choose a feature"
                searchable
                data={features.data.map((feature) => ({ value: feature.code, label: `${feature.code} — ${feature.name}` }))}
                value={featureCode}
                onChange={setFeatureCode}
              />
              <Select
                label="Environment"
                data={environments.data.map((item) => ({ value: item.code, label: `${item.code} — ${item.name}` }))}
                value={environment}
                onChange={setEnvironmentCode}
                allowDeselect={false}
              />

              <div>
                <Text fw={600} size="sm">
                  Request context
                </Text>
                <Text size="xs" c="dimmed">
                  What the application knows about the request. Leave a field empty to not send it. Highest priority
                  first.
                </Text>
              </div>
              {qualifiers.data.length === 0 && (
                <Text size="sm" c="dimmed">
                  This project has no qualifiers, so no rule can match: every feature evaluates to false.
                </Text>
              )}
              {qualifiers.data.map((qualifier) => (
                <QualifierValueInput
                  key={qualifier.id}
                  valueType={qualifier.valueType}
                  label={`${qualifier.code} — ${qualifier.name}`}
                  description={qualifier.description}
                  value={context[qualifier.code] ?? ''}
                  onChange={(value) => setContext({ ...context, [qualifier.code]: value })}
                />
              ))}

              <Group justify="space-between">
                <Button variant="default" onClick={() => setContext({})}>
                  Clear context
                </Button>
                <Group gap="sm">
                  <Button
                    variant="light"
                    leftSection={<IconArrowsDiff size={16} />}
                    disabled={!featureCode || environmentCodes.length === 0}
                    loading={compare.isPending}
                    onClick={() => compare.mutate({ input: request, environmentCodes })}
                  >
                    Compare across environments
                  </Button>
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    disabled={!featureCode || !environment}
                    loading={evaluate.isPending}
                    onClick={() => evaluate.mutate(request)}
                  >
                    Evaluate
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Card>

          <Card padding="lg" mt="lg">
            <Text fw={600} size="sm" mb="xs">
              Request sent to POST /api/evaluations/evaluate
            </Text>
            {/* keepMounted={false}: only the open tab is on the page, so its text is the only copy there */}
            <Tabs defaultValue="json" keepMounted={false}>
              <Tabs.List mb="sm">
                <Tabs.Tab value="json">JSON</Tabs.Tab>
                <Tabs.Tab value="curl">curl</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="json">
                <CopyableBlock text={requestJson} />
              </Tabs.Panel>
              <Tabs.Panel value="curl">
                <CopyableBlock text={curl} />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Grid.Col>

        {/* Sticky: the result stays in view while scrolling through a long request context */}
        <Grid.Col span={{ base: 12, md: 6 }} style={{ position: 'sticky', top: 84, alignSelf: 'flex-start' }}>
          <Stack>
            {evaluate.isError && <ErrorAlert error={evaluate.error} />}
            {!evaluate.data && !evaluate.isError && (
              <Card padding="lg">
                <EmptyState
                  icon={<IconTargetArrow size={28} stroke={1.5} />}
                  title="No result yet"
                  description="Choose a feature, fill in the request context and press Evaluate."
                />
              </Card>
            )}
            {evaluate.data && !evaluate.isError && <EvaluationResultCard projectId={projectId} evaluation={evaluate.data} />}

            {compare.isError && <ErrorAlert error={compare.error} />}
            {compare.data && !compare.isError && (
              <Card padding="lg">
                <Title order={5} mb={4}>
                  Across environments
                </Title>
                <Text size="xs" c="dimmed" mb="sm">
                  The same feature and request context, sent once per environment.
                </Text>
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Environment</Table.Th>
                      <Table.Th>Value</Table.Th>
                      <Table.Th>Decided by</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {compare.data.map(({ environmentCode: code, evaluation }) => (
                      <Table.Tr key={code}>
                        <Table.Td>
                          <EnvironmentBadge code={code} />
                        </Table.Td>
                        <Table.Td>
                          <Code fw={600}>{evaluation.result.resolvedValue}</Code>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {evaluation.result.source === 'RULE_MATCH'
                              ? `rule #${evaluation.result.matchingRuleId} (${evaluation.result.matchingQualifierCode})`
                              : 'default value'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}

function EvaluationResultCard({ projectId, evaluation }: { projectId: number; evaluation: Evaluation }) {
  const { result, requestId } = evaluation;
  const features = useFeatures(projectId);
  const feature = features.data?.find((candidate) => candidate.code === result.featureCode);
  // The panel's colour (styles.css, `value-panel`): green for true, grey for false, the accent for any other value
  let kind = 'value';
  if (result.resolvedValue === 'true') kind = 'true';
  if (result.resolvedValue === 'false') kind = 'false';

  return (
    <Card padding="lg">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Result</Title>
        <SourceBadge source={result.source} />
      </Group>

      <Text size="sm" c="dimmed">
        {result.featureCode} in {result.environmentCode} resolves to
      </Text>
      <div className="value-panel" data-kind={kind} style={{ margin: 'var(--mantine-spacing-sm) 0' }}>
        <Code block>{prettyValue(result.resolvedValue)}</Code>
      </div>

      {result.source === 'RULE_MATCH' ? (
        <Text size="sm">
          Decided by rule #{result.matchingRuleId} on qualifier <Code>{result.matchingQualifierCode}</Code>
          {feature && (
            <>
              {' '}
              (
              <Anchor component={Link} to={`/projects/${projectId}/features/${feature.id}?environment=${encodeURIComponent(result.environmentCode ?? '')}`}>
                see the feature's rules
              </Anchor>
              )
            </>
          )}
          .
        </Text>
      ) : (
        <Alert color="gray" variant="light">
          No active rule matched the request context, so the feature has its default value.
        </Alert>
      )}

      <Title order={5} mt="lg" mb="sm">
        How it was decided
      </Title>
      {/* The backend's own steps, in order; the last one is the decision */}
      <Timeline active={(result.logs ?? []).length - 1} bulletSize={20} lineWidth={2}>
        {(result.logs ?? []).map((line, index) => (
          // The index is the key: the steps are a fixed list that is replaced as a whole, never reordered
          <Timeline.Item
            key={index}
            bullet={
              <ThemeIcon size={20} radius="xl" variant="light">
                <IconPoint size={12} />
              </ThemeIcon>
            }
          >
            <Text size="sm">{line}</Text>
          </Timeline.Item>
        ))}
      </Timeline>

      <Group gap={6} mt="lg" wrap="nowrap">
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          Request id
        </Text>
        <Code style={{ whiteSpace: 'nowrap' }}>{requestId}</Code>
        <CopyButton value={requestId}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy the request id'}>
              <ActionIcon size="sm" variant="subtle" onClick={copy} aria-label="Copy the request id">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        <Text size="xs" c="dimmed">
          the backend's evidence line for this call has the same id.
        </Text>
      </Group>
    </Card>
  );
}

/** JSON values are shown indented; anything else as it is. */
function prettyValue(value: string | undefined): string {
  if (value === undefined) {
    return '';
  }
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON: show the text as it is
  }
  return value;
}

/** A block of text (the request) with a Copy button in its corner. */
function CopyableBlock({ text }: { text: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', paddingRight: 80 }}>
        {text}
      </Code>
      <CopyButton value={text}>
        {({ copied, copy }) => (
          <Button
            size="compact-xs"
            variant="default"
            leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            onClick={copy}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </CopyButton>
    </div>
  );
}
