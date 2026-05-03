import { useState, useEffect, useRef } from "react";
import { useToast } from "../utils/toast";
import { addStudent, mailBatch, getBatches, getProgrammes, getDepartments } from "../services/api";
import BulkImportSection from "../components/users/BulkImportSection";

export default function AddStudentPage({ onBulkCreateSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    roll_number: "",
    first_name: "",
    last_name: "",
    title: "",
    department: "",
    gender: "",
    category: "",
    father_name: "",
    mother_name: "",
    programme: "",
    batch: "",
    semester: "",
    email: "",
    phone: "",
    date_of_birth: "",
  });

  const [mailBatchYear, setMailBatchYear] = useState("");
  const [mailing, setMailing] = useState(false);
  
  // Reference data from backend
  const [batches, setBatches] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRefs = useRef(false);

  // Load reference data
  useEffect(() => {
    if (hasLoadedRefs.current) return;
    hasLoadedRefs.current = true;

    Promise.all([getBatches(), getProgrammes(), getDepartments()])
      .then(([b, p, d]) => {
        setBatches(b);
        setProgrammes(p);
        setDepartments(d);
      })
      .catch((err) => {
        toast("Failed to load form data. Make sure backend is running.", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      const required = ["roll_number", "first_name", "last_name", "gender", "category", "programme", "batch", "semester", "father_name", "mother_name", "email"];
      const missing = required.filter((f) => !formData[f]);

      if (missing.length > 0) {
        toast(`Please fill all required fields: ${missing.join(", ")}`, "error");
        return;
      }

      if (!formData.email.toLowerCase().endsWith("@gmail.com")) {
        toast("Only @gmail.com email addresses are allowed.", "error");
        return;
      }

      // Debug: Log what we're about to send
      const studentData = {
        username: formData.roll_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        roll_number: formData.roll_number,
        title: formData.title || "",
        department_id: formData.department || "",
        gender: formData.gender,
        category: formData.category,
        father_name: formData.father_name || "",
        mother_name: formData.mother_name || "",
        programme_id: parseInt(formData.programme, 10),
        batch_id: parseInt(formData.batch, 10),
        semester: formData.semester || "",
        phone_no: formData.phone || "",
      };

      await addStudent(studentData);
      toast("Student account created successfully.", "success");
      resetForm();
    } catch (err) {
      // Extract detailed error message
      let errorMessage = "Failed to create student";
      
      if (err?.data) {
        // Handle serializer errors (object with field errors)
        if (err.data.error && typeof err.data.error === 'object') {
          const fieldErrors = Object.entries(err.data.error)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = fieldErrors || JSON.stringify(err.data.error) || errorMessage;
        } 
        // Handle simple error string
        else if (err.data.error) {
          errorMessage = err.data.error;
        }
        // Handle other error formats
        else if (err.data.message) {
          errorMessage = err.data.message;
        }
      }
      
      toast(errorMessage, "error");
    }
  };

  const resetForm = () => {
    setFormData({
      roll_number: "",
      first_name: "",
      last_name: "",
      title: "",
      department: "",
      gender: "",
      category: "",
      father_name: "",
      mother_name: "",
      programme: "",
      batch: "",
      semester: "",
      email: "",
      phone: "",
      date_of_birth: "",
    });
  };

  const handleMailBatch = async () => {
    if (!mailBatchYear) {
      toast("Please enter a batch year", "error");
      return;
    }
    setMailing(true);
    try {
      const result = await mailBatch(mailBatchYear);
      toast(`Mail batch completed successfully: ${result.success} sent, ${result.failed} failed.`, "success");
      setMailBatchYear("");
    } catch (err) {
      toast(err?.data?.error || "Mail batch failed", "error");
    } finally {
      setMailing(false);
    }
  };

  const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const CATEGORIES = ["GEN", "OBC", "SC", "ST", "EWS"];
  const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr."];

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading form...</div>;
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Add Student
      </div>

      {/* Mail Batch Section */}
      <div className="role-section" style={{ marginBottom: 16 }}>
        <h2>Mail Batch - Generate Passwords</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Batch Year</label>
            <select
              value={mailBatchYear}
              onChange={(e) => setMailBatchYear(e.target.value)}
            >
              <option value="">Select batch year</option>
              {batches.map((b) => (
                <option key={b.id} value={b.year}>{b.name} ({b.year})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={handleMailBatch}
              disabled={mailing}
            >
              {mailing ? "Sending..." : "Mail Batch"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          This will generate new passwords and email them to all students in the selected batch.
        </p>
      </div>

      <BulkImportSection
        userType="student"
        allowTypeSelect
        allowedTypes={["student"]}
        onSuccess={() => onBulkCreateSuccess?.("students")}
      />

      <div className="form-wrap">
        {/* Row 1 */}
        <div className="form-row">
          <div className="form-group">
            <label>Roll Number<span className="req">*</span></label>
            <input
              type="text"
              name="roll_number"
              placeholder="Enter roll number"
              value={formData.roll_number}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>First Name<span className="req">*</span></label>
            <input
              type="text"
              name="first_name"
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="form-row">
          <div className="form-group">
            <label>Last Name<span className="req">*</span></label>
            <input
              type="text"
              name="last_name"
              placeholder="Enter last name / NA"
              value={formData.last_name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Title</label>
            <select name="title" value={formData.title} onChange={handleChange}>
              <option value="">Select title</option>
              {TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div className="form-row single">
          <div className="form-group">
            <label>Department</label>
            <select name="department" value={formData.department} onChange={handleChange}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4 */}
        <div className="form-row">
          <div className="form-group">
            <label>Gender<span className="req">*</span></label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  checked={formData.gender === "M"}
                  onChange={handleChange}
                /> Male
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  checked={formData.gender === "F"}
                  onChange={handleChange}
                /> Female
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Category<span className="req">*</span></label>
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5 */}
        <div className="form-row">
          <div className="form-group">
            <label>Father&apos;s Name<span className="req">*</span></label>
            <input
              type="text"
              name="father_name"
              placeholder="Enter father's name"
              value={formData.father_name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Mother&apos;s Name<span className="req">*</span></label>
            <input
              type="text"
              name="mother_name"
              placeholder="Enter mother's name"
              value={formData.mother_name}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 6 */}
        <div className="form-row">
          <div className="form-group">
            <label>Programme<span className="req">*</span></label>
            <select name="programme" value={formData.programme} onChange={handleChange}>
              <option value="">Select programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Batch<span className="req">*</span></label>
            <select name="batch" value={formData.batch} onChange={handleChange}>
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.year})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 7 */}
        <div className="form-row">
          <div className="form-group">
            <label>Semester<span className="req">*</span></label>
            <select name="semester" value={formData.semester} onChange={handleChange}>
              <option value="">Select semester</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Email<span className="req">*</span></label>
            <input
              type="email"
              name="email"
              placeholder="Enter Gmail address (name@gmail.com)"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 8 */}
        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={resetForm}>Reset</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Create Student Account</button>
        </div>
      </div>
    </div>
  );
}
