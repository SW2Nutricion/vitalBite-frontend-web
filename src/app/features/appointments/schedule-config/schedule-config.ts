import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphqlService } from '../../../core/graphql/graphql.service';
import { LucidePlus, LucideTrash2, LucideSave } from '@lucide/angular';

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
    <div class="p-4 max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Mis Horarios de Atención</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configura tus horas disponibles para las citas médicas.</p>
        </div>
        <button
          (click)="save()"
          [disabled]="loading()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          <svg lucideSave size="18"></svg>
          Guardar Cambios
        </button>
      </div>

      <div class="space-y-6">
        @for (day of days(); track day.dayOfWeek) {
          <div class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div class="flex items-center justify-between mb-4">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="day.enabled"
                  class="w-5 h-5 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span class="text-lg font-medium text-gray-900 dark:text-white">{{ day.name }}</span>
              </label>

              @if (day.enabled) {
                <button
                  (click)="addRange(day)"
                  class="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <svg lucidePlus size="16"></svg>
                  Añadir rango
                </button>
              }
            </div>

            @if (day.enabled) {
              <div class="space-y-3">
                @for (range of day.ranges; track $index) {
                  <div class="flex items-center gap-4">
                    <input
                      type="time"
                      [(ngModel)]="range.startTime"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-32 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand-500 dark:focus:border-brand-500"
                    />
                    <span class="text-gray-500 dark:text-gray-400">a</span>
                    <input
                      type="time"
                      [(ngModel)]="range.endTime"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-32 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand-500 dark:focus:border-brand-500"
                    />
                    <button
                      (click)="removeRange(day, $index)"
                      class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg lucideTrash2 size="18"></svg>
                    </button>
                  </div>
                }
                
                @if (day.ranges.length === 0) {
                  <p class="text-sm text-yellow-600 dark:text-yellow-400">Debes añadir al menos un rango de tiempo, o desmarcar el día.</p>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ScheduleConfig implements OnInit {
  private graphql = inject(GraphqlService);

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideSave = LucideSave;

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

  ngOnInit() {
    this.loadSchedules();
  }

  async loadSchedules() {
    this.loading.set(true);
    try {
      const response = await this.graphql.query<{ mySchedules: any[] }>(`
        query {
          mySchedules {
            id
            dayOfWeek
            startTime
            endTime
          }
        }
      `);
      
      const schedules = response.mySchedules;
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
      alert('Error cargando horarios');
    } finally {
      this.loading.set(false);
    }
  }

  addRange(day: DaySchedule) {
    day.ranges.push({ startTime: '09:00', endTime: '13:00' });
    this.days.set([...this.days()]);
  }

  removeRange(day: DaySchedule, index: number) {
    day.ranges.splice(index, 1);
    this.days.set([...this.days()]);
  }

  async save() {
    const inputs: any[] = [];
    
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
      await this.graphql.mutate(`
        mutation SaveSchedules($inputs: [SaveScheduleInput!]!) {
          saveSchedules(inputs: $inputs) {
            id
          }
        }
      `, { inputs });
      
      alert('Horarios guardados correctamente');
    } catch (e) {
      console.error(e);
      alert('Error guardando horarios');
    } finally {
      this.loading.set(false);
    }
  }
}


