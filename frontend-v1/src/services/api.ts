import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forensic-link-api.azurewebsites.net/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface StatsOverview {
  total_cases: number
  total_samples: number
  total_persons: number
  total_dna_matches: number
  total_links: number
  multi_case_persons: number
  dna_links: number
  id_links: number
  verified_links: number
}

export interface Case {
  case_id: string
  case_number: string
  case_type: string
  case_category?: string
  province: string
  police_station: string
  case_date: string
  analyst_name?: string
  sample_count?: number
  link_count?: number
}

export interface Person {
  person_id: string
  id_number: string
  full_name: string
  first_name?: string
  last_name?: string
  person_type: string
  case_count: number
  case_numbers?: string
}

export interface Link {
  link_id: string
  link_type: string
  link_strength: number
  case1_id: string
  case1_number: string
  case1_type: string
  case1_province: string
  case2_id: string
  case2_number: string
  case2_type: string
  case2_province: string
}

export interface GraphNode {
  id: string
  type: 'person' | 'case'
  label: string
  isCenter?: boolean
  data: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  label: string
  strength: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: Record<string, number>
}

// API Functions
export const statsApi = {
  getOverview: async (): Promise<StatsOverview> => {
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
  getAll: async (params?: { page?: number; limit?: number; province?: string }) => {
    const { data } = await api.get('/cases', { params })
    return data
  },
  
  getById: async (id: string): Promise<Case> => {
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
  getAll: async (params?: { page?: number; limit?: number; multi_case_only?: boolean }) => {
    const { data } = await api.get('/persons', { params })
    return data
  },
  
  getMultiCase: async (minCases = 2, limit = 50): Promise<Person[]> => {
    const { data } = await api.get(`/persons/multi-case?min_cases=${minCases}&limit=${limit}`)
    return data.data
  },
  
  getById: async (id: string): Promise<Person> => {
    const { data } = await api.get(`/persons/${id}`)
    return data.data
  },
  
  getCases: async (id: string): Promise<Case[]> => {
    const { data } = await api.get(`/persons/${id}/cases`)
    return data.data
  },
}

export const linksApi = {
  getAll: async (params?: { page?: number; limit?: number; link_type?: string; min_strength?: number }) => {
    const { data } = await api.get('/links', { params })
    return data
  },
  
  getTop: async (limit = 10): Promise<Link[]> => {
    const { data } = await api.get(`/links/top?limit=${limit}`)
    return data.data
  },
  
  getTypes: async () => {
    const { data } = await api.get('/links/types')
    return data.data
  },
}

export const graphApi = {
  getPerson: async (id: string): Promise<GraphData> => {
    const { data } = await api.get(`/graph/person/${id}`)
    return data.data
  },
  
  getCase: async (id: string, depth = 1): Promise<GraphData> => {
    const { data } = await api.get(`/graph/case/${id}?depth=${depth}`)
    return data.data
  },
  
  getNetwork: async (limit = 50, minStrength = 0.8): Promise<GraphData> => {
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
