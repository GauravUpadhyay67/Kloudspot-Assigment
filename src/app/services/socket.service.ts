import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root'
})
export class SocketService implements OnDestroy {
    private socket: Socket;
    private url = 'https://hiring-dev.internal.kloudspot.com';

    constructor() {
        this.socket = io(this.url, {
            transports: ['polling', 'websocket'], // Allow polling fallback
            autoConnect: true
        });
    }

    onAlert(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('alert', (data) => {
                observer.next(data);
            });
        });
    }

    onLiveOccupancy(): Observable<any> {
        return new Observable(observer => {
            this.socket.on('live_occupancy', (data) => {
                observer.next(data);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    ngOnDestroy() {
        this.disconnect();
    }
}
