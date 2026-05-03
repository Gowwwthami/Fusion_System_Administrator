import { useState } from "react";

const MENU_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "grid",
    isDashboard: true,
    onClick: "dashboard",
  },
  {
    id: "user-directory",
    label: "User Directory",
    icon: "book",
    isPrimary: true,
    onClick: "user-directory",
  },
  {
    id: "user",
    label: "User Management",
    icon: "user",
    subItems: [
      { id: "add-student", label: "Add Student", icon: "user-graduate" },
      { id: "add-faculty", label: "Add Faculty", icon: "chalkboard" },
    ],
  },
  {
    id: "role",
    label: "Role Management",
    icon: "clone",
    subItems: [
      { id: "role-management", label: "Create Role", icon: "shield" },
      { id: "role-management", label: "Manage Role Access", icon: "tasks" },
      { id: "role-management", label: "Edit Role", icon: "edit" },
    ],
  },
  {
    id: "archive",
    label: "Archive Management",
    icon: "archive",
    subItems: [
      { id: "audit-logs", label: "Archive Students", icon: "archive" },
      { id: "audit-logs", label: "Archive Faculty", icon: "archive" },
    ],
  },
  {
    id: "emergency-control",
    label: "Emergency Access",
    icon: "alert-triangle",
    onClick: "emergency-control",
  },
  {
    id: "logout",
    label: "Logout",
    icon: "logout",
    isLogout: true,
  },
];

// SVG Icons
const Icons = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  grid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  "user-graduate": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10l-10-5-10 5 10 5 10-5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  chalkboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2"/>
      <path d="M8 20h8"/>
      <path d="M10 16v4M14 16v4"/>
    </svg>
  ),
  "users-gear": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="7" r="3"/>
      <path d="M3 20a6 6 0 0 1 12 0"/>
      <circle cx="18" cy="8" r="2"/>
      <path d="M18 13v6M15 16h6"/>
    </svg>
  ),
  clone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <rect x="2" y="2" width="13" height="13" rx="2"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/>
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  edit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  archive: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="4" rx="1"/>
      <path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>
      <path d="M10 12h4"/>
    </svg>
  ),
  drive: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="8" rx="2"/>
      <rect x="2" y="13" width="20" height="8" rx="2"/>
      <circle cx="18" cy="7" r="1"/>
      <circle cx="18" cy="17" r="1"/>
    </svg>
  ),
  database: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  "user-plus": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21a8 8 0 10-16 0"/>
      <line x1="18" y1="8" x2="22" y2="8"/>
      <line x1="20" y1="6" x2="20" y2="10"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21a8 8 0 10-16 0"/>
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  "file-text": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  key: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  "alert-triangle": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Sidebar({ activePage, onNavigate, onLogout }) {
  const [hovered, setHovered] = useState(null);

  function handlePrimaryClick(item) {
    if (item.id === "logout") {
      onLogout();
      return;
    }
    if (item.onClick) onNavigate(item.onClick);
  }

  return (
    <aside className="sidebar">
      {MENU_ITEMS.map((item) => {
        const isActive =
          item.onClick === activePage ||
          (item.subItems || []).some((sub) => sub.id === activePage);

        return (
          <div
            key={item.id}
            className={`sidebar-btn-wrap ${item.isLogout ? "logout" : ""} ${item.isPrimary ? "primary" : ""} ${item.isDashboard ? "dash" : ""}`}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              className={`sidebar-btn ${isActive ? "active" : ""}`}
              onClick={() => handlePrimaryClick(item)}
            >
              {Icons[item.icon]}
              <span className="tip">{item.label}</span>
            </button>

            {hovered === item.id && item.subItems?.length ? (
              <div className="sidebar-submenu">
                {item.subItems.map((sub) => (
                  <button
                    key={`${item.id}-${sub.label}`}
                    className="sidebar-subitem"
                    onClick={() => onNavigate(sub.id)}
                    title={sub.label}
                  >
                    {Icons[sub.icon]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
