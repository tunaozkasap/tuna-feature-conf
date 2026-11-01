/**
 * The frame around every page: a header (logo, project picker, search, light/dark switch), a side menu with the open
 * project's sections, and the page itself in the middle (`<Outlet />` is where React Router puts the page that matches
 * the address). It also holds the Ctrl+K search window (CommandPalette.tsx).
 */
import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import {
  IconAdjustmentsHorizontal,
  IconFilter,
  IconFlag,
  IconFolders,
  IconLayoutDashboard,
  IconListDetails,
  IconMoon,
  IconPlayerPlay,
  IconSearch,
  IconServer,
  IconSun,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useProjects } from '../api/projects';
import { CommandPalette, type ProjectScreen } from './CommandPalette';
import { ProjectAvatar } from './ProjectAvatar';

/** The side menu: the address after /projects/:id, its label and icon. */
const SECTIONS: ProjectScreen[] = [
  { path: '', label: 'Overview', icon: IconLayoutDashboard },
  { path: '/features', label: 'Features', icon: IconFlag },
  { path: '/rules', label: 'Rules', icon: IconListDetails },
  { path: '/evaluate', label: 'Evaluate', icon: IconPlayerPlay },
];

const SETUP_SECTIONS: ProjectScreen[] = [
  { path: '/environments', label: 'Environments', icon: IconServer },
  { path: '/qualifiers', label: 'Qualifiers', icon: IconFilter },
];

export function AppLayout() {
  const [menuOpen, menu] = useDisclosure();
  const projectMatch = useMatch('/projects/:projectId/*');
  const projectId = projectMatch ? Number(projectMatch.params.projectId) : null;

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !menuOpen } }}
      padding="xl"
    >
      <AppShell.Header className="app-header">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={menuOpen} onClick={menu.toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Link to="/projects" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Group gap={10} wrap="nowrap">
                <div className="app-logo">
                  <IconAdjustmentsHorizontal size={18} stroke={2.2} />
                </div>
                <Stack gap={0} visibleFrom="xs">
                  <Text fw={700} size="md" lh={1.1} style={{ letterSpacing: '-0.01em' }}>
                    Feature Configuration
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.2}>
                    Flags, rules and evaluations
                  </Text>
                </Stack>
              </Group>
            </Link>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <SearchButton />
            <ProjectPicker projectId={projectId} />
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" className="app-sidebar">
        <ScrollArea>
          <SideMenu projectId={projectId} onNavigate={menu.close} />
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box className="app-content">
          {/* The key starts the page afresh when the project changes, so no filter or selection of the old one stays */}
          <Outlet key={projectId ?? 'no-project'} />
        </Box>
      </AppShell.Main>

      <CommandPalette projectId={projectId} screens={[...SECTIONS, ...SETUP_SECTIONS]} />
    </AppShell>
  );
}

/** Looks like a search box; opens the search window (the same as Ctrl+K). */
function SearchButton() {
  return (
    <UnstyledButton
      onClick={() => spotlight.open()}
      aria-label="Open search"
      visibleFrom="md"
      px="sm"
      h={36}
      w={220}
      style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'var(--app-card-background)' }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <IconSearch size={16} color="var(--app-subtle-text)" />
          <Text size="sm" c="dimmed">
            Search…
          </Text>
        </Group>
        <span className="kbd-hint">Ctrl K</span>
      </Group>
    </UnstyledButton>
  );
}

/** Sun/moon button: switches between light and dark mode (Mantine remembers the choice in the browser). */
function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  // "auto" resolved to what is actually shown right now
  const shown = useComputedColorScheme('light');
  const next = shown === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <ActionIcon variant="default" size={36} radius="md" aria-label={`Switch to ${next} mode`} onClick={() => setColorScheme(next)}>
        {shown === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
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
      leftSection={<IconFolders size={16} />}
      data={(projects.data ?? []).map((project) => ({ value: String(project.id), label: project.name }))}
      value={projectId ? String(projectId) : null}
      onChange={switchTo}
      w={{ base: 170, sm: 240 }}
      searchable
      allowDeselect={false}
      nothingFoundMessage="No project with that name"
    />
  );
}

function SideMenu({ projectId, onNavigate }: { projectId: number | null; onNavigate: () => void }) {
  const location = useLocation();
  const projects = useProjects();
  const project = projects.data?.find((candidate) => candidate.id === projectId);

  return (
    <>
      <NavLink
        className="app-nav-link"
        component={Link}
        to="/projects"
        label="All projects"
        leftSection={<IconFolders size={18} />}
        active={location.pathname === '/projects'}
        onClick={onNavigate}
      />
      {projectId !== null && (
        <>
          {/* The open project, so it is always clear whose features and rules the screens show */}
          <Group gap="sm" p="sm" mt="md" mb="xs" wrap="nowrap" className="app-project-card">
            <ProjectAvatar name={project?.name ?? '?'} />
            <div style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} lh={1.2}>
                Project
              </Text>
              <Text size="sm" fw={600} truncate>
                {project?.name ?? '…'}
              </Text>
            </div>
          </Group>
          <MenuHeading>Configure</MenuHeading>
          {SECTIONS.map((section) => (
            <MenuLink key={section.label} projectId={projectId} section={section} onNavigate={onNavigate} />
          ))}
          <MenuHeading>Setup</MenuHeading>
          {SETUP_SECTIONS.map((section) => (
            <MenuLink key={section.label} projectId={projectId} section={section} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </>
  );
}

function MenuHeading({ children }: { children: string }) {
  return (
    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="md" mb={6} px="sm" style={{ letterSpacing: '0.04em' }}>
      {children}
    </Text>
  );
}

function MenuLink({ projectId, section, onNavigate }: { projectId: number; section: ProjectScreen; onNavigate: () => void }) {
  const location = useLocation();
  const to = `/projects/${projectId}${section.path}`;
  // Overview is active only on its own address; the others also on their sub-pages (a feature's page is "Features")
  const active = section.path === '' ? location.pathname === to : location.pathname.startsWith(to);
  const Icon = section.icon;
  return (
    <NavLink
      className="app-nav-link"
      component={Link}
      to={to}
      label={section.label}
      leftSection={<Icon size={18} />}
      active={active}
      variant="light"
      onClick={onNavigate}
    />
  );
}
