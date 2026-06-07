import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { LucideActivity, LucideAlertTriangle, LucideUsers, LucideX } from '@lucide/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { PatientSegmentation, Patient } from '../../core/models/vitalbite.models';
import { SegmentationsService } from '../../core/services/segmentations.service';
import { PatientsService } from '../../core/services/patients.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-segmentations-page',
  imports: [LucideActivity, LucideAlertTriangle, LucideUsers, LucideX, DecimalPipe, KeyValuePipe, NgxEchartsDirective],
  providers: [
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
  templateUrl: './segmentations-page.html',
  styleUrl: './segmentations-page.scss',
})
export class SegmentationsPage implements OnInit {
  readonly segmentation = signal<PatientSegmentation | null>(null);
  readonly patientsList = signal<Patient[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly expandedChart = signal<'pca' | 'distribution' | null>(null);

  constructor(
    private readonly segmentationsService: SegmentationsService,
    private readonly patientsService: PatientsService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadLatest(),
      this.loadPatients()
    ]);
  }

  async loadPatients() {
    try {
      const patients = await this.patientsService.list();
      this.patientsList.set(patients);
    } catch (err) {
      console.error('Error loading patients', err);
    }
  }

  openChart(type: 'pca' | 'distribution') {
    this.expandedChart.set(type);
  }

  closeChart() {
    this.expandedChart.set(null);
  }

  onChartClick(event: any) {
    if (event.seriesType === 'scatter') {
      const patientId = event.data[3];
      if (patientId) {
        this.router.navigate(['/patients', patientId]);
      }
    }
  }

  readonly doughnutOptions = computed<EChartsOption>(() => {
    const data = this.segmentation();
    if (!data) return {};

    const chartData = data.clusters.map(c => ({
      value: c.total_pacientes,
      name: c.label,
    }));

    return {
      tooltip: { 
        trigger: 'item',
        formatter: '{b}: <br/><b>{c} pacientes</b> ({d}%)' 
      },
      legend: { show: false },
      color: ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
      series: [
        {
          name: 'Distribución',
          type: 'pie',
          radius: ['55%', '85%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 4
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 18, fontWeight: 'bold' }
          },
          labelLine: { show: false },
          data: chartData
        }
      ]
    };
  });

  readonly scatterOptions = computed<EChartsOption>(() => {
    const data = this.segmentation();
    const patients = this.patientsList();
    if (!data || !data.pcaPoints) return {};

    const colors = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    const scatterData = data.pcaPoints.map((p: any) => [
      p.x, p.y, p.cluster_id, p.patient_id
    ]);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const d = params.data;
          const patientId = d[3];
          const clusterLabel = data.clusters.find(c => c.cluster_id === d[2])?.label || `Cluster ${d[2]}`;
          const patient = patients.find(p => p.id === patientId);
          const patientName = patient ? patient.fullName : 'Paciente Anónimo';
          
          return `<div style="font-family: Inter, sans-serif;">
            <strong style="color: #0f172a; font-size: 1.1em;">👤 ${patientName}</strong><br/>
            <strong style="color: ${colors[d[2] % colors.length]};">${clusterLabel}</strong><br/>
            <hr style="border:0; border-top:1px solid #e2e8f0; margin: 5px 0;">
            <span style="color:#64748b; font-size: 0.9em;">Haz clic para ver su expediente</span>
          </div>`;
        }
      },
      grid: { left: '10%', right: '10%', bottom: '15%', top: '10%', containLabel: true },
      xAxis: { 
        type: 'value', 
        name: 'PCA 1', 
        nameLocation: 'middle', 
        nameGap: 30, 
        scale: true,
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { color: '#64748b' },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      },
      yAxis: { 
        type: 'value', 
        name: 'PCA 2', 
        nameLocation: 'middle', 
        nameGap: 40, 
        scale: true, 
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { color: '#64748b' },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 20,
          data: scatterData,
          itemStyle: {
            color: (params: any) => colors[params.data[2] % colors.length],
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.15)',
            shadowOffsetY: 5
          }
        }
      ]
    };
  });

  async loadLatest() {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.segmentationsService.getLatestSegmentation();
      this.segmentation.set(data);
    } catch (err) {
      this.error.set('');
    } finally {
      this.loading.set(false);
    }
  }

  async analyze() {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.segmentationsService.analyzeTenantSegmentation();
      this.segmentation.set(data);
    } catch (err: any) {
      this.error.set(
        err?.message || 'Error al procesar los datos clínicos de los pacientes. Es posible que no haya suficientes pacientes con historial.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(value?: string | null) {
    if (!value) return 'N/D';
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  formatScore(score?: number | null) {
    if (score === null || score === undefined) return 'N/D';
    if (score > 0.5) return 'Alta';
    if (score > 0.2) return 'Media';
    return 'Baja';
  }
}
