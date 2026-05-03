import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Stack, Group, Title, Text, Button, TextInput, SegmentedControl,
  Card, Table, Badge, ActionIcon, Menu, Skeleton, Pagination,
  Box, Divider, Avatar,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconUpload, IconDownload, IconSearch, IconDots,
  IconUserCheck, IconUserOff, IconArchive, IconKey, IconX, IconUsers, IconUsersPlus,
} from '@tabler/icons-react';
import { getUsers, exportUsers, importUsers, activateUser, deactivateUser, archiveUser } from '../../../api';
import AddUserModal from '../components/AddUserModal';
import BulkCreateUsersModal from '../components/BulkCreateUsersModal';
import ResetPasswordModal from '../components/ResetPasswordModal';

const TYPE_FILTERS = [
  { value: 'all', label: 'All' }, { value: 'student', label: 'Students' },
  { value: 'faculty', label: 'Faculty' }, { value: 'staff', label: 'Staff' },
];
const STATUS_COLOR = { active: 'green', inactive: 'red', archived: 'gray' };
const TYPE_COLOR   = { student: 'blue', faculty: 'orange', staff: 'teal' };

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [count, setCount]           = useState(0);
  const [page, setPage]             = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]       = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [resetUser, setResetUser]   = useState(null);
  const importRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (typeFilter !== 'all') params.user_type = typeFilter;
      if (search) params.q = search;
      const res = await getUsers(params);
      setUsers(res.results || []);
      setCount(res.count || 0);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load users.', color: 'red' });
    } finally { setLoading(false); }
  }, [page, typeFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function commitSearch() { setSearch(searchInput); setPage(1); }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importUsers(file, typeFilter !== 'all' ? typeFilter : 'student');
      notifications.show({
        title: 'Import complete',
        message: `${result.results.created.length} created, ${result.results.failed.length} failed.`,
        color: 'green',
      });
      fetchUsers();
    } catch {
      notifications.show({ title: 'Import failed', message: 'Check CSV format.', color: 'red' });
    }
    e.target.value = '';
  }

  async function doAction(fn, username, label) {
    try {
      await fn(username);
      notifications.show({ title: 'Done', message: `${label} successful.`, color: 'green' });
      fetchUsers();
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.data?.error || `${label} failed.`, color: 'red' });
    }
  }

  const totalPages = Math.ceil(count / 20);

  const rows = loading
    ? [...Array(6)].map((_, i) => (
        <Table.Tr key={i}>{[...Array(7)].map((__, j) => <Table.Td key={j}><Skeleton height={14} radius="sm" /></Table.Td>)}</Table.Tr>
      ))
    : users.length === 0
    ? (<Table.Tr><Table.Td colSpan={7}><Box ta="center" py="xl"><IconUsers size={36} color="var(--mantine-color-gray-4)"/><Text c="dimmed" size="sm" mt="xs">No users found</Text></Box></Table.Td></Table.Tr>)
    : users.map(u => (
        <Table.Tr key={u.user.id}>
          <Table.Td>
            <Group gap={8}>
              <Avatar size={26} radius="xl" color="blue">
                <Text size="10px" fw={700}>{(u.user.first_name?.[0] || u.user.username[0]).toUpperCase()}</Text>
              </Avatar>
              <Text size="xs" ff="monospace" c="dimmed">{u.user.username}</Text>
            </Group>
          </Table.Td>
          <Table.Td><Text size="sm" fw={500}>{u.user.first_name} {u.user.last_name}</Text></Table.Td>
          <Table.Td><Text size="sm" c="dimmed">{u.user.email}</Text></Table.Td>
          <Table.Td><Badge size="sm" variant="light" color={TYPE_COLOR[u.user_type]   || 'gray'}>{u.user_type}</Badge></Table.Td>
          <Table.Td><Badge size="sm" variant="light" color={STATUS_COLOR[u.user_status] || 'gray'}>{u.user_status}</Badge></Table.Td>
          <Table.Td><Text size="sm" c="dimmed">{u.department?.name || '—'}</Text></Table.Td>
          <Table.Td>
            <Menu shadow="md" width={185} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" radius="md"><IconDots size={15}/></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{u.user.username}</Menu.Label>
                {u.user_status !== 'active'   && <Menu.Item leftSection={<IconUserCheck size={13}/>} color="green" onClick={() => doAction(activateUser,   u.user.username, 'Activation')}>Activate</Menu.Item>}
                {u.user_status === 'active'   && <Menu.Item leftSection={<IconUserOff   size={13}/>} color="orange" onClick={() => doAction(deactivateUser, u.user.username, 'Deactivation')}>Deactivate</Menu.Item>}
                {u.user_status !== 'archived' && <Menu.Item leftSection={<IconArchive  size={13}/>} color="gray" onClick={() => doAction(archiveUser,    u.user.username, 'Archive')}>Archive</Menu.Item>}
                <Divider />
                <Menu.Item leftSection={<IconKey size={13}/>} color="blue" onClick={() => setResetUser(u)}>Reset Password</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Table.Td>
        </Table.Tr>
      ));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={700} style={{ letterSpacing: '-0.5px' }}>User Management</Title>
          <Text c="dimmed" size="sm" mt={4}>{count} total users</Text>
        </Box>
        <Group gap={8}>
          <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <Button variant="default" size="sm" leftSection={<IconUpload size={13}/>} onClick={() => importRef.current?.click()}>Import CSV</Button>
          <Button variant="default" size="sm" leftSection={<IconUsersPlus size={13}/>} onClick={() => setShowBulkCreate(true)}>Bulk Create</Button>
          <Button variant="default" size="sm" leftSection={<IconDownload size={13}/>} onClick={() => exportUsers(typeFilter !== 'all' ? typeFilter : undefined)}>Export CSV</Button>
          <Button size="sm" leftSection={<IconPlus size={13}/>} onClick={() => setShowAdd(true)}>Add User</Button>
        </Group>
      </Group>

      <Group gap="md" wrap="wrap">
        <SegmentedControl value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }} data={TYPE_FILTERS} size="sm" />
        <TextInput
          placeholder="Search name, username, email…"
          leftSection={<IconSearch size={13}/>}
          rightSection={searchInput ? <ActionIcon size="xs" variant="subtle" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}><IconX size={11}/></ActionIcon> : null}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commitSearch()}
          style={{ width: 280 }} size="sm"
        />
      </Group>

      <Card withBorder radius="md" p={0}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Username</Table.Th><Table.Th>Name</Table.Th><Table.Th>Email</Table.Th>
              <Table.Th>Type</Table.Th><Table.Th>Status</Table.Th><Table.Th>Department</Table.Th>
              <Table.Th style={{ width: 46 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
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

      <AddUserModal opened={showAdd} onClose={() => setShowAdd(false)} onCreated={fetchUsers} />
      <BulkCreateUsersModal opened={showBulkCreate} onClose={() => setShowBulkCreate(false)} onCreated={fetchUsers} />
      {resetUser && <ResetPasswordModal opened user={resetUser} onClose={() => setResetUser(null)} />}
    </Stack>
  );
}
