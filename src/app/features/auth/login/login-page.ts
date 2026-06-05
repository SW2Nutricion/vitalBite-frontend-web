import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideHeartPulse, LucideLogIn } from '@lucide/angular';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, LucideHeartPulse, LucideLogIn],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['elena.cruz@gmail.com', [Validators.required, Validators.email]],
    password: ['demo1234', [Validators.required]],
  });

  constructor(
    readonly session: SessionService,
  ) {}

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.session.login(email, password);
    } catch {
      this.error.set('No se pudo iniciar sesion. Verifica tus credenciales y el servicio.');
    }
  }
}
