/**
 * The frame around every page: a header with the project picker, a side menu with the project's sections, and the
 * page itself in the middle (`<Outlet />` is where React Router puts the page that matches the address).
 */
import { AppShell, Burger, Group, NavLink, ScrollArea, Select, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustments,
  IconFilter,
  IconFlag,
  IconFolders,
  IconLayoutDashboard,
  IconListDetails,
  IconPlayerPlay,
  IconServer,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useProjects } from '../api/projects';

/** The side menu: the address after /projects/:id, its label and icon. */
const SECTIONS = [
  { path: '', label: 'Overview', icon: IconLayoutDashboard },
  { path: '/features', label: 'Features', icon: IconFlag },
  { path: '/rules', label: 'Rules', icon: IconListDetails },
  { path: '/evaluate', label: 'Evaluate', icon: IconPlayerPlay },
];

const SETUP_SECTIONS = [
  { path: '/environments', label: 'Environments', icon: IconServer },
  { path: '/qualifiers', label: 'Qualifiers', icon: IconFilter },
];

export function AppLayout() {
  const [menuOpen, menu] = useDisclosure();
  const projectMatch = useMatch('/projects/:projectId/*');
  const projectId = projectMatch ? Number(projectMatch.params.projectId) : null;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !menuOpen } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={menuOpen} onClick={menu.toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <IconAdjustments size={26} color="var(--mantine-color-indigo-6)" />
            <Link to="/projects" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Title order={4}>Feature Configuration</Title>
            </Link>
          </Group>
          <ProjectPicker projectId={projectId} />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          <SideMenu projectId={projectId} onNavigate={menu.close} />
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* The key starts the page afresh when the project changes, so no filter or selection of the old one stays */}
        <Outlet key={projectId ?? 'no-project'} />
      </AppShell.Main>
    </AppShell>
  );
}

/** Lists the projects; picking one keeps you in the same section (Features stays Features). */
function ProjectPicker({ projectId }: { projectId: number | null }) {
  const projects = useProjects();
  const navigate = useNavigate();
  const location = useLocation();

  function switchTo(value: string | null) {
    if (!value) {
      return;
    }
    // /projects/1/features/7 → section "/features" (a feature of another project makes no sense, so its id is dropped)
    const section = location.pathname.split('/')[3];
    navigate(`/projects/${value}${section ? '/' + section : ''}`);
  }

  return (
    <Select
      aria-label="Project"
      placeholder="Choose a project"
      data={(projects.data ?? []).map((project) => ({ value: String(project.id), label: project.name }))}
      value={projectId ? String(projectId) : null}
      onChange={switchTo}
      w={260}
      searchable
      allowDeselect={false}
      nothingFoundMessage="No project with that name"
    />
  );
}

function SideMenu({ projectId, onNavigate }: { projectId: number | null; onNavigate: () => void }) {
  const location = useLocation();

  return (
    <>
      <NavLink
        component={Link}
        to="/projects"
        label="All projects"
        leftSection={<IconFolders size={18} />}
        active={location.pathname === '/projects'}
        onClick={onNavigate}
      />
      {projectId !== null && (
        <>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="md" mb={4} px="sm">
            Project
          </Text>
          {SECTIONS.map((section) => (
            <MenuLink key={section.label} projectId={projectId} section={section} onNavigate={onNavigate} />
          ))}
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="md" mb={4} px="sm">
            Setup
          </Text>
          {SETUP_SECTIONS.map((section) => (
            <MenuLink key={section.label} projectId={projectId} section={section} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </>
  );
}

function MenuLink({ projectId, section, onNavigate }: { projectId: number; section: (typeof SECTIONS)[number]; onNavigate: () => void }) {
  const location = useLocation();
  const to = `/projects/${projectId}${section.path}`;
  // Overview is active only on its own address; the others also on their sub-pages (a feature's page is "Features")
  const active = section.path === '' ? location.pathname === to : location.pathname.startsWith(to);
  const Icon = section.icon;
  return <NavLink component={Link} to={to} label={section.label} leftSection={<Icon size={18} />} active={active} onClick={onNavigate} />;
}
