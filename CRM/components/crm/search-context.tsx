"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import type { DealSearchFilters } from './deal-search-panel'

interface SearchContextType {
  searchValue: string
  setSearchValue: (value: string) => void
  dealFilters: DealSearchFilters | null
  setDealFilters: (filters: DealSearchFilters | null) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchValue, setSearchValue] = useState('')
  const [dealFilters, setDealFilters] = useState<DealSearchFilters | null>(null)

  return (
    <SearchContext.Provider value={{ searchValue, setSearchValue, dealFilters, setDealFilters }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}



