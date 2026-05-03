import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);
let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${toastSeq++}`;
    // Convert object messages to string
    const messageStr = typeof message === 'object' 
      ? JSON.stringify(message, null, 2) 
      : String(message || '');
    setToasts(prev => [...prev, { id, message: messageStr, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = { success: "✓", error: "✕", info: "ℹ" };

  function normalizeToastType(type) {
    if (type === "warning") return "warning";
    if (type === "error") return "error";
    if (type === "success") return "success";
    return "info";
  }

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast show ${normalizeToastType(t.type)}`}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{icons[normalizeToastType(t.type)]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
