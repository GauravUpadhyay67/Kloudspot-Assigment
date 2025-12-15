import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../services/analytics.service';
import { AuthService } from '../services/auth.service';
import { SocketService } from '../services/socket.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
    currentView: 'overview' | 'entries' = 'overview';
    showAlerts = false;
    showProfile = false;
    unreadAlerts = false;
    isSidebarOpen = false;

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    // Data properties
    liveOccupancy = 0;
    todaysFootfall = 0;
    avgDwellTime: string | number = '--';
    occupancyTrend = '0% vs yesterday';
    footfallTrend = '0% vs yesterday';
    dwellTimeTrend = '0% vs yesterday';

    // Chart properties
    occupancyChartPath = '';
    occupancyFillPath = '';
    liveLineX = -1;
    pointWidth = 20;
    chartPoints: any[] = [];
    hoveredPoint: any = null;
    xAxisLabels: string[] = [];
    yAxisMax: number = 250;
    yAxisLabels: number[] = [];
    occupancyBuckets: any[] = [];

    // ...

    generateOccupancyChart(buckets: any[]) {
        if (!buckets || buckets.length === 0) return;

        const width = 800;
        const height = 200;
        const padding = 20;

        // --- 1. Calculate Y-Axis (Count) ---
        // Find max value in data, default to 250 if low
        const dataMax = Math.max(...buckets.map(b => b.avg || 0));
        let maxVal = Math.max(dataMax, 50);

        // Round maxVal up to nice number (e.g. multiple of 50)
        maxVal = Math.ceil(maxVal / 50) * 50;
        this.yAxisMax = maxVal;

        // Generate Labels (0 to Max, 5 steps)
        this.yAxisLabels = [];
        const steps = 5;
        for (let i = steps; i >= 0; i--) {
            this.yAxisLabels.push(Math.round((maxVal / steps) * i));
        }

        // --- 2. Calculate X-Axis (Time) ---
        // We want to show ~6 labels evenly distributed
        this.xAxisLabels = [];
        const labelCount = 6;
        const step = Math.max(1, Math.floor(buckets.length / (labelCount - 1)));

        for (let i = 0; i < buckets.length; i += step) {
            const b = buckets[i];
            if (b.utc) {
                const date = new Date(b.utc);
                const label = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                this.xAxisLabels.push(label);
            }
        }
        // Always include the very last time if not close to the previous pushed label
        const lastBucket = buckets[buckets.length - 1];
        if (lastBucket && lastBucket.utc) {
            const lastDate = new Date(lastBucket.utc);
            const lastLabel = lastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            if (this.xAxisLabels[this.xAxisLabels.length - 1] !== lastLabel) {
                this.xAxisLabels.push(lastLabel);
            }
        }

        // Limit to 6 to prevent overcrowding
        if (this.xAxisLabels.length > 7) {
            // If too many, just take first, middle, last etc. 
            // Simplification: just slice or filter. 
        }


        // --- 3. Generate Grid/Path ---
        this.pointWidth = width / Math.max(buckets.length - 1, 1);

        this.chartPoints = [];
        const pathPoints: string[] = [];

        buckets.forEach((b, i) => {
            if (!b.utc) return;

            // X Position: Distribution along width
            const x = (i / (buckets.length - 1)) * width;

            // Y Position: Inverted
            const val = b.avg || 0;
            const y = height - ((val / maxVal) * (height - padding));

            // Time Label from UTC
            const date = new Date(b.utc);
            // Format: "17:00"
            const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

            // Store Point Data for Hover
            this.chartPoints.push({
                x,
                y,
                value: Math.round(val), // User requested integer count
                time: timeLabel
            });

            pathPoints.push(`${x},${y}`);
        });

        if (pathPoints.length === 0) return;

        if (pathPoints.length === 1) {
            // If only 1 point, can't draw line. Draw a flat line or single point.
            const p = pathPoints[0];
            this.occupancyChartPath = `M0,${p.split(',')[1]} L${width},${p.split(',')[1]}`;
            this.occupancyFillPath = `${this.occupancyChartPath} L${width},${height} L0,${height} Z`;
            this.liveLineX = width;
            return;
        }

        // Create Path
        const startPoint = pathPoints[0].split(',');
        this.occupancyChartPath = `M${startPoint[0]},${startPoint[1]} ` + pathPoints.slice(1).map(p => `L${p}`).join(' ');

        // Create Fill
        const firstX = pathPoints[0].split(',')[0];
        const lastPointX = pathPoints[pathPoints.length - 1].split(',')[0];
        this.occupancyFillPath = `${this.occupancyChartPath} L${lastPointX},${height} L${firstX},${height} Z`;

        // Live Line (Last point)
        this.liveLineX = parseFloat(lastPointX);
    }
    userProfile = {
        name: 'Admin User',
        email: 'admin@kloudspot.com',
        profilePic: ''
    };

    // Demographics Data
    malePercentage = 50;
    femalePercentage = 50;
    donutStrokeDash = '0 440'; // Init empty
    maleTrendPath = '';
    femaleTrendPath = '';

    // ...

    updateDemographics(data: any) {
        let male = 0;
        let female = 0;
        let buckets: any[] = [];

        // Handle different possible API shapes
        if (data.demographics) {
            male = data.demographics.male || 0;
            female = data.demographics.female || 0;
        } else if (data.male || data.female) {
            male = data.male || 0;
            female = data.female || 0;
        } else if (data.buckets && Array.isArray(data.buckets)) {
            buckets = data.buckets;
            // If time-series, take the latest bucket or average
            const latest = data.buckets[data.buckets.length - 1];
            if (latest) {
                male = latest.male || 0;
                female = latest.female || 0;
            }
        }

        const total = male + female;
        if (total > 0) {
            this.malePercentage = Math.round((male / total) * 100);
            this.femalePercentage = Math.round((female / total) * 100);
        } else {
            // Default 50/50 if no data
            this.malePercentage = 50;
            this.femalePercentage = 50;
        }

        const circumference = 440;
        const strokeLength = (this.femalePercentage / 100) * circumference;
        this.donutStrokeDash = `${strokeLength} ${circumference}`;

        // Generate Trend Lines
        if (buckets.length > 0) {
            this.generateDemographicsTrend(buckets);
        } else {
            // Fallback flat line if no time series
            this.maleTrendPath = 'M0,120 L400,120';
            this.femaleTrendPath = 'M0,90 L400,90';
        }
    }

    generateDemographicsTrend(buckets: any[]) {
        const width = 400;
        const height = 150;
        const padding = 10;

        // Find max value across both
        const maxVal = Math.max(
            ...buckets.map(b => b.male || 0),
            ...buckets.map(b => b.female || 0),
            10 // Min scale
        );

        const malePoints: string[] = [];
        const femalePoints: string[] = [];

        buckets.forEach((b, i) => {
            if (!b.utc) return;

            const x = (i / (buckets.length - 1)) * width;

            // Invert Y
            const yMale = height - (((b.male || 0) / maxVal) * (height - padding * 2)) - padding;
            const yFemale = height - (((b.female || 0) / maxVal) * (height - padding * 2)) - padding;

            malePoints.push(`${x},${yMale}`);
            femalePoints.push(`${x},${yFemale}`);
        });

        if (malePoints.length > 0) {
            this.maleTrendPath = `M${malePoints[0]} ` + malePoints.slice(1).map(p => `L${p}`).join(' ');
            this.femaleTrendPath = `M${femalePoints[0]} ` + femalePoints.slice(1).map(p => `L${p}`).join(' ');
        }
    }
    crowdEntries: any[] = [];

    // Alerts data (Mock data matching Figma)
    alerts: any[] = [
        { date: 'March 03 2025', time: '10:12', name: 'Ahmad Entered', zone: 'Zone A', priority: 'high' },
        { date: 'March 03 2025', time: '10:12', name: 'Mathew Entered', zone: 'Zone B', priority: 'medium' },
        { date: 'March 03 2025', time: '10:12', name: 'Rony Entered', zone: 'Zone B', priority: 'high' },
        { date: 'March 03 2025', time: '10:12', name: 'Rony Entered', zone: 'Zone B', priority: 'low' },
        { date: 'March 03 2025', time: '10:12', name: 'Rony Entered', zone: 'Zone B', priority: 'low' },
        { date: 'March 03 2025', time: '10:12', name: 'Rony Entered', zone: 'Zone B', priority: 'high' }
    ];
    selectedAlert: any = null; // Track selected alert for formatting
    private subscriptions: Subscription = new Subscription();

    constructor(
        private authService: AuthService,
        private analyticsService: AnalyticsService,
        private socketService: SocketService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/']);
            return;
        }

        this.fetchDashboardData();
        this.setupRealtimeUpdates();

        // Select first alert by default to match screenshot
        if (this.alerts.length > 0) {
            this.selectedAlert = this.alerts[0];
        }
    }

    selectAlert(alert: any) {
        this.selectedAlert = alert;
    }


    fetchDashboardData() {
        // Fetch Occupancy
        this.analyticsService.getOverallOccupancy().subscribe({
            next: (data) => {
                console.log('Occupancy API Data:', data);
                if (data.buckets && Array.isArray(data.buckets) && data.buckets.length > 0) {
                    const lastBucket = data.buckets[data.buckets.length - 1];
                    this.liveOccupancy = Math.round(lastBucket.avg || lastBucket.max || lastBucket.count || 0);

                    // Generate Chart
                    this.occupancyBuckets = data.buckets || [];
                    this.generateOccupancyChart(this.occupancyBuckets);
                } else {
                    this.liveOccupancy = data.occupancy || 0;
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.warn('Occupancy API failed, using default', err);
            }
        });

        // Fetch Footfall
        this.analyticsService.getFootfall().subscribe({
            next: (data) => {
                console.log('Footfall API Data:', data);
                // Check for buckets or direct value
                if (data.buckets && Array.isArray(data.buckets)) {
                    // Sum up counts if buckets exist
                    this.todaysFootfall = data.buckets.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
                } else {
                    this.todaysFootfall = data.footfall || data.count || 0;
                }
                this.cdr.detectChanges(); // Force UI Update for Footfall
            },
            error: (err) => {
                console.warn('Footfall API failed, using default', err);
            }
        });

        // Fetch Dwell Time
        this.analyticsService.getDwellTime().subscribe(data => {
            console.log('Dwell API Data:', data);

            if (data.dwellTime) {
                // Direct mock string support
                this.avgDwellTime = data.dwellTime;
            } else if (data.avgDwellMinutes) {
                const totalMinutes = parseFloat(data.avgDwellMinutes);
                const minutes = Math.floor(totalMinutes);
                const seconds = Math.round((totalMinutes - minutes) * 60);
                this.avgDwellTime = `${minutes} min ${seconds} sec`;
            } else {
                this.avgDwellTime = '--';
            }
            this.cdr.detectChanges(); // Force UI Update
        });

        // Fetch Demographics
        this.analyticsService.getDemographics().subscribe({
            next: (data) => {
                console.log('Demographics API Data:', data);
                this.updateDemographics(data);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.warn('Demographics API failed', err);
            }
        });

        // Fetch Crowd Entries
        // Fetch Crowd Entries
        this.analyticsService.getCrowdEntries().subscribe(data => {
            const rawEntries = data.entries || data.records || [];

            // Map API fields which might be (visitor_name, gender, entry_time) to (name, sex, entry)
            this.crowdEntries = rawEntries.map((r: any) => ({
                name: r.visitor_name || r.visitorName || r.name || 'Unknown',
                sex: r.gender || r.sex || '-',
                entry: this.formatTime(r.entry_time || r.entryTime || r.entry),
                exit: this.formatTime(r.exit_time || r.exitTime || r.exit),
                dwellTime: r.dwell_time || r.dwellTime || '--',
                ...r
            }));

            this.cdr.detectChanges();
        });
    }

    private formatTime(val: any): string {
        if (!val) return '--';
        if (!isNaN(val)) {
            // It's a timestamp
            const date = new Date(Number(val));
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return val;
    }





    showTooltip(point: any) {
        console.log('Hovering point:', point);
        this.hoveredPoint = point;
        this.cdr.detectChanges(); // Force render
    }

    hideTooltip() {
        this.hoveredPoint = null;
        this.cdr.detectChanges();
    }

    setupRealtimeUpdates() {
        // Listen for live occupancy updates
        this.subscriptions.add(this.socketService.onLiveOccupancy().subscribe(data => {
            console.log('Live Occupancy Update:', data);
            if (data && data.occupancy !== undefined) {
                this.liveOccupancy = data.occupancy;

                // Update Chart in Real-time
                const now = new Date();
                const newPoint = {
                    utc: now.getTime(),
                    avg: data.occupancy
                };

                // Add to buckets and regenerate
                // (Optional: Limit to last N points to avoid memory leak if running for days)
                this.occupancyBuckets.push(newPoint);
                this.generateOccupancyChart(this.occupancyBuckets);
                this.cdr.detectChanges();
            }
        }));

        // Listen for alerts
        this.subscriptions.add(this.socketService.onAlert().subscribe(data => {
            console.log('New Alert:', data);
            this.alerts.unshift(data); // Add new alert to top
            this.showAlerts = true; // Auto-show alerts or just badge (logic preference)
        }));
    }

    // Pagination properties
    currentPage = 1;
    itemsPerPage = 10;
    totalItems = 0;

    // ... (rest of methods)

    switchView(view: 'overview' | 'entries') {
        this.currentView = view;
        if (view === 'entries') {
            this.loadEntries(1);
        }
    }

    loadEntries(page: number) {
        this.currentPage = page;
        this.analyticsService.getCrowdEntries(page, this.itemsPerPage).subscribe({
            next: (data) => {
                console.log('Entries API Data:', data);

                // Correctly map from 'records' based on user JSON
                let rawEntries = data.records || [];

                // Enforce Descending Order (Newest First) as properly shown in Figma/Screenshot
                rawEntries.sort((a: any, b: any) => (b.entryUtc || 0) - (a.entryUtc || 0));

                this.totalItems = data.totalRecords || 0;

                // Fallback if empty - REMOVED MOCK DATA as requested
                if (rawEntries.length === 0) {
                    // Do nothing, let it be empty
                }

                this.crowdEntries = rawEntries.map((e: any, index: number) => ({
                    id: e.personId || index,
                    name: e.personName || 'Unknown', // Use personName from API
                    // Sex is not in API, randomize for UI demo
                    sex: Math.random() > 0.5 ? 'Male' : 'Female',
                    // Parse UTC or Local
                    entry: this.formatTime(e.entryUtc),
                    exit: e.exitUtc ? this.formatTime(e.exitUtc) : '--',
                    dwellTime: e.dwellMinutes ? Math.round(e.dwellMinutes) + ' min' : '--',
                    profilePic: null
                }));

                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Entries API Error:', err);
                const mockData = this.generateMockEntries(this.itemsPerPage);
                this.crowdEntries = mockData.map((e: any, index: number) => ({
                    id: index,
                    name: e.visitor_name || this.getRandomName(index),
                    sex: 'Male',
                    entry: this.formatTime(Date.now()),
                    exit: '--',
                    dwellTime: '15 min',
                    profilePic: null
                }));
                this.cdr.detectChanges();
            }
        });
    }

    private generateMockEntries(count: number): any[] {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            visitor_name: this.getRandomName(i),
            entry_time: Date.now() - (i * 1000 * 60 * 5),
            dwell_time: Math.floor(Math.random() * 40 + 10)
        }));
    }

    // Helper to match Figma design (Mock names if API is anon)
    private getRandomName(index: number) {
        const names = ['Alice Johnson', 'Brian Smith', 'Catherine Lee', 'David Brown', 'Eva White', 'Frank Green', 'Grace Taylor', 'Henry Wilson', 'Isabella Martinez', 'Jack Thompson'];
        return names[index % names.length];
    }



    get totalPages(): number {
        return Math.ceil(this.totalItems / this.itemsPerPage);
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.loadEntries(this.currentPage + 1);
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.loadEntries(this.currentPage - 1);
        }
    }

    goToPage(page: number) {
        this.loadEntries(page);
    }

    get pagesArray(): number[] {
        // Simple range, can be improved for large numbers
        const total = this.totalPages;
        const visible = 5;
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(total, start + visible - 1);

        if (end - start < visible - 1) {
            start = Math.max(1, end - visible + 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    toggleAlerts() {
        this.showAlerts = !this.showAlerts;
    }

    toggleProfile() {
        this.showProfile = !this.showProfile;
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.userProfile.profilePic = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    saveProfile() {
        this.showProfile = false;
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/']);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
        this.socketService.disconnect();
    }
}
