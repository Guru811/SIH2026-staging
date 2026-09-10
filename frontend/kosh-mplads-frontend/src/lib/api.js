export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Fetch JSON from the kosh backend. Throws ApiError with the exact
 * connection-failure copy required by the spec so every page can
 * render a consistent error state.
 */
export async function apiGet(path) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`)
  } catch (err) {
    throw new ApiError('Unable to connect to backend — ensure uvicorn is running on port 8000')
  }
  if (!res.ok) {
    throw new ApiError('Unable to connect to backend — ensure uvicorn is running on port 8000')
  }
  return res.json()
}

// ---- Endpoint map (see Project_Contexts.pdf "API Endpoints Summary") ----
export const endpoints = {
  nationalStats: () => apiGet('/api/national-stats'),
  summary: () => apiGet('/api/summary'),
  integrityIndex: () => apiGet('/api/integrity-index'),
  projectRisks: (limit = 500) => apiGet(`/api/project-risks?limit=${limit}`),
  projectsByConstituency: (constituency) =>
    apiGet(`/api/projects/${encodeURIComponent(constituency)}`),
  vendorGraph: () => apiGet('/api/vendor-graph'),
  vendorRisks: (limit = 200) => apiGet(`/api/vendor-risks?limit=${limit}`),
  spendingPatterns: (limit = 500) => apiGet(`/api/spending-patterns?limit=${limit}`),
  duplicates: (limit = 2000) => apiGet(`/api/duplicates?limit=${limit}`),
  states: () => apiGet('/api/states'),
  constituencies: (state) => apiGet(`/api/constituencies?state=${encodeURIComponent(state)}`),
  mps: (state) => apiGet(`/api/mps?state=${encodeURIComponent(state)}`),
  weather: (constituency) => apiGet(`/api/weather/${encodeURIComponent(constituency)}`)
}
