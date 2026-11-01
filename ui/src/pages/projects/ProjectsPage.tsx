/**
 * All projects, as cards. A project groups everything else: its environments, qualifiers, features and rules.
 * Opening a project goes to its overview; the side menu then shows the project's sections.
 * With many projects a search box filters the cards by name and description.
 */
import { useState } from 'react';
import { ActionIcon, Button, Card, Group, Modal, SimpleGrid, Text, TextInput, Tooltip } from '@mantine/core';
import { IconArrowRight, IconPencil, IconPlus, IconSearch } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useDeleteProject, useProjects } from '../../api/projects';
import type { Project } from '../../api/types';
import { DeleteButton } from '../../components/DeleteButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { ProjectForm } from './ProjectForm';

export function ProjectsPage() {
  const projects = useProjects();
  const deleteProject = useDeleteProject();
  // The form dialog: null = closed, {} = new project, { project } = edit that project
  const [editor, setEditor] = useState<{ project?: Project } | null>(null);
  const [search, setSearch] = useState('');

  const shown = (projects.data ?? []).filter((project) =>
    [project.name, project.description ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()),
  );

  const newButton = (
    <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({})}>
      New project
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="A project holds the features of one application, the environments it runs in and the rules that decide each feature's value."
        actions={newButton}
      />

      {projects.isPending && <Loading />}
      {projects.isError && <ErrorAlert error={projects.error} />}
      {projects.data?.length === 0 && <EmptyState title="No projects yet" description="Create the first one to start adding features." action={newButton} />}

      {projects.data && projects.data.length > 6 && (
        <TextInput
          placeholder="Search projects"
          aria-label="Search projects"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={360}
          maw="100%"
          mb="lg"
        />
      )}
      {projects.data && projects.data.length > 0 && shown.length === 0 && <EmptyState title="No project matches the search" />}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {shown.map((project) => (
          <Card key={project.id} padding="lg" className="clickable-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <Group gap="sm" wrap="nowrap">
              <ProjectAvatar name={project.name} size={40} />
              <Text fw={650} size="lg" component={Link} to={`/projects/${project.id}`} style={{ color: 'inherit', textDecoration: 'none' }} truncate>
                {project.name}
              </Text>
            </Group>
            <Text c="dimmed" size="sm" mt="sm" mih={40} lineClamp={3}>
              {project.description || 'No description'}
            </Text>
            {/* mt="auto" pushes the buttons to the bottom, so they line up across cards of different heights */}
            <Group justify="space-between" mt="auto" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              <Group gap={4}>
                <Tooltip label="Edit">
                  <ActionIcon variant="subtle" aria-label={`Edit project ${project.name}`} onClick={() => setEditor({ project })}>
                    <IconPencil size={18} />
                  </ActionIcon>
                </Tooltip>
                <DeleteButton
                  what={`project ${project.name}`}
                  warning="Only an empty project can be deleted: remove its features, qualifiers and environments first."
                  onConfirm={() => deleteProject.mutateAsync(project.id)}
                />
              </Group>
              <Button component={Link} to={`/projects/${project.id}`} variant="light" rightSection={<IconArrowRight size={16} />}>
                Open
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Modal opened={editor !== null} onClose={() => setEditor(null)} title={editor?.project ? 'Edit project' : 'New project'}>
        {editor && <ProjectForm project={editor.project} onDone={() => setEditor(null)} />}
      </Modal>
    </>
  );
}
