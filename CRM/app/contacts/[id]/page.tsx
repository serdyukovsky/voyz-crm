"use client"

import { use } from 'react'
import { CRMLayout } from '@/components/crm/layout'
import { ContactDetail } from '@/components/crm/contact-detail'

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <CRMLayout>
      <ContactDetail contactId={id} />
    </CRMLayout>
  )
}






