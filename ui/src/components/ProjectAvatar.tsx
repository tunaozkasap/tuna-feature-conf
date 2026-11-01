/** A project's initials in a coloured square, used in the side menu and on the projects page. */
import { Avatar } from '@mantine/core';

/** A square with the project's first letters, in a colour picked from its name (the same on every screen). */
export function ProjectAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const colors = ['brand', 'grape', 'teal', 'orange', 'pink', 'cyan', 'lime'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return (
    <Avatar size={size} radius="md" color={colors[sum % colors.length]} variant="light">
      {initials(name)}
    </Avatar>
  );
}

/** "Web Shop" → "WS", "billing" → "BI". */
function initials(name: string): string {
  const words = name.trim().split(/[\s_-]+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

