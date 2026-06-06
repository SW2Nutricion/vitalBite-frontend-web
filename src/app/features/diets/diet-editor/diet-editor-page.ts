import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  LucideBookOpen,
  LucideCheck,
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

type SaveMode = 'draft' | 'update' | '';

type WeekDay = {
  label: string;
  order: number;
};

type MealTemplate = {
  name: string;
  time: string;
  targetCalories: number;
};

type ScheduleRow = {
  mealOrder: number;
  name: string;
  time: string;
  itemCount: number;
  totalCalories: number;
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
    LucideBookOpen,
    LucideCheck,
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
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveMode = signal<SaveMode>('');
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly actionError = signal('');
  readonly weekDays = WEEK_DAYS;

  readonly scheduleRows = computed<ScheduleRow[]>(() =>
    this.mealOrders().map((mealOrder) => {
      const meals = this.days()
        .map((day) => this.mealForOrder(day, mealOrder))
        .filter((meal): meal is DietMeal => Boolean(meal));
      const firstMeal = meals[0];

      return {
        mealOrder,
        name: firstMeal?.name ?? this.defaultMealTemplate(mealOrder).name,
        time: firstMeal?.notes ?? this.defaultMealTemplate(mealOrder).time,
        itemCount: meals.reduce((total, meal) => total + meal.items.length, 0),
        totalCalories: meals.reduce((total, meal) => total + this.mealCalories(meal), 0),
      };
    }),
  );
  readonly activeMealsCount = computed(() => this.scheduleRows().length);
  readonly activeItemsCount = computed(() =>
    this.days().reduce(
      (total, day) => total + day.meals.reduce((dayTotal, meal) => dayTotal + meal.items.length, 0),
      0,
    ),
  );
  readonly weeklyCalories = computed(() =>
    this.days().reduce((total, day) => total + this.dayCalories(day), 0),
  );
  readonly averageDailyCalories = computed(() =>
    this.days().length ? Math.round(this.weeklyCalories() / this.days().length) : 0,
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
      this.days.set(this.normalizeWeek(diet.days, diet.mealsPerDay ?? DEFAULT_MEALS.length));
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

  addScheduleRow() {
    const nextOrder = Math.max(...this.mealOrders(), 0) + 1;
    const template = this.defaultMealTemplate(nextOrder);

    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: [
          ...day.meals,
          this.newMeal(day.id, nextOrder, template.name, template.time, template.targetCalories),
        ],
      })),
    );
  }

  removeScheduleRow(mealOrder: number) {
    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.filter((meal) => meal.mealOrder !== mealOrder),
      })),
    );
  }

  updateScheduleRow(mealOrder: number, field: 'name' | 'time', event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this.days.update((days) =>
      days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.mealOrder === mealOrder
            ? {
                ...meal,
                name: field === 'name' ? value : meal.name,
                notes: field === 'time' ? value : meal.notes,
              }
            : meal,
        ),
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

  mealFor(day: DietPlanDay, row: ScheduleRow) {
    return this.mealForOrder(day, row.mealOrder);
  }

  mealCalories(meal: DietMeal) {
    return meal.items.reduce((total, item) => total + (Number(item.calories) || 0), 0);
  }

  dayCalories(day: DietPlanDay) {
    return day.meals.reduce((total, meal) => total + this.mealCalories(meal), 0);
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
        mealsPerDay: this.activeMealsCount(),
        estimatedCalories: this.averageDailyCalories(),
      });
      this.diet.set(updated);
      this.days.set(this.normalizeWeek(updated.days, updated.mealsPerDay ?? this.activeMealsCount()));
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

  private normalizeWeek(days: DietPlanDay[], mealsPerDay: number) {
    const now = new Date().toISOString();
    const mealOrders = this.normalizeMealOrders(days, mealsPerDay);

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
        meals: mealOrders.map((mealOrder) => {
          const sourceMeal = sourceDay?.meals.find((meal) => meal.mealOrder === mealOrder);
          const fallbackMeal = this.firstMealByOrder(days, mealOrder);
          const template = this.defaultMealTemplate(mealOrder);

          return sourceMeal
            ? this.cloneMeal(sourceMeal)
            : this.newMeal(
                dayId,
                mealOrder,
                fallbackMeal?.name ?? template.name,
                fallbackMeal?.notes ?? template.time,
                fallbackMeal?.targetCalories ?? template.targetCalories,
              );
        }),
      };
    });
  }

  private normalizeMealOrders(days: DietPlanDay[], mealsPerDay: number) {
    const mealOrders = [...new Set(days.flatMap((day) => day.meals.map((meal) => meal.mealOrder)))].sort(
      (current, next) => current - next,
    );

    if (mealOrders.length) return mealOrders;

    return DEFAULT_MEALS.slice(0, Math.max(1, mealsPerDay)).map((_, index) => index + 1);
  }

  private findSourceDay(days: DietPlanDay[], weekDay: WeekDay) {
    return (
      days.find((day) => day.dayOrder === weekDay.order) ??
      days.find((day) => day.dayLabel.trim().toLowerCase() === weekDay.label.toLowerCase()) ??
      null
    );
  }

  private firstMealByOrder(days: DietPlanDay[], mealOrder: number) {
    for (const day of days) {
      const meal = day.meals.find((item) => item.mealOrder === mealOrder);
      if (meal) return meal;
    }

    return null;
  }

  private mealOrders() {
    return [...new Set(this.days().flatMap((day) => day.meals.map((meal) => meal.mealOrder)))].sort(
      (current, next) => current - next,
    );
  }

  private mealForOrder(day: DietPlanDay, mealOrder: number) {
    return day.meals.find((meal) => meal.mealOrder === mealOrder) ?? null;
  }

  private cloneMeal(meal: DietMeal) {
    return {
      ...meal,
      items: meal.items.map((item) => ({ ...item })),
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

  private clearActionMessages() {
    this.successMessage.set('');
    this.actionError.set('');
  }
}
