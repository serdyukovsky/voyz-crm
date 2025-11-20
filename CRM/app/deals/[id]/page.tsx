"use client"

import { use } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { DealDetail } from "@/components/crm/deal-detail"

export default function DealDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  return (
    <CRMLayout>
      <DealDetail dealId={id} />
    </CRMLayout>
  )
}
