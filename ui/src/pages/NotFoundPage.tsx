import { Button } from '@mantine/core';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/PageStates';

/** Any address App.tsx doesn't know. */
export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="This address doesn't lead to a screen."
      action={
        <Button component={Link} to="/projects">
          Go to the projects
        </Button>
      }
    />
  );
}
