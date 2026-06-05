import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBadgeDollarSign,
  LucideBuilding2,
  LucideChartColumn,
  LucideCheckCircle2,
  LucideClipboardList,
  LucideHeartPulse,
  LucideRuler,
  LucideShieldCheck,
  LucideUserRoundCheck,
  LucideUsers,
} from '@lucide/angular';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideArrowUpRight,
    LucideBadgeDollarSign,
    LucideBuilding2,
    LucideChartColumn,
    LucideCheckCircle2,
    LucideClipboardList,
    LucideHeartPulse,
    LucideRuler,
    LucideShieldCheck,
    LucideUserRoundCheck,
    LucideUsers,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}
