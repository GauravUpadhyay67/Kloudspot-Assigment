import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private baseUrl = '/api/analytics';

    constructor(private http: HttpClient) { }

    getOverallOccupancy(): Observable<any> {
        return this.getAnalyticsPayload('occupancy');
    }

    getFootfall(): Observable<any> {
        return this.getAnalyticsPayload('footfall');
    }

    getDwellTime(): Observable<any> {
        return this.getAnalyticsPayload('dwell');
    }

    getDemographics(): Observable<any> {
        return this.getAnalyticsPayload('demographics');
    }

    private getAnalyticsPayload(endpoint: string, additionalParams: any = {}): Observable<any> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const currentTimestamp = now.getTime();

        // Correct Site ID for Dubai Mall
        const siteId = '8bd0d580-fdac-44a4-a6e4-367253099c4e';

        return this.http.post<any>(`${this.baseUrl}/${endpoint}`, {
            siteId: siteId,
            fromUtc: startOfDay,
            toUtc: currentTimestamp,
            granularity: '15m',
            ...additionalParams
        }).pipe(
            retry({ count: 3, delay: 3000 }) // Retry 3 times with 3s delay
        );
    }

    getCrowdEntries(page: number = 1, limit: number = 10): Observable<any> {
        return this.getAnalyticsPayload('entry-exit', { page, limit });
    }
}
