import { Component } from '@angular/core';
import { AppointmentsCalendarComponent } from './appointments-calendar/appointments-calendar.component';

@Component({
  selector: 'app-appointments-page',
  imports: [AppointmentsCalendarComponent],
  template: `<app-appointments-calendar></app-appointments-calendar>`,
})
export class AppointmentsPage {}
