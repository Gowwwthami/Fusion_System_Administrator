import { useState, useEffect, useRef } from "react";
import { useToast } from "../utils/toast";
import { addFaculty, addStaff, getDepartments, getDesignations } from "../services/api";
import BulkImportSection from "../components/users/BulkImportSection";

export default function AddFacultyPage({ onBulkCreateSuccess }) {
  const toast = useToast();
  const [userType, setUserType] = useState("faculty");
  const [formData, setFormData] = useState({
    employee_id: "",
    username: "",
    first_name: "",
    last_name: "",
    title: "",
    department: "",
    designation: "",
    gender: "",
    email: "",
    phone: "",
    date_of_joining: "",
    date_of_birth: "",
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRefs = useRef(false);

  // Load reference data
  useEffect(() => {
    if (hasLoadedRefs.current) return;
    hasLoadedRefs.current = true;

    Promise.all([getDepartments(), getDesignations()])
      .then(([d, des]) => {
        setDepartments(d);
        setDesignations(des);
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
      const required = ["username", "first_name", "last_name", "department", "email", "gender"];
      const missing = required.filter((f) => !formData[f]);

      if (missing.length > 0) {
        toast(`Please fill all required fields: ${missing.join(", ")}`, "error");
        return;
      }

      if (userType === "faculty" && !formData.designation) {
        toast("Please select a designation for faculty", "error");
        return;
      }

      if (!formData.email.toLowerCase().endsWith("@gmail.com")) {
        toast("Only @gmail.com email addresses are allowed.", "error");
        return;
      }

      const data = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        department_id: formData.department,
        designation_id: parseInt(formData.designation, 10),
        gender: formData.gender,
        phone_no: formData.phone || "",
      };

      if (userType === "faculty") {
        await addFaculty(data);
        toast("Faculty account created successfully.", "success");
      } else {
        await addStaff(data);
        toast("Staff account created successfully.", "success");
      }
      
      resetForm();
    } catch (err) {
      toast(err?.data?.error || `Failed to create ${userType}`, "error");
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
      username: "",
      first_name: "",
      last_name: "",
      title: "",
      department: "",
      designation: "",
      gender: "",
      email: "",
      phone: "",
      date_of_joining: "",
      date_of_birth: "",
    });
  };

  const TITLES = ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."];

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading form...</div>;
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Add Faculty / Staff
      </div>

      <BulkImportSection
        userType={userType}
        allowTypeSelect
        allowedTypes={["faculty", "staff"]}
        onUserTypeChange={setUserType}
        onSuccess={({ userType: createdType }) => onBulkCreateSuccess?.(createdType === "staff" ? "staff" : "faculty")}
      />

      <div className="form-wrap">
        {/* User Type */}
        <div className="form-row single">
          <div className="form-group">
            <label>User Type<span className="req">*</span></label>
            <select value={userType} onChange={(e) => setUserType(e.target.value)}>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>

        {/* Row 1 */}
        <div className="form-row">
          <div className="form-group">
            <label>Username<span className="req">*</span></label>
            <input
              type="text"
              name="username"
              placeholder="e.g. r.sharma"
              value={formData.username}
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
              placeholder="Enter last name"
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
        <div className="form-row">
          <div className="form-group">
            <label>Department<span className="req">*</span></label>
            <select name="department" value={formData.department} onChange={handleChange}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
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
        </div>

        {/* Row 4 */}
        <div className="form-row">
          {userType === "faculty" && (
            <div className="form-group">
              <label>Designation<span className="req">*</span></label>
              <select name="designation" value={formData.designation} onChange={handleChange}>
                <option value="">Select designation</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
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

        {/* Row 5 */}
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
            <label>Date of Joining</label>
            <input
              type="date"
              name="date_of_joining"
              value={formData.date_of_joining}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 6 */}
        <div className="form-row">
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
          <button className="btn btn-primary" onClick={handleSubmit}>Create Account</button>
        </div>
      </div>
    </div>
  );
}
