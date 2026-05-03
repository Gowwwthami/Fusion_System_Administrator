import { useState } from 'react';
import { Modal, PasswordInput, Button, Group, Text, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { resetPassword } from '../../../api';

export default function ResetPasswordModal({ opened, user, onClose }) {
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const username = user?.user?.username;

  async function handleSubmit() {
    if (newPass.length < 8) return;
    setErr(''); setLoading(true);
    try {
      await resetPassword(username, newPass);
      notifications.show({ title: 'Success', message: 'Password reset successfully.', color: 'green' });
      setNewPass(''); onClose();
    } catch (e) {
      const message = e?.data?.error || 'Password reset failed.';
      setErr(message);
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally { setLoading(false); }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Reset Password" radius="md" size="sm">
      <Text size="sm" c="dimmed" mb="md">
        Resetting password for <Text component="span" fw={600} c="dark">{username}</Text>
      </Text>
      <PasswordInput
        label="New Password" placeholder="Minimum 8 characters"
        value={newPass} onChange={e => setNewPass(e.target.value)}
        minLength={8} autoFocus mb="sm"
      />
      {err && <Alert icon={<IconAlertCircle size={14}/>} color="red" variant="light" radius="md" mb="sm">{err}</Alert>}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={newPass.length < 8}>Reset Password</Button>
      </Group>
    </Modal>
  );
}
