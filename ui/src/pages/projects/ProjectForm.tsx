/** Create or edit a project: name and description. */
import { Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSaveProject } from '../../api/projects';
import type { Project } from '../../api/types';
import { FormButtons, fieldErrorsOf, required } from '../../components/forms';
import { showSuccess } from '../../components/notify';

interface ProjectFormProps {
  /** The project to edit, or nothing to create a new one. */
  project?: Project;
  onDone: () => void;
}

export function ProjectForm({ project, onDone }: ProjectFormProps) {
  const save = useSaveProject();
  const form = useForm({
    initialValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
    },
    validate: {
      name: required('Name'),
    },
  });

  async function submit(values: typeof form.values) {
    try {
      await save.mutateAsync({ id: project?.id, input: values });
      showSuccess(`Project "${values.name}" saved.`);
      onDone();
    } catch (error) {
      // The notification is shown by queryClient.ts; here the backend's field messages go next to the fields
      form.setErrors(fieldErrorsOf(error));
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <TextInput label="Name" placeholder="Storefront Web" withAsterisk data-autofocus {...form.getInputProps('name')} />
        <Textarea label="Description" placeholder="What the project is and who uses it" autosize minRows={2} {...form.getInputProps('description')} />
      </Stack>
      <FormButtons saving={save.isPending} onCancel={onDone} />
    </form>
  );
}
