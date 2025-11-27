import { useParams } from 'react-router-dom'
import { CRMLayout } from "@/components/crm/layout"
import { DealDetail } from "@/components/crm/deal-detail"

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  
  if (!id) {
    return <div>Deal ID not found</div>
  }
  
  return (
    <CRMLayout>
      <DealDetail dealId={id} />
    </CRMLayout>
  )
}

