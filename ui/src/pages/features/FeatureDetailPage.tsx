/**
 * One feature and its rules, one tab per environment. Inside a tab the rules are numbered steps in the order
 * evaluations check them, ending with "Otherwise → false", so the page answers "what will this feature be in PROD for
 * a given request?" from top to bottom.
 *
 * The address can pick the tab: /projects/1/features/7?environment=PROD (the overview's grid links there).
 */
import { useState } from 'react';
import { Badge, Button, Card, Code, ColorSwatch, Group, Modal, Tabs, Text } from '@mantine/core';
import { IconPencil, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useDeleteFeature, useFeatures } from '../../api/features';
import { useRules } from '../../api/rules';
import type { Rule } from '../../api/types';
import { environmentColor } from '../../components/Badges';
import { DeleteButton } from '../../components/DeleteButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectBreadcrumbs } from '../../hooks/useProjectBreadcrumbs';
import { useProjectId } from '../../hooks/useProjectId';
import { sortInEvaluationOrder } from '../../utils/rules';
import { RuleForm } from '../rules/RuleForm';
import { RulesTable } from '../rules/RulesTable';
import { FeatureForm } from './FeatureForm';

export function FeatureDetailPage() {
  const projectId = useProjectId();
  const featureId = Number(useParams().featureId);
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const rules = useRules(projectId);
  const deleteFeature = useDeleteFeature(projectId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const featuresLink = `/projects/${projectId}/features`;
  const feature = features.data?.find((candidate) => candidate.id === featureId);
  const breadcrumbs = useProjectBreadcrumbs(projectId, { label: 'Features', to: featuresLink }, { label: feature?.code ?? '…' });

  const [editingFeature, setEditingFeature] = useState(false);
  // The rule dialog: null = closed, {} = new rule, { rule } = edit it
  const [ruleEditor, setRuleEditor] = useState<{ rule?: Rule } | null>(null);
  // The selected environment tab (its id as text); until the user picks one: the address's ?environment=, else the first
  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  // The tabs count rules and say "No rules in PROD", so the page waits for the rules too
  if (features.isPending || environments.isPending || rules.isPending) return <Loading />;
  if (features.isError) return <ErrorAlert error={features.error} />;
  if (environments.isError) return <ErrorAlert error={environments.error} />;
  if (rules.isError) return <ErrorAlert error={rules.error} />;

  if (!feature) {
    return <EmptyState title="Feature not found" description="It may have been deleted." />;
  }

  const featureRules = (rules.data ?? []).filter((rule) => rule.featureId === feature.id);
  const fromAddress = environments.data.find((environment) => environment.code === searchParams.get('environment'));
  const firstEnvironment = fromAddress ?? environments.data[0];
  const tab = selectedTab ?? (firstEnvironment ? String(firstEnvironment.id) : null);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={
          <Group gap="sm">
            <Code fz={22} fw={700} px="sm" py={4}>
              {feature.code}
            </Code>
            <span>{feature.name}</span>
          </Group>
        }
        description={feature.description}
        actions={
          <>
            <Button
              variant="light"
              leftSection={<IconPlayerPlay size={16} />}
              component={Link}
              to={`/projects/${projectId}/evaluate?feature=${encodeURIComponent(feature.code)}`}
            >
              Evaluate
            </Button>
            <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => setEditingFeature(true)}>
              Edit
            </Button>
            <DeleteButton
              what={`feature ${feature.code}`}
              warning={featureRules.length > 0 ? `It still has ${featureRules.length} rule(s); delete them first.` : undefined}
              onConfirm={async () => {
                await deleteFeature.mutateAsync(feature.id);
                navigate(featuresLink);
              }}
            />
          </>
        }
      />

      {environments.data.length === 0 ? (
        <EmptyState
          title="This project has no environments"
          description="Rules belong to an environment. Add environments first."
          action={
            <Button component={Link} to={`/projects/${projectId}/environments`}>
              Go to environments
            </Button>
          }
        />
      ) : (
        <Tabs value={tab} onChange={setSelectedTab} keepMounted={false} variant="pills" radius="md">
          <Tabs.List mb="lg">
            {environments.data.map((environment) => {
              const count = featureRules.filter((rule) => rule.environmentId === environment.id).length;
              return (
                <Tabs.Tab
                  key={environment.id}
                  value={String(environment.id)}
                  leftSection={<ColorSwatch size={10} color={`var(--mantine-color-${environmentColor(environment.code)}-6)`} withShadow={false} />}
                >
                  {environment.code}{' '}
                  <Text span size="xs" fw={600} opacity={0.7}>
                    ({count})
                  </Text>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {environments.data.map((environment) => {
            const inEnvironment = sortInEvaluationOrder(featureRules.filter((rule) => rule.environmentId === environment.id));
            return (
              <Tabs.Panel key={environment.id} value={String(environment.id)}>
                <Card padding={0}>
                  <Group justify="space-between" p="md" wrap="nowrap">
                    <div>
                      <Group gap="xs">
                        <Text fw={600}>{environment.name}</Text>
                        <Badge variant="light" color="gray">
                          {inEnvironment.length === 0 ? 'no rules' : `checked top to bottom`}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {environment.description ||
                          'The first active rule whose value matches the request decides the value; when none matches, the value is false.'}
                      </Text>
                    </div>
                    <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => setRuleEditor({})}>
                      Add rule in {environment.code}
                    </Button>
                  </Group>
                  {inEnvironment.length === 0 ? (
                    <EmptyState
                      title={`No rules in ${environment.code}`}
                      description={`Every request in ${environment.code} gets the default value, false.`}
                    />
                  ) : (
                    <RulesTable projectId={projectId} rules={inEnvironment} onEdit={(rule) => setRuleEditor({ rule })} showOrder />
                  )}
                </Card>
              </Tabs.Panel>
            );
          })}
        </Tabs>
      )}

      <Modal opened={editingFeature} onClose={() => setEditingFeature(false)} title="Edit feature">
        {editingFeature && <FeatureForm projectId={projectId} feature={feature} onDone={() => setEditingFeature(false)} />}
      </Modal>

      <Modal opened={ruleEditor !== null} onClose={() => setRuleEditor(null)} title={ruleEditor?.rule ? 'Edit rule' : `New rule for ${feature.code}`} size="lg">
        {ruleEditor && (
          <RuleForm
            projectId={projectId}
            rule={ruleEditor.rule}
            fixedFeatureId={feature.id}
            initialEnvironmentId={tab ? Number(tab) : undefined}
            onDone={() => setRuleEditor(null)}
          />
        )}
      </Modal>
    </>
  );
}
