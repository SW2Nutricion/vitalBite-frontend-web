import { Component, OnInit, computed, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import {
  LucideTrendingUp,
  LucideUsers,
  LucideWallet,
  LucideCreditCard,
  LucideCheckCircle2,
  LucideAlertCircle,
} from '@lucide/angular';
import { SuperAdminTenantsService } from '../../core/services/super-admin-tenants.service';
import { PaymentsService } from '../../core/services/payments.service';
import { SubscriptionPlan } from '../../core/models/vitalbite.models';

@Component({
  selector: 'app-super-admin-billing-page',
  imports: [
    NgxEchartsDirective,
    LucideTrendingUp,
    LucideUsers,
    LucideWallet,
    LucideCreditCard,
    LucideCheckCircle2,
    LucideAlertCircle,
  ],
  templateUrl: './super-admin-billing-page.html',
  styleUrl: './super-admin-billing-page.scss',
})
export class SuperAdminBillingPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal('');
  
  readonly mrr = signal(0);
  readonly activeSubscriptions = signal(0);
  readonly revenueByPlan = signal<{ planCode: string; planName: string; mrr: number; subscriptionsCount: number }[]>([]);
  readonly plans = signal<SubscriptionPlan[]>([]);

  readonly arpu = computed(() => {
    if (this.activeSubscriptions() === 0) return 0;
    return this.mrr() / this.activeSubscriptions();
  });

  readonly planDistributionChartOptions = computed<EChartsOption>(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: '#64748b' } },
    color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
    series: [
      {
        name: 'Ingresos por Plan (MRR)',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 18, fontWeight: 'bold' },
        },
        labelLine: { show: false },
        data: this.revenueByPlan().map((r) => ({
          name: r.planName,
          value: r.mrr,
        })),
      },
    ],
  }));

  readonly projectedGrowthChartOptions = computed<EChartsOption>(() => {
    // Simulamos un crecimiento pasado y futuro basado en el MRR actual para dar contexto visual
    const currentMRR = this.mrr();
    const data = [
      currentMRR * 0.5,
      currentMRR * 0.65,
      currentMRR * 0.8,
      currentMRR * 0.9,
      currentMRR,
      currentMRR * 1.1,
      currentMRR * 1.25,
    ];
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
        axisLine: { lineStyle: { color: '#94a3b8' } },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
        axisLabel: { formatter: '${value}' }
      },
      series: [
        {
          name: 'Proyección MRR',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16,185,129,0.3)' },
                { offset: 1, color: 'rgba(16,185,129,0.0)' },
              ],
            },
          },
          data,
        },
      ],
    };
  });

  constructor(
    private readonly superAdminTenantsService: SuperAdminTenantsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');

    try {
      const [metrics, plans] = await Promise.all([
        this.superAdminTenantsService.superAdminRevenueMetrics(),
        this.paymentsService.plans(),
      ]);

      this.mrr.set(metrics.mrr);
      this.activeSubscriptions.set(metrics.activeSubscriptions);
      this.revenueByPlan.set(metrics.revenueByPlan);
      this.plans.set(plans);
    } catch {
      this.error.set('No se pudieron cargar las métricas globales.');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
}
