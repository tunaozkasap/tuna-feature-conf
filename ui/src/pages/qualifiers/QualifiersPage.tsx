/**
 * The project's qualifiers: the facts about a request that rules can match on (COUNTRY, USER_ID, BETA_TESTER, ...).
 * Listed in the order evaluations check them: highest priority first.
 */
import { useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Group, Modal, Table, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconPencil, IconPlus } from '@tabler/icons-react';
import { useDeleteQualifier, useQualifiers } from '../../api/qualifiers';
import { useRules } from '../../api/rules';
import type { Qualifier } from '../../api/types';
import { ValueTypeBadge } from '../../components/Badges';
import { DeleteButton } from '../../components/DeleteButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorAlert, Loading } from '../../components/PageStates';
import { useProjectId } from '../../hooks/useProjectId';
import { QualifierForm } from './QualifierForm';

export function QualifiersPage() {
  const projectId = useProjectId();
  const qualifiers = useQualifiers(projectId);
  const rules = useRules(projectId);
  const deleteQualifier = useDeleteQualifier(projectId);
  // The form dialog: null = closed, {} = new qualifier, { qualifier } = edit it
  const [editor, setEditor] = useState<{ qualifier?: Qualifier } | null>(null);

  function ruleCount(qualifierId: number): number {
    return (rules.data ?? []).filter((rule) => rule.qualifierId === qualifierId).length;
  }

  const newButton = (
    <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({})}>
      New qualifier
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Qualifiers"
        description="The facts about a request that rules can match on. An evaluation request sends them in its request context, keyed by code."
        actions={newButton}
      />

      <Alert icon={<IconInfoCircle />} color="indigo" variant="light" mb="lg">
        Rules are checked in this order: qualifiers with a higher priority first, then rules with a higher rule priority.
        The first rule whose value matches the request decides the feature's value.
      </Alert>

      {/* The rule counts are part of the table, so it waits for the rules too */}
      {(qualifiers.isPending || rules.isPending) && <Loading />}
      {qualifiers.isError && <ErrorAlert error={qualifiers.error} />}
      {rules.isError && <ErrorAlert error={rules.error} />}
      {qualifiers.data?.length === 0 && (
        <EmptyState title="No qualifiers yet" description="Add what your rules should match on, for example COUNTRY or USER_ID." action={newButton} />
      )}

      {qualifiers.data && rules.data && qualifiers.data.length > 0 && (
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={90}>Priority</Table.Th>
              <Table.Th>Code</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Rules</Table.Th>
              <Table.Th w={90} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {qualifiers.data.map((qualifier) => {
              const count = ruleCount(qualifier.id);
              return (
                <Table.Tr key={qualifier.id}>
                  <Table.Td>
                    <Badge variant="filled" color="indigo">
                      {qualifier.priority ?? 0}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text ff="monospace" fw={600}>
                      {qualifier.code}
                    </Text>
                  </Table.Td>
                  <Table.Td>{qualifier.name}</Table.Td>
                  <Table.Td>
                    <ValueTypeBadge valueType={qualifier.valueType} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {qualifier.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>{count}</Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" aria-label={`Edit qualifier ${qualifier.code}`} onClick={() => setEditor({ qualifier })}>
                          <IconPencil size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <DeleteButton
                        what={`qualifier ${qualifier.code}`}
                        warning={count > 0 ? `${count} rule(s) still match on it; delete them first.` : undefined}
                        onConfirm={() => deleteQualifier.mutateAsync(qualifier.id)}
                      />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={editor !== null} onClose={() => setEditor(null)} title={editor?.qualifier ? 'Edit qualifier' : 'New qualifier'}>
        {editor && <QualifierForm projectId={projectId} qualifier={editor.qualifier} onDone={() => setEditor(null)} />}
      </Modal>
    </>
  );
}
