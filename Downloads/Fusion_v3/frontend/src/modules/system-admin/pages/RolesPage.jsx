import { useState } from 'react';
import {
  Stack, Group, Title, Text, TextInput, Button, Card,
  Table, Badge, Modal, Select, SimpleGrid, Divider,
  Box, ThemeIcon, Alert, Skeleton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconKey, IconPlus, IconRefresh, IconTrash, IconAlertCircle, IconUserSearch } from '@tabler/icons-react';
import { getUserRoles, getDesignations, assignRole, reassignRole, revokeRole } from '../../../api';

export default function RolesPage() {
  const [inputVal, setInputVal]     = useState('');
  const [username, setUsername]     = useState('');
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [designations, setDesignations] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showReassign, setShowReassign] = useState(null);
  const [assignForm, setAssignForm] = useState({ designation_id: '', start_date: '', end_date: '' });
  const [reassignDesig, setReassignDesig] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchRoles(uname) {
    setLoading(true);
    try {
      const data = await getUserRoles(uname);
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      notifications.show({ title: 'Not found', message: 'User not found or has no roles.', color: 'red' });
      setRoles([]);
    } finally { setLoading(false); }
  }

  async function openAssign() {
    const d = await getDesignations().catch(() => []);
    setDesignations(d);
    setAssignForm({ designation_id: '', start_date: '', end_date: '' });
    setShowAssign(true);
  }

  async function openReassign(hold) {
    const d = await getDesignations().catch(() => []);
    setDesignations(d);
    setReassignDesig('');
    setShowReassign(hold);
  }

  async function handleAssign() {
    setSubmitting(true);
    try {
      await assignRole({ username, ...assignForm, designation_id: parseInt(assignForm.designation_id, 10) });
      notifications.show({ title: 'Success', message: 'Role assigned.', color: 'green' });
      setShowAssign(false);
      fetchRoles(username);
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.data?.error || 'Failed.', color: 'red' });
    } finally { setSubmitting(false); }
  }

  async function handleReassign() {
    setSubmitting(true);
    try {
      await reassignRole(showReassign.id, parseInt(reassignDesig, 10));
      notifications.show({ title: 'Success', message: 'Role reassigned.', color: 'green' });
      setShowReassign(null);
      fetchRoles(username);
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.data?.error || 'Failed.', color: 'red' });
    } finally { setSubmitting(false); }
  }

  async function handleRevoke(holdId) {
    if (!confirm('Revoke this role?')) return;
    try {
      await revokeRole(holdId);
      notifications.show({ title: 'Revoked', message: 'Role revoked.', color: 'orange' });
      fetchRoles(username);
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.data?.error || 'Failed.', color: 'red' });
    }
  }

  const desigData = designations.map(d => ({ value: String(d.id), label: d.name }));

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2} fw={700} style={{ letterSpacing: '-0.5px' }}>Role Assignment</Title>
        <Text c="dimmed" size="sm" mt={4}>Assign, reassign, and manage user roles and designations</Text>
      </Box>

      <Card withBorder radius="md">
        <Group gap={8} mb="md">
          <ThemeIcon size={26} variant="light" color="orange" radius="md"><IconUserSearch size={14}/></ThemeIcon>
          <Text fw={600} size="sm">Look Up User</Text>
        </Group>
        <Group gap="sm">
          <TextInput
            placeholder="Enter username…" leftSection={<IconSearch size={13}/>}
            value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && inputVal) { setUsername(inputVal); fetchRoles(inputVal); }}}
            style={{ width: 300 }}
          />
          <Button leftSection={<IconSearch size={13}/>} disabled={!inputVal || loading} loading={loading}
            onClick={() => { setUsername(inputVal); fetchRoles(inputVal); }}>
            Search
          </Button>
        </Group>
      </Card>

      {username && (
        <Card withBorder radius="md" p={0}>
          <Group justify="space-between" px="lg" py="md">
            <Group gap={8}>
              <ThemeIcon size={26} variant="light" color="orange" radius="md"><IconKey size={14}/></ThemeIcon>
              <Box>
                <Text fw={600} size="sm">Roles for</Text>
                <Text size="xs" c="orange" ff="monospace">{username}</Text>
              </Box>
            </Group>
            <Button size="sm" leftSection={<IconPlus size={13}/>} onClick={openAssign}>Assign Role</Button>
          </Group>
          <Divider />
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Designation</Table.Th><Table.Th>Status</Table.Th>
                <Table.Th>Start Date</Table.Th><Table.Th>End Date</Table.Th>
                <Table.Th style={{ width: 160 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <Table.Tr key={i}>{[...Array(5)].map((__, j) => <Table.Td key={j}><Skeleton height={14} radius="sm"/></Table.Td>)}</Table.Tr>
              )) : roles.length === 0 ? (
                <Table.Tr><Table.Td colSpan={5}><Box ta="center" py="xl"><Text c="dimmed" size="sm">No roles found for this user</Text></Box></Table.Td></Table.Tr>
              ) : roles.map(r => (
                <Table.Tr key={r.id}>
                  <Table.Td><Text size="sm" fw={500}>{r.designation.name}</Text></Table.Td>
                  <Table.Td><Badge size="sm" variant="light" color={r.working ? 'green' : 'gray'}>{r.working ? 'Active' : 'Revoked'}</Badge></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed" ff="monospace">{r.start_date || '—'}</Text></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed" ff="monospace">{r.end_date || '—'}</Text></Table.Td>
                  <Table.Td>
                    {r.working && (
                      <Group gap={6}>
                        <Button size="xs" variant="light" color="blue" leftSection={<IconRefresh size={11}/>} onClick={() => openReassign(r)}>Reassign</Button>
                        <Button size="xs" variant="light" color="red"  leftSection={<IconTrash   size={11}/>} onClick={() => handleRevoke(r.id)}>Revoke</Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Assign Modal */}
      <Modal opened={showAssign} onClose={() => setShowAssign(false)} title="Assign Role" radius="md">
        <Stack gap="md">
          <Select label="Designation *" placeholder="Select designation" required data={desigData}
            value={assignForm.designation_id} onChange={v => setAssignForm(f => ({ ...f, designation_id: v }))} searchable />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput label="Start Date" type="date" value={assignForm.start_date} onChange={e => setAssignForm(f => ({ ...f, start_date: e.target.value }))} />
            <TextInput label="End Date"   type="date" value={assignForm.end_date}   onChange={e => setAssignForm(f => ({ ...f, end_date:   e.target.value }))} />
          </SimpleGrid>
          <Group justify="flex-end" mt={4}>
            <Button variant="default" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={submitting} disabled={!assignForm.designation_id}>Assign</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Reassign Modal */}
      <Modal opened={!!showReassign} onClose={() => setShowReassign(null)} title="Reassign Role" radius="md">
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={14}/>} variant="light" color="blue">
            Current role: <strong>{showReassign?.designation?.name}</strong>
          </Alert>
          <Select label="New Designation *" placeholder="Select" required
            data={desigData.filter(d => d.value !== String(showReassign?.designation?.id))}
            value={reassignDesig} onChange={setReassignDesig} searchable />
          <Group justify="flex-end" mt={4}>
            <Button variant="default" onClick={() => setShowReassign(null)}>Cancel</Button>
            <Button onClick={handleReassign} loading={submitting} disabled={!reassignDesig}>Reassign</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
