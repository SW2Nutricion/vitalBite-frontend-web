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
export type DietPlanStatus = 'ACTIVE' | 'DRAFT' | 'NEEDS_ADJUSTMENT';
export type PatientRiskPredictionStatus =
  | 'SUCCESS'
  | 'REUSED'
  | 'INSUFFICIENT_DATA'
  | 'UNAVAILABLE';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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
  activityLevel?: number | null;
  dietQualityScore?: number | null;
  comorbiditiesCount?: number | null;
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

export interface PatientRiskPrediction {
  status: PatientRiskPredictionStatus;
  nivelRiesgo?: string | null;
  probabilidad?: number | null;
  probabilidades?: Record<string, number> | null;
  factoresCriticos: string[];
  recomendacion?: string | null;
  createdAt?: string | null;
  sourceMeasurementId?: string | null;
  sourceCompositionId?: string | null;
}

export interface AnthropometryMeasurement {
  id: string;
  tenantId: string;
  patientId: string;
  bodyMeasurementId?: string | null;
  measuredAt: string;
  neckCm?: number | null;
  chestThoraxCm?: number | null;
  rightArmCm?: number | null;
  leftArmCm?: number | null;
  rightForearmCm?: number | null;
  leftForearmCm?: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  rightThighCm?: number | null;
  leftThighCm?: number | null;
  rightCalfCm?: number | null;
  leftCalfCm?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DietMealItem {
  id: string;
  dietMealId: string;
  name: string;
  portion?: string | null;
  calories?: number | null;
  itemOrder: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DietMeal {
  id: string;
  dietPlanDayId: string;
  name: string;
  mealOrder: number;
  targetCalories?: number | null;
  notes?: string | null;
  items: DietMealItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DietPlanDay {
  id: string;
  dietPlanId: string;
  dayLabel: string;
  dayOrder: number;
  meals: DietMeal[];
  createdAt: string;
  updatedAt: string;
}

export interface DietPlan {
  id: string;
  tenantId: string;
  patientId: string;
  nutritionistId: string;
  name: string;
  objective: string;
  phase?: string | null;
  approach?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: DietPlanStatus;
  mealsPerDay?: number | null;
  mainRestriction?: string | null;
  notes?: string | null;
  estimatedCalories?: number | null;
  adherencePercent?: number | null;
  patientFullName: string;
  nutritionistFullName: string;
  days: DietPlanDay[];
  createdAt: string;
  updatedAt: string;
}

export interface DietMealItemInput {
  name: string;
  portion?: string | null;
  calories?: number | null;
  itemOrder?: number | null;
  notes?: string | null;
}

export interface DietMealInput {
  name: string;
  mealOrder?: number | null;
  targetCalories?: number | null;
  notes?: string | null;
  items?: DietMealItemInput[] | null;
}

export interface DietPlanDayInput {
  dayLabel: string;
  dayOrder?: number | null;
  meals?: DietMealInput[] | null;
}

export interface CreateDietPlanInput {
  patientId: string;
  nutritionistId?: string | null;
  name: string;
  objective: string;
  phase?: string | null;
  approach?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: DietPlanStatus | null;
  mealsPerDay?: number | null;
  mainRestriction?: string | null;
  notes?: string | null;
  estimatedCalories?: number | null;
  adherencePercent?: number | null;
  days?: DietPlanDayInput[] | null;
}

export interface UpdateDietPlanInput {
  name?: string | null;
  objective?: string | null;
  phase?: string | null;
  approach?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: DietPlanStatus | null;
  mealsPerDay?: number | null;
  mainRestriction?: string | null;
  notes?: string | null;
  estimatedCalories?: number | null;
  adherencePercent?: number | null;
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

export interface SuperAdminTenantOverview {
  tenant: Tenant;
  subscription?: TenantSubscription | null;
  pendingPlanChangeRequestsCount: number;
  usersCount: number;
  patientsCount: number;
}

export interface SuperAdminTenantDetail {
  tenant: Tenant;
  subscription?: TenantSubscription | null;
  planChangeRequests: PlanChangeRequest[];
  usersCount: number;
  patientsCount: number;
}

export interface UpdateTenantStatusInput {
  tenantId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
}

export interface ResolveSuperAdminPlanChangeInput {
  tenantId: string;
  requestId: string;
  action: 'APPROVE' | 'REJECT';
  comment?: string | null;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: 'ADMINISTRADOR' | 'ADMIN' | 'NUTRICIONISTA';
}

export interface UpdateUserInput extends CreateUserInput {
  userId: string;
}

export interface AuditEvent {
  id: string;
  tenantId?: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
  actorUserId?: string | null;
  actorTenantId?: string | null;
  actorEmail?: string | null;
  actorRoleCode?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  previousHash?: string | null;
  eventHash: string;
  createdAt: string;
}

export interface AuditEventsFilterInput {
  search?: string | null;
  tenantId?: string | null;
  action?: string | null;
  resourceType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number | null;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: Gender | null;
  activityLevel?: number | null;
  dietQualityScore?: number | null;
  comorbiditiesCount?: number | null;
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

export interface CreateAnthropometryMeasurementInput {
  patientId: string;
  bodyMeasurementId?: string | null;
  measuredAt: string;
  neckCm?: number | null;
  chestThoraxCm?: number | null;
  rightArmCm?: number | null;
  leftArmCm?: number | null;
  rightForearmCm?: number | null;
  leftForearmCm?: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  rightThighCm?: number | null;
  leftThighCm?: number | null;
  rightCalfCm?: number | null;
  leftCalfCm?: number | null;
}

export interface UpdateAnthropometryMeasurementInput {
  bodyMeasurementId?: string | null;
  measuredAt?: string | null;
  neckCm?: number | null;
  chestThoraxCm?: number | null;
  rightArmCm?: number | null;
  leftArmCm?: number | null;
  rightForearmCm?: number | null;
  leftForearmCm?: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  rightThighCm?: number | null;
  leftThighCm?: number | null;
  rightCalfCm?: number | null;
  leftCalfCm?: number | null;
}
