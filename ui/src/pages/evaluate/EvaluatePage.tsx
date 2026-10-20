/**
 * The evaluation tester: pick a feature and an environment, fill in the request context (one field per qualifier),
 * and see what value the backend resolves, which rule decided it and every step it took.
 *
 * It sends exactly what an application would send to POST /api/evaluations/evaluate; the request is shown under
 * the form so it can be copied into code. The result shows the request id, to find the call's evidence line.
 *
 * The address can preselect the feature and environment: /projects/1/evaluate?feature=NEW_CHECKOUT&environment=PROD
 */
import { useState } from 'react';
import { Alert, Anchor, Button, Card, Code, CopyButton, Grid, Group, List, Select, Stack, Text, Title } from '@mantine/core';
import { IconCheck, IconCopy, IconPlayerPlay } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useEvaluateFeature, type Evaluation } from '../../api/evaluation';
import { useFeatures } from '../../api/features';
import { useQualifiers } from '../../api/qualifiers';
import type { EvaluationInput } from '../../api/types';
import { SourceBadge } from '../../components/Badges';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { QualifierValueInput } from '../../components/QualifierValueInput';
import { useProjectId } from '../../hooks/useProjectId';

export function EvaluatePage() {
  const projectId = useProjectId();
  const [searchParams] = useSearchParams();
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const evaluate = useEvaluateFeature();

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

  return (
    <>
      <PageHeader
        title="Evaluate a feature"
        description="See what a feature resolves to for a request, and why. This sends the same request an application would."
      />

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg">
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
                <Button
                  leftSection={<IconPlayerPlay size={16} />}
                  disabled={!featureCode || !environment}
                  loading={evaluate.isPending}
                  onClick={() => evaluate.mutate(request)}
                >
                  Evaluate
                </Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder padding="lg" mt="lg">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">
                Request sent to POST /api/evaluations/evaluate
              </Text>
              <CopyJsonButton text={requestJson} />
            </Group>
            <Code block>{requestJson}</Code>
          </Card>
        </Grid.Col>

        {/* Sticky: the result stays in view while scrolling through a long request context */}
        <Grid.Col span={{ base: 12, md: 6 }} style={{ position: 'sticky', top: 76, alignSelf: 'flex-start' }}>
          {evaluate.isError && <ErrorAlert error={evaluate.error} />}
          {!evaluate.data && !evaluate.isError && (
            <Card withBorder padding="lg">
              <EmptyState title="No result yet" description="Choose a feature, fill in the request context and press Evaluate." />
            </Card>
          )}
          {evaluate.data && !evaluate.isError && <EvaluationResultCard projectId={projectId} evaluation={evaluate.data} />}
        </Grid.Col>
      </Grid>
    </>
  );
}

function EvaluationResultCard({ projectId, evaluation }: { projectId: number; evaluation: Evaluation }) {
  const { result, requestId } = evaluation;
  const features = useFeatures(projectId);
  const feature = features.data?.find((candidate) => candidate.code === result.featureCode);

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Result</Title>
        <SourceBadge source={result.source} />
      </Group>

      <Text size="sm" c="dimmed">
        {result.featureCode} in {result.environmentCode} resolves to
      </Text>
      <Code block fz="lg" my="sm">
        {prettyValue(result.resolvedValue)}
      </Code>

      {result.source === 'RULE_MATCH' ? (
        <Text size="sm">
          Decided by rule #{result.matchingRuleId} on qualifier <Code>{result.matchingQualifierCode}</Code>
          {feature && (
            <>
              {' '}
              (<Anchor component={Link} to={`/projects/${projectId}/features/${feature.id}`}>see the feature's rules</Anchor>)
            </>
          )}
          .
        </Text>
      ) : (
        <Alert color="gray" variant="light">
          No active rule matched the request context, so the feature has its default value.
        </Alert>
      )}

      <Title order={5} mt="lg" mb="xs">
        How it was decided
      </Title>
      <List size="sm" spacing={4}>
        {(result.logs ?? []).map((line, index) => (
          <List.Item key={index}>{line}</List.Item>
        ))}
      </List>

      <Text size="xs" c="dimmed" mt="lg">
        Request id <Code>{requestId}</Code>: the backend's evidence line for this call has the same id.
      </Text>
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

function CopyJsonButton({ text }: { text: string }) {
  return (
    <CopyButton value={text}>
      {({ copied, copy }) => (
        <Button size="xs" variant="subtle" leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      )}
    </CopyButton>
  );
}
