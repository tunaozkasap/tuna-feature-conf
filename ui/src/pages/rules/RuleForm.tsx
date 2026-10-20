/**
 * Create or edit a rule: "In <environment>, when <qualifier> is <value>, <feature> has the value <value>".
 *
 * The qualifier value input changes with the chosen qualifier's type (see QualifierValueInput). The feature and the
 * environment can be fixed by the caller, e.g. on a feature's page the feature is always that feature.
 */
import { Group, NumberInput, Select, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEnvironments } from '../../api/environments';
import { useFeatures } from '../../api/features';
import { useQualifiers } from '../../api/qualifiers';
import { useSaveRule } from '../../api/rules';
import type { Rule } from '../../api/types';
import { FormButtons, fieldErrorsOf } from '../../components/forms';
import { showSuccess } from '../../components/notify';
import { QualifierValueInput, checkQualifierValue } from '../../components/QualifierValueInput';
import { fromDateTimeInput, toDateTimeInput } from '../../utils/dates';

interface RuleFormProps {
  projectId: number;
  /** The rule to edit, or nothing to create a new one. */
  rule?: Rule;
  /** For a new rule: start with this feature and don't let it change. */
  fixedFeatureId?: number;
  /** For a new rule: start with this feature, but let it change. */
  initialFeatureId?: number;
  /** For a new rule: start with this environment. */
  initialEnvironmentId?: number;
  onDone: () => void;
}

export function RuleForm({ projectId, rule, fixedFeatureId, initialFeatureId, initialEnvironmentId, onDone }: RuleFormProps) {
  const features = useFeatures(projectId);
  const environments = useEnvironments(projectId);
  const qualifiers = useQualifiers(projectId);
  const save = useSaveRule(projectId);

  // Mantine's Select works with text values, so ids are kept as text in the form and turned into numbers on save
  const form = useForm({
    initialValues: {
      featureId: String(rule?.featureId ?? fixedFeatureId ?? initialFeatureId ?? ''),
      environmentId: String(rule?.environmentId ?? initialEnvironmentId ?? ''),
      qualifierId: String(rule?.qualifierId ?? ''),
      qualifierValue: rule?.qualifierValue ?? '',
      featureValue: rule?.featureValue ?? '',
      priority: rule?.priority ?? 0,
      enabled: rule?.enabled ?? true,
      effectiveFrom: toDateTimeInput(rule?.effectiveFrom),
      effectiveTo: toDateTimeInput(rule?.effectiveTo),
      description: rule?.description ?? '',
    },
    validate: {
      featureId: (value) => (value ? null : 'Choose a feature'),
      environmentId: (value) => (value ? null : 'Choose an environment'),
      qualifierId: (value) => (value ? null : 'Choose a qualifier'),
      qualifierValue: (value, values) =>
        value.trim() ? checkQualifierValue(qualifierOf(values.qualifierId)?.valueType, value) : 'Enter the value to match',
      featureValue: (value) => (value.trim() ? null : 'Enter the value the feature gets'),
      effectiveTo: (value, values) =>
        value && values.effectiveFrom && value <= values.effectiveFrom ? 'Must be after the start' : null,
    },
  });

  function qualifierOf(id: string) {
    return qualifiers.data?.find((qualifier) => String(qualifier.id) === id);
  }

  async function submit(values: typeof form.values) {
    const input = {
      featureId: Number(values.featureId),
      environmentId: Number(values.environmentId),
      qualifierId: Number(values.qualifierId),
      qualifierValue: values.qualifierValue.trim(),
      featureValue: values.featureValue.trim(),
      priority: Number(values.priority) || 0,
      enabled: values.enabled,
      effectiveFrom: fromDateTimeInput(values.effectiveFrom),
      effectiveTo: fromDateTimeInput(values.effectiveTo),
      description: values.description,
    };
    try {
      await save.mutateAsync({ id: rule?.id, input });
      showSuccess('Rule saved.');
      onDone();
    } catch (error) {
      form.setErrors(fieldErrorsOf(error));
    }
  }

  const selectedQualifier = qualifierOf(form.values.qualifierId);
  const editingDates = rule !== undefined && (rule.effectiveFrom || rule.effectiveTo);

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <Select
          label="Feature"
          data={(features.data ?? []).map((feature) => ({ value: String(feature.id), label: `${feature.code} — ${feature.name}` }))}
          disabled={fixedFeatureId !== undefined}
          searchable
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps('featureId')}
        />
        <Select
          label="Environment"
          data={(environments.data ?? []).map((environment) => ({ value: String(environment.id), label: `${environment.code} — ${environment.name}` }))}
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps('environmentId')}
        />

        <Text fw={600} size="sm" mt="xs">
          When the request has…
        </Text>
        <Select
          label="Qualifier"
          description="Higher priority qualifiers are checked first."
          data={(qualifiers.data ?? []).map((qualifier) => ({
            value: String(qualifier.id),
            label: `${qualifier.code} — ${qualifier.name} (${qualifier.valueType}, priority ${qualifier.priority ?? 0})`,
          }))}
          searchable
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps('qualifierId')}
        />
        <QualifierValueInput
          valueType={selectedQualifier?.valueType}
          label="Equal to"
          description={selectedQualifier?.description ?? 'Compared ignoring upper/lower case and surrounding spaces.'}
          required
          value={form.values.qualifierValue}
          onChange={(value) => form.setFieldValue('qualifierValue', value)}
          error={form.errors.qualifierValue}
        />

        <Text fw={600} size="sm" mt="xs">
          …the feature's value is
        </Text>
        <Textarea
          label="Value"
          description='What evaluations return, e.g. true, 50, embedding-v2 or {"title":"Sale"}.'
          withAsterisk
          autosize
          minRows={1}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          {...form.getInputProps('featureValue')}
        />

        <Group grow align="flex-start">
          <NumberInput label="Rule priority" description="Breaks ties between rules on the same qualifier." {...form.getInputProps('priority')} />
          <Switch label="Switched on" mt={30} {...form.getInputProps('enabled', { type: 'checkbox' })} />
        </Group>
        <Group grow align="flex-start">
          <TextInput type="datetime-local" label="Starts" description="Empty: active right away" {...form.getInputProps('effectiveFrom')} />
          <TextInput type="datetime-local" label="Ends" description="Empty: never ends" {...form.getInputProps('effectiveTo')} />
        </Group>
        {editingDates && (
          <Text size="xs" c="dimmed">
            Clearing a start or end date of an existing rule is not supported by the API yet: the old date is kept.
            Delete and re-create the rule instead.
          </Text>
        )}
        <TextInput label="Description" placeholder="Why this rule exists, e.g. a ticket number" {...form.getInputProps('description')} />
      </Stack>
      <FormButtons saving={save.isPending} onCancel={onDone} />
    </form>
  );
}
