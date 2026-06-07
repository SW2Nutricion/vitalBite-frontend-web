import { Injectable } from '@angular/core';
import { PatientSegmentation } from '../models/vitalbite.models';
import { GraphqlService } from '../graphql/graphql.service';

const SEGMENTATION_FIELDS = `
  id
  kClusters
  totalPatients
  silhouetteScore
  clusters {
    cluster_id
    label
    total_pacientes
    porcentaje
    feature_dominante
    caracteristicas
  }
  pcaPoints {
    patient_id
    cluster_id
    x
    y
    z
  }
  varianceExplained
  createdAt
`;

@Injectable({ providedIn: 'root' })
export class SegmentationsService {
  constructor(private readonly graphql: GraphqlService) {}

  async analyzeTenantSegmentation(): Promise<PatientSegmentation> {
    const data = await this.graphql.mutate<{ analyzeTenantSegmentation: PatientSegmentation }>(
      `
        mutation AnalyzeTenantSegmentation {
          analyzeTenantSegmentation {
            ${SEGMENTATION_FIELDS}
          }
        }
      `,
    );

    return data.analyzeTenantSegmentation;
  }

  async getLatestSegmentation(): Promise<PatientSegmentation | null> {
    const data = await this.graphql.query<{ latestTenantSegmentation: PatientSegmentation | null }>(
      `
        query LatestTenantSegmentation {
          latestTenantSegmentation {
            ${SEGMENTATION_FIELDS}
          }
        }
      `,
    );

    return data.latestTenantSegmentation;
  }
}
