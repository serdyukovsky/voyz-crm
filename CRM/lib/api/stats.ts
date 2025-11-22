const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface DealByStage {
  stageName: string
  count: number
}

export interface TopCompany {
  companyId: string
  companyName: string
  dealCount: number
  totalRevenue: number
}

export interface TopManager {
  userId: string
  userName: string
  dealCount: number
  totalRevenue: number
}

export interface RevenueTrend {
  date: string
  revenue: number
}

export interface GlobalStats {
  totalDeals: number
  dealsByStage: DealByStage[]
  totalRevenue: number
  tasksToday: number
  newContacts: number
  topCompanies: TopCompany[]
  topManagers: TopManager[]
  revenueTrend: RevenueTrend[]
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const response = await fetch(`${API_BASE_URL}/stats/global`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch global stats')
  }

  return response.json()
}

