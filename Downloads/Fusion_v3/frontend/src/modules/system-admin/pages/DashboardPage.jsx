import { useState, useEffect } from 'react';
import {
  Grid, Card, Text, Title, Group, Stack, Badge, Box,
  RingProgress, Table, Skeleton, ThemeIcon, Divider, SimpleGrid,
} from '@mantine/core';
import {
  IconUsers, IconSchool, IconBriefcase, IconBuilding, IconActivity, IconClipboardCheck,
} from '@tabler/icons-react';
import { getUsers, getAuditLogs } from '../../../api';

const ACTION_COLORS = {
  user_created: 'green', user_archived: 'gray', user_deactivated: 'red',
  user_activated: 'green', role_assigned: 'orange', role_reassigned: 'blue',
  role_revoked: 'red', password_reset: 'blue', bulk_import: 'violet',
};

function StatCard({ label, value, icon: Icon, color, sub, loading }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb={6}>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>{label}</Text>
        <ThemeIcon size={34} radius="md" variant="light" color={color}><Icon size={18} /></ThemeIcon>
      </Group>
      {loading ? <Skeleton height={34} width={80} radius="md" mt={4} /> :
        <Title order={2} fw={800} style={{ fontSize: 30, letterSpacing: '-1px' }}>{value ?? '—'}</Title>}
      {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
    </Card>
  );
}

export default function DashboardPage() {
  const [counts, setCounts] = useState({ total: null, students: null, faculty: null, staff: null });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [all, students, faculty, staff, logs] = await Promise.all([
          getUsers(), getUsers({ user_type: 'student' }),
          getUsers({ user_type: 'faculty' }), getUsers({ user_type: 'staff' }),
          getAuditLogs({ page_size: 8 }),
        ]);
        setCounts({ total: all.count, students: students.count, faculty: faculty.count, staff: staff.count });
        setRecentLogs(logs.results || []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const total = counts.total || 1;
  const dist = [
    { label: 'Students', value: counts.students || 0, color: 'blue' },
    { label: 'Faculty',  value: counts.faculty  || 0, color: 'orange' },
    { label: 'Staff',    value: counts.staff    || 0, color: 'teal' },
  ];

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2} fw={700} style={{ letterSpacing: '-0.5px' }}>System Overview</Title>
        <Text c="dimmed" size="sm" mt={4}>FusionERP — IIITDM Jabalpur Admin Portal</Text>
      </Box>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <StatCard label="Total Users"  value={counts.total}    icon={IconUsers}     color="blue"   loading={loading} sub="All accounts" />
        <StatCard label="Students"     value={counts.students} icon={IconSchool}    color="teal"   loading={loading} sub="Enrolled" />
        <StatCard label="Faculty"      value={counts.faculty}  icon={IconBriefcase} color="orange" loading={loading} sub="Teaching staff" />
        <StatCard label="Staff"        value={counts.staff}    icon={IconBuilding}  color="green"  loading={loading} sub="Administrative" />
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="md" h="100%">
            <Text fw={600} mb="md" size="sm">User Distribution</Text>
            <Group justify="center" mb="md">
              {loading ? <Skeleton height={130} width={130} circle /> : (
                <RingProgress size={140} thickness={14}
                  sections={dist.map(d => ({ value: Math.round((d.value / total) * 100) || 0, color: `var(--mantine-color-${d.color}-6)` }))}
                  label={<Text ta="center" size="xs" fw={600} c="dimmed">{counts.total ?? '—'}<br />Total</Text>}
                />
              )}
            </Group>
            <Stack gap={8}>
              {dist.map(d => (
                <Group key={d.label} justify="space-between">
                  <Group gap={6}>
                    <Box w={9} h={9} style={{ borderRadius: 3, background: `var(--mantine-color-${d.color}-6)` }} />
                    <Text size="sm">{d.label}</Text>
                  </Group>
                  {loading ? <Skeleton width={40} height={14} /> : (
                    <Group gap={4}>
                      <Text size="sm" fw={600}>{d.value}</Text>
                      <Text size="xs" c="dimmed">({total > 1 ? Math.round((d.value / total) * 100) : 0}%)</Text>
                    </Group>
                  )}
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="md" p={0}>
            <Group px="lg" py="md" justify="space-between">
              <Group gap={8}>
                <ThemeIcon size={26} variant="light" color="blue" radius="md"><IconActivity size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Recent Activity</Text>
              </Group>
              <Badge size="sm" variant="light">{recentLogs.length} entries</Badge>
            </Group>
            <Divider />
            {loading ? (
              <Stack gap={0} p="sm">{[...Array(5)].map((_, i) => <Skeleton key={i} height={40} radius={0} mb={1} />)}</Stack>
            ) : recentLogs.length === 0 ? (
              <Box p="xl" ta="center">
                <IconClipboardCheck size={28} color="var(--mantine-color-gray-4)" />
                <Text c="dimmed" size="sm" mt={6}>No recent activity</Text>
              </Box>
            ) : (
              <Table>
                <Table.Tbody>
                  {recentLogs.map(log => (
                    <Table.Tr key={log.id}>
                      <Table.Td w={150}>
                        <Badge size="xs" variant="light" color={ACTION_COLORS[log.action] || 'gray'}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm" fw={500}>{log.target_user || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">by {log.performed_by}</Text></Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {new Date(log.timestamp).toLocaleString()}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
