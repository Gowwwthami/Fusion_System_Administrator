import { Outlet, NavLink as RRNavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppShell, Burger, Group, NavLink, Text, Avatar,
  Menu, UnstyledButton, Divider, Box, ScrollArea,
  Badge, ActionIcon, Tooltip, Stack, ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard, IconUsers, IconKey, IconClipboardList,
  IconLogout, IconSchool, IconBell, IconSettings, IconUser,
  IconChevronRight, IconShield,
} from '@tabler/icons-react';
import { clearUser } from '../redux/userSlice';

const NAV = [
  { to: '/dashboard', label: 'Dashboard',       Icon: IconLayoutDashboard, color: 'blue'   },
  { to: '/users',     label: 'User Management', Icon: IconUsers,           color: 'teal'   },
  { to: '/roles',     label: 'Role Assignment', Icon: IconKey,             color: 'orange' },
  { to: '/audit',     label: 'Audit Logs',      Icon: IconClipboardList,   color: 'grape'  },
];

export default function AppShellLayout() {
  const [mobileOpen, { toggle }] = useDisclosure();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const username = useSelector((s) => s.user.username);

  function handleLogout() {
    dispatch(clearUser());
    navigate('/login', { replace: true });
  }

  return (
    <AppShell
      header={{ height: 58 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !mobileOpen } }}
      padding="lg"
      styles={{
        main:   { backgroundColor: '#f1f3f5' },
        header: { backgroundColor: '#fff', borderBottom: '1px solid #e9ecef' },
        navbar: { backgroundColor: '#fff', borderRight: '1px solid #e9ecef' },
      }}
    >
      {/* ── Header ─────────────────────────────── */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={mobileOpen} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={10} style={{ cursor: 'default' }}>
              <Box style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg,#228be6,#1864ab)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(34,139,230,.35)',
              }}>
                <IconSchool size={17} color="#fff" stroke={2} />
              </Box>
              <Box>
                <Text fw={800} size="sm" lh={1.2} style={{ letterSpacing: '-0.3px' }}>FusionERP</Text>
                <Text size="10px" c="dimmed" lh={1.2}>IIITDM Jabalpur</Text>
              </Box>
            </Group>
          </Group>

          <Group gap={6}>
            <Tooltip label="Notifications" withArrow>
              <ActionIcon variant="subtle" color="gray" size="lg" radius="md">
                <IconBell size={17} />
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={190} position="bottom-end">
              <Menu.Target>
                <UnstyledButton style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px', borderRadius:8 }}>
                  <Avatar size={30} radius="xl" color="blue">
                    <Text size="xs" fw={700} c="white">{username?.[0]?.toUpperCase() || 'A'}</Text>
                  </Avatar>
                  <Box visibleFrom="xs">
                    <Text size="sm" fw={600} lh={1.2}>{username || 'Admin'}</Text>
                    <Text size="11px" c="dimmed" lh={1.2}>System Admin</Text>
                  </Box>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={13} />}>Profile</Menu.Item>
                <Menu.Item leftSection={<IconSettings size={13} />}>Settings</Menu.Item>
                <Divider />
                <Menu.Item leftSection={<IconLogout size={13} />} color="red" onClick={handleLogout}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Navbar ─────────────────────────────── */}
      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          <Stack gap={2} mt={4}>
            <Text size="10px" fw={700} c="dimmed" px={8} mb={4} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Menu
            </Text>
            {NAV.map(({ to, label, Icon, color }) => (
              <RRNavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <NavLink
                    component="div"
                    label={label}
                    active={isActive}
                    leftSection={
                      <ThemeIcon size={22} variant={isActive ? 'light' : 'subtle'} color={color} radius="sm">
                        <Icon size={13} stroke={2} />
                      </ThemeIcon>
                    }
                    rightSection={isActive ? <IconChevronRight size={11} color="#adb5bd" /> : null}
                    styles={{ root: { borderRadius: 8, fontWeight: isActive ? 600 : 400, fontSize: 13 } }}
                  />
                )}
              </RRNavLink>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider mb="xs" />
          <Group px={8} py={4} justify="space-between">
            <Group gap={5}>
              <ThemeIcon size={18} variant="light" color="blue" radius="sm">
                <IconShield size={10} />
              </ThemeIcon>
              <Text size="11px" c="dimmed">Admin Portal</Text>
            </Group>
            <Badge size="xs" variant="dot" color="green">Live</Badge>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* ── Main ───────────────────────────────── */}
      <AppShell.Main><Outlet /></AppShell.Main>
    </AppShell>
  );
}
