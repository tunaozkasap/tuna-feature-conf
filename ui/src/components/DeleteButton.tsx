/**
 * A delete icon that asks before deleting. Used in every table.
 *
 * `onConfirm` returns the delete call's promise; the dialog stays open (with a spinner) until it finishes, and closes
 * when it succeeded. A failure is shown as a notification by the app-wide error handling (queryClient.ts), e.g.
 * "The request conflicts with existing data" when something still uses the item.
 */
import { useState } from 'react';
import { ActionIcon, Button, Group, Modal, Text, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface DeleteButtonProps {
  /** What is deleted, e.g. "feature NEW_CHECKOUT". */
  what: string;
  /** Extra warning under the question, e.g. "Its 4 rules must be deleted first." */
  warning?: string;
  onConfirm: () => Promise<unknown>;
}

export function DeleteButton({ what, warning, onConfirm }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // Already shown as a notification; keep the dialog open so the user sees what failed
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Tooltip label={`Delete ${what}`}>
        <ActionIcon variant="subtle" color="red" aria-label={`Delete ${what}`} onClick={() => setOpen(true)}>
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
      <Modal opened={open} onClose={() => setOpen(false)} title="Delete?" centered>
        <Text>Delete {what}? This cannot be undone.</Text>
        {warning && (
          <Text c="orange.8" size="sm" mt="sm">
            {warning}
          </Text>
        )}
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button color="red" loading={deleting} onClick={confirm}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
