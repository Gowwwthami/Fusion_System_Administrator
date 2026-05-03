import { useState, useEffect } from "react";
import Modal from "../dashboard/Modal";
import { getDepartments, getBatches, getProgrammes, getDesignations, addStudent, addFaculty, addStaff } from "../../services/api";
import { useToast } from "../../utils/toast";

export default function AddUserModal({ onClose, onCreated }) {
  const toast = useToast();
  const [userType, setUserType] = useState("student");
  const [form, setForm] = useState({});
  const [refs, setRefs] = useState({ departments: [], batches: [], programmes: [], designations: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getDepartments(), getBatches(), getProgrammes(), getDesignations()]).then(
      ([departments, batches, programmes, designations]) => setRefs({ departments, batches, programmes, designations })
    ).catch(() => {});
  }, []);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fn = { student: addStudent, faculty: addFaculty, staff: addStaff }[userType];
      const result = await fn({ ...form });
      toast("User created successfully.", "success");
      onCreated();
      onClose();
    } catch (err) {
      toast(err?.data?.error || "Failed to create user.", "error");
    } finally {
      setLoading(false);
    }
  }

  const commonFields = (
    <>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input className="form-input" placeholder="e.g. john.doe" required onChange={e => set("username", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" placeholder="user@gmail.com" required onChange={e => set("email", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">First Name *</label>
          <input className="form-input" required onChange={e => set("first_name", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name *</label>
          <input className="form-input" required onChange={e => set("last_name", e.target.value)} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" placeholder="10-digit number" onChange={e => set("phone_no", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password (optional)</label>
          <input className="form-input" type="password" placeholder="Auto-generated if blank" onChange={e => set("password", e.target.value)} />
        </div>
      </div>
    </>
  );

  return (
    <Modal
      title="Create New User"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="add-user-form" disabled={loading}>
            {loading ? "Creating…" : "Create User"}
          </button>
        </>
      }
    >
      {/* User Type Tabs */}
      <div className="tabs mb-4">
        {["student", "faculty", "staff"].map(t => (
          <button key={t} className={`tab ${userType === t ? "active" : ""}`} type="button" onClick={() => setUserType(t)} style={{ textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      <form id="add-user-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {commonFields}

        {userType === "student" && (
          <>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Batch *</label>
                <select className="form-input form-select" required onChange={e => set("batch_id", e.target.value)}>
                  <option value="">Select batch</option>
                  {refs.batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.year})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Programme *</label>
                <select className="form-input form-select" required onChange={e => set("programme_id", e.target.value)}>
                  <option value="">Select programme</option>
                  {refs.programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input form-select" onChange={e => set("category", e.target.value)}>
                  <option value="UG">UG</option>
                  <option value="PG">PG</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
            </div>
          </>
        )}

        {(userType === "faculty" || userType === "staff") && (
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-input form-select" required onChange={e => set("department_id", e.target.value)}>
                <option value="">Select department</option>
                {refs.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <select className="form-input form-select" required onChange={e => set("designation_id", e.target.value)}>
                <option value="">Select designation</option>
                {refs.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
