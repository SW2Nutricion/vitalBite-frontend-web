import { AppointmentStatus, PatientStatus } from './vitalbite.models';

export function patientStatusLabel(status?: PatientStatus | null) {
  const labels: Record<PatientStatus, string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    ARCHIVED: 'Archivado',
  };

  return status ? labels[status] : 'Sin estado';
}

export function appointmentStatusLabel(status?: AppointmentStatus | null) {
  const labels: Record<AppointmentStatus, string> = {
    SCHEDULED: 'Programada',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    RESCHEDULED: 'Reprogramada',
    NO_SHOW: 'Inasistencia',
  };

  return status ? labels[status] : 'Sin estado';
}
