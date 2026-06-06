import { ActivatedRoute } from '@angular/router';
import { DietMeal, DietMealItem, DietPlanDay, DietPlanDayInput, DietMealInput } from '../../../core/models/vitalbite.models';
import { DietsService } from '../../../core/services/diets.service';
import { PatientsService } from '../../../core/services/patients.service';
import { DietEditorPage } from './diet-editor-page';

describe('DietEditorPage', () => {
  let component: DietEditorPage;

  beforeEach(() => {
    component = new DietEditorPage(
      ({
        snapshot: {
          paramMap: {
            get: () => null,
          },
        },
      } as unknown) as ActivatedRoute,
      {} as DietsService,
      {} as PatientsService,
    );
  });

  it('derives empty, in-progress and complete day states', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, []),
        createMeal('Almuerzo', 2, 560, []),
      ]),
      createDay('Martes', 2, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 150, 1)]),
        createMeal('Almuerzo', 2, 560, []),
      ]),
      createDay('Miercoles', 3, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 150, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
    ]);

    expect(component.weeklyDayCards().slice(0, 3).map((card) => card.status)).toEqual([
      'empty',
      'in-progress',
      'complete',
    ]);
  });

  it('calculates daily target, consumed and difference for the selected day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 300, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 620, 1)]),
      ]),
    ]);
    component.selectedDayOrder.set(1);

    expect(component.dailyTargetCalories()).toBe(980);
    expect(component.dailyConsumedCalories()).toBe(920);
    expect(component.dailyDifferenceCalories()).toBe(-60);
  });

  it('builds the next adjustment message from the first incomplete day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 420, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 560, 1)]),
      ]),
      createDay('Martes', 2, [
        createMeal('Desayuno', 1, 420, [createItem('Fruta', 120, 1)]),
        createMeal('Almuerzo', 2, 560, []),
        createMeal('Cena', 3, 390, []),
      ]),
    ]);

    expect(component.nextAdjustmentMessage()).toBe(
      'Martes necesita completar almuerzo, cena para equilibrar la semana.',
    );
  });

  it('adds a schedule only to the selected day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
      createDay('Martes', 2, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
    ]);
    component.selectDay(1);

    component.addScheduleRow();

    expect(component.days()[0].meals.map((meal) => meal.mealOrder)).toEqual([1, 2, 3]);
    expect(component.days()[1].meals.map((meal) => meal.mealOrder)).toEqual([1, 2]);
    expect(component.activeMealsCount()).toBe(3);
    expect(component.activeItemsCount()).toBe(2);
  });

  it('duplicates a schedule inside the selected day with copied items', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
      createDay('Martes', 2, [createMeal('Cena', 1, 390, [createItem('Sopa', 180, 1)])]),
    ]);
    component.selectDay(1);

    component.duplicateScheduleRow(1);

    expect(component.days()[0].meals.map((meal) => meal.name)).toEqual([
      'Desayuno',
      'Almuerzo',
      'Desayuno',
    ]);
    expect(component.days()[0].meals[2].items.map((item) => item.name)).toEqual(['Avena']);
    expect(component.days()[1].meals.map((meal) => meal.name)).toEqual(['Cena']);
  });

  it('reorders schedules only within the selected day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, []),
        createMeal('Almuerzo', 2, 560, []),
        createMeal('Cena', 3, 390, []),
      ]),
      createDay('Martes', 2, [
        createMeal('Snack', 1, 150, []),
        createMeal('Cena', 2, 390, []),
      ]),
    ]);
    component.selectDay(1);

    component.moveScheduleRow(2, 'up');
    expect(component.selectedMeals().map((meal) => meal.name)).toEqual(['Almuerzo', 'Desayuno', 'Cena']);

    component.moveScheduleRow(1, 'down');
    expect(component.selectedMeals().map((meal) => meal.name)).toEqual(['Desayuno', 'Almuerzo', 'Cena']);
    expect(component.days()[1].meals.map((meal) => meal.name)).toEqual(['Snack', 'Cena']);
  });

  it('removes a schedule only from the selected day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
      createDay('Martes', 2, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
    ]);
    component.selectDay(1);

    component.removeScheduleRow(2);

    expect(component.days()[0].meals.map((meal) => meal.mealOrder)).toEqual([1]);
    expect(component.days()[1].meals.map((meal) => meal.mealOrder)).toEqual([1, 2]);
  });

  it('requires confirmation before deleting a schedule', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, []),
        createMeal('Almuerzo', 2, 560, []),
      ]),
    ]);
    component.selectDay(1);

    component.requestRemoveScheduleRow(2);
    expect(component.pendingDeleteMealOrder()).toBe(2);
    expect(component.days()[0].meals.map((meal) => meal.mealOrder)).toEqual([1, 2]);

    component.cancelRemoveScheduleRow();
    expect(component.pendingDeleteMealOrder()).toBeNull();

    component.requestRemoveScheduleRow(2);
    component.confirmRemoveScheduleRow();
    expect(component.pendingDeleteMealOrder()).toBeNull();
    expect(component.days()[0].meals.map((meal) => meal.mealOrder)).toEqual([1]);
  });

  it('updates schedule labels only on the selected day', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
      ]),
      createDay('Martes', 2, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
      ]),
    ]);
    component.selectDay(1);

    component.updateScheduleRow(1, 'name', createInputEvent('Brunch'));
    component.updateScheduleRow(1, 'time', createInputEvent('10:30'));

    expect(component.days()[0].meals[0].name).toBe('Brunch');
    expect(component.days()[0].meals[0].notes).toBe('10:30');
    expect(component.days()[1].meals[0].name).toBe('Desayuno');
    expect(component.days()[1].meals[0].notes).toBe('08:00');
  });

  it('does not autocomplete missing schedules during normalization', () => {
    const normalized = (component as any).normalizeWeek([
      createDay('Lunes', 1, [createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)])]),
      createDay('Martes', 2, []),
    ]) as DietPlanDay[];

    expect(normalized.find((day) => day.dayOrder === 1)?.meals.map((meal) => meal.mealOrder)).toEqual([1]);
    expect(normalized.find((day) => day.dayOrder === 2)?.meals).toEqual([]);
    expect(normalized.find((day) => day.dayOrder === 3)?.meals).toEqual([]);
  });

  it('preserves distinct day structures when building the save payload', () => {
    const input = (component as any).toInput([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [createItem('Avena', 120, 1)]),
        createMeal('Cena', 3, 390, [createItem('Sopa', 200, 1)]),
      ]),
      createDay('Martes', 2, [createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)])]),
    ]) as DietPlanDayInput[];

    expect(input[0].meals?.map((meal: DietMealInput) => meal.mealOrder)).toEqual([1, 2]);
    expect(input[0].meals?.map((meal: DietMealInput) => meal.name)).toEqual(['Desayuno', 'Cena']);
    expect(input[1].meals?.map((meal: DietMealInput) => meal.mealOrder)).toEqual([1]);
    expect(input[1].meals?.map((meal: DietMealInput) => meal.name)).toEqual(['Almuerzo']);
  });

  it('preserves item ordering while adding and removing entries', () => {
    component.days.set([
      createDay('Lunes', 1, [
        createMeal('Desayuno', 1, 420, [
          createItem('Avena', 120, 1),
          createItem('Fruta', 90, 2),
        ]),
        createMeal('Almuerzo', 2, 560, [createItem('Pollo', 240, 1)]),
      ]),
    ]);
    component.selectDay(1);

    expect(component.selectedMeals().map((meal) => meal.mealOrder)).toEqual([1, 2]);

    const firstMealBeforeRemoval = component.selectedDay()!.meals.find((meal) => meal.mealOrder === 1)!;
    component.removeItem(component.selectedDay()!.id, 1, firstMealBeforeRemoval.items[0].id);
    const firstMealAfterRemoval = component.selectedDay()!.meals.find((meal) => meal.mealOrder === 1)!;
    expect(firstMealAfterRemoval.items.map((item) => item.itemOrder)).toEqual([1]);

    component.addItem(component.selectedDay()!.id, 1);
    const firstMealAfterAdd = component.selectedDay()!.meals.find((meal) => meal.mealOrder === 1)!;
    expect(firstMealAfterAdd.items.map((item) => item.itemOrder)).toEqual([1, 2]);
  });
});

function createDay(dayLabel: string, dayOrder: number, meals: DietMeal[]): DietPlanDay {
  return {
    id: `day-${dayOrder}`,
    dietPlanId: 'diet-1',
    dayLabel,
    dayOrder,
    meals,
    createdAt: '2026-06-06T00:00:00.000Z',
    updatedAt: '2026-06-06T00:00:00.000Z',
  };
}

function createMeal(
  name: string,
  mealOrder: number,
  targetCalories: number,
  items: DietMealItem[],
): DietMeal {
  return {
    id: `meal-${mealOrder}-${name}`,
    dietPlanDayId: 'day-1',
    name,
    mealOrder,
    targetCalories,
    notes: `${String(7 + mealOrder).padStart(2, '0')}:00`,
    items,
    createdAt: '2026-06-06T00:00:00.000Z',
    updatedAt: '2026-06-06T00:00:00.000Z',
  };
}

function createItem(name: string, calories: number, itemOrder: number): DietMealItem {
  return {
    id: `item-${name}-${itemOrder}`,
    dietMealId: 'meal-1',
    name,
    portion: '1 porcion',
    calories,
    itemOrder,
    createdAt: '2026-06-06T00:00:00.000Z',
    updatedAt: '2026-06-06T00:00:00.000Z',
  };
}

function createInputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}
