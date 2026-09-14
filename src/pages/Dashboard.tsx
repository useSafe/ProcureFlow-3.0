import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { onProcurementsChange, onCabinetsChange, onShelvesChange, onFoldersChange, onBoxesChange, onSuppliersChange } from '@/lib/storage';
import { Procurement, Cabinet, Shelf, Folder, Box } from '@/types/procurement';
import { SVP_PROCESS_STEPS, REGULAR_BIDDING_PROCESS_STEPS } from '@/lib/validation-utils';
import { Supplier } from '@/types/supplier';
import {
    FileText, Archive, Layers, Package, FolderOpen, Clock, TrendingUp,
    Database, Download, AlertCircle, CheckCircle2, BarChart2, Activity,
    Users, Trophy, ChevronRight, ArrowUpRight, ArrowDownRight,
    ShoppingCart, Gavel, Star, XCircle, CalendarDays
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
    PieChart, Pie, Cell, LabelList, LineChart, Line, CartesianGrid, Area, AreaChart, ComposedChart,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    differenceInCalendarDays, format, startOfMonth, endOfMonth,
    eachMonthOfInterval, subMonths, eachWeekOfInterval, subWeeks, startOfWeek, endOfWeek,
} from 'date-fns';
import { cn } from '@/lib/utils';

// ── Color Palettes ────────────────────────────────────────────────────────────
const ACCENT_COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    gray: '#6B7280',
};

const MODE_COLORS: Record<string, string> = {
    'SVP': ACCENT_COLORS.primary,
    'Regular Bidding': ACCENT_COLORS.purple,
    'Attendance Sheets': ACCENT_COLORS.gray,
    'Receipt': ACCENT_COLORS.warning,
    'Others': '#9CA3AF',
};

const STATUS_COLORS: Record<string, string> = {
    'Completed': ACCENT_COLORS.success,
    'Processing': ACCENT_COLORS.primary,
    'Returned PR to EU': ACCENT_COLORS.warning,
    'Not yet Acted': ACCENT_COLORS.gray,
    'Failure': ACCENT_COLORS.danger,
    'Cancelled': '#D1D5DB',
};

const URGENCY_COLORS: Record<string, string> = {
    'Low': '#86EFAC',
    'Medium': ACCENT_COLORS.warning,
    'High': '#F97316',
    'Critical': ACCENT_COLORS.danger,
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover/95 backdrop-blur text-popover-foreground border border-border p-3 rounded-lg shadow-md text-xs min-w-[120px]">
                {label && <p className="font-semibold mb-2">{label}</p>}
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                                <span className="font-medium text-muted-foreground">{entry.name}</span>
                            </div>
                            <span className="font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// ── Mini KPI ─────────────────────────────────────────────────────────────────
const MiniKpi = ({ label, value, delta, color }: { label: string; value: number | string; delta?: number; color: string }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold" style={{ color }}>{value}</span>
            {typeof delta === 'number' && (
                <span className={cn('text-[10px] flex items-center', delta >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(delta)}
                </span>
            )}
        </div>
    </div>
);

// ── Gauge Ring ────────────────────────────────────────────────────────────────
const GaugeRing = ({ value, max, color, label }: { value: number; max: number; color: string; label: string }) => {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const r = 28;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                <circle
                    cx="36" cy="36" r={r} fill="none"
                    stroke={color} strokeWidth="5"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
            </svg>
            <div className="text-center -mt-12">
                <p className="text-sm font-bold text-foreground">{value}</p>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-8">{label}</p>
        </div>
    );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('all');

    useEffect(() => {
        const unsubs = [
            onProcurementsChange(setProcurements),
            onCabinetsChange(setCabinets),
            onShelvesChange(setShelves),
            onFoldersChange(setFolders),
            onBoxesChange(setBoxes),
            onSuppliersChange(setSuppliers),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    const extractPrYear = (prNumber: string): string | null => {
        const newMatch = prNumber.match(/^(\d{4})-/);
        if (newMatch) return newMatch[1];
        const oldMatch = prNumber.match(/^[A-Za-z]+-[A-Za-z]+-([0-9]{2,4})-/);
        if (oldMatch) {
            const yr = oldMatch[1];
            if (yr.length === 2) return (2000 + parseInt(yr)).toString();
            return yr;
        }
        return null;
    };

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        procurements.forEach(p => {
            const yr = extractPrYear(p.prNumber);
            if (yr) years.add(yr);
            else if (p.createdAt) {
                try { years.add(new Date(p.createdAt).getFullYear().toString()); } catch { }
            }
        });
        return Array.from(years).sort().reverse();
    }, [procurements]);

    const filteredProcurements = useMemo(() => {
        if (selectedYear === 'all') return procurements;
        return procurements.filter(p => {
            const yr = extractPrYear(p.prNumber);
            if (yr) return yr === selectedYear;
            if (p.createdAt) return new Date(p.createdAt).getFullYear().toString() === selectedYear;
            return false;
        });
    }, [selectedYear, procurements]);

    // ── KPIs ─────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const total = filteredProcurements.length;
        const completed = filteredProcurements.filter(p => p.procurementStatus === 'Completed').length;
        const inProgress = filteredProcurements.filter(p => p.procurementStatus === 'Processing').length;
        const borrowed = filteredProcurements.filter(p => p.status === 'active').length;
        const urgent = filteredProcurements.filter(p => {
            if (p.urgencyLevel === 'Done') return false;
            if (p.urgencyLevel === 'High' || p.urgencyLevel === 'Low') return true;
            return false;
        }).length;
        const totalAbc = filteredProcurements.reduce((sum, p) => sum + (p.abc || 0), 0);
        const cancelled = filteredProcurements.filter(p => p.procurementStatus === 'Cancelled').length;
        const notActed = filteredProcurements.filter(p => !p.procurementStatus || p.procurementStatus === 'Not yet Acted').length;
        const svp = filteredProcurements.filter(p => p.procurementType === 'SVP').length;
        const bidding = filteredProcurements.filter(p => p.procurementType === 'Regular Bidding').length;
        const otherDocuments = filteredProcurements.filter(p => p.procurementType === 'Other Documents').length;
        const withSuppliers = filteredProcurements.filter(p => p.supplier && p.supplier.trim() !== '').length;
        return { total, completed, inProgress, borrowed, urgent, totalAbc, cancelled, notActed, otherDocuments, svp, bidding, withSuppliers };
    }, [filteredProcurements]);

    const monthlyTrend = useMemo(() => {
        const targetDate = selectedYear === 'all' ? new Date() : new Date(parseInt(selectedYear), 11, 31);
        const weeks = eachWeekOfInterval({ start: subWeeks(targetDate, 23), end: targetDate });
        
        return weeks.map(w => {
            const weekStart = startOfWeek(w);
            const weekEnd = endOfWeek(w);
            return {
                month: format(weekStart, 'MMM d'), // "month" key kept for chart dataKey compatibility
                'Other Documents': filteredProcurements.filter(p => {
                    const d = p.dateAdded ? new Date(p.dateAdded) : (p.createdAt ? new Date(p.createdAt) : null);
                    if (!d) return false;
                    return d >= weekStart && d <= weekEnd && p.procurementType === 'Other Documents';
                }).length,
                SVP: filteredProcurements.filter(p => {
                    if (!p.createdAt) return false;
                    const d = new Date(p.createdAt);
                    return d >= weekStart && d <= weekEnd && p.procurementType === 'SVP';
                }).length,
                'Regular Bidding': filteredProcurements.filter(p => {
                    if (!p.createdAt) return false;
                    const d = new Date(p.createdAt);
                    return d >= weekStart && d <= weekEnd && p.procurementType === 'Regular Bidding';
                }).length,
                Total: filteredProcurements.filter(p => {
                    if (!p.createdAt) return false;
                    const d = new Date(p.createdAt);
                    return d >= weekStart && d <= weekEnd;
                }).length,
            };
        });
    }, [filteredProcurements, selectedYear]);

    // ── Status data ───────────────────────────────────────────────────────
    const statusData = useMemo(() => {
        const statuses = ['Completed', 'Processing', 'Returned PR to EU', 'Not yet Acted', 'Failure', 'Cancelled'];
        return statuses.map(s => ({
            name: s === 'Returned PR to EU' ? 'Returned' : s,
            value: filteredProcurements.filter(p =>
                s === 'Not yet Acted'
                    ? (!p.procurementStatus || p.procurementStatus === 'Not yet Acted')
                    : p.procurementStatus === s
            ).length,
            fill: STATUS_COLORS[s],
        })).filter(d => d.value > 0);
    }, [filteredProcurements]);

    // ── Type distribution ─────────────────────────────────────────────────
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredProcurements.forEach(p => {
            const type = p.procurementType || 'Unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, fill: MODE_COLORS[name] || '#9CA3AF' }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredProcurements]);

    // ── Urgency data ──────────────────────────────────────────────────────
    const urgencyData = useMemo(() => (
        ['Low', 'High'].map(u => ({
            name: u,
            value: filteredProcurements.filter(p => p.urgencyLevel === u).length,
            fill: URGENCY_COLORS[u],
        })).filter(d => d.value > 0)
    ), [filteredProcurements]);

    // ── Progress monitoring data ───────────────────────────────────────────
    const progressData = useMemo(() => ([
        { name: 'Completed', value: kpis.completed, color: ACCENT_COLORS.success },
        { name: 'Processing', value: kpis.inProgress, color: ACCENT_COLORS.primary },
        { name: 'Not Acted', value: kpis.notActed, color: ACCENT_COLORS.gray },
        { name: 'Cancelled', value: kpis.cancelled, color: ACCENT_COLORS.danger },
    ]).filter(d => d.value > 0), [kpis]);

    // ── Process Steps Monitoring (SVP & Regular) ───────────────────────────
    const processStepsData = useMemo(() => {
        const svpFilter = filteredProcurements.filter(p => p.procurementType === 'SVP');
        const regFilter = filteredProcurements.filter(p => p.procurementType === 'Regular Bidding');

        const svpSteps = SVP_PROCESS_STEPS.map(step => ({
            name: step.label,
            value: svpFilter.filter(p => !!p[step.key as keyof Procurement]).length,
            total: svpFilter.length
        }));

        const regSteps = REGULAR_BIDDING_PROCESS_STEPS.map(step => ({
            name: step.label,
            value: regFilter.filter(p => !!p[step.key as keyof Procurement]).length,
            total: regFilter.length
        }));

        return { svpSteps, regSteps };
    }, [filteredProcurements]);

    const [selectedStepMode, setSelectedStepMode] = useState<'SVP' | 'Regular Bidding'>('SVP');
    const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

    // ── Supplier Leaderboard ──────────────────────────────────────────────
    const supplierLeaderboard = useMemo(() => {
        return suppliers.map(s => ({
            ...s,
            awarded: filteredProcurements.filter(p =>
                p.supplier?.trim().toLowerCase() === s.name.trim().toLowerCase() &&
                p.procurementStatus === 'Completed'
            ).length,
            failed: filteredProcurements.filter(p =>
                p.supplier?.trim().toLowerCase() === s.name.trim().toLowerCase() &&
                p.procurementStatus === 'Failure'
            ).length,
        }))
            .filter(s => s.awarded > 0 || s.failed > 0)
            .sort((a, b) => b.awarded - a.awarded)
            .slice(0, 5);
    }, [suppliers, filteredProcurements]);

    // ── Recent & Urgent ───────────────────────────────────────────────────
    const recentActivity = useMemo(() => [...filteredProcurements]
        .sort((a, b) => new Date(b.createdAt || b.dateAdded).getTime() - new Date(a.createdAt || a.dateAdded).getTime())
        .slice(0, 6), [filteredProcurements]);

    const urgentRecords = useMemo(() => filteredProcurements
        .filter(p => 
            (p.urgencyLevel === 'High' || p.urgencyLevel === 'Low') &&
            p.procurementStatus !== 'Completed' && p.urgencyLevel !== 'Done'
        )
        .sort((a, b) => {
            if (a.urgencyLevel !== b.urgencyLevel) return a.urgencyLevel === 'High' ? -1 : 1;
            if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        })
        .slice(0, 5), [filteredProcurements]);

    const getDaysLeft = (deadline?: string) => {
        if (!deadline) return null;
        try {
            const days = differenceInCalendarDays(new Date(deadline), new Date());
            if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-500' };
            if (days === 0) return { label: 'Due today', color: 'text-red-500 font-bold' };
            if (days <= 3) return { label: `${days}d left`, color: 'text-orange-500' };
            if (days <= 7) return { label: `${days}d left`, color: 'text-amber-500' };
            return { label: `${days}d left`, color: 'text-muted-foreground' };
        } catch { return null; }
    };

    const formatCurrency = (val: number) => {
        if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `₱${(val / 1_000).toFixed(0)}K`;
        return `₱${val.toLocaleString()}`;
    };

    const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

    // ── KPI Card ──────────────────────────────────────────────────────────
    const KpiCard = ({ title, value, icon: Icon, sub, color, onClick }: {
        title: string; value: string | number; icon: any; sub?: string; color?: string; onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left w-full transition-all duration-200',
                onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'
            )}
        >
            {/* Accent bar */}
            <div className="absolute top-0 left-0 h-0.5 w-full" style={{ background: color || '#6B7280' }} />
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1.5 leading-none">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
                </div>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color || '#6B7280'}20` }}>
                    <Icon className="h-4.5 w-4.5" style={{ color: color || '#6B7280' }} />
                </div>
            </div>
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in-up pb-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Analytics overview{selectedYear !== 'all' && ` · ${selectedYear}`} · {format(new Date(), 'MMMM d, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={async () => {
                            const el = document.getElementById('dashboard-print');
                            if (!el) return;
                            try {
                                const canvas = await html2canvas(el as HTMLElement, { scale: 1.5, backgroundColor: '#fff' });
                                const pdf = new jsPDF('l', 'mm', 'a3');
                                const pw = pdf.internal.pageSize.getWidth();
                                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, (canvas.height * pw) / canvas.width);
                                pdf.save(`dashboard-${selectedYear}.pdf`);
                                toast.success('Dashboard exported');
                            } catch { toast.error('Export failed'); }
                        }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export PDF
                    </Button>
                </div>
            </div>

            <div id="dashboard-print" className="space-y-6">
                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <KpiCard title="Total Records" value={kpis.total} icon={Database} color={ACCENT_COLORS.primary} onClick={() => navigate('/procurement?tab=records')} />
                    <KpiCard title="With Suppliers" value={kpis.withSuppliers} icon={Users} color={ACCENT_COLORS.warning} onClick={() => navigate('/suppliers')} />
                    <KpiCard title="Completed" value={kpis.completed} icon={CheckCircle2} color={ACCENT_COLORS.success} sub={`${completionRate}% rate`} onClick={() => navigate('/procurement?tab=records&processStatus=Completed')} />
                    <KpiCard title="Processing" value={kpis.inProgress} icon={Activity} color={ACCENT_COLORS.cyan} onClick={() => navigate('/procurement?tab=records&processStatus=Processing')} />
                    <KpiCard title="Other Docs" value={kpis.otherDocuments} icon={FileText} color={ACCENT_COLORS.cyan} onClick={() => navigate('/procurement?tab=records&type=Other Documents')} />
                    <KpiCard title="SVP" value={kpis.svp} icon={FileText} color={ACCENT_COLORS.primary} onClick={() => navigate('/procurement?tab=records&type=SVP')} />
                    <KpiCard title="Regular Bidding" value={kpis.bidding} icon={Gavel} color={ACCENT_COLORS.purple} onClick={() => navigate('/procurement?tab=records&type=Regular Bidding')} />
                </div>

                {/* ── Row 2: Storage summary + ABC + Urgency ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Drawers', val: cabinets.length, icon: Layers, color: ACCENT_COLORS.primary },
                        { label: 'Cabinets', val: shelves.length, icon: Archive, color: ACCENT_COLORS.purple },
                        { label: 'Folders', val: folders.length, icon: FolderOpen, color: ACCENT_COLORS.warning },
                        { label: 'Boxes', val: boxes.length, icon: Package, color: ACCENT_COLORS.danger },
                        { label: 'Urgent/Due', val: kpis.urgent, icon: AlertCircle, color: ACCENT_COLORS.danger },
                    ].map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}20` }}>
                                    <Icon className="h-4 w-4" style={{ color: s.color }} />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground leading-none">{s.val}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Charts Row 1: Monthly Trends per Mode ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Monthly Trends — main chart */}
                    <Card className="lg:col-span-2 border border-border">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Weekly Trends per Mode of Procurement (6 Months)
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {[
                                        { key: 'Other Documents', color: ACCENT_COLORS.cyan },
                                        { key: 'SVP', color: ACCENT_COLORS.primary },
                                        { key: 'Regular Bidding', color: ACCENT_COLORS.purple },
                                    ].map(l => (
                                        <div key={l.key} className="flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                                            <span className="text-[10px] text-muted-foreground">{l.key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="Other Documents" fill={ACCENT_COLORS.cyan} radius={[3, 3, 0, 0]} barSize={10}>
                                            <LabelList dataKey="Other Documents" position="top" fill="hsl(var(--muted-foreground))" fontSize={9} fontWeight="500" />
                                        </Bar>
                                        <Bar dataKey="SVP" fill={ACCENT_COLORS.primary} radius={[3, 3, 0, 0]} barSize={10}>
                                            <LabelList dataKey="SVP" position="top" fill="hsl(var(--muted-foreground))" fontSize={9} fontWeight="500" />
                                        </Bar>
                                        <Bar dataKey="Regular Bidding" fill={ACCENT_COLORS.purple} radius={[3, 3, 0, 0]} barSize={10}>
                                            <LabelList dataKey="Regular Bidding" position="top" fill="hsl(var(--muted-foreground))" fontSize={9} fontWeight="500" />
                                        </Bar>
                                        <Line type="monotone" dataKey="Total" stroke={ACCENT_COLORS.danger} strokeWidth={1.5} dot={{ r: 3, fill: ACCENT_COLORS.danger }} activeDot={{ r: 5 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Type Distribution Pie */}
                    <Card className="border border-border">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                Type Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="h-[280px]">
                                {typeData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                            <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={82} paddingAngle={2} dataKey="value" stroke="none">
                                                {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                                <LabelList dataKey="value" position="inside" fill="#fff" stroke="none" fontSize={11} fontWeight="700" />
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '16px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Charts Row 2: Progress + Process + Calendar ── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {/* Process Status */}
                    <Card className="border border-border">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                                Process Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="h-[320px]">
                                {statusData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} hide />
                                            <YAxis type="category" dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={85} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.5)' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={100}>
                                                {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                                <LabelList dataKey="value" position="right" fill="hsl(var(--foreground))" fontSize={11} fontWeight="600" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Monitoring By Process Steps */}
                    <Card className="border border-border xl:col-span-1">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                    Progress Monitoring (Steps)
                                </CardTitle>
                                <Select value={selectedStepMode} onValueChange={(val: any) => setSelectedStepMode(val)}>
                                    <SelectTrigger className="h-7 w-28 text-[10px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SVP" className="text-[10px]">SVP Process</SelectItem>
                                        <SelectItem value="Regular Bidding" className="text-[10px]">Regular Bidding</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-3 pt-2">
                                    {(selectedStepMode === 'SVP' ? processStepsData.svpSteps : processStepsData.regSteps).map((step, idx) => {
                                        const pct = step.total > 0 ? (step.value / step.total) * 100 : 0;
                                        return (
                                            <div key={idx}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground text-[10px] sm:text-xs truncate max-w-[180px]">{step.name}</span>
                                                    <span className="font-semibold text-foreground text-[10px] sm:text-xs">{step.value} / {step.total}</span>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${pct}%`, backgroundColor: selectedStepMode === 'SVP' ? ACCENT_COLORS.primary : ACCENT_COLORS.purple }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Calendar Inline */}
                    <Card className="border border-border">
                        <CardHeader className="pb-0 pt-4 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                    Deadlines Calendar
                                </CardTitle>
                                {/* Legend */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="h-3 w-3 rounded bg-red-500" />
                                        <span className="text-[10px] text-muted-foreground">High</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="h-3 w-3 rounded bg-blue-500" />
                                        <span className="text-[10px] text-muted-foreground">Low</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4 flex flex-col justify-center items-center min-h-[280px]">
                            <div className="w-full max-w-full">
                                <Calendar
                                    mode="single"
                                    selected={calendarDate}
                                    onSelect={setCalendarDate}
                                    className="w-full rounded-md border bg-card/40 p-2 sm:p-3"
                                    classNames={{
                                        months: "flex flex-col w-full space-y-4",
                                        month: "space-y-4 w-full flex flex-col",
                                        table: "w-full border-collapse space-y-1",
                                        head_row: "flex w-full justify-between",
                                        head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] text-center",
                                        row: "flex w-full mt-2 justify-between gap-1",
                                        cell: "text-center text-sm p-0 relative w-full flex items-center justify-center [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: "h-8 w-full sm:h-9 max-w-[40px] mx-auto p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center transition-colors",
                                    }}
                                    components={{
                                        DayContent: (props) => {
                                            const date = props.date;
                                            const dayRecords = procurements.filter(r => {
                                                if (!r.deadline || r.urgencyLevel === 'Done') return false;
                                                if (r.urgencyLevel !== 'High' && r.urgencyLevel !== 'Low') return false;
                                                
                                                try {
                                                    const [y, m, d] = r.deadline.split('-').map(Number);
                                                    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
                                                } catch {
                                                    return false;
                                                }
                                            });

                                            if (dayRecords.length > 0) {
                                                const hasHigh = dayRecords.some(r => r.urgencyLevel === 'High');
                                                const bgColor = hasHigh ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600';
                                                const textColor = 'text-white'; // Both red and blue need white text
                                                
                                                return (
                                                    <HoverCard openDelay={200} closeDelay={100}>
                                                        <HoverCardTrigger asChild>
                                                            <div className={cn("w-full h-full flex flex-col items-center justify-center rounded-md font-bold cursor-pointer transition-colors leading-tight py-0.5", bgColor, textColor)}>
                                                                <span className="text-sm">{date.getDate()}</span>
                                                                <span className="text-[8px] font-medium opacity-90 mt-0.5">{dayRecords.length} {dayRecords.length === 1 ? 'doc' : 'docs'}</span>
                                                            </div>
                                                        </HoverCardTrigger>
                                                        <HoverCardContent side="top" className="w-auto max-w-[280px] p-3 shadow-xl z-[100]" onClick={(e) => e.stopPropagation()}>
                                                            <div className="space-y-2.5">
                                                                <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 mb-1.5 border-b border-border pb-1">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    {dayRecords.length === 1 ? '1 Deadline' : `${dayRecords.length} Deadlines`}
                                                                </p>
                                                                {dayRecords.map(r => (
                                                                    <div key={r.id} className="text-xs space-y-1 relative pb-2 mb-2 last:mb-0 last:pb-0 border-b border-border/40 last:border-0 text-left">
                                                                        <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">{r.prNumber}</p>
                                                                        <p className="text-muted-foreground line-clamp-2 leading-snug">{r.projectName || r.description}</p>
                                                                        <div className="flex justify-between items-end gap-2 !mt-1.5">
                                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-muted/50 truncate max-w-[140px]">{r.division || 'No Division'}</Badge>
                                                                            <span className="font-bold text-foreground bg-primary/10 text-primary px-1.5 py-0 rounded text-[9px] shrink-0">₱{r.abc?.toLocaleString() || '0'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                );
                                            }
                                            return <>{date.getDate()}</>;
                                        }
                                    }}
                                    modifiers={{
                                        hasDeadline: (date) => filteredProcurements.some(r => 
                                            r.deadline && 
                                            new Date(r.deadline).toDateString() === date.toDateString() &&
                                            (r.urgencyLevel === 'High' || r.urgencyLevel === 'Low') &&
                                            r.procurementStatus !== 'Completed' && r.urgencyLevel !== 'Done'
                                        )
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Row 4: Urgency + Bottom Row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Urgency Levels */}
                    <Card className="border border-border col-span-1">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                Urgency Levels
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="space-y-3 py-2">
                                {urgencyData.length === 0 ? (
                                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">No data</div>
                                ) : urgencyData.map(u => (
                                    <div key={u.name}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground font-medium">{u.name}</span>
                                            <span className="font-semibold text-foreground">{u.value}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${kpis.total ? (u.value / kpis.total) * 100 : 0}%`,
                                                    backgroundColor: u.fill
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* ABC Total */}
                            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total ABC Value</p>
                                <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.totalAbc)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bottom Row within the rest of grid columns */}
                    <div className="col-span-1 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Recent Records */}
                        <Card className="border border-border">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                        Recent Records
                                    </span>
                                    <button
                                        onClick={() => navigate('/procurement?tab=records')}
                                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                    >
                                        View all <ChevronRight className="h-3 w-3" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-1">
                                {recentActivity.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">No records</p>
                                ) : recentActivity.map(p => (
                                    <div key={p.id} className="flex items-start gap-2.5 py-1.5 border-b border-border last:border-0">
                                        <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                            style={{ backgroundColor: `${MODE_COLORS[p.procurementType || 'Others']}20` }}>
                                            <FileText className="h-3 w-3" style={{ color: MODE_COLORS[p.procurementType || 'Others'] }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-foreground truncate">{p.prNumber}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{p.projectName || p.description}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                                            {p.procurementType?.split(' ')[0] || 'Other'}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Urgent Records */}
                        <Card className="border border-border">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                        Urgent Records
                                    </span>
                                    <button
                                        onClick={() => navigate('/urgent-records')}
                                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                    >
                                        View all <ChevronRight className="h-3 w-3" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-1">
                                {urgentRecords.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-1 text-muted-foreground/40">
                                        <CheckCircle2 className="h-6 w-6" />
                                        <p className="text-xs">No urgent records</p>
                                    </div>
                                ) : urgentRecords.map(p => {
                                    const dl = getDaysLeft(p.deadline);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => navigate(`/procurement?tab=records&search=${encodeURIComponent(p.prNumber)}`)}
                                            className="w-full flex items-start gap-2.5 py-2 px-2 border-b border-border last:border-0 hover:bg-muted/50 rounded-md transition-colors text-left"
                                        >
                                            <div className={cn(
                                                'h-1.5 w-1.5 rounded-full mt-2 shrink-0',
                                                p.urgencyLevel === 'High' ? 'bg-red-500' : 'bg-yellow-500'
                                            )} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-foreground truncate">{p.prNumber}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{p.projectName || p.description || '—'}</p>
                                            </div>
                                            {dl && <span className={cn('text-[10px] shrink-0', dl.color)}>{dl.label}</span>}
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Supplier Leaderboard */}
                        <Card className="border border-border">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                        Supplier Leaders
                                    </span>
                                    <button
                                        onClick={() => navigate('/suppliers')}
                                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                                    >
                                        View all <ChevronRight className="h-3 w-3" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-2">
                                {supplierLeaderboard.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">No awarded suppliers yet</p>
                                ) : supplierLeaderboard.map((s, i) => (
                                    <div key={s.id} className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-0">
                                        <span className={cn(
                                            'text-xs font-bold w-5 text-center shrink-0',
                                            i === 0 ? 'text-amber-500' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'
                                        )}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                    <Trophy className="h-2.5 w-2.5" />{s.awarded}
                                                </span>
                                                {s.failed > 0 && (
                                                    <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                                                        <XCircle className="h-2.5 w-2.5" />{s.failed}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden shrink-0">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${(s.awarded / (supplierLeaderboard[0]?.awarded || 1)) * 100}%`,
                                                    backgroundColor: ACCENT_COLORS.success
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;