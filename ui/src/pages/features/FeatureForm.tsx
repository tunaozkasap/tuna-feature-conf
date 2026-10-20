/** Create or edit a feature: code, name and description. Its values come from rules, edited on the feature's page. */
import { Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSaveFeature } from '../../api/features';
import type { Feature } from '../../api/types';
import { FormButtons, fieldErrorsOf, required, toCode } from '../../components/forms';
import { showSuccess } from '../../components/notify';

interface FeatureFormProps {
  projectId: number;
  /** The feature to edit, or nothing to create a new one. */
  feature?: Feature;
  /** Called after a save with the saved feature, or with nothing after Cancel. */
  onDone: (saved?: Feature) => void;
}

export function FeatureForm({ projectId, feature, onDone }: FeatureFormProps) {
  const save = useSaveFeature(projectId);
  const form = useForm({
    initialValues: {
      code: feature?.code ?? '',
      name: feature?.name ?? '',
      description: feature?.description ?? '',
    },
    validate: {
      code: required('Code'),
      name: required('Name'),
    },
    transformValues: (values) => ({ ...values, code: toCode(values.code.trim()) }),
  });

  async function submit(values: typeof form.values) {
    try {
      const saved = await save.mutateAsync({ id: feature?.id, input: { ...values, projectId } });
      showSuccess(`Feature ${values.code} saved.`);
      onDone(saved);
    } catch (error) {
      form.setErrors(fieldErrorsOf(error));
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <TextInput
          label="Code"
          description="What the application asks for when it evaluates the feature. Stored in upper case."
          placeholder="NEW_CHECKOUT"
          withAsterisk
          data-autofocus
          {...form.getInputProps('code')}
        />
        <TextInput label="Name" placeholder="New checkout flow" withAsterisk {...form.getInputProps('name')} />
        <Textarea label="Description" placeholder="What the feature does and which values it can have" autosize minRows={2} {...form.getInputProps('description')} />
      </Stack>
      <FormButtons saving={save.isPending} onCancel={() => onDone()} />
    </form>
  );
}
