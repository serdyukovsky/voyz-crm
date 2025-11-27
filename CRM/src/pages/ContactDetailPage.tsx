import { useParams } from 'react-router-dom'
import { CRMLayout } from '@/components/crm/layout'
import { ContactDetail } from '@/components/crm/contact-detail'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <div>Contact ID not found</div>
  }

  return (
    <CRMLayout>
      <ContactDetail contactId={id} />
    </CRMLayout>
  )
}

