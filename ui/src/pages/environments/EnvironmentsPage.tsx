/**
 * The project's environments (DEV, QA, STAGING, PROD, ...). Every rule belongs to one environment, so a feature can
 * be on in DEV and off in PROD. The table shows how many rules each environment has.
 */
import { useState } from 'react';
import { ActionIcon, Badge, Button, Group, Modal, Table, Text, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { useDeleteEnvironment, useEnvironments } from '../../api/environments';
import { useRules } from '../../api/rules';
import type { Environment } from '../../api/types';
import { DeleteButton } from '../../components/DeleteButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectId } from '../../hooks/useProjectId';
import { EnvironmentForm } from './EnvironmentForm';

export function EnvironmentsPage() {
  const projectId = useProjectId();
  const environments = useEnvironments(projectId);
  const rules = useRules(projectId);
  const deleteEnvironment = useDeleteEnvironment(projectId);
  // The form dialog: null = closed, {} = new environment, { environment } = edit it
  const [editor, setEditor] = useState<{ environment?: Environment } | null>(null);

  function ruleCount(environmentId: number): number {
    return (rules.data ?? []).filter((rule) => rule.environmentId === environmentId).length;
  }

  const newButton = (
    <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({})}>
      New environment
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Environments"
        description="Where the application runs. Every rule belongs to one environment, and an evaluation request names the environment it runs in."
        actions={newButton}
      />

      {/* The rule counts are part of the table, so it waits for the rules too */}
      {(environments.isPending || rules.isPending) && <Loading />}
      {environments.isError && <ErrorAlert error={environments.error} />}
      {rules.isError && <ErrorAlert error={rules.error} />}
      {environments.data?.length === 0 && (
        <EmptyState title="No environments yet" description="Add at least one (for example DEV and PROD) before creating rules." action={newButton} />
      )}

      {environments.data && rules.data && environments.data.length > 0 && (
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Rules</Table.Th>
              <Table.Th w={90} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {environments.data.map((environment) => {
              const count = ruleCount(environment.id);
              return (
                <Table.Tr key={environment.id}>
                  <Table.Td>
                    <Badge variant="light">{environment.code}</Badge>
                  </Table.Td>
                  <Table.Td>{environment.name}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {environment.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>{count}</Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" aria-label={`Edit environment ${environment.code}`} onClick={() => setEditor({ environment })}>
                          <IconPencil size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <DeleteButton
                        what={`environment ${environment.code}`}
                        warning={count > 0 ? `It still has ${count} rule(s); delete them first.` : undefined}
                        onConfirm={() => deleteEnvironment.mutateAsync(environment.id)}
                      />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={editor !== null} onClose={() => setEditor(null)} title={editor?.environment ? 'Edit environment' : 'New environment'}>
        {editor && <EnvironmentForm projectId={projectId} environment={editor.environment} onDone={() => setEditor(null)} />}
      </Modal>
    </>
  );
}
