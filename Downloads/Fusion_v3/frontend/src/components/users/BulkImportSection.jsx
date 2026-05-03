import { useMemo, useRef, useState } from "react";
import { useToast } from "../../utils/toast";
import { bulkCreateUsers } from "../../services/api";

function buildBulkFailureMessage(payload) {
  const failed = payload?.results?.failed;
  if (!Array.isArray(failed) || failed.length === 0) return null;

  const first = failed[0] || {};
  const rawError = first.error;
  const errorText = typeof rawError === "string"
    ? rawError
    : JSON.stringify(rawError || {});
  return `Row ${first.index || 1}${first.username ? ` (${first.username})` : ""}: ${errorText}`;
}

const INTEGER_FIELDS_BY_TYPE = {
  student: ["batch_id", "programme_id"],
  faculty: ["designation_id"],
  staff: ["designation_id"],
};

const ALLOWED_FIELDS_BY_TYPE = {
  student: new Set([
    "username", "first_name", "last_name", "email", "password", "phone_no",
    "roll_number", "batch_id", "programme_id", "category", "semester", "department_id",
    "father_name", "mother_name", "gender", "title",
  ]),
  faculty: new Set([
    "username", "first_name", "last_name", "email", "password", "phone_no",
    "department_id", "designation_id",
  ]),
  staff: new Set([
    "username", "first_name", "last_name", "email", "password", "phone_no",
    "department_id", "designation_id",
  ]),
};

const STUDENT_CATEGORY_MAP = {
  gen: "GEN",
  general: "GEN",
  obc: "OBC",
  sc: "SC",
  st: "ST",
  ews: "EWS",
};

const STUDENT_GENDER_MAP = {
  m: "M",
  male: "M",
  f: "F",
  female: "F",
};

const HEADER_ALIASES = {
  username: ["username", "user_name", "userid", "user id", "employee_id", "employee id"],
  roll_number: ["roll_number", "roll no", "roll no.", "roll number"],
  first_name: ["first_name", "firstname", "first name"],
  last_name: ["last_name", "lastname", "last name", "surname"],
  email: ["email", "email_id", "email id", "mail", "e-mail", "email address"],
  phone_no: ["phone_no", "phone", "mobile", "mobile_no", "phone number"],
  department_id: ["department_id", "department", "dept", "department name"],
  designation_id: ["designation_id", "designation", "role", "designation name"],
  batch_id: ["batch_id", "batch", "batch_name", "batch year", "batch_year"],
  programme_id: ["programme_id", "programme", "program", "programme name"],
  category: ["category"],
  semester: ["semester", "sem"],
  father_name: ["father_name", "father name", "father's name"],
  mother_name: ["mother_name", "mother name", "mother's name"],
  gender: ["gender", "sex"],
  title: ["title"],
};

function normalizeHeader(header) {
  const clean = (header || "").replace(/^\uFEFF/, "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, " ");
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return canonical;
  }
  return clean;
}

function withDerivedFields(row, userType) {
  const normalized = { ...row };

  if (userType === "student") {
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
  const raw = String(rawValue ?? "").trim();
  if (!raw) return raw;

  if (userType === "student" && field === "category") {
    return STUDENT_CATEGORY_MAP[raw.toLowerCase()] || raw.toUpperCase();
  }

  if (userType === "student" && field === "gender") {
    return STUDENT_GENDER_MAP[raw.toLowerCase()] || raw;
  }

  return raw;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
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

    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function csvToUsers(csvText, userType) {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    throw new Error("CSV file is empty.");
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((h) => normalizeHeader(h));
  const intFields = INTEGER_FIELDS_BY_TYPE[userType] || [];
  const allowedFields = ALLOWED_FIELDS_BY_TYPE[userType] || new Set();

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      if (!allowedFields.has(header)) return;

      const raw = normalizeValue(header, values[idx] ?? "", userType);
      if (!raw) return;

      if (intFields.includes(header)) {
        const n = parseInt(raw, 10);
        row[header] = Number.isNaN(n) ? raw : n;
      } else {
        row[header] = raw;
      }
    });

    return withDerivedFields(row, userType);
  });
}

export default function BulkImportSection({
  userType,
  onUserTypeChange,
  allowTypeSelect = false,
  allowedTypes,
  onSuccess,
}) {
  const toast = useToast();
  const showSuccessPopup = (message) => {
    if (typeof toast === "function") {
      toast(message, "success");
    }
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message);
    }
  };
  const csvInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [csvUsers, setCsvUsers] = useState([]);
  const [csvMeta, setCsvMeta] = useState({ name: "", count: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("info");

  const activeType = userType || "student";
  const typeOptions = useMemo(() => {
    const all = [
      { value: "student", label: "Student" },
      { value: "faculty", label: "Faculty" },
      { value: "staff", label: "Staff" },
    ];
    if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return all;
    return all.filter((opt) => allowedTypes.includes(opt.value));
  }, [allowedTypes]);

  function resetParsed() {
    setCsvUsers([]);
    setCsvMeta({ name: "", count: 0 });
    setStatusMsg("");
    setStatusType("info");
  }

  async function onCsvPick(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const users = csvToUsers(text, activeType).filter((row) => Object.keys(row).length > 0);

      if (!users.length) {
        toast("CSV has no usable user rows.", "error");
        resetParsed();
        return;
      }

      setCsvUsers(users);
      setCsvMeta({ name: file.name, count: users.length });
      setStatusType("success");
      setStatusMsg(`File parsed successfully (${users.length} rows). Click Create Users (check icon) to upload to backend.`);
      showSuccessPopup("File uploaded successfully.");
    } catch (err) {
      resetParsed();
      setStatusType("error");
      setStatusMsg(err?.message || "Failed to parse CSV.");
      toast(err?.message || "Failed to parse CSV.", "error");
    } finally {
      event.target.value = "";
    }
  }

  async function submitBulk() {
    if (!Array.isArray(csvUsers) || csvUsers.length === 0) {
      setStatusType("error");
      setStatusMsg("No users to submit. Upload a CSV first.");
      toast("No users to submit. Upload a CSV first.", "error");
      return;
    }

    setSubmitting(true);
    setStatusType("info");
    setStatusMsg("Creating users in backend...");
    try {
      const res = await bulkCreateUsers(activeType, csvUsers);
      const created = res?.results?.created?.length || 0;
      const failed = res?.results?.failed?.length || 0;
      if (created > 0 && failed === 0) {
        setStatusType("success");
        setStatusMsg("Users created successfully in backend.");
        showSuccessPopup("Users created successfully.");
      } else {
        setStatusType(failed > 0 ? "warning" : "success");
        setStatusMsg(`Bulk create complete: ${created} created, ${failed} failed.`);
        toast(`Bulk create complete: ${created} created, ${failed} failed.`, failed > 0 ? "info" : "success");
      }
      if (failed > 0) {
        const firstFailure = buildBulkFailureMessage(res);
        if (firstFailure) toast(firstFailure, "error");
      }
      if (created > 0) {
        resetParsed();
        if (onSuccess) onSuccess({ userType: activeType, created, failed, response: res });
      }
    } catch (err) {
      const msg = buildBulkFailureMessage(err?.data)
        || err?.data?.error
        || (typeof err?.data === "object" ? JSON.stringify(err.data) : null)
        || "Bulk create failed.";
      setStatusType("error");
      setStatusMsg(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="role-section" style={{ marginBottom: 16 }}>
      <h2>Bulk Import Users</h2>

      {allowTypeSelect && (
        <div className="form-row single" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label>User Type</label>
            <select
              value={activeType}
              onChange={(e) => {
                if (onUserTypeChange) onUserTypeChange(e.target.value);
                resetParsed();
              }}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={onCsvPick}
        />
        <button
          className="btn btn-secondary"
          onClick={() => csvInputRef.current?.click()}
          title="Upload CSV"
          aria-label="Upload CSV"
          style={{ minWidth: 44, width: 44, padding: 10 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
        <button
          className="btn btn-primary"
          onClick={submitBulk}
          disabled={submitting}
          title={submitting ? "Submitting..." : "Convert CSV to JSON and Submit"}
          aria-label={submitting ? "Submitting" : "Convert CSV to JSON and Submit"}
          style={{ minWidth: 44, width: 44, padding: 10 }}
        >
          {submitting ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      </div>

      {csvMeta.name && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          CSV ready: {csvMeta.name} ({csvMeta.count} rows)
        </p>
      )}

      {statusMsg && (
        <p
          style={{
            fontSize: 12,
            marginTop: 8,
            color:
              statusType === "error"
                ? "#c62828"
                : statusType === "success"
                  ? "#2E7D32"
                  : statusType === "warning"
                    ? "#e65100"
                    : "#1565C0",
          }}
        >
          {statusMsg}
        </p>
      )}
    </div>
  );
}
