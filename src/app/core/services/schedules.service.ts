import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import { Schedule, SaveScheduleInput } from '../models/vitalbite.models';

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  constructor(private readonly graphql: GraphqlService) {}

  async mySchedules() {
    const data = await this.graphql.query<{ mySchedules: Schedule[] }>(`
      query MySchedules {
        mySchedules {
          id
          dayOfWeek
          startTime
          endTime
        }
      }
    `);
    return data.mySchedules;
  }

  async saveSchedules(inputs: SaveScheduleInput[]) {
    const data = await this.graphql.mutate<{ saveSchedules: Schedule[] }>(
      `
        mutation SaveSchedules($inputs: [SaveScheduleInput!]!) {
          saveSchedules(inputs: $inputs) {
            id
            dayOfWeek
            startTime
            endTime
          }
        }
      `,
      { inputs },
    );
    return data.saveSchedules;
  }
}
