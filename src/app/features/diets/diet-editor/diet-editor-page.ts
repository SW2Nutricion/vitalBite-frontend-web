import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  LucideBookOpen,
  LucideCheck,
  LucideCopy,
  LucideDownload,
  LucideFileText,
  LucidePlus,
  LucideSave,
  LucideTrash2,
} from '@lucide/angular';
import {
  DietMeal,
  DietMealItem,
  DietPlan,
  DietPlanDay,
  DietPlanDayInput,
  Patient,
} from '../../../core/models/vitalbite.models';
import { DietsService } from '../../../core/services/diets.service';
import { PatientsService } from '../../../core/services/patients.service';

type SaveMode = 'draft' | 'update' | 'duplicate' | '';

@Component({
  selector: 'app-diet-editor-page',
  imports: [
    RouterLink,
    LucideBookOpen,
    LucideCheck,
    LucideCopy,
    LucideDownload,
    LucideFileText,
    LucidePlus,
    LucideSave,
    LucideTrash2,
  ],
  templateUrl: './diet-editor-page.html',
  styleUrl: './diet-editor-page.scss',
})
export class DietEditorPage implements OnInit {
  readonly patient = signal<Patient | null>(null);
  readonly diet = signal<DietPlan | null>(null);
  readonly days = signal<DietPlanDay[]>([]);
  readonly activeDayId = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveMode = signal<SaveMode>('');
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly actionError = signal('');

  readonly selectedDay = computed<DietPlanDay | null>(
    () => this.days().find((day) => day.id === this.activeDayId()) ?? this.days()[0] ?? null,
  );

  readonly dailyCalories = computed(() => this.sumDayCalories(this.selectedDay()));
  readonly activeMealsCount = computed(() => this.selectedDay()?.meals.length ?? 0);
  readonly activeItemsCount = computed(
    () => this.selectedDay()?.meals.reduce((total, meal) => total + meal.items.length, 0) ?? 0,
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dietsService: DietsService,
    private readonly patientsService: PatientsService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const patientId = this.route.snapshot.paramMap.get('id');
    const dietId = this.route.snapshot.paramMap.get('dietId');
    if (!patientId || !dietId) return;

    this.loading.set(true);
    this.error.set('');
    try {
      const [patient, diet] = await Promise.all([
        this.patientsService.byId(patientId),
        this.dietsService.byId(dietId),
      ]);
      this.patient.set(patient);
      this.diet.set(diet);
      this.days.set(this.cloneDays(diet.days));
      this.activeDayId.set(diet.days[0]?.id ?? '');
    } catch {
      this.error.set('No se pudo cargar el editor de dieta.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveDraft() {
    await this.save('DRAFT');
  }

  async updatePlan() {
    await this.save('ACTIVE');
  }

  async duplicateDay() {
    const diet = this.diet();
    const sourceDay = this.selectedDay();
    if (!diet || !sourceDay) return;

    this.clearActionMessages();
    this.saving.set(true);
    this.saveMode.set('duplicate');
    try {
      const nextOrder = Math.max(...this.days().map((day) => day.dayOrder), 0) + 1;
      const updated = await this.dietsService.duplicateDay({
        dietPlanId: diet.id,
        sourceDayId: sourceDay.id,
        targetDayLabel: `Dia ${nextOrder}`,
        targetDayOrder: nextOrder,
      });
      this.diet.set(updated);
      this.days.set(this.cloneDays(updated.days));
      this.activeDayId.set(updated.days.at(-1)?.id ?? sourceDay.id);
      this.successMessage.set('Dia duplicado dentro del plan.');
    } catch {
      this.actionError.set('No se pudo duplicar el dia. Conservamos el trabajo actual en pantalla.');
    } finally {
      this.saving.set(false);
      this.saveMode.set('');
    }
  }

  addItem(meal: DietMeal) {
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((currentMeal) =>
          currentMeal.id === meal.id
            ? {
                ...currentMeal,
                items: [
                  ...currentMeal.items,
                  this.newItem(currentMeal.id, currentMeal.items.length + 1),
                ],
              }
            : currentMeal,
        ),
      })),
    );
  }

  removeItem(mealId: string, itemId: string) {
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                items: meal.items
                  .filter((item) => item.id !== itemId)
                  .map((item, index) => ({ ...item, itemOrder: index + 1 })),
              }
            : meal,
        ),
      })),
    );
  }

  updateItem(
    mealId: string,
    itemId: string,
    field: 'name' | 'portion' | 'calories',
    event: Event,
  ) {
    const input = event.target as HTMLInputElement;
    const value = field === 'calories' ? Number(input.value) || 0 : input.value;
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.id === mealId
            ? {
                ...meal,
                items: meal.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item,
                ),
              }
            : meal,
        ),
      })),
    );
  }

  updateMealCalories(mealId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.id === mealId ? { ...meal, targetCalories: value } : meal,
        ),
      })),
    );
  }

  mealCalories(meal: DietMeal) {
    return meal.items.reduce((total, item) => total + (Number(item.calories) || 0), 0);
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value));
  }

  private async save(status: 'ACTIVE' | 'DRAFT') {
    const diet = this.diet();
    if (!diet) return;

    this.clearActionMessages();
    this.saving.set(true);
    this.saveMode.set(status === 'ACTIVE' ? 'update' : 'draft');
    try {
      const days = this.toInput(this.days());
      await this.dietsService.updateStructure(diet.id, days);
      const updated = await this.dietsService.update(diet.id, {
        status,
        estimatedCalories: this.dailyCalories(),
      });
      this.diet.set(updated);
      this.days.set(this.cloneDays(updated.days));
      this.activeDayId.set(updated.days[0]?.id ?? '');
      this.successMessage.set(
        status === 'ACTIVE'
          ? 'Plan actualizado y marcado como activo.'
          : 'Borrador guardado correctamente.',
      );
    } catch {
      this.actionError.set('No se pudo guardar el plan. Conservamos los cambios en pantalla.');
    } finally {
      this.saving.set(false);
      this.saveMode.set('');
    }
  }

  private toInput(days: DietPlanDay[]): DietPlanDayInput[] {
    return days.map((day, dayIndex) => ({
      dayLabel: day.dayLabel,
      dayOrder: dayIndex + 1,
      meals: day.meals.map((meal, mealIndex) => ({
        name: meal.name,
        mealOrder: mealIndex + 1,
        targetCalories: Number(meal.targetCalories) || null,
        items: meal.items.map((item, itemIndex) => ({
          name: item.name,
          portion: item.portion,
          calories: Number(item.calories) || null,
          itemOrder: itemIndex + 1,
        })),
      })),
    }));
  }

  private cloneDays(days: DietPlanDay[]) {
    return days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        items: meal.items.map((item) => ({ ...item })),
      })),
    }));
  }

  private sumDayCalories(day: DietPlanDay | null) {
    if (!day) return 0;
    return day.meals.reduce((total, meal) => total + this.mealCalories(meal), 0);
  }

  private newItem(mealId: string, itemOrder: number): DietMealItem {
    const now = new Date().toISOString();
    return {
      id: `temp-${crypto.randomUUID()}`,
      dietMealId: mealId,
      name: 'Nuevo alimento',
      portion: '1 porcion',
      calories: 0,
      itemOrder,
      createdAt: now,
      updatedAt: now,
    };
  }

  private clearActionMessages() {
    this.successMessage.set('');
    this.actionError.set('');
  }
}
