/**
 * One feature and its rules, one tab per environment. Inside a tab the rules are listed in the order evaluations
 * check them, so the page answers "what will this feature be in PROD for a given request?" from top to bottom.
 */
import { useState } from 'react';
import { Alert, Anchor, Breadcrumbs, Button, Code, Group, Modal, Tabs, Text } from '@mantine/core';
import { IconInfoCircle, IconPencil, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEnvironments } from '../../api/environments';
import { useDeleteFeature, useFeatures } from '../../api/features';
import { useRules } from '../../api/rules';
import type { Rule } from '../../api/types';
import { DeleteButton } from '../../components/DeleteButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
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

  const [editingFeature, setEditingFeature] = useState(false);
  // The rule dialog: null = closed, {} = new rule, { rule } = edit it
  const [ruleEditor, setRuleEditor] = useState<{ rule?: Rule } | null>(null);
  // The selected environment tab (its id as text); the first environment until the user picks one
  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  // The tabs count rules and say "No rules in PROD", so the page waits for the rules too
  if (features.isPending || environments.isPending || rules.isPending) return <Loading />;
  if (features.isError) return <ErrorAlert error={features.error} />;
  if (environments.isError) return <ErrorAlert error={environments.error} />;
  if (rules.isError) return <ErrorAlert error={rules.error} />;

  const feature = features.data.find((candidate) => candidate.id === featureId);
  if (!feature) {
    return <EmptyState title="Feature not found" description="It may have been deleted." />;
  }

  const featureRules = (rules.data ?? []).filter((rule) => rule.featureId === feature.id);
  const tab = selectedTab ?? (environments.data[0] ? String(environments.data[0].id) : null);
  const featuresLink = `/projects/${projectId}/features`;

  return (
    <>
      <Breadcrumbs mb="sm">
        <Anchor component={Link} to={featuresLink} size="sm">
          Features
        </Anchor>
        <Text size="sm">{feature.code}</Text>
      </Breadcrumbs>

      <PageHeader
        title={
          <Group gap="sm">
            <Code fz="xl">{feature.code}</Code>
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
        <Tabs value={tab} onChange={setSelectedTab} keepMounted={false}>
          <Tabs.List mb="md">
            {environments.data.map((environment) => {
              const count = featureRules.filter((rule) => rule.environmentId === environment.id).length;
              return (
                <Tabs.Tab key={environment.id} value={String(environment.id)}>
                  {environment.code} ({count})
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {environments.data.map((environment) => {
            const inEnvironment = sortInEvaluationOrder(featureRules.filter((rule) => rule.environmentId === environment.id));
            return (
              <Tabs.Panel key={environment.id} value={String(environment.id)}>
                <Group justify="space-between" mb="sm">
                  <Text size="sm" c="dimmed">
                    {environment.name}
                    {environment.description ? ` · ${environment.description}` : ''}
                  </Text>
                  <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setRuleEditor({})}>
                    Add rule in {environment.code}
                  </Button>
                </Group>
                {inEnvironment.length === 0 ? (
                  <EmptyState
                    title={`No rules in ${environment.code}`}
                    description={`Every request in ${environment.code} gets the default value, false.`}
                  />
                ) : (
                  <>
                    <Alert icon={<IconInfoCircle />} variant="light" color="gray" mb="sm">
                      Checked from top to bottom. The first active rule whose value matches the request decides the
                      value; when none matches, the value is <Code>false</Code>.
                    </Alert>
                    <RulesTable projectId={projectId} rules={inEnvironment} onEdit={(rule) => setRuleEditor({ rule })} showOrder />
                  </>
                )}
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
