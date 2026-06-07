import { Injectable } from '@angular/core';
import { PatientRiskPrediction } from '../models/vitalbite.models';
import { GraphqlService } from '../graphql/graphql.service';

const RISK_PREDICTION_FIELDS = `
  status
  nivelRiesgo
  probabilidad
  probabilidades
  factoresCriticos
  recomendacion
  createdAt
  sourceMeasurementId
  sourceCompositionId
`;

@Injectable({ providedIn: 'root' })
export class RiskPredictionsService {
  constructor(private readonly graphql: GraphqlService) {}

  async byPatient(patientId: string) {
    const data = await this.graphql.query<{ patientRiskPrediction: PatientRiskPrediction }>(
      `
        query PatientRiskPrediction($patientId: ID!) {
          patientRiskPrediction(patientId: $patientId) {
            ${RISK_PREDICTION_FIELDS}
          }
        }
      `,
      { patientId },
    );

    return data.patientRiskPrediction;
  }
}
