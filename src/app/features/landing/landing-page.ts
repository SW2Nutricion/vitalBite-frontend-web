import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideChartColumn,
  LucideClipboardList,
  LucideHeartPulse,
  LucideRuler,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideArrowUpRight,
    LucideChartColumn,
    LucideClipboardList,
    LucideHeartPulse,
    LucideRuler,
    LucideShieldCheck,
    LucideUsers,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}
