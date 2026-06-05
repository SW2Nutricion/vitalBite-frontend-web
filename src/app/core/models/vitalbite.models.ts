export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';
export type AppointmentMode = 'IN_PERSON' | 'VIRTUAL';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
}

export interface Patient {
  id: string;
  tenantId: string;
  nutritionistId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: Gender | null;
  status: PatientStatus;
  clinicalNotes?: string | null;
  nutritionGoal?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  nutritionistId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  mode: AppointmentMode;
  reason?: string | null;
  notes?: string | null;
  cancelReason?: string | null;
  patientFullName: string;
  nutritionistFullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyMeasurement {
  id: string;
  tenantId: string;
  patientId: string;
  registeredById: string;
  measuredAt: string;
  weightKg: number;
  heightCm?: number | null;
  bmi?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BodyComposition {
  id: string;
  tenantId: string;
  patientId: string;
  bodyMeasurementId?: string | null;
  measuredAt: string;
  bodyFatPercentage?: number | null;
  muscleMassKg?: number | null;
  waterPercentage?: number | null;
  visceralFatLevel?: number | null;
  boneMassKg?: number | null;
  metabolicAge?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimit {
  key: string;
  value: string;
}

export interface SubscriptionPlan {
  code: string;
  name: string;
  description: string;
  priceUsd: number;
  billingPeriod: string;
  audience: string;
  included: string[];
  limits: PlanLimit[];
}

export interface TenantSubscription {
  tenantId: string;
  planCode: string;
  planName: string;
  status: string;
  billingPeriod: string;
  startedAt: string;
  nextReviewAt: string;
  limits: PlanLimit[];
}

export interface PlanChangeRequest {
  requestId: string;
  tenantId: string;
  currentPlanCode: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  status: string;
  comment?: string | null;
  requestedAt: string;
  resolutionComment?: string | null;
  resolvedAt?: string | null;
}

export interface RequestPlanChangeInput {
  planCode: string;
  comment?: string | null;
}

export interface ResolvePlanChangeInput {
  requestId: string;
  comment?: string | null;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: Gender | null;
  nutritionGoal?: string | null;
  clinicalNotes?: string | null;
  status?: PatientStatus | null;
  nutritionistId?: string | null;
}

export interface CreateAppointmentInput {
  patientId: string;
  nutritionistId: string;
  scheduledAt: string;
  durationMinutes: number;
  mode?: AppointmentMode | null;
  reason?: string | null;
  notes?: string | null;
  status?: AppointmentStatus | null;
}

export interface CreateBodyMeasurementInput {
  patientId: string;
  measuredAt: string;
  weightKg: number;
  heightCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
}

export interface CreateBodyCompositionInput {
  patientId: string;
  bodyMeasurementId?: string | null;
  measuredAt: string;
  bodyFatPercentage?: number | null;
  muscleMassKg?: number | null;
  waterPercentage?: number | null;
  visceralFatLevel?: number | null;
  boneMassKg?: number | null;
  metabolicAge?: number | null;
}
