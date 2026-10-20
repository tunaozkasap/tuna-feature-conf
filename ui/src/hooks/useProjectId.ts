import { useParams } from 'react-router-dom';

/** The project id from the address, e.g. 3 for /projects/3/features. */
export function useProjectId(): number {
  const { projectId } = useParams();
  return Number(projectId);
}
