import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = String(event?.reason || "");
    if (reason.includes("A listener indicated an asynchronous response by returning true")) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    const message = String(event?.message || "");
    if (message.includes("A listener indicated an asynchronous response by returning true")) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
