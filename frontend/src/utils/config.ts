// Centralized API configuration
// Set REACT_APP_API_URL in .env.local to override
// Default is 8001 (Laragon Apache multi-worker) — required for SSE to work
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';
