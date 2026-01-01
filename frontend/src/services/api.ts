import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forensic-link-api.azurewebsites.net/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API Functions
export const statsApi = {
  getOverview: async () => {
    const { data } = await api.get('/stats/overview')
    return data.data
  },
  
  getByProvince: async () => {
    const { data } = await api.get('/stats/by-province')
    return data.data
  },
  
  getByCaseType: async () => {
    const { data } = await api.get('/stats/by-case-type')
    return data.data
  },
  
  getLinksSummary: async () => {
    const { data } = await api.get('/stats/links-summary')
    return data.data
  },
  
  getTopLinkedCases: async (limit = 10) => {
    const { data } = await api.get(`/stats/top-linked-cases?limit=${limit}`)
    return data.data
  },
}

export const casesApi = {
  getAll: async (params?: any) => {
    const { data } = await api.get('/cases', { params })
    return data
  },
  
  getById: async (id: string) => {
    const { data } = await api.get(`/cases/${id}`)
    return data.data
  },
  
  getSamples: async (id: string) => {
    const { data } = await api.get(`/cases/${id}/samples`)
    return data.data
  },
  
  getPersons: async (id: string) => {
    const { data } = await api.get(`/cases/${id}/persons`)
    return data.data
  },
  
  getLinks: async (id: string) => {
    const { data } = await api.get(`/cases/${id}/links`)
    return data.data
  },
}

export const personsApi = {
  getAll: async (params?: any) => {
    const { data } = await api.get('/persons', { params })
    return data
  },
  
  getMultiCase: async (minCases = 2, limit = 50) => {
    const { data } = await api.get(`/persons/multi-case?min_cases=${minCases}&limit=${limit}`)
    return data.data
  },
  
  getById: async (id: string) => {
    const { data } = await api.get(`/persons/${id}`)
    return data.data
  },
  
  getCases: async (id: string) => {
    const { data } = await api.get(`/persons/${id}/cases`)
    return data.data
  },
}

export const linksApi = {
  getAll: async (params?: any) => {
    const { data } = await api.get('/links', { params })
    return data
  },
  
  getTop: async (limit = 10) => {
    const { data } = await api.get(`/links/top?limit=${limit}`)
    return data.data
  },
  
  getTypes: async () => {
    const { data } = await api.get('/links/types')
    return data.data
  },
}

export const graphApi = {
  getPerson: async (id: string) => {
    const { data } = await api.get(`/graph/person/${id}`)
    return data.data
  },
  
  getCase: async (id: string, depth = 1) => {
    const { data } = await api.get(`/graph/case/${id}?depth=${depth}`)
    return data.data
  },
  
  getNetwork: async (limit = 50, minStrength = 0.8) => {
    const { data } = await api.get(`/graph/network?limit=${limit}&min_strength=${minStrength}`)
    return data.data
  },
}

export const searchApi = {
  search: async (q: string, type = 'all') => {
    const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&type=${type}`)
    return data
  },
  
  searchById: async (idNumber: string) => {
    const { data } = await api.get(`/search/id/${idNumber}`)
    return data.data
  },
  
  searchByCase: async (caseNumber: string) => {
    const { data } = await api.get(`/search/case/${caseNumber}`)
    return data.data
  },
}

export default api
