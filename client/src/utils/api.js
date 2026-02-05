// ✅ Determine API base URL with fallbacks
const getApiBase = () => {
  // First priority: explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Second priority: detect environment from hostname
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Production
    if (hostname.includes("netlify") || hostname.includes("hosting-01")) {
      return "https://hosting-s1hz.onrender.com";
    }
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
  }

  // Fallback
  return "https://hosting-s1hz.onrender.com";
};

const API_BASE = getApiBase();

console.log("🔧 API_BASE:", API_BASE);

export const API = `${API_BASE}/api`;
export const BACKEND = API_BASE;
