/** Create or edit a qualifier: code, name, value type, priority and description. */
import { NumberInput, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSaveQualifier } from '../../api/qualifiers';
import type { Qualifier, QualifierValueType } from '../../api/types';
import { FormButtons, fieldErrorsOf, required, toCode } from '../../components/forms';
import { showSuccess } from '../../components/notify';

const VALUE_TYPES: { value: QualifierValueType; label: string }[] = [
  { value: 'TEXT', label: 'Text (e.g. TR, GOLD, cust-10001)' },
  { value: 'NUMERIC', label: 'Number (e.g. 1042)' },
  { value: 'BOOLEAN', label: 'Yes / no (true or false)' },
  { value: 'JSON', label: 'JSON (matched as a whole)' },
];

interface QualifierFormProps {
  projectId: number;
  /** The qualifier to edit, or nothing to create a new one. */
  qualifier?: Qualifier;
  onDone: () => void;
}

export function QualifierForm({ projectId, qualifier, onDone }: QualifierFormProps) {
  const save = useSaveQualifier(projectId);
  const form = useForm({
    initialValues: {
      code: qualifier?.code ?? '',
      name: qualifier?.name ?? '',
      valueType: (qualifier?.valueType ?? 'TEXT') as QualifierValueType,
      priority: qualifier?.priority ?? 0,
      description: qualifier?.description ?? '',
    },
    validate: {
      code: required('Code'),
      name: required('Name'),
    },
    transformValues: (values) => ({ ...values, code: toCode(values.code.trim()), priority: Number(values.priority) || 0 }),
  });

  async function submit(values: typeof form.values) {
    try {
      await save.mutateAsync({ id: qualifier?.id, input: { ...values, projectId } });
      showSuccess(`Qualifier ${values.code} saved.`);
      onDone();
    } catch (error) {
      form.setErrors(fieldErrorsOf(error));
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <TextInput
          label="Code"
          description="The key an evaluation request sends in its request context, e.g. COUNTRY. Stored in upper case."
          placeholder="COUNTRY"
          withAsterisk
          data-autofocus
          {...form.getInputProps('code')}
        />
        <TextInput label="Name" placeholder="Country" withAsterisk {...form.getInputProps('name')} />
        <Select label="Value type" data={VALUE_TYPES} allowDeselect={false} withAsterisk {...form.getInputProps('valueType')} />
        <NumberInput
          label="Priority"
          description="Rules on qualifiers with a higher priority are checked first. Use it to let specific targeting (a user) win over broad targeting (a country)."
          {...form.getInputProps('priority')}
        />
        <Textarea label="Description" description="Which values to expect" autosize minRows={2} {...form.getInputProps('description')} />
      </Stack>
      <FormButtons saving={save.isPending} onCancel={onDone} />
    </form>
  );
}
