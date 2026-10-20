/**
 * An input for a qualifier's value that fits the qualifier's type:
 *   BOOLEAN → true / false choice, NUMERIC → number field, JSON → multi-line text, TEXT → text field.
 * The value is always text, because that's what the API stores and compares.
 */
import type { ReactNode } from 'react';
import { SegmentedControl, Stack, Text, TextInput, Textarea } from '@mantine/core';
import type { QualifierValueType } from '../api/types';

interface QualifierValueInputProps {
  valueType: QualifierValueType | undefined;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  error?: ReactNode;
  required?: boolean;
  placeholder?: string;
}

export function QualifierValueInput({ valueType, label, description, value, onChange, error, required, placeholder }: QualifierValueInputProps) {
  if (valueType === 'BOOLEAN') {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
        <SegmentedControl
          aria-label={label}
          data={required ? ['true', 'false'] : [{ label: 'not sent', value: '' }, 'true', 'false']}
          value={value}
          onChange={onChange}
        />
        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}
      </Stack>
    );
  }

  if (valueType === 'JSON') {
    return (
      <Textarea
        label={label}
        description={description}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        error={error}
        withAsterisk={required}
        placeholder={placeholder ?? '{"key":"value"}'}
        autosize
        minRows={2}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      />
    );
  }

  return (
    <TextInput
      label={label}
      description={description}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      error={error}
      withAsterisk={required}
      placeholder={placeholder}
      inputMode={valueType === 'NUMERIC' ? 'decimal' : undefined}
    />
  );
}

/** A message when the text doesn't fit the type, or `null` when it does. Empty text is left to `required`. */
export function checkQualifierValue(valueType: QualifierValueType | undefined, value: string): string | null {
  const text = value.trim();
  if (!text) {
    return null;
  }
  if (valueType === 'NUMERIC' && Number.isNaN(Number(text))) {
    return 'Must be a number';
  }
  if (valueType === 'BOOLEAN' && text !== 'true' && text !== 'false') {
    return 'Must be true or false';
  }
  if (valueType === 'JSON') {
    try {
      JSON.parse(text);
    } catch {
      return 'Must be valid JSON';
    }
  }
  return null;
}
