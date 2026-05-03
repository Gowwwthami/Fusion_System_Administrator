import { useState, useEffect } from 'react';
import {
  Modal, Tabs, TextInput, PasswordInput, Select, Button,
  Group, Stack, SimpleGrid, Text, Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus, IconAlertCircle } from '@tabler/icons-react';
import { getDepartments, getBatches, getProgrammes, getDesignations, addStudent, addFaculty, addStaff } from '../../../api';

const EMPTY_FORM = {};

export default function AddUserModal({ opened, onClose, onCreated }) {
  const [tab, setTab] = useState('student');
  const [form, setForm] = useState(EMPTY_FORM);
  const [refs, setRefs] = useState({ departments: [], batches: [], programmes: [], designations: [] });
  const [refsLoading, setRefsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load reference data when modal opens
  useEffect(() => {
    if (!opened) return;
    setRefsLoading(true);
    setFormError('');
    Promise.all([getDepartments(), getBatches(), getProgrammes(), getDesignations()])
      .then(([departments, batches, programmes, designations]) =>
        setRefs({ departments, batches, programmes, designations }))
      .catch(() => setFormError('Failed to load form options. Check that the backend is running.'))
      .finally(() => setRefsLoading(false));
  }, [opened]);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleClose() {
    setForm(EMPTY_FORM);
    setTab('student');
    setFormError('');
    onClose();
  }

  async function handleSubmit() {
    setFormError('');
    setSubmitting(true);
    try {
      // Build payload — parse integers where backend expects them
      const payload = { ...form };
      if (payload.batch_id)       payload.batch_id       = parseInt(payload.batch_id, 10);
      if (payload.programme_id)   payload.programme_id   = parseInt(payload.programme_id, 10);
      if (payload.designation_id) payload.designation_id = parseInt(payload.designation_id, 10);

      const fn = { student: addStudent, faculty: addFaculty, staff: addStaff }[tab];
      const result = await fn(payload);

      notifications.show({
        title: 'User created',
        message: `"${result.username}" was created successfully.`,
        color: 'green',
        autoClose: 4000,
      });
      onCreated();
      handleClose();
    } catch (err) {
      const msg = err?.data?.error
        || (typeof err?.data === 'object' ? JSON.stringify(err.data) : null)
        || 'Failed to create user. Check all required fields.';
      setFormError(msg);
      notifications.show({
        title: 'Create user failed',
        message: msg,
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Common fields shared across all user types
  const commonFields = (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing="sm">
        <TextInput label="Username *"   placeholder="e.g. john.doe"          required value={form.username   || ''} onChange={e => set('username',   e.target.value)} />
        <TextInput label="Email *"      type="email" placeholder="user@gmail.com" required value={form.email      || ''} onChange={e => set('email',      e.target.value)} />
      </SimpleGrid>
      <SimpleGrid cols={2} spacing="sm">
        <TextInput label="First Name *" required value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
        <TextInput label="Last Name *"  required value={form.last_name  || ''} onChange={e => set('last_name',  e.target.value)} />
      </SimpleGrid>
      <SimpleGrid cols={2} spacing="sm">
        <TextInput label="Phone" placeholder="10-digit number" value={form.phone_no || ''} onChange={e => set('phone_no', e.target.value)} />
        <PasswordInput label="Password" placeholder="Auto-generated if blank" value={form.password || ''} onChange={e => set('password', e.target.value)} />
      </SimpleGrid>
    </Stack>
  );

  const batchData       = refs.batches.map(b     => ({ value: String(b.id),   label: `${b.name} (${b.year})` }));
  const programmeData   = refs.programmes.map(p  => ({ value: String(p.id),   label: p.name }));
  const departmentData  = refs.departments.map(d => ({ value: d.name,         label: d.name }));
  const designationData = refs.designations.map(d=> ({ value: String(d.id),   label: d.name }));

  return (
    <Modal
      opened={opened} onClose={handleClose} size="lg" radius="md"
      title={<Group gap="xs"><IconUserPlus size={17} /><Text fw={700}>Create New User</Text></Group>}
    >
      <Tabs value={tab} onChange={v => { setTab(v); setForm(EMPTY_FORM); setFormError(''); }}>
        <Tabs.List mb="md">
          <Tabs.Tab value="student">Student</Tabs.Tab>
          <Tabs.Tab value="faculty">Faculty</Tabs.Tab>
          <Tabs.Tab value="staff">Staff</Tabs.Tab>
        </Tabs.List>

        {/* ── STUDENT ── */}
        <Tabs.Panel value="student">
          <Stack gap="sm">
            {commonFields}
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Batch *"
                placeholder={refsLoading ? 'Loading…' : batchData.length === 0 ? 'No batches in DB — add via Django admin' : 'Select batch'}
                data={batchData}
                required
                disabled={refsLoading}
                value={form.batch_id ? String(form.batch_id) : null}
                onChange={v => set('batch_id', v ? parseInt(v, 10) : null)}
                nothingFoundMessage="No batches found. Add via /admin"
                searchable
              />
              <Select
                label="Programme *"
                placeholder={refsLoading ? 'Loading…' : programmeData.length === 0 ? 'No programmes in DB — add via Django admin' : 'Select programme'}
                data={programmeData}
                required
                disabled={refsLoading}
                value={form.programme_id ? String(form.programme_id) : null}
                onChange={v => set('programme_id', v ? parseInt(v, 10) : null)}
                nothingFoundMessage="No programmes found. Add via /admin"
                searchable
              />
            </SimpleGrid>
            <Select
              label="Category"
              data={[{ value: 'UG', label: 'UG — Undergraduate' }, { value: 'PG', label: 'PG — Postgraduate' }, { value: 'PhD', label: 'PhD — Doctorate' }]}
              value={form.category || 'UG'}
              onChange={v => set('category', v)}
              style={{ width: '50%' }}
            />
          </Stack>
        </Tabs.Panel>

        {/* ── FACULTY ── */}
        <Tabs.Panel value="faculty">
          <Stack gap="sm">
            {commonFields}
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Department *"
                placeholder={refsLoading ? 'Loading…' : 'Select department'}
                data={departmentData}
                required disabled={refsLoading}
                value={form.department_id || null}
                onChange={v => set('department_id', v)}
                searchable
              />
              <Select
                label="Designation *"
                placeholder={refsLoading ? 'Loading…' : 'Select designation'}
                data={designationData}
                required disabled={refsLoading}
                value={form.designation_id ? String(form.designation_id) : null}
                onChange={v => set('designation_id', v ? parseInt(v, 10) : null)}
                searchable
              />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        {/* ── STAFF ── */}
        <Tabs.Panel value="staff">
          <Stack gap="sm">
            {commonFields}
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Department *"
                placeholder={refsLoading ? 'Loading…' : 'Select department'}
                data={departmentData}
                required disabled={refsLoading}
                value={form.department_id || null}
                onChange={v => set('department_id', v)}
                searchable
              />
              <Select
                label="Designation *"
                placeholder={refsLoading ? 'Loading…' : 'Select designation'}
                data={designationData}
                required disabled={refsLoading}
                value={form.designation_id ? String(form.designation_id) : null}
                onChange={v => set('designation_id', v ? parseInt(v, 10) : null)}
                searchable
              />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Error shown inside modal, never crashes the page */}
      {formError && (
        <Alert icon={<IconAlertCircle size={15} />} color="red" variant="light" radius="md" mt="md">
          {formError}
        </Alert>
      )}

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} loading={submitting}>Create User</Button>
      </Group>
    </Modal>
  );
}
