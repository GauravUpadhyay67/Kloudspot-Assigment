import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
    ApexAnnotations,
    ApexAxisChartSeries,
    ApexChart,
    ApexFill,
    ApexNonAxisChartSeries,
    ApexStroke,
    ApexXAxis,
    NgApexchartsModule
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../services/analytics.service';
import { AuthService } from '../services/auth.service';
import { SocketService } from '../services/socket.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, FormsModule, NgApexchartsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
    currentView: 'overview' | 'entries' = 'overview';
    showAlerts = false;
    alerts: any[] = [];
    showProfile = false;
    unreadAlerts = false;
    isSidebarOpen = false;
    isCollapsed = false;

    // Dropdown Logic
    locations = ['Avenue Mall', 'City Center', 'Marina Plaza'];
    selectedLocation = 'Avenue Mall';
    showLocationDropdown = false;

    toggleLocationDropdown() {
        this.showLocationDropdown = !this.showLocationDropdown;
    }

    selectLocation(loc: string) {
        this.selectedLocation = loc;
        this.showLocationDropdown = false;
        // Optionally reload data here specific to location
        if (this.cdr) this.cdr.detectChanges();
    }

    toggleSidebar() {
        if (window.innerWidth >= 1024) {
            this.isCollapsed = !this.isCollapsed;
        } else {
            this.isSidebarOpen = !this.isSidebarOpen;
        }
    }

    // Data properties
    liveOccupancy = 0;
    todaysFootfall = 0;
    avgDwellTime: string | number = '--';
    occupancyTrend = '0% vs yesterday';
    footfallTrend = '0% vs yesterday';
    dwellTimeTrend = '0% vs yesterday';

    // Chart properties
    // Chart.js Properties
    // ApexCharts Properties
    public chartSeries: ApexAxisChartSeries = [];
    public chartDetails: ApexChart = {
        type: 'area', // Changed to Area to match Demographics
        height: 350,
        toolbar: { show: false },
        zoom: { enabled: false }
    };
    public chartStroke: ApexStroke = {
        curve: 'smooth',
        width: 3 // Reduced slightly to match Demographics
    };
    public chartFill: ApexFill = {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 90, 100]
        }
    };
    public chartColors = ['#6FCF97']; // Figma Green
    public chartDataLabels: ApexDataLabels = { enabled: false };
    public chartGrid: ApexGrid = {
        strokeDashArray: 4,
        borderColor: '#e0e0e0',
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } }
    };
    public chartXAxis: ApexXAxis = {
        title: { text: "Time", style: { color: '#6c757d', fontSize: '12px', fontFamily: 'Helvetica, Arial, sans-serif' } },
        categories: [],
        tickAmount: 8,
        labels: {
            rotate: 0,
            style: {
                colors: '#6c757d',
                fontSize: '12px',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
    };
    public chartYAxis: ApexYAxis = {
        title: { text: "Count", rotate: -90, style: { color: '#6c757d', fontSize: '12px', fontFamily: 'Helvetica, Arial, sans-serif' } },
        tickAmount: 5,
        labels: {
            style: {
                colors: '#6c757d',
                fontSize: '12px',
                fontFamily: 'Helvetica, Arial, sans-serif'
            },
            formatter: (val) => Math.floor(val).toString() // Integers only
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
    };
    public chartAnnotations: ApexAnnotations = {};
    public lineChartLegend = false;
    occupancyBuckets: any[] = [];


    // Demographics Chart Properties
    public demographicsChartSeries: ApexAxisChartSeries = [];
    public demographicsChartDetails: ApexChart = {
        type: 'area', // Changed to Area as requested
        height: 200, // Adjusted height
        toolbar: { show: false },
        zoom: { enabled: false }
    };
    public demographicsChartStroke: ApexStroke = {
        curve: 'smooth',
        width: 3
    };
    public demographicsChartFill: ApexFill = {
        type: 'solid',
        opacity: 0.3 // Light fill for area
    };
    public demographicsChartDataLabels: ApexDataLabels = { enabled: false };
    public demographicsChartColors = ['#2D9CDB', '#6FCF97']; // Male (Blue), Female (Green)

    // Reuse X-Axis config concept (Simple hours, no rotation)
    public demographicsChartXAxis: ApexXAxis = {
        title: { text: "Time", style: { color: '#6c757d', fontSize: '12px', fontFamily: 'Helvetica, Arial, sans-serif' } },
        categories: [],
        tickAmount: 6,
        labels: {
            rotate: 0,
            style: {
                colors: '#6c757d',
                fontSize: '12px',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }
    };

    // Reuse Y-Axis config concept (Steps of 50, integers)
    public demographicsChartYAxis: ApexYAxis = {
        title: { text: "Count", rotate: -90, style: { color: '#6c757d', fontSize: '12px', fontFamily: 'Helvetica, Arial, sans-serif' } },
        tickAmount: 5,
        labels: {
            style: {
                colors: '#6c757d',
                fontSize: '12px',
                fontFamily: 'Helvetica, Arial, sans-serif'
            },
            formatter: (val) => Math.floor(val).toString()
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
    };
    public demographicsChartGrid: ApexGrid = {
        strokeDashArray: 4,
        borderColor: '#e0e0e0',
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } }, // Match Overall Occupancy grid
        padding: { top: 0, right: 0, bottom: 0, left: 10 }
    };
    public demographicsChartLegend: any = {
        show: false, // Hidden to avoid duplication with custom header
        position: 'top',
        horizontalAlign: 'right',
        markers: { radius: 12 },
        itemMargin: { horizontal: 10, vertical: 0 }
    };

    // Donut Chart Properties
    public donutChartSeries: ApexNonAxisChartSeries = [50, 50]; // Default
    public donutChartDetails: ApexChart = {
        type: 'donut',
        height: 200 // Reduced from 250 to 200 to fit better
    };
    public donutChartLabels = ['Male', 'Female'];
    public donutChartColors = ['#2D9CDB', '#6FCF97']; // Figma Blue, Green
    public donutChartDataLabels: ApexDataLabels = { enabled: false };
    public donutChartLegend: any = { show: false }; // Hide or position right as requested
    public donutChartPlotOptions: any = {
        pie: {
            donut: {
                labels: {
                    show: true,
                    total: {
                        show: true,
                        label: 'Total Crowd',
                        fontSize: '16px',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        color: '#828282',
                        formatter: function (w: any) {
                            const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                            return Math.round(total).toString(); // Round to integer
                        }
                    },
                    value: {
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#333',
                        offsetY: 5
                    }
                }
            }
        }
    };

    // ...

    generateOccupancyChart(buckets: any[]) {
        if (!buckets || buckets.length === 0) {
            // Clear chart if no data
            this.chartSeries = [{ name: "Occupancy", data: [] }];
            this.chartXAxis = { ...this.chartXAxis, categories: [] };
            this.cdr.detectChanges();
            return;
        }

        // ApexCharts Implementation with Flexible Mapping
        const labels: string[] = [];
        const data: number[] = [];

        buckets.forEach(b => {
            // Try multiple keys for timestamp
            const timeVal = b.bucketStartTime || b.timestamp || b.time || b.utc;
            if (timeVal) {
                // Format as simple hour (e.g. "8:00")
                const date = new Date(timeVal);
                const label = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                labels.push(label);
            } else {
                labels.push('--');
            }

            // Try multiple keys for occupancy value
            const val = b.occupancy || b.count || b.avg || 0;
            data.push(val);
        });

        // Force update series
        this.chartSeries = [{
            name: "Occupancy",
            data: data
        }];

        // Force update X-axis
        this.chartXAxis = {
            categories: labels,
            title: { text: "Time", style: { color: '#9aa0ac', fontSize: '12px' } },
            tickAmount: 8,
            labels: {
                rotate: 0,
                style: {
                    colors: '#9aa0ac',
                    fontSize: '12px',
                    fontFamily: 'Helvetica, Arial, sans-serif'
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
        };

        // Live Annotation
        const currentLabelIndex = labels.length - 1;
        if (currentLabelIndex >= 0) {
            this.chartAnnotations = {
                xaxis: [
                    {
                        x: labels[currentLabelIndex],
                        borderColor: '#EB5757',
                        strokeDashArray: 4,
                        label: {
                            borderColor: '#EB5757',
                            style: {
                                color: '#fff',
                                background: '#EB5757',
                                fontSize: '10px',
                                fontWeight: 700,
                            },
                            text: 'LIVE',
                            offsetY: -10
                        }
                    }
                ]
            };
        }

        // Ensure dataLabels disabled
        this.chartDataLabels = { enabled: false };

        this.cdr.detectChanges();
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

    // ...

    updateDemographics(data: any) {
        console.log('Demographics API Response:', data); // Debug Log

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
            // Summing Logic: If the API only provides time-based buckets, sum them up
            male = Math.round(data.buckets.reduce((acc: number, b: any) => acc + (b.maleCount || b.male || 0), 0));
            female = Math.round(data.buckets.reduce((acc: number, b: any) => acc + (b.femaleCount || b.female || 0), 0));
        }

        const total = male + female;

        // Update Donut Chart Series
        if (total > 0) {
            this.donutChartSeries = [male, female];
            // Calculate percentages for custom legend
            this.malePercentage = Math.round((male / total) * 100);
            this.femalePercentage = Math.round((female / total) * 100);
        } else {
            this.donutChartSeries = [0, 0];
            this.malePercentage = 50;
            this.femalePercentage = 50;
        }

        const circumference = 440;
        const strokeLength = (this.femalePercentage / 100) * circumference;
        this.donutStrokeDash = `${strokeLength} ${circumference}`;

        // Generate ApexCharts Series
        if (buckets.length > 0) {
            const labels: string[] = [];
            const maleData: number[] = [];
            const femaleData: number[] = [];

            buckets.forEach(b => {
                const timeVal = b.bucketStartTime || b.timestamp || b.time || b.utc;
                if (timeVal) {
                    const date = new Date(timeVal);
                    // Simple hour format for X-axis
                    let label = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    labels.push(label);
                } else {
                    labels.push('--');
                }

                maleData.push(b.maleCount || b.male || 0);
                femaleData.push(b.femaleCount || b.female || 0);
            });

            this.demographicsChartSeries = [
                { name: 'Male', data: maleData },
                { name: 'Female', data: femaleData }
            ];

            this.demographicsChartXAxis = {
                ...this.demographicsChartXAxis,
                categories: labels
            };
        } else {
            // Clear chart if no data
            this.demographicsChartSeries = [];
            this.demographicsChartXAxis = {
                ...this.demographicsChartXAxis,
                categories: []
            };
        }
    }


    crowdEntries: any[] = [];

    // Pagination Controls
    currentPage = 1;
    itemsPerPage = 15; // User requested 15

    get totalPages(): number {
        return Math.ceil(this.crowdEntries.length / this.itemsPerPage) || 1;
    }

    get paginatedEntries(): any[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.crowdEntries.slice(start, start + this.itemsPerPage);
    }

    get pagesArray(): number[] {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1).slice(0, 5); // Limit to 5 for now
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    goToPage(p: number) {
        this.currentPage = p;
    }



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
        // Fetch Occupancy
        this.analyticsService.getOverallOccupancy().subscribe({
            next: (data) => {
                console.log('Occupancy API Response:', data); // Debug Log

                let buckets: any[] = [];

                if (Array.isArray(data)) {
                    // Case 1: API returns array directly
                    buckets = data;
                } else if (data.buckets && Array.isArray(data.buckets)) {
                    // Case 2: API returns { buckets: [...] }
                    buckets = data.buckets;
                }

                if (buckets.length > 0) {
                    // Find the bucket corresponding to the CURRENT time (not the end of the day)
                    const now = new Date().getTime();
                    let currentBucket = buckets[0];

                    // Sort if needed, but assuming sorted
                    for (const b of buckets) {
                        // Check if bucket time is past or present
                        // Use flexible key access
                        const timeVal = b.bucketStartTime || b.timestamp || b.time || b.utc;
                        if (timeVal && timeVal <= now) {
                            currentBucket = b;
                        }
                    }

                    // Flexible Occupancy Value
                    this.liveOccupancy = Math.round(currentBucket.avg || currentBucket.max || currentBucket.count || currentBucket.occupancy || 0);

                    // Generate Chart
                    this.occupancyBuckets = buckets;
                    this.generateOccupancyChart(this.occupancyBuckets);
                } else if (data.occupancy !== undefined) {
                    // Case 3: API returns { occupancy: 123 } (Live only)
                    this.liveOccupancy = data.occupancy || 0;
                    // Pass empty or single point? Pass [] to clear chart or single point
                    this.generateOccupancyChart([]);
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
        // Fetch Crowd Entries
        this.analyticsService.getCrowdEntries(1, this.itemsPerPage).subscribe(data => {
            const rawEntries = data.entries || data.records || [];
            // Map API fields based on user provided keys
            this.crowdEntries = rawEntries.map((r: any) => ({
                name: r.personName || r.name || 'Unknown',
                sex: (r.gender || r.sex || '-').charAt(0).toUpperCase() + (r.gender || r.sex || '-').slice(1),
                entry: this.formatTime(r.entryLocal || r.entry),
                exit: this.formatTime(r.exitLocal || r.exit),
                dwellTime: this.formatDwellTime(r.dwellMinutes !== undefined ? r.dwellMinutes : r.dwellTime),
                ...r
            }));

            this.cdr.detectChanges();
        });
    }

    private formatDwellTime(minutes: any): string {
        if (minutes === undefined || minutes === null || minutes === '--') return '--';

        const num = Number(minutes);
        if (isNaN(num)) return String(minutes);

        const h = Math.floor(num / 60);
        const m = Math.round(num % 60);

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    private formatTime(val: any): string {
        if (!val) return '--';

        // 1. Handle numeric timestamp (milliseconds)
        if (!isNaN(val)) {
            const date = new Date(Number(val));
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        // 2. Handle string formats
        if (typeof val === 'string') {
            // Case A: "DD/MM/YYYY HH:mm:ss" (e.g. "17/12/2025 13:18:34")
            // Regex to capture time part HH:mm:ss
            // Matches: 17/12/2025 13:18:34
            const dMyMatch = val.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}):(\d{1,2})(?::\d{1,2})?/);
            if (dMyMatch) {
                let hours = parseInt(dMyMatch[1], 10);
                const minutes = parseInt(dMyMatch[2], 10);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                const strMinutes = minutes < 10 ? '0' + minutes : minutes;
                return `${hours.toString().padStart(2, '0')}:${strMinutes} ${ampm}`;
            }

            // Case B: ISO string or parsable date string
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        }

        return val;
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

                // Regenerate Chart.js Data
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



    // ... (rest of methods)

    switchView(view: 'overview' | 'entries') {
        this.currentView = view;
        if (view === 'entries') {
            this.currentPage = 1;
        }
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
