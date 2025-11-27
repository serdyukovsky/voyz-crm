import { useParams } from 'react-router-dom'
import { CRMLayout } from '@/components/crm/layout'
import { CompanyDetail } from '@/components/crm/company-detail'

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <div>Company ID not found</div>
  }

  return (
    <CRMLayout>
      <CompanyDetail companyId={id} />
    </CRMLayout>
  )
}

