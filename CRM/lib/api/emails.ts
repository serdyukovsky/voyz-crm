import { getApiBaseUrl } from '@/lib/config'

export interface SendEmailDto {
  to: string
  subject: string
  text: string
  html?: string
  dealId?: string
  contactId?: string
  companyId?: string
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(data: SendEmailDto): Promise<SendEmailResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send email' }))
    throw new Error(error.message || 'Failed to send email')
  }

  return response.json()
}






