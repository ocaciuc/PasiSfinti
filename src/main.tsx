import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateStorageCache } from "./lib/capacitor-storage";

// Hydrate the storage cache before rendering to ensure
// Supabase can access persisted session data on mobile
hydrateStorageCache().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch((error) => {
  console.error("Failed to hydrate storage cache:", error);
  // Render anyway even if hydration fails
  createRoot(document.getElementById("root")!).render(<App />);
});
