import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBriefcaseMedical,
  LucideBuilding2,
  LucideHeartPulse,
  LucideLock,
  LucideMail,
  LucidePhone,
  LucideShieldCheck,
  LucideUser,
} from '@lucide/angular';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideArrowRight,
    LucideBriefcaseMedical,
    LucideBuilding2,
    LucideHeartPulse,
    LucideLock,
    LucideMail,
    LucidePhone,
    LucideShieldCheck,
    LucideUser,
  ],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    professionalArea: ['', [Validators.required]],
    clinicName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(readonly session: SessionService) {}

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, email, password, clinicName } = this.form.getRawValue();

    this.error.set('');
    try {
      await this.session.register({
        fullName,
        email,
        password,
        clinicName,
      });
    } catch {
      this.error.set('No se pudo crear la cuenta. Verifica tus datos o usa otro correo.');
    }
  }
}
