/** Create or edit an environment: code (DEV, PROD, ...), name and description. */
import { Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSaveEnvironment } from '../../api/environments';
import type { Environment } from '../../api/types';
import { FormButtons, fieldErrorsOf, required, toCode } from '../../components/forms';
import { showSuccess } from '../../components/notify';

interface EnvironmentFormProps {
  projectId: number;
  /** The environment to edit, or nothing to create a new one. */
  environment?: Environment;
  onDone: () => void;
}

export function EnvironmentForm({ projectId, environment, onDone }: EnvironmentFormProps) {
  const save = useSaveEnvironment(projectId);
  const form = useForm({
    initialValues: {
      code: environment?.code ?? '',
      name: environment?.name ?? '',
      description: environment?.description ?? '',
    },
    validate: {
      code: required('Code'),
      name: required('Name'),
    },
    transformValues: (values) => ({ ...values, code: toCode(values.code.trim()) }),
  });

  async function submit(values: typeof form.values) {
    try {
      await save.mutateAsync({ id: environment?.id, input: { ...values, projectId } });
      showSuccess(`Environment ${values.code} saved.`);
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
          description="What evaluation requests send as environmentCode. Stored in upper case."
          placeholder="PROD"
          withAsterisk
          data-autofocus
          {...form.getInputProps('code')}
        />
        <TextInput label="Name" placeholder="Production" withAsterisk {...form.getInputProps('name')} />
        <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
      </Stack>
      <FormButtons saving={save.isPending} onCancel={onDone} />
    </form>
  );
}
