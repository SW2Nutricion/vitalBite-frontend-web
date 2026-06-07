import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideCopy,
  LucidePlus,
  LucideSave,
  LucideTrash2,
  LucideFileText,
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

type SaveMode = 'draft' | 'update' | '';
type DayStatus = 'empty' | 'in-progress' | 'complete';
type MealStatus = 'pending' | 'on-target' | 'above-target' | 'below-target';

type WeekDay = {
  label: string;
  order: number;
};

type MealTemplate = {
  name: string;
  time: string;
  targetCalories: number;
};

type WeekDayCard = {
  dayId: string;
  dayOrder: number;
  fullLabel: string;
  shortLabel: string;
  consumedCalories: number;
  targetCalories: number;
  progress: number;
  status: DayStatus;
  statusLabel: string;
  isSelected: boolean;
};

type SelectedMealCard = {
  id: string;
  mealOrder: number;
  name: string;
  time: string;
  targetCalories: number;
  consumedCalories: number;
  differenceCalories: number;
  itemCount: number;
  status: MealStatus;
  statusLabel: string;
  items: DietMealItem[];
};

type WeeklyCompletion = {
  completedDays: number;
  totalDays: number;
  percent: number;
};

const WEEK_DAYS: WeekDay[] = [
  { label: 'Lunes', order: 1 },
  { label: 'Martes', order: 2 },
  { label: 'Miercoles', order: 3 },
  { label: 'Jueves', order: 4 },
  { label: 'Viernes', order: 5 },
  { label: 'Sabado', order: 6 },
  { label: 'Domingo', order: 7 },
];

const DAY_SHORT_LABELS: Record<string, string> = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miercoles: 'Mie',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sabado: 'Sab',
  Domingo: 'Dom',
};

const DEFAULT_MEALS: MealTemplate[] = [
  { time: '08:00', name: 'Desayuno', targetCalories: 420 },
  { time: '12:30', name: 'Almuerzo', targetCalories: 560 },
  { time: '16:30', name: 'Merienda', targetCalories: 200 },
  { time: '20:00', name: 'Cena', targetCalories: 390 },
];

@Component({
  selector: 'app-diet-editor-page',
  imports: [
    RouterLink,
    LucideArrowDown,
    LucideArrowUp,
    LucideCopy,
    LucidePlus,
    LucideSave,
    LucideTrash2,
    LucideFileText,
  ],
  templateUrl: './diet-editor-page.html',
  styleUrl: './diet-editor-page.scss',
})
export class DietEditorPage implements OnInit {
  readonly patient = signal<Patient | null>(null);
  readonly diet = signal<DietPlan | null>(null);
  readonly days = signal<DietPlanDay[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly generatingPdf = signal(false);
  readonly saveMode = signal<SaveMode>('');
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly actionError = signal('');
  readonly selectedDayOrder = signal(1);
  readonly selectedMealOrder = signal<number | null>(1);
  readonly pendingDeleteMealOrder = signal<number | null>(null);

  readonly selectedDay = computed<DietPlanDay | null>(() => {
    const days = this.sortedDays();
    return days.find((day) => day.dayOrder === this.selectedDayOrder()) ?? days[0] ?? null;
  });
  readonly selectedMeals = computed<SelectedMealCard[]>(() => {
    const day = this.selectedDay();
    if (!day) return [];

    return [...day.meals]
      .sort((current, next) => current.mealOrder - next.mealOrder)
      .map((meal) => {
        const consumedCalories = this.mealCalories(meal);
        const targetCalories = Number(meal.targetCalories) || 0;
        const status = this.mealStatus(meal);

        return {
          id: meal.id,
          mealOrder: meal.mealOrder,
          name: meal.name,
          time: meal.notes || this.defaultMealTemplate(meal.mealOrder).time,
          targetCalories,
          consumedCalories,
          differenceCalories: consumedCalories - targetCalories,
          itemCount: meal.items.length,
          status,
          statusLabel: this.mealStatusLabel(status),
          items: meal.items,
        };
      });
  });
  readonly weeklyDayCards = computed<WeekDayCard[]>(() =>
    this.sortedDays().map((day) => {
      const targetCalories = this.dayTargetCalories(day);
      const consumedCalories = this.dayCalories(day);
      const status = this.dayStatus(day);

      return {
        dayId: day.id,
        dayOrder: day.dayOrder,
        fullLabel: day.dayLabel,
        shortLabel: DAY_SHORT_LABELS[day.dayLabel] ?? day.dayLabel.slice(0, 3),
        consumedCalories,
        targetCalories,
        progress: this.progressPercentage(consumedCalories, targetCalories),
        status,
        statusLabel: this.dayStatusLabel(status),
        isSelected: day.dayOrder === this.selectedDay()?.dayOrder,
      };
    }),
  );
  readonly activeMealsCount = computed(() => this.selectedMeals().length);
  readonly activeItemsCount = computed(() =>
    this.selectedMeals().reduce((total, meal) => total + meal.items.length, 0),
  );
  readonly weeklyMealsPerDayMax = computed(() =>
    this.days().reduce((max, day) => Math.max(max, day.meals.length), 0),
  );
  readonly weeklyCalories = computed(() =>
    this.days().reduce((total, day) => total + this.dayCalories(day), 0),
  );
  readonly averageDailyCalories = computed(() =>
    this.days().length ? Math.round(this.weeklyCalories() / this.days().length) : 0,
  );
  readonly dailyTargetCalories = computed(() => {
    const day = this.selectedDay();
    return day ? this.dayTargetCalories(day) : 0;
  });
  readonly dailyConsumedCalories = computed(() => {
    const day = this.selectedDay();
    return day ? this.dayCalories(day) : 0;
  });
  readonly dailyDifferenceCalories = computed(
    () => this.dailyConsumedCalories() - this.dailyTargetCalories(),
  );
  readonly weeklyCompletion = computed<WeeklyCompletion>(() => {
    const days = this.sortedDays();
    const completedDays = days.filter((day) => this.dayStatus(day) === 'complete').length;

    return {
      completedDays,
      totalDays: days.length,
      percent: days.length ? Math.round((completedDays / days.length) * 100) : 0,
    };
  });
  readonly nextAdjustmentMessage = computed(() => {
    const pendingDay = this.sortedDays().find((day) => this.dayStatus(day) !== 'complete');
    if (!pendingDay) {
      return 'La semana actual ya cubre todos los horarios del plan.';
    }

    const missingMeals = pendingDay.meals
      .filter((meal) => this.mealStatus(meal) === 'pending')
      .map((meal) => meal.name.toLowerCase());

    if (!missingMeals.length) {
      return `${pendingDay.dayLabel} necesita revisar porciones para cerrar la meta diaria.`;
    }

    return `${pendingDay.dayLabel} necesita completar ${missingMeals.join(', ')} para equilibrar la semana.`;
  });

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
      this.days.set(this.normalizeWeek(diet.days));
      this.resetSelection();
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

  async exportPdf() {
    const diet = this.diet();
    if (!diet) return;
    
    this.generatingPdf.set(true);
    this.error.set('');
    this.successMessage.set('');
    
    try {
      const s3Url = await this.dietsService.generatePdf(diet.id);
      window.open(s3Url, '_blank');
      this.successMessage.set('PDF generado correctamente. Se abrio en una nueva pestana.');
    } catch (e) {
      this.actionError.set('Ocurrio un error al generar el PDF.');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  selectDay(dayOrder: number) {
    this.selectedDayOrder.set(dayOrder);
    this.pendingDeleteMealOrder.set(null);
    this.ensureSelectedMealOrder();
  }

  selectMeal(mealOrder: number) {
    this.selectedMealOrder.set(mealOrder);
  }

  duplicateScheduleRow(mealOrder: number) {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return;

    const sourceMeal = selectedDay.meals.find((meal) => meal.mealOrder === mealOrder);
    if (!sourceMeal) return;

    const duplicatedMealOrder = selectedDay.meals.length + 1;

    this.days.update((days) =>
      days.map((day) => {
        if (day.id !== selectedDay.id) return day;

        const duplicatedMeal = this.duplicateMeal(day.id, sourceMeal, duplicatedMealOrder);
        return {
          ...day,
          meals: [...day.meals, duplicatedMeal],
        };
      }),
    );

    this.pendingDeleteMealOrder.set(null);
    this.selectedMealOrder.set(duplicatedMealOrder);
  }

  moveScheduleRow(mealOrder: number, direction: 'up' | 'down') {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return;

    const orderedMeals = [...selectedDay.meals].sort((current, next) => current.mealOrder - next.mealOrder);
    const currentIndex = orderedMeals.findIndex((meal) => meal.mealOrder === mealOrder);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedMeals.length) return;

    const reorderedMeals = [...orderedMeals];
    [reorderedMeals[currentIndex], reorderedMeals[targetIndex]] = [
      reorderedMeals[targetIndex],
      reorderedMeals[currentIndex],
    ];

    this.days.update((days) =>
      days.map((day) =>
        day.id === selectedDay.id
          ? {
              ...day,
              meals: this.reindexMeals(reorderedMeals),
            }
          : day,
      ),
    );

    this.pendingDeleteMealOrder.set(null);
    this.selectedMealOrder.set(targetIndex + 1);
  }

  addScheduleRow() {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return;

    const nextOrder = Math.max(...selectedDay.meals.map((meal) => meal.mealOrder), 0) + 1;
    const template = this.defaultMealTemplate(nextOrder);

    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals:
          day.id === selectedDay.id
            ? [
                ...day.meals,
                this.newMeal(day.id, nextOrder, template.name, template.time, template.targetCalories),
              ]
            : day.meals,
      })),
    );
    this.pendingDeleteMealOrder.set(null);
    this.selectedMealOrder.set(nextOrder);
  }

  requestRemoveScheduleRow(mealOrder: number) {
    this.pendingDeleteMealOrder.set(mealOrder);
  }

  cancelRemoveScheduleRow() {
    this.pendingDeleteMealOrder.set(null);
  }

  confirmRemoveScheduleRow() {
    const mealOrder = this.pendingDeleteMealOrder();
    if (mealOrder === null) return;

    this.removeScheduleRow(mealOrder);
    this.pendingDeleteMealOrder.set(null);
  }

  removeScheduleRow(mealOrder: number) {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return;

    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals:
          day.id === selectedDay.id
            ? this.reindexMeals(day.meals.filter((meal) => meal.mealOrder !== mealOrder))
            : day.meals,
      })),
    );
    this.pendingDeleteMealOrder.set(null);
    this.ensureSelectedMealOrder();
  }

  updateScheduleRow(mealOrder: number, field: 'name' | 'time', event: Event) {
    const selectedDay = this.selectedDay();
    if (!selectedDay) return;

    const input = event.target as HTMLInputElement;
    const value = input.value;

    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals:
          day.id === selectedDay.id
            ? day.meals.map((meal) =>
                meal.mealOrder === mealOrder
                  ? {
                      ...meal,
                      name: field === 'name' ? value : meal.name,
                      notes: field === 'time' ? value : meal.notes,
                    }
                  : meal,
              )
            : day.meals,
      })),
    );
  }

  addItem(dayId: string, mealOrder: number) {
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((currentMeal) =>
          day.id === dayId && currentMeal.mealOrder === mealOrder
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
    this.selectedMealOrder.set(mealOrder);
  }

  removeItem(dayId: string, mealOrder: number, itemId: string) {
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          day.id === dayId && meal.mealOrder === mealOrder
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
    dayId: string,
    mealOrder: number,
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
          day.id === dayId && meal.mealOrder === mealOrder
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

  updateMealCalories(dayId: string, mealOrder: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          day.id === dayId && meal.mealOrder === mealOrder ? { ...meal, targetCalories: value } : meal,
        ),
      })),
    );
  }

  mealCalories(meal: DietMeal) {
    return meal.items.reduce((total, item) => total + (Number(item.calories) || 0), 0);
  }

  dayCalories(day: DietPlanDay) {
    return day.meals.reduce((total, meal) => total + this.mealCalories(meal), 0);
  }

  dayTargetCalories(day: DietPlanDay) {
    return day.meals.reduce((total, meal) => total + (Number(meal.targetCalories) || 0), 0);
  }

  dayStatus(day: DietPlanDay): DayStatus {
    const allMealsEmpty = day.meals.every((meal) => meal.items.length === 0 && this.mealCalories(meal) === 0);
    if (allMealsEmpty) return 'empty';

    const allMealsComplete = day.meals.every((meal) => meal.items.length > 0);
    return allMealsComplete ? 'complete' : 'in-progress';
  }

  dayStatusLabel(status: DayStatus) {
    if (status === 'empty') return 'Vacio';
    if (status === 'complete') return 'Completo';
    return 'En progreso';
  }

  mealStatus(meal: DietMeal): MealStatus {
    const consumedCalories = this.mealCalories(meal);
    const targetCalories = Number(meal.targetCalories) || 0;

    if (consumedCalories === 0) return 'pending';
    if (Math.abs(consumedCalories - targetCalories) <= 50) return 'on-target';
    return consumedCalories > targetCalories ? 'above-target' : 'below-target';
  }

  mealStatusLabel(status: MealStatus) {
    if (status === 'pending') return 'Pendiente';
    if (status === 'on-target') return 'En meta';
    if (status === 'above-target') return 'Sobre meta';
    return 'Bajo meta';
  }

  differenceLabel(value: number) {
    if (value > 0) return `+${value} kcal`;
    return `${value} kcal`;
  }

  progressPercentage(consumedCalories: number, targetCalories: number) {
    if (!targetCalories) return 0;
    return Math.max(0, Math.min(100, Math.round((consumedCalories / targetCalories) * 100)));
  }

  formatDate(value?: string | null) {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value));
  }

  trackByItemId(_: number, item: DietMealItem) {
    return item.id;
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
        mealsPerDay: this.weeklyMealsPerDayMax(),
        estimatedCalories: this.averageDailyCalories(),
      });
      this.diet.set(updated);
      this.days.set(this.normalizeWeek(updated.days));
      this.resetSelection();
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
    return [...days].sort((current, next) => current.dayOrder - next.dayOrder).map((day, dayIndex) => ({
      dayLabel: day.dayLabel,
      dayOrder: dayIndex + 1,
      meals: [...day.meals].sort((current, next) => current.mealOrder - next.mealOrder).map((meal, mealIndex) => ({
        name: meal.name.trim() || `Comida ${mealIndex + 1}`,
        mealOrder: mealIndex + 1,
        targetCalories: Number(meal.targetCalories) || null,
        notes: meal.notes?.trim() || null,
        items: meal.items.map((item, itemIndex) => ({
          name: item.name.trim() || 'Alimento sin nombre',
          portion: item.portion,
          calories: Number(item.calories) || null,
          itemOrder: itemIndex + 1,
        })),
      })),
    }));
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

  private normalizeWeek(days: DietPlanDay[]) {
    const now = new Date().toISOString();

    return WEEK_DAYS.map((weekDay) => {
      const sourceDay = this.findSourceDay(days, weekDay);
      const dayId = sourceDay?.id ?? `temp-day-${weekDay.order}-${crypto.randomUUID()}`;
      const dietPlanId = sourceDay?.dietPlanId ?? this.diet()?.id ?? 'temp-diet';

      return {
        id: dayId,
        dietPlanId,
        dayLabel: weekDay.label,
        dayOrder: weekDay.order,
        createdAt: sourceDay?.createdAt ?? now,
        updatedAt: sourceDay?.updatedAt ?? now,
        meals: (sourceDay?.meals ?? [])
          .slice()
          .sort((current, next) => current.mealOrder - next.mealOrder)
          .map((meal) => this.cloneMeal(meal)),
      };
    });
  }

  private findSourceDay(days: DietPlanDay[], weekDay: WeekDay) {
    return (
      days.find((day) => day.dayOrder === weekDay.order) ??
      days.find((day) => day.dayLabel.trim().toLowerCase() === weekDay.label.toLowerCase()) ??
      null
    );
  }

  private cloneMeal(meal: DietMeal) {
    return {
      ...meal,
      items: meal.items.map((item) => ({ ...item })),
    };
  }

  private duplicateMeal(dietPlanDayId: string, meal: DietMeal, mealOrder: number): DietMeal {
    const now = new Date().toISOString();
    const duplicatedMealId = `temp-meal-${crypto.randomUUID()}`;

    return {
      ...meal,
      id: duplicatedMealId,
      dietPlanDayId,
      mealOrder,
      items: meal.items.map((item, index) => ({
        ...item,
        id: `temp-${crypto.randomUUID()}`,
        dietMealId: duplicatedMealId,
        itemOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }

  private newMeal(
    dietPlanDayId: string,
    mealOrder: number,
    name: string,
    time: string,
    targetCalories: number,
  ): DietMeal {
    const now = new Date().toISOString();

    return {
      id: `temp-meal-${crypto.randomUUID()}`,
      dietPlanDayId,
      name,
      mealOrder,
      targetCalories,
      notes: time,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private defaultMealTemplate(mealOrder: number) {
    return DEFAULT_MEALS[mealOrder - 1] ?? {
      time: `${String(Math.min(23, 8 + (mealOrder - 1) * 3)).padStart(2, '0')}:00`,
      name: `Comida ${mealOrder}`,
      targetCalories: 0,
    };
  }

  private reindexMeals(meals: DietMeal[]) {
    return meals.slice().map((meal, index) => ({
        ...meal,
        mealOrder: index + 1,
      }));
  }

  private sortedDays() {
    return [...this.days()].sort((current, next) => current.dayOrder - next.dayOrder);
  }

  private resetSelection() {
    this.selectedDayOrder.set(this.sortedDays()[0]?.dayOrder ?? 1);
    this.ensureSelectedMealOrder();
  }

  private ensureSelectedMealOrder() {
    const currentMeals = this.selectedDay()?.meals
      .map((meal) => meal.mealOrder)
      .sort((current, next) => current - next) ?? [];

    if (!currentMeals.length) {
      this.selectedMealOrder.set(null);
      return;
    }

    const currentOrder = this.selectedMealOrder();
    if (currentOrder && currentMeals.includes(currentOrder)) return;

    this.selectedMealOrder.set(currentMeals[0]);
  }

  private clearActionMessages() {
    this.successMessage.set('');
    this.actionError.set('');
  }
}
