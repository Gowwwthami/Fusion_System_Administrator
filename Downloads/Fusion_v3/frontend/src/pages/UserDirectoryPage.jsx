import { useState, useEffect, useCallback } from "react";
import MultiSelectFilter from "../components/dashboard/MultiSelectFilter";
import { useToast } from "../utils/toast";
import {
  getStudents,
  getFaculty,
  getStaff,
  getDepartments,
  getDesignations,
  getBatches,
  getProgrammes,
  getUserDirectoryFilters,
} from "../services/api";

const STATIC_FILTER_OPTIONS = {
  students: {
    programme: [],
    discipline: [],
    batch: [],
    semester: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    category: ["GEN", "OBC", "SC", "ST", "EWS"],
    gender: ["M", "F"],
  },
  faculty: {
    dept: [],
    desig: [],
    gender: ["M", "F"],
  },
  staff: {
    desig: [],
    gender: ["M", "F"],
  },
};

const SORT_OPTIONS = {
  students: [
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "username_asc", label: "Username A-Z" },
    { value: "username_desc", label: "Username Z-A" },
    { value: "programme_asc", label: "Programme A-Z" },
    { value: "batch_desc", label: "Batch (newest)" },
    { value: "semester_asc", label: "Semester (low-high)" },
  ],
  faculty: [
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "username_asc", label: "Username A-Z" },
    { value: "username_desc", label: "Username Z-A" },
    { value: "department_asc", label: "Department A-Z" },
    { value: "designation_asc", label: "Designation A-Z" },
  ],
  staff: [
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "username_asc", label: "Username A-Z" },
    { value: "username_desc", label: "Username Z-A" },
    { value: "designation_asc", label: "Designation A-Z" },
  ],
};

export default function UserDirectoryPage({ initialTab = "students" }) {
  const toast = useToast();
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState(STATIC_FILTER_OPTIONS);
  const [sortKey, setSortKey] = useState("name_asc");

  // Filters state
  const [filters, setFilters] = useState({
    students: { programme: [], discipline: [], batch: [], semester: [], category: [], gender: [] },
    faculty: { dept: [], desig: [], gender: [] },
    staff: { desig: [], gender: [] },
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const currentFilters = filters[currentTab];
      const params = { q: search };

      // Add filters to params
      Object.entries(currentFilters).forEach(([key, values]) => {
        if (values.length > 0) {
          params[key] = values;
        }
      });

      let data;
      if (currentTab === "students") {
        data = await getStudents(params);
      } else if (currentTab === "faculty") {
        data = await getFaculty(params);
      } else {
        data = await getStaff(params);
      }

      setUsers(data.results || []);
    } catch (err) {
      toast("Failed to load users", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTab, filters, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDepartments(),
      getDesignations(),
      getBatches(),
      getProgrammes(),
      getUserDirectoryFilters(),
    ])
      .then(([departments, designations, batches, programmes, filterPayload]) => {
        if (!isMounted) return;

        const departmentNames = (departments || [])
          .map((d) => d?.name)
          .filter(Boolean);

        const designationNames = (designations || [])
          .map((d) => d?.name)
          .filter(Boolean);

        const programmeNames = (programmes || [])
          .map((p) => p?.name)
          .filter(Boolean);

        const disciplineNames = Array.from(
          new Set((batches || []).map((b) => b?.discipline_name).filter(Boolean))
        );

        const batchYears = Array.from(
          new Set((batches || []).map((b) => String(b?.year ?? "")).filter(Boolean))
        ).sort();

        const studentsFilters = filterPayload?.students || {};
        const facultyFilters = filterPayload?.faculty || {};
        const staffFilters = filterPayload?.staff || {};

        setFilterOptions({
          students: {
            ...STATIC_FILTER_OPTIONS.students,
            programme: studentsFilters.programme?.length ? studentsFilters.programme : programmeNames,
            discipline: studentsFilters.discipline?.length ? studentsFilters.discipline : disciplineNames,
            batch: studentsFilters.batch?.length ? studentsFilters.batch : batchYears,
          },
          faculty: {
            ...STATIC_FILTER_OPTIONS.faculty,
            dept: facultyFilters.dept || [],
            desig: facultyFilters.desig || [],
          },
          staff: {
            ...STATIC_FILTER_OPTIONS.staff,
            desig: staffFilters.desig || [],
          },
        });
      })
      .catch(() => {
        toast("Failed to load filter options.", "error");
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSortKey("name_asc");
  }, [currentTab]);

  const updateFilter = (filterKey, values) => {
    setFilters((prev) => ({
      ...prev,
      [currentTab]: {
        ...prev[currentTab],
        [filterKey]: values,
      },
    }));
  };

  const renderUserCard = (user) => {
    const statusClass = user.status === "active" ? "badge-green" : "badge-red";

    if (currentTab === "students") {
      return (
        <div key={user.id} className="user-card">
          <h3>
            {user.first_name} {user.last_name}{" "}
            <span className={`badge ${statusClass}`} style={{ fontSize: "11px" }}>
              {user.status?.toUpperCase()}
            </span>
          </h3>
          <div className="username">
            Username: <span>{user.username}</span>
          </div>
          <div className="fields">
            <b>Programme:</b> {user.programme || "N/A"}<br />
            <b>Discipline:</b> {user.discipline || "N/A"}<br />
            <b>Batch:</b> {user.batch || "N/A"}<br />
            <b>Semester:</b> {user.semester || "N/A"}<br />
            <b>Category:</b> {user.category || "NULL"}<br />
            <b>Gender:</b> {user.gender}
          </div>
        </div>
      );
    }

    if (currentTab === "faculty") {
      return (
        <div key={user.id} className="user-card">
          <h3>
            {user.title} {user.first_name} {user.last_name}{" "}
            <span className={`badge ${statusClass}`} style={{ fontSize: "11px" }}>
              {user.status?.toUpperCase()}
            </span>
          </h3>
          <div className="username">
            Username: <span>{user.username}</span>
          </div>
          <div className="fields">
            <b>Department:</b> {user.department || "N/A"}<br />
            <b>Gender:</b> {user.gender}<br />
            <b>Designations:</b><br />
            <span className="badge badge-blue">{user.designation?.toUpperCase()}</span>
          </div>
        </div>
      );
    }

    // Staff
    return (
      <div key={user.id} className="user-card">
        <h3>
          {user.first_name} {user.last_name}{" "}
          <span className={`badge ${statusClass}`} style={{ fontSize: "11px" }}>
            {user.status?.toUpperCase()}
          </span>
        </h3>
        <div className="username">
          Username: <span>{user.username}</span>
        </div>
        <div className="fields">
          <b>Gender:</b> {user.gender}<br />
          <b>Designation:</b> {user.designation || "N/A"}
        </div>
      </div>
    );
  };

  const sortUsers = (rows) => {
    const [key, direction] = sortKey.split("_");
    const dir = direction === "desc" ? -1 : 1;

    const getValue = (user) => {
      switch (key) {
        case "name":
          return `${user.first_name || ""} ${user.last_name || ""}`.trim();
        case "username":
          return user.username || "";
        case "programme":
          return user.programme || "";
        case "batch":
          return user.batch_year || user.batch || "";
        case "semester":
          return user.semester || 0;
        case "department":
          return user.department || "";
        case "designation":
          return user.designation || "";
        default:
          return "";
      }
    };

    return [...rows].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);

      if (typeof aVal === "number" || typeof bVal === "number") {
        const aNum = Number(aVal) || 0;
        const bNum = Number(bVal) || 0;
        return (aNum - bNum) * dir;
      }

      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  };

  const currentOptions = filterOptions[currentTab] || STATIC_FILTER_OPTIONS[currentTab];
  const currentFilters = filters[currentTab];
  const sortedUsers = sortUsers(users);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        User Directory
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${currentTab === "students" ? "active" : ""}`}
          onClick={() => setCurrentTab("students")}
        >
          STUDENTS
        </button>
        <button
          className={`tab-btn ${currentTab === "faculty" ? "active" : ""}`}
          onClick={() => setCurrentTab("faculty")}
        >
          FACULTY
        </button>
        <button
          className={`tab-btn ${currentTab === "staff" ? "active" : ""}`}
          onClick={() => setCurrentTab("staff")}
        >
          STAFF
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <span className="ico">🔍</span>
        <input
          type="text"
          placeholder="Search by name or username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ marginLeft: "12px" }}
        >
          {(SORT_OPTIONS[currentTab] || SORT_OPTIONS.students).map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="filter-grid">
        {Object.entries(currentOptions).map(([key, options]) => (
          <MultiSelectFilter
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            options={options}
            selected={currentFilters[key] || []}
            onChange={(values) => updateFilter(key, values)}
          />
        ))}
      </div>

      {/* User Cards */}
      <div className="cards-wrap">
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : users.length === 0 ? (
          <div className="no-results">No {currentTab} found.</div>
        ) : (
          sortedUsers.map(renderUserCard)
        )}
      </div>
    </div>
  );
}
