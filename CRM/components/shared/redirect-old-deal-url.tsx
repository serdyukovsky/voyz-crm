import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Компонент для обратной совместимости со старыми URL формата /deals?deal=id
 * Автоматически редиректит на новый формат /deals/:id
 *
 * Используется в DealsPage для миграции со старого query параметра
 * на новый динамический маршрут.
 */
export function RedirectOldDealUrl() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const dealId = searchParams.get('deal')
    if (dealId) {
      console.log(`🔄 Redirecting old URL format /deals?deal=${dealId} to /deals/${dealId}`)
      navigate(`/deals/${dealId}`, { replace: true })
    }
  }, [searchParams, navigate])

  return null
}
