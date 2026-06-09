import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchedulesService } from '../../../core/services/schedules.service';
import { ToastService } from '../../../core/services/toast.service';
import { SaveScheduleInput } from '../../../core/models/vitalbite.models';
import { LucidePlus, LucideTrash2, LucideSave, LucideCopy, LucideAlertCircle } from '@lucide/angular';

interface TimeRange {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  dayOfWeek: number;
  name: string;
  enabled: boolean;
  ranges: TimeRange[];
}

@Component({
  selector: 'app-schedule-config',
  imports: [CommonModule, FormsModule, LucidePlus, LucideTrash2, LucideSave],
  template: `
    <div class="schedule-container">
      <div class="schedule-header">
        <div>
          <h2>Mis Horarios de Atención</h2>
          <p>Configura tus horas disponibles para las citas médicas.</p>
        </div>
        <button class="btn" (click)="save()" [disabled]="loading() || hasAnyError">
          <svg lucideSave size="18"></svg>
          Guardar Cambios
        </button>
      </div>

      <div class="schedule-group">
        <h3>Días Laborables</h3>
        @for (day of workDays(); track day.dayOfWeek) {
          <div class="schedule-card" [class.error]="hasErrorsInDay(day)">
            <div class="schedule-card-header" [class.active]="day.enabled">
              <label class="schedule-card-title">
                <div class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="day.enabled" />
                  <div class="toggle-slider"></div>
                </div>
                <span class="schedule-card-name" [class.disabled]="!day.enabled">{{ day.name }}</span>
              </label>

              @if (day.enabled) {
                <div class="schedule-card-actions">
                  @if (day.dayOfWeek === 1) {
                    <button class="btn-ghost muted" (click)="copyMondayToWeekdays()" title="Copiar horario a L-V">
                      <svg lucideCopy size="16"></svg>
                      Copiar a L-V
                    </button>
                  }
                  <button class="btn-ghost" (click)="addRange(day)">
                    <svg lucidePlus size="16"></svg>
                    Añadir rango
                  </button>
                </div>
              }
            </div>

            @if (day.enabled) {
              <div class="range-list">
                @for (range of day.ranges; track $index) {
                  <div class="range-item">
                    <input type="time" [(ngModel)]="range.startTime" class="time-input" />
                    <span class="range-separator">a</span>
                    <input type="time" [(ngModel)]="range.endTime" class="time-input" />
                    <button class="btn-icon" (click)="removeRange(day, $index)">
                      <svg lucideTrash2 size="18"></svg>
                    </button>
                  </div>
                  @if (range.startTime >= range.endTime) {
                    <p class="error-text">
                      <svg lucideAlertCircle size="12"></svg> La hora de fin debe ser posterior.
                    </p>
                  }
                }
                
                @if (day.ranges.length === 0) {
                  <p class="warning-text">Debes añadir un rango o desmarcar el día.</p>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="schedule-group">
        <h3>Fin de Semana</h3>
        @for (day of weekendDays(); track day.dayOfWeek) {
          <div class="schedule-card" [class.error]="hasErrorsInDay(day)">
            <div class="schedule-card-header" [class.active]="day.enabled">
              <label class="schedule-card-title">
                <div class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="day.enabled" />
                  <div class="toggle-slider"></div>
                </div>
                <span class="schedule-card-name" [class.disabled]="!day.enabled">{{ day.name }}</span>
              </label>

              @if (day.enabled) {
                <button class="btn-ghost" (click)="addRange(day)">
                  <svg lucidePlus size="16"></svg>
                  Añadir rango
                </button>
              }
            </div>

            @if (day.enabled) {
              <div class="range-list">
                @for (range of day.ranges; track $index) {
                  <div class="range-item">
                    <input type="time" [(ngModel)]="range.startTime" class="time-input" />
                    <span class="range-separator">a</span>
                    <input type="time" [(ngModel)]="range.endTime" class="time-input" />
                    <button class="btn-icon" (click)="removeRange(day, $index)">
                      <svg lucideTrash2 size="18"></svg>
                    </button>
                  </div>
                  @if (range.startTime >= range.endTime) {
                    <p class="error-text">
                      <svg lucideAlertCircle size="12"></svg> La hora de fin debe ser posterior.
                    </p>
                  }
                }
                
                @if (day.ranges.length === 0) {
                  <p class="warning-text">Debes añadir un rango o desmarcar el día.</p>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .schedule-container { max-width: 900px; padding: 24px 0; margin: 0 auto; }
    .schedule-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 16px; }
    .schedule-header h2 { font-size: 24px; font-weight: 800; color: var(--green-950); margin: 0 0 4px; }
    .schedule-header p { margin: 0; color: var(--muted); font-size: 14px; }
    .schedule-group { margin-bottom: 40px; }
    .schedule-group h3 { font-size: 16px; font-weight: 800; color: var(--green-900); padding-left: 10px; border-left: 4px solid var(--green-700); margin-bottom: 16px; }
    
    .schedule-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(22, 63, 42, 0.03); transition: all 0.2s; }
    .schedule-card:hover { box-shadow: var(--shadow); }
    .schedule-card.error { border-color: var(--danger); box-shadow: 0 0 0 2px rgba(182, 81, 67, 0.2); }
    
    .schedule-card-header { display: flex; justify-content: space-between; align-items: center; }
    .schedule-card-header.active { margin-bottom: 20px; }
    .schedule-card-title { display: flex; align-items: center; gap: 14px; cursor: pointer; }
    .schedule-card-name { font-size: 16px; font-weight: 700; color: var(--text); transition: opacity 0.2s; }
    .schedule-card-name.disabled { opacity: 0.5; }
    .schedule-card-actions { display: flex; gap: 8px; }
    
    .toggle-switch { position: relative; width: 44px; height: 24px; background: #e2e8f0; border-radius: 999px; transition: background 0.2s; }
    .toggle-switch input { position: absolute; opacity: 0; cursor: pointer; width: 100%; height: 100%; z-index: 2; margin: 0; }
    .toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1); }
    .toggle-switch input:checked + .toggle-slider { transform: translateX(20px); }
    .toggle-switch:has(input:checked) { background: var(--green-700); }
    
    .range-list { border-top: 1px solid var(--line); padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .range-item { display: flex; align-items: center; gap: 12px; background: var(--surface); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line); }
    
    .time-input { border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; font-weight: 600; font-size: 14px; color: var(--text); outline: none; transition: border-color 0.2s; }
    .time-input:focus { border-color: var(--green-700); box-shadow: 0 0 0 2px rgba(47, 107, 66, 0.2); }
    
    .range-separator { color: var(--muted); font-size: 14px; font-weight: 600; }
    .btn-icon { background: transparent; border: none; color: var(--muted); margin-left: auto; padding: 6px; border-radius: 8px; transition: all 0.2s; display: flex; }
    .btn-icon:hover { color: var(--danger); background: #ffebee; }
    
    .btn-ghost { background: transparent; border: none; color: var(--green-700); font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
    .btn-ghost:hover { background: var(--green-100); }
    .btn-ghost.muted { color: var(--muted); }
    .btn-ghost.muted:hover { background: #e0e4da; color: var(--text); }
    
    .error-text { color: var(--danger); font-size: 13px; display: flex; align-items: center; gap: 6px; margin: 4px 0 0; font-weight: 600; }
    .warning-text { color: #d97706; font-size: 13px; font-weight: 600; margin: 0; }
  `]
})
export class ScheduleConfig implements OnInit {
  private schedulesService = inject(SchedulesService);
  private toast = inject(ToastService);

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideSave = LucideSave;
  readonly LucideCopy = LucideCopy;
  readonly LucideAlertCircle = LucideAlertCircle;

  loading = signal(false);

  days = signal<DaySchedule[]>([
    { dayOfWeek: 1, name: 'Lunes', enabled: false, ranges: [] },
    { dayOfWeek: 2, name: 'Martes', enabled: false, ranges: [] },
    { dayOfWeek: 3, name: 'Miércoles', enabled: false, ranges: [] },
    { dayOfWeek: 4, name: 'Jueves', enabled: false, ranges: [] },
    { dayOfWeek: 5, name: 'Viernes', enabled: false, ranges: [] },
    { dayOfWeek: 6, name: 'Sábado', enabled: false, ranges: [] },
    { dayOfWeek: 0, name: 'Domingo', enabled: false, ranges: [] },
  ]);

  workDays = () => this.days().filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
  weekendDays = () => this.days().filter(d => d.dayOfWeek === 6 || d.dayOfWeek === 0);

  ngOnInit() {
    this.loadSchedules();
  }

  async loadSchedules() {
    this.loading.set(true);
    try {
      const schedules = await this.schedulesService.mySchedules();
      
      const daysState = this.days().map(d => ({ ...d, enabled: false, ranges: [] as TimeRange[] }));

      for (const s of schedules) {
        const day = daysState.find(d => d.dayOfWeek === s.dayOfWeek);
        if (day) {
          day.enabled = true;
          day.ranges.push({ startTime: s.startTime, endTime: s.endTime });
        }
      }

      this.days.set(daysState);
    } catch (e) {
      console.error(e);
      this.toast.error('Error cargando horarios');
    } finally {
      this.loading.set(false);
    }
  }

  addRange(day: DaySchedule) {
    if (day.ranges.length === 0) {
      day.ranges.push({ startTime: '09:00', endTime: '13:00' });
    } else {
      const lastRange = day.ranges[day.ranges.length - 1];
      const lastEndHour = parseInt(lastRange.endTime.split(':')[0], 10);
      let newStart = lastEndHour + 1;
      if (newStart > 22) newStart = 22;
      let newEnd = newStart + 4;
      if (newEnd > 23) newEnd = 23;
      
      day.ranges.push({ 
        startTime: `${newStart.toString().padStart(2, '0')}:00`, 
        endTime: `${newEnd.toString().padStart(2, '0')}:00` 
      });
    }
    this.days.set([...this.days()]);
  }

  removeRange(day: DaySchedule, index: number) {
    day.ranges.splice(index, 1);
    this.days.set([...this.days()]);
  }

  copyMondayToWeekdays() {
    const monday = this.days().find(d => d.dayOfWeek === 1);
    if (!monday) return;
    
    const newDays = this.days().map(d => {
      if (d.dayOfWeek >= 2 && d.dayOfWeek <= 5) {
        return {
          ...d,
          enabled: monday.enabled,
          ranges: monday.ranges.map(r => ({ ...r }))
        };
      }
      return d;
    });
    
    this.days.set(newDays);
    this.toast.success('Horario copiado a toda la semana laboral');
  }

  hasErrorsInDay(day: DaySchedule): boolean {
    if (!day.enabled) return false;
    if (day.ranges.length === 0) return true;
    for (const r of day.ranges) {
      if (r.startTime >= r.endTime) return true;
    }
    return false;
  }

  get hasAnyError(): boolean {
    return this.days().some(d => this.hasErrorsInDay(d));
  }

  async save() {
    if (this.hasAnyError) {
      this.toast.error('Revisa los horarios. Hay rangos inválidos.');
      return;
    }

    const inputs: SaveScheduleInput[] = [];
    
    for (const day of this.days()) {
      if (day.enabled) {
        for (const range of day.ranges) {
          inputs.push({
            dayOfWeek: day.dayOfWeek,
            startTime: range.startTime,
            endTime: range.endTime,
          });
        }
      }
    }

    this.loading.set(true);
    try {
      await this.schedulesService.saveSchedules(inputs);
      this.toast.success('Horarios guardados correctamente');
    } catch (e) {
      console.error(e);
      this.toast.error('Error guardando horarios');
    } finally {
      this.loading.set(false);
    }
  }
}


