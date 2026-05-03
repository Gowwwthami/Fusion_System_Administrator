import { useState } from "react";
import { activateUser, deactivateUser, archiveUser, resetPassword } from "../../services/api";
import { useToast } from "../../utils/toast";
import Modal from "../dashboard/Modal";

export default function UserActionsMenu({ user, onRefresh }) {
  const toast = useToast();
  const notifyAdminUpdate = (message = "Update completed successfully") => {
    toast(message, "success");
  };
  const [showReset, setShowReset] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const username = user?.user?.username;
  const status = user?.user_status;

  async function doAction(fn, successMessage, failureMessage) {
    setLoading(true);
    setOpen(false);
    try {
      await fn(username);
      notifyAdminUpdate(successMessage);
      onRefresh();
    } catch (err) {
      toast(err?.data?.error || failureMessage, "error");
    } finally { setLoading(false); }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(username, newPass);
      notifyAdminUpdate("Password reset successfully.");
      setShowReset(false);
      setNewPass("");
    } catch (err) {
      toast(err?.data?.error || "Password reset failed.", "error");
    } finally { setLoading(false); }
  }

  return (
    <>
      <div style={{ position: "relative", display: "inline-block" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} disabled={loading}>
          ···
        </button>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 60,
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", minWidth: 170, padding: 4,
              boxShadow: "var(--shadow)",
            }}>
              {status !== "active" && <ActionItem label="Activate" onClick={() => doAction(activateUser, "Account activated successfully.", "Failed to activate account.")} color="var(--green)" />}
              {status === "active" && <ActionItem label="Deactivate" onClick={() => doAction(deactivateUser, "Account deactivated successfully.", "Failed to deactivate account.")} color="var(--red)" />}
              {status !== "archived" && <ActionItem label="Archive" onClick={() => doAction(archiveUser, "Account archived successfully.", "Failed to archive account.")} color="var(--muted)" />}
              <ActionItem label="Reset Password" onClick={() => { setOpen(false); setShowReset(true); }} color="var(--blue)" />
            </div>
          </>
        )}
      </div>

      {showReset && (
        <Modal title="Reset Password" onClose={() => setShowReset(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="reset-pw-form" disabled={loading}>
                {loading ? "Resetting…" : "Reset"}
              </button>
            </>
          }
        >
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Resetting password for <strong style={{ color: "var(--text)" }}>{username}</strong>
          </p>
          <form id="reset-pw-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" minLength={8} required value={newPass}
                onChange={e => setNewPass(e.target.value)} placeholder="Min. 8 characters" autoFocus />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function ActionItem({ label, onClick, color }) {
  return (
    <button className="btn btn-ghost" onClick={onClick} style={{ width: "100%", justifyContent: "flex-start", fontSize: 13, padding: "7px 12px", color, borderRadius: 6 }}>
      {label}
    </button>
  );
}
