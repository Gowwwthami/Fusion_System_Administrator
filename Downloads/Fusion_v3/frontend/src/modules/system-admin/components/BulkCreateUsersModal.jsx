import { useMemo, useRef, useState } from 'react';
import { Modal, Stack, Group, Text, Select, Textarea, Button, Alert, List } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDownload, IconUpload, IconUsersPlus } from '@tabler/icons-react';
import { bulkCreateUsers } from '../../../api';

const TYPE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
];

const SAMPLE_BY_TYPE = {
  student: [
    {
      username: 'student1001',
      first_name: 'Asha',
      last_name: 'Verma',
      email: 'asha.verma@gmail.com',
      batch_id: 1,
      programme_id: 1,
      category: 'GEN',
    },
  ],
  faculty: [
    {
      username: 'faculty1001',
      first_name: 'Ravi',
      last_name: 'Mehta',
      email: 'ravi.mehta@gmail.com',
      department_id: 'CSE',
      designation_id: 1,
    },
  ],
  staff: [
    {
      username: 'staff1001',
      first_name: 'Neha',
      last_name: 'Soni',
      email: 'neha.soni@gmail.com',
      department_id: 'CSE',
      designation_id: 1,
    },
  ],
};

const CSV_HEADERS_BY_TYPE = {
  student: ['username', 'first_name', 'last_name', 'email', 'batch_id', 'programme_id', 'category', 'phone_no'],
  faculty: ['username', 'first_name', 'last_name', 'email', 'department_id', 'designation_id', 'phone_no'],
  staff: ['username', 'first_name', 'last_name', 'email', 'department_id', 'designation_id', 'phone_no'],
};

const INTEGER_FIELDS_BY_TYPE = {
  student: ['batch_id', 'programme_id'],
  faculty: ['designation_id'],
  staff: ['designation_id'],
};

const ALLOWED_FIELDS_BY_TYPE = {
  student: new Set([
    'username', 'first_name', 'last_name', 'email', 'password', 'phone_no',
    'roll_number', 'batch_id', 'programme_id', 'category', 'semester', 'department_id',
    'father_name', 'mother_name', 'gender', 'title',
  ]),
  faculty: new Set([
    'username', 'first_name', 'last_name', 'email', 'password', 'phone_no',
    'department_id', 'designation_id',
  ]),
  staff: new Set([
    'username', 'first_name', 'last_name', 'email', 'password', 'phone_no',
    'department_id', 'designation_id',
  ]),
};

const STUDENT_CATEGORY_MAP = {
  gen: 'GEN',
  general: 'GEN',
  obc: 'OBC',
  sc: 'SC',
  st: 'ST',
  ews: 'EWS',
};

const STUDENT_GENDER_MAP = {
  m: 'M',
  male: 'M',
  f: 'F',
  female: 'F',
};

const HEADER_ALIASES = {
  username: ['username', 'user_name', 'userid', 'user id', 'employee_id', 'employee id'],
  roll_number: ['roll_number', 'roll no', 'roll no.', 'roll number'],
  first_name: ['first_name', 'firstname', 'first name'],
  last_name: ['last_name', 'lastname', 'last name', 'surname'],
  email: ['email', 'email_id', 'email id', 'mail', 'e-mail', 'email address'],
  phone_no: ['phone_no', 'phone', 'mobile', 'mobile_no', 'phone number'],
  department_id: ['department_id', 'department', 'dept', 'department name'],
  designation_id: ['designation_id', 'designation', 'role', 'designation name'],
  batch_id: ['batch_id', 'batch', 'batch_name', 'batch year', 'batch_year'],
  programme_id: ['programme_id', 'programme', 'program', 'programme name'],
  category: ['category'],
  semester: ['semester', 'sem'],
  father_name: ['father_name', 'father name', "father's name"],
  mother_name: ['mother_name', 'mother name', "mother's name"],
  gender: ['gender', 'sex'],
  title: ['title'],
};

function normalizeHeader(header) {
  const clean = (header || '').replace(/^\uFEFF/, '').trim();
  const key = clean.toLowerCase().replace(/\s+/g, ' ');
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return canonical;
  }
  return clean;
}

function withDerivedFields(row, userType) {
  const normalized = { ...row };

  if (userType === 'student') {
    if (!normalized.username && normalized.roll_number) {
      normalized.username = normalized.roll_number;
    }
    if (!normalized.roll_number && normalized.username) {
      normalized.roll_number = normalized.username;
    }
  }

  return normalized;
}

function normalizeValue(field, rawValue, userType) {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return raw;

  if (userType === 'student' && field === 'category') {
    return STUDENT_CATEGORY_MAP[raw.toLowerCase()] || raw.toUpperCase();
  }

  if (userType === 'student' && field === 'gender') {
    return STUDENT_GENDER_MAP[raw.toLowerCase()] || raw;
  }

  return raw;
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function csvTextToUsers(csvText, userType) {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    throw new Error('CSV file is empty.');
  }

  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must include a header and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]).map((h) => normalizeHeader(h));
  const intFields = INTEGER_FIELDS_BY_TYPE[userType] || [];
  const allowedFields = ALLOWED_FIELDS_BY_TYPE[userType] || new Set();

  const users = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      if (!allowedFields.has(header)) return;

      const raw = normalizeValue(header, values[index] ?? '', userType);
      if (!raw) return;

      if (intFields.includes(header)) {
        const asNumber = parseInt(raw, 10);
        row[header] = Number.isNaN(asNumber) ? raw : asNumber;
        return;
      }

      row[header] = raw;
    });

    row._row = idx + 2;
    return withDerivedFields(row, userType);
  });

  return users;
}

function buildBulkFailureMessage(payload) {
  const failed = payload?.results?.failed;
  if (!Array.isArray(failed) || failed.length === 0) return null;

  const first = failed[0] || {};
  const rawError = first.error;
  const errorText = typeof rawError === 'string'
    ? rawError
    : JSON.stringify(rawError || {});
  return `Row ${first.index || 1}${first.username ? ` (${first.username})` : ''}: ${errorText}`;
}

export default function BulkCreateUsersModal({ opened, onClose, onCreated }) {
  const [userType, setUserType] = useState('student');
  const [rawJson, setRawJson] = useState(JSON.stringify(SAMPLE_BY_TYPE.student, null, 2));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [csvUsers, setCsvUsers] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const csvInputRef = useRef(null);

  const hints = useMemo(() => {
    if (userType === 'student') return ['Required fields: username, first_name, last_name, email, batch_id, programme_id'];
    return ['Required fields: username, first_name, last_name, email, department_id, designation_id'];
  }, [userType]);

  function handleTypeChange(value) {
    const nextType = value || 'student';
    setUserType(nextType);
    setRawJson(JSON.stringify(SAMPLE_BY_TYPE[nextType], null, 2));
    setCsvUsers([]);
    setCsvFileName('');
    setError('');
    setResult(null);
  }

  function handleClose() {
    setError('');
    setResult(null);
    setCsvUsers([]);
    setCsvFileName('');
    onClose();
  }

  function triggerCsvPick() {
    csvInputRef.current?.click();
  }

  function handleDownloadTemplate() {
    const headers = CSV_HEADERS_BY_TYPE[userType];
    const sample = SAMPLE_BY_TYPE[userType][0] || {};
    const row = headers.map((header) => escapeCsvValue(sample[header] ?? ''));
    const csv = `${headers.join(',')}\n${row.join(',')}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bulk_create_${userType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCsvPicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedUsers = csvTextToUsers(text, userType).map(({ _row, ...row }) => row);

      if (!parsedUsers.length) {
        setError('CSV has no usable user rows.');
        setCsvUsers([]);
        setCsvFileName('');
        return;
      }

      setCsvUsers(parsedUsers);
      setCsvFileName(file.name);
      setRawJson(JSON.stringify(parsedUsers, null, 2));
      setError('');
      setResult(null);
      notifications.show({
        title: 'CSV converted',
        message: `${parsedUsers.length} rows converted to JSON.`,
        color: 'green',
      });
    } catch (err) {
      setCsvUsers([]);
      setCsvFileName('');
      setError(err?.message || 'Failed to parse CSV file.');
    } finally {
      event.target.value = '';
    }
  }

  async function submitUsers(users) {
    setSubmitting(true);
    try {
      const res = await bulkCreateUsers(userType, users);
      setResult(res.results);
      notifications.show({
        title: 'Bulk create finished',
        message: `${res.results.created.length} created, ${res.results.failed.length} failed.`,
        color: res.results.failed.length > 0 ? 'yellow' : 'green',
      });
      const firstFailure = buildBulkFailureMessage(res);
      if (firstFailure) {
        notifications.show({ title: 'First failure', message: firstFailure, color: 'red' });
      }
      onCreated();
    } catch (err) {
      const message = buildBulkFailureMessage(err?.data)
        || err?.data?.error
        || (typeof err?.data === 'object' ? JSON.stringify(err.data) : null)
        || 'Bulk create failed.';
      setError(message);
      notifications.show({ title: 'Bulk create failed', message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setError('');
    setResult(null);

    let users;
    try {
      users = JSON.parse(rawJson);
    } catch {
      const message = 'Invalid JSON. Paste a valid JSON array.';
      setError(message);
      notifications.show({ title: 'Invalid payload', message, color: 'red' });
      return;
    }

    if (!Array.isArray(users) || users.length === 0) {
      const message = 'Payload must be a non-empty JSON array of users.';
      setError(message);
      notifications.show({ title: 'Invalid payload', message, color: 'red' });
      return;
    }

    await submitUsers(users);
  }

  async function handleSubmitCsvConverted() {
    setError('');
    setResult(null);

    if (!csvUsers.length) {
      const message = 'Upload a CSV and convert it first.';
      setError(message);
      notifications.show({ title: 'CSV required', message, color: 'red' });
      return;
    }

    await submitUsers(csvUsers);
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="lg"
      radius="md"
      title={(
        <Group gap="xs">
          <IconUsersPlus size={17} />
          <Text fw={700}>Bulk Create Users</Text>
        </Group>
      )}
    >
      <Stack gap="sm">
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleCsvPicked}
        />
        <Select label="User type" data={TYPE_OPTIONS} value={userType} onChange={handleTypeChange} />
        <Group gap="xs" wrap="wrap">
          <Button variant="default" leftSection={<IconDownload size={14} />} onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>
          <Button variant="default" leftSection={<IconUpload size={14} />} onClick={triggerCsvPick}>
            Upload CSV
          </Button>
          <Button variant="light" onClick={handleSubmitCsvConverted} disabled={!csvUsers.length} loading={submitting}>
            Convert CSV to JSON and Submit
          </Button>
        </Group>
        {csvFileName && (
          <Text size="xs" c="dimmed">
            CSV ready: {csvFileName} ({csvUsers.length} rows)
          </Text>
        )}
        <Textarea
          autosize
          minRows={12}
          label="Users JSON Array (manual or CSV-converted)"
          placeholder="Paste JSON array"
          value={rawJson}
          onChange={(e) => setRawJson(e.currentTarget.value)}
        />
        <List size="xs" c="dimmed">
          {hints.map((hint) => (
            <List.Item key={hint}>{hint}</List.Item>
          ))}
        </List>

        {error && (
          <Alert icon={<IconAlertCircle size={15} />} color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        {result && (
          <Alert color={result.failed.length > 0 ? 'yellow' : 'green'} variant="light" radius="md">
            Created: {result.created.length} | Failed: {result.failed.length}
          </Alert>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose} disabled={submitting}>Close</Button>
          <Button onClick={handleSubmit} loading={submitting}>Create in Bulk</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
