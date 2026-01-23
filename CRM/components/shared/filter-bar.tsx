"use client"

import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Filter } from "lucide-react"
import { MultiSelectFilter, MultiSelectOption } from "./multi-select-filter"
import { useState, useEffect } from "react"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useDebouncedValue } from '@/lib/utils/debounce'

interface FilterBarProps {
  searchPlaceholder?: string
  tagOptions?: MultiSelectOption[]
  statusOptions?: MultiSelectOption[]
  companyOptions?: MultiSelectOption[]
  onFiltersChange?: (filters: Record<string, string[]>) => void
  className?: string
}

export function FilterBar({
  searchPlaceholder,
  tagOptions = [],
  statusOptions = [],
  companyOptions = [],
  onFiltersChange,
  className,
}: FilterBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const [searchParams] = useSearchParams()
  
  const defaultSearchPlaceholder = searchPlaceholder || t('common.searchPlaceholder')

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get('statuses')?.split(',').filter(Boolean) || []
  )
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    searchParams.get('companies')?.split(',').filter(Boolean) || []
  )

  // Debounce search input (500ms) to reduce API calls while typing
  const debouncedSearch = useDebouncedValue(search, 500)

  useEffect(() => {
    const params = new URLSearchParams()

    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (selectedStatuses.length > 0) params.set('statuses', selectedStatuses.join(','))
    if (selectedCompanies.length > 0) params.set('companies', selectedCompanies.join(','))

    navigate(`${pathname}?${params.toString()}`, { replace: true })

    onFiltersChange?.({
      search: debouncedSearch ? [debouncedSearch] : [],
      tags: selectedTags,
      statuses: selectedStatuses,
      companies: selectedCompanies,
    })
  }, [debouncedSearch, selectedTags, selectedStatuses, selectedCompanies, navigate, pathname, onFiltersChange])

  const clearAll = () => {
    setSearch('')
    setSelectedTags([])
    setSelectedStatuses([])
    setSelectedCompanies([])
  }

  const hasActiveFilters = search || selectedTags.length > 0 || selectedStatuses.length > 0 || selectedCompanies.length > 0

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>{t('common.filters')}:</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border border-border rounded-md px-3 h-9 bg-background flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={defaultSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 px-0 h-auto bg-transparent focus-visible:ring-0 text-sm"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Multi-select Filters */}
        {tagOptions.length > 0 && (
          <MultiSelectFilter
            options={tagOptions}
            selected={selectedTags}
            onSelectionChange={setSelectedTags}
            placeholder={t('common.tags')}
            searchPlaceholder={t('common.searchTags')}
          />
        )}

        {statusOptions.length > 0 && (
          <MultiSelectFilter
            options={statusOptions}
            selected={selectedStatuses}
            onSelectionChange={setSelectedStatuses}
            placeholder={t('common.status')}
            searchPlaceholder={t('common.searchStatuses')}
          />
        )}

        {companyOptions.length > 0 && (
          <MultiSelectFilter
            options={companyOptions}
            selected={selectedCompanies}
            onSelectionChange={setSelectedCompanies}
            placeholder={t('companies.title')}
            searchPlaceholder={t('common.searchCompanies')}
          />
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {search && (
            <Badge variant="secondary" className="gap-1">
              {t('common.search')}: {search}
              <button
                onClick={() => setSearch('')}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedTags.map((tag) => {
            const option = tagOptions.find((o) => o.value === tag)
            return (
              <Badge key={tag} variant="secondary" className="gap-1">
                {t('common.tag')}: {option?.label || tag}
                <button
                  onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {selectedStatuses.map((status) => {
            const option = statusOptions.find((o) => o.value === status)
            return (
              <Badge key={status} variant="secondary" className="gap-1">
                {t('common.status')}: {option?.label || status}
                <button
                  onClick={() => setSelectedStatuses(selectedStatuses.filter((s) => s !== status))}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {selectedCompanies.map((company) => {
            const option = companyOptions.find((o) => o.value === company)
            return (
              <Badge key={company} variant="secondary" className="gap-1">
                {t('companies.company')}: {option?.label || company}
                <button
                  onClick={() => setSelectedCompanies(selectedCompanies.filter((c) => c !== company))}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}



