import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, timeout } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = '/api/auth/login';
    private tokenKey = 'kloudspot_token';

    constructor(private http: HttpClient) { }

    login(email: string, password: string): Observable<any> {
        const body = {
            email: email,
            password: password
        };
        return this.http.post<any>(this.apiUrl, body).pipe(
            tap(response => {
                const token = response.token || response.access_token; // Handle both cases just to be safe
                if (token) {
                    localStorage.setItem(this.tokenKey, token);
                }
            }),
            timeout(60000) // 1 minute timeout for slow backend
        );
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem(this.tokenKey);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }
}
