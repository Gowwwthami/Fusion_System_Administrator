import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Group, Title, Text, Select, TextInput, Card,
  Table, Badge, Box, ThemeIcon, Divider, Code,
  Pagination, Skeleton, SimpleGrid, Button, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconClipboardList, IconFilter, IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { getAuditLogs } from '../../../api';

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'user_created',     label: 'User Created' },
  { value: 'user_activated',   label: 'User Activated' },
  { value: 'user_deactivated', label: 'User Deactivated' },
  { value: 'user_archived',    label: 'User Archived' },
  { value: 'role_assigned',    label: 'Role Assigned' },
  { value: 'role_reassigned',  label: 'Role Reassigned' },
  { value: 'role_revoked',     label: 'Role Revoked' },
  { value: 'password_reset',   label: 'Password Reset' },
  { value: 'bulk_import',      label: 'Bulk Import' },
];
const ACTION_COLORS = {
  user_created: 'green', user_archived: 'gray', user_deactivated: 'red',
  user_activated: 'green', role_assigned: 'orange', role_reassigned: 'blue',
  role_revoked: 'red', password_reset: 'blue', bulk_import: 'violet',
};

const EMPTY_FILTERS = { action: '', performed_by: '', target_user: '', date_from: '', date_to: '' };

export default function AuditPage() {
  const [logs, setLogs]     = useState([]);
  const [count, setCount]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const res = await getAuditLogs(params);
      setLogs(res.results || []);
      setCount(res.count || 0);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load audit logs.', color: 'red' });
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); setPage(1); }
  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.ceil(count / 20);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={700} style={{ letterSpacing: '-0.5px' }}>Audit Logs</Title>
          <Text c="dimmed" size="sm" mt={4}>Immutable record of all system actions — {count} entries</Text>
        </Box>
      </Group>

      {/* Filters */}
      <Card withBorder radius="md">
        <Group gap={8} mb="md" justify="space-between">
          <Group gap={8}>
            <ThemeIcon size={26} variant="light" color="grape" radius="md"><IconFilter size={14}/></ThemeIcon>
            <Text fw={600} size="sm">Filters</Text>
          </Group>
          {hasFilters && (
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={11}/>}
              onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
              Clear
            </Button>
          )}
        </Group>
        <SimpleGrid cols={{ base: 2, md: 5 }} spacing="sm">
          <Select label="Action" data={ACTION_OPTIONS} value={filters.action}
            onChange={v => setFilter('action', v || '')} clearable size="sm" />
          <TextInput label="Performed By" placeholder="Username" value={filters.performed_by}
            onChange={e => setFilter('performed_by', e.target.value)} size="sm" />
          <TextInput label="Target User" placeholder="Username" value={filters.target_user}
            onChange={e => setFilter('target_user', e.target.value)} size="sm" />
          <TextInput label="Date From" type="date" value={filters.date_from}
            onChange={e => setFilter('date_from', e.target.value)} size="sm" />
          <TextInput label="Date To"   type="date" value={filters.date_to}
            onChange={e => setFilter('date_to', e.target.value)} size="sm" />
        </SimpleGrid>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p={0}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 30 }}></Table.Th>
              <Table.Th>Timestamp</Table.Th><Table.Th>Action</Table.Th>
              <Table.Th>Performed By</Table.Th><Table.Th>Target User</Table.Th>
              <Table.Th>IP Address</Table.Th><Table.Th>Details</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <Table.Tr key={i}>{[...Array(7)].map((__, j) => <Table.Td key={j}><Skeleton height={13} radius="sm"/></Table.Td>)}</Table.Tr>
              ))
            ) : logs.length === 0 ? (
              <Table.Tr><Table.Td colSpan={7}><Box ta="center" py="xl">
                <IconClipboardList size={36} color="var(--mantine-color-gray-4)"/>
                <Text c="dimmed" size="sm" mt={6}>No audit logs found</Text>
              </Box></Table.Td></Table.Tr>
            ) : logs.map(log => (
              <>
                <Table.Tr key={log.id} style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <Table.Td>
                    <ActionIcon size="xs" variant="subtle" color="gray">
                      {expanded === log.id ? <IconChevronDown size={13}/> : <IconChevronRight size={13}/>}
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light" color={ACTION_COLORS[log.action] || 'gray'}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" ff="monospace">{log.performed_by}</Text></Table.Td>
                  <Table.Td><Text size="sm" ff="monospace" c="dimmed">{log.target_user || '—'}</Text></Table.Td>
                  <Table.Td><Text size="xs" ff="monospace" c="dimmed">{log.ip_address || '—'}</Text></Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed"
                      style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {expanded === log.id && (
                  <Table.Tr key={`${log.id}-x`} style={{ background: 'var(--mantine-color-gray-0)' }}>
                    <Table.Td colSpan={7} style={{ padding: '10px 24px' }}>
                      <Text size="xs" fw={600} c="dimmed" mb={4}>Full Details</Text>
                      <Code block style={{ fontSize: 11 }}>{JSON.stringify(log.details, null, 2)}</Code>
                    </Table.Td>
                  </Table.Tr>
                )}
              </>
            ))}
          </Table.Tbody>
        </Table>
        {totalPages > 1 && (
          <>
            <Divider />
            <Group justify="space-between" px="md" py="sm">
              <Text size="xs" c="dimmed">Page {page} of {totalPages} ({count} total)</Text>
              <Pagination value={page} onChange={setPage} total={totalPages} size="sm" radius="md" />
            </Group>
          </>
        )}
      </Card>
    </Stack>
  );
}
