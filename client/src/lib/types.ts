export type Role = 'ADMIN' | 'SUPERVISOR' | 'COLLECTOR' | 'CLERK' | 'CLIENT'

export interface ClientProfile {
  id: string
  userId: string
  cedula: string
  birthDate?: string | null
  address?: string | null
  community?: string | null
  occupation?: string | null
  employer?: string | null
  employmentStartDate?: string | null
  monthlyIncome?: number | null
  otherIncome?: number | null
  assignedCollectorId?: string | null
  assignedCollector?: User | null
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  role: Role
  status: string
  profile?: ClientProfile | null
  createdAt?: string
  _count?: {
    applications?: number
    clientLoans?: number
    assignedClients?: number
  }
}

export interface ApplicationDocument {
  id: string
  type: string
  originalName: string
  mimeType: string
  size: number
  createdAt: string
}

export interface Installment {
  id: string
  number: number
  dueDate: string
  principal: number
  interest: number
  total: number
  paidAmount: number
  status: string
}

export interface Payment {
  id: string
  loanId: string
  amount: number
  paidAt: string
  method: string
  receiptNumber: string
  listoRecaudoReceipt?: string | null
  notes?: string | null
  collector?: { id: string; name: string } | null
  voidedAt?: string | null
  voidReason?: string | null
  refinancingLoanId?: string | null
  loan?: Loan
  allocations?: { id: string; amount: number; installment?: Installment }[]
}

export interface Loan {
  id: string
  applicationId: string
  clientId: string
  principal: number
  annualRate: number
  termWeeks: number
  termInstallments: number
  paymentFrequency: string
  startDate: string
  firstDueDate: string
  status: string
  disbursedAt?: string | null
  renewalPayoff?: number
  netDisbursement?: number | null
  listoRecaudoLoanId?: string | null
  assignedCollectorId?: string | null
  assignedCollector?: { id: string; name: string; phone?: string | null } | null
  client?: User
  application?: Application
  installments?: Installment[]
  payments?: Payment[]
  balance?: number
  paidAmount?: number
  nextDueDate?: string | null
  overdueCount?: number
  overdueAmount?: number
}

export interface Application {
  id: string
  clientId: string
  amountRequested: number
  renewalOfLoanId?: string | null
  termWeeks: number
  termInstallments: number
  paymentFrequency: string
  purpose?: string | null
  status: string
  submittedAt?: string | null
  reviewNotes?: string | null
  decisionAt?: string | null
  rejectionReason?: string | null
  approvedAmount?: number | null
  annualRate?: number | null
  approvedTermWeeks?: number | null
  approvedTerm?: number | null
  approvedFrequency?: string | null
  firstDueDate?: string | null
  createdAt: string
  client?: User
  reviewedBy?: { id: string; name: string } | null
  documents?: ApplicationDocument[]
  loan?: Loan | null
  _count?: { documents: number }
}

export interface Settings {
  minAmount: number
  maxAmount: number
  annualRate: number
  minTerm: number
  maxTerm: number
  loanAmounts: number[]
  contactPhone: string
  contactPhone2?: string
  contactPhone3?: string
  contactEmail: string
  address: string
  hours: string
  heroTitle: string
  heroSubtitle: string
  privacyVersion: string
}

export interface SimulateResult {
  annualRate: number
  amount: number
  termInstallments: number
  paymentFrequency: string
  installment: number
  totalInterest: number
  totalPayment: number
  installments: number
  schedule: {
    number: number
    dueDate: string
    principal: number
    interest: number
    total: number
  }[]
}

export interface DashboardData {
  role: Role
  kpis: {
    clients: number
    pendingApplications: number
    activeLoans: number
    portfolio: number
    collectedMonth: number
    overdueAmount: number
    overdueCount: number
    collectedTotal: number
  }
  applicationsByStatus: { status: string; count: number }[]
  monthlyCollections: { key: string; label: string; total: number }[]
  recentApplications: {
    id: string
    status: string
    amountRequested: number
    createdAt: string
    client: { id: string; name: string; community?: string | null }
  }[]
  recentLoans: Loan[]
  aging: { bucket: string; count: number; amount: number }[]
  communities: { community: string; count: number }[]
  collectors: {
    id: string
    name: string
    phone?: string | null
    status: string
    clients: number
    activeLoans: number
    collected: number
  }[]
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  readAt?: string | null
  createdAt: string
}
