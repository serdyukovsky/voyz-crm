"use client"

import { use } from 'react'
import { CRMLayout } from '@/components/crm/layout'
import { CompanyDetail } from '@/components/crm/company-detail'

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <CRMLayout>
      <CompanyDetail companyId={id} />
    </CRMLayout>
  )
}





