import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    Plus, Search, Pencil, Trash2, Phone, Mail, Building, MapPin,
    Users, Trophy, XCircle, ChevronRight, Eye, Filter, LayoutList,
    Award, Star, TrendingUp, FileText, X
} from 'lucide-react';
import { format } from 'date-fns';
import { onSuppliersChange, addSupplier, updateSupplier, deleteSupplier } from '@/lib/storage';
import { Supplier } from '@/types/supplier';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Supplier Form ────────────────────────────────────────────────────────────
interface SupplierFormData {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
}

const emptyForm = (): SupplierFormData => ({
    name: '', contactPerson: '', email: '', phone: '', address: '',
});

function SupplierForm({
    data, onChange,
}: { data: SupplierFormData; onChange: (d: SupplierFormData) => void }) {
    return (
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Company Name <span className="text-destructive">*</span></Label>
                <Input required value={data.name}
                    onChange={e => onChange({ ...data, name: e.target.value })}
                    placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={data.contactPerson}
                    onChange={e => onChange({ ...data, contactPerson: e.target.value })}
                    placeholder="e.g. John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={data.email}
                        onChange={e => onChange({ ...data, email: e.target.value })}
                        placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={data.phone}
                        onChange={e => onChange({ ...data, phone: e.target.value })}
                        placeholder="+63 ..." />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Address</Label>
                <Input value={data.address}
                    onChange={e => onChange({ ...data, address: e.target.value })}
                    placeholder="Full Address" />
            </div>
        </div>
    );
}

// ─── Procurement Modal for a Supplier ────────────────────────────────────────
function SupplierProcurementsModal({
    supplier,
    procurements,
    open,
    onClose,
}: {
    supplier: Supplier | null;
    procurements: any[];
    open: boolean;
    onClose: () => void;
}) {
    const navigate = useNavigate();
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    if (!supplier) return null;

    const supplierProcs = procurements.filter(p =>
        p.supplier?.trim().toLowerCase() === supplier.name.trim().toLowerCase()
    );

    const divisions = Array.from(new Set(supplierProcs.map(p => p.division || 'N/A').filter(Boolean)));
    const filtered = supplierProcs.filter(p => {
        if (divisionFilter !== 'all' && (p.division || 'N/A') !== divisionFilter) return false;
        if (statusFilter !== 'all' && p.procurementStatus !== statusFilter) return false;
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {supplier.name} — Procurement Records
                    </DialogTitle>
                    <DialogDescription>
                        {supplierProcs.length} total record{supplierProcs.length !== 1 ? 's' : ''} for this supplier
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                        <SelectTrigger className="h-8 text-xs w-40">
                            <SelectValue placeholder="All Divisions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Divisions</SelectItem>
                            {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs w-40">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            {['Completed', 'Processing', 'Failure', 'Cancelled', 'Not yet Acted'].map(s =>
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {(divisionFilter !== 'all' || statusFilter !== 'all') && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setDivisionFilter('all'); setStatusFilter('all'); }}>
                            <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} records</span>
                </div>

                {/* Table */}
                <div className="overflow-y-auto flex-1 border border-border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs">PR Number</TableHead>
                                <TableHead className="text-xs">Project / Description</TableHead>
                                <TableHead className="text-xs">Division</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(p => (
                                <TableRow key={p.id} className="text-xs">
                                    <TableCell className="font-mono font-medium">{p.prNumber}</TableCell>
                                    <TableCell className="max-w-[180px] truncate">{p.projectName || p.description || '—'}</TableCell>
                                    <TableCell>{p.division || '—'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.procurementType || 'Other'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium',
                                            p.procurementStatus === 'Completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                            p.procurementStatus === 'Failure' ? 'bg-red-500/15 text-red-500' :
                                            p.procurementStatus === 'Processing' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                                            'bg-muted text-muted-foreground'
                                        )}>
                                            {p.procurementStatus || 'Not yet Acted'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                                            onClick={() => navigate(`/procurement?tab=records&search=${encodeURIComponent(p.prNumber)}`)}>
                                            <Eye className="h-3 w-3 mr-1" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Suppliers() {
    const { user } = useAuth();
    const { procurements } = useData();
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'leaderboard' | 'table'>('leaderboard');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<SupplierFormData>(emptyForm());

    // Procurement modal state
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [procModalOpen, setProcModalOpen] = useState(false);

    useEffect(() => {
        const unsub = onSuppliersChange(setSuppliers);
        return () => unsub();
    }, []);

    const resetForm = () => { setFormData(emptyForm()); setEditingId(null); };

    const toPayload = (d: SupplierFormData) => ({
        name: d.name,
        contactPerson: d.contactPerson,
        email: d.email,
        phone: d.phone,
        address: d.address,
    });

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addSupplier(toPayload(formData));
            toast.success('Supplier added successfully');
            setIsAddOpen(false);
            resetForm();
        } catch { toast.error('Failed to add supplier'); }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        try {
            await updateSupplier(editingId, toPayload(formData));
            toast.success('Supplier updated successfully');
            setIsEditOpen(false);
            resetForm();
        } catch { toast.error('Failed to update supplier'); }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSupplier(id);
            toast.success('Supplier deleted successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete supplier');
        }
    };

    const openEdit = (s: Supplier) => {
        setEditingId(s.id);
        setFormData({
            name: s.name,
            contactPerson: s.contactPerson || '',
            email: s.email || '',
            phone: s.phone || '',
            address: s.address || '',
        });
        setIsEditOpen(true);
    };

    const getSupplierStats = (supplierName: string) => {
        const supplierProcs = procurements.filter(p =>
            p.supplier?.trim().toLowerCase() === supplierName.trim().toLowerCase()
        );
        const awarded = supplierProcs.filter(p => p.procurementStatus === 'Completed').length;
        const failed = supplierProcs.filter(p => p.procurementStatus === 'Failure').length;
        const inProgress = supplierProcs.filter(p => p.procurementStatus === 'Processing').length;
        const total = supplierProcs.length;
        return { awarded, failed, inProgress, total };
    };

    // Ranked suppliers (all with procurements, sorted by awarded)
    const rankedSuppliers = useMemo(() => {
        return suppliers.map(s => ({
            ...s,
            ...getSupplierStats(s.name),
        })).sort((a, b) => b.awarded - a.awarded);
    }, [suppliers, procurements]);

    const filteredSuppliers = rankedSuppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
    );

    const canEdit = !['viewer', 'archiver'].includes(user?.role || '');

    const RankBadge = ({ rank }: { rank: number }) => {
        if (rank === 1) return <span className="text-lg">🥇</span>;
        if (rank === 2) return <span className="text-lg">🥈</span>;
        if (rank === 3) return <span className="text-lg">🥉</span>;
        return <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{rank}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Suppliers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Leaderboard by awarded procurements · {suppliers.length} total suppliers
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex rounded-md border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('leaderboard')}
                            className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors', viewMode === 'leaderboard' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
                        >
                            <Trophy className="h-3.5 w-3.5" /> Leaderboard
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors', viewMode === 'table' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
                        >
                            <LayoutList className="h-3.5 w-3.5" /> Table
                        </button>
                    </div>

                    {canEdit && (
                        <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-8 gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Supplier
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <form onSubmit={handleAddSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>Add New Supplier</DialogTitle>
                                        <DialogDescription>Enter the details of the new supplier or vendor.</DialogDescription>
                                    </DialogHeader>
                                    <SupplierForm data={formData} onChange={setFormData} />
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                        <Button type="submit">Save Supplier</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search suppliers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                />
            </div>

            {/* ── Leaderboard View ── */}
            {viewMode === 'leaderboard' && (
                <div className="space-y-3">
                    {filteredSuppliers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">No suppliers found</div>
                    ) : filteredSuppliers.map((supplier, idx) => {
                        const overallRank = rankedSuppliers.findIndex(s => s.id === supplier.id) + 1;
                        const topAward = rankedSuppliers[0]?.awarded || 1;
                        const barWidth = topAward > 0 ? (supplier.awarded / topAward) * 100 : 0;

                        return (
                            <div
                                key={supplier.id}
                                className={cn(
                                    'group relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md',
                                    overallRank === 1 && 'border-amber-500/40 bg-amber-500/5',
                                    overallRank === 2 && 'border-slate-400/40 bg-slate-400/5',
                                    overallRank === 3 && 'border-amber-700/40 bg-amber-700/5',
                                )}
                            >
                                {/* Rank bar background */}
                                {supplier.awarded > 0 && (
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-l-xl opacity-10 transition-all duration-500"
                                        style={{
                                            width: `${barWidth}%`,
                                            backgroundColor: overallRank === 1 ? '#F59E0B' : overallRank === 2 ? '#94A3B8' : overallRank === 3 ? '#B45309' : '#10B981'
                                        }}
                                    />
                                )}

                                <div className="relative flex items-center gap-4">
                                    {/* Rank */}
                                    <div className="shrink-0 w-10 flex justify-center">
                                        <RankBadge rank={overallRank} />
                                    </div>

                                    {/* Supplier avatar */}
                                    <div className={cn(
                                        'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
                                        overallRank === 1 ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                                        overallRank === 2 ? 'border-slate-400 bg-slate-400/20 text-slate-600' :
                                        overallRank === 3 ? 'border-amber-700 bg-amber-700/20 text-amber-800 dark:text-amber-200' :
                                        'border-border bg-muted text-muted-foreground'
                                    )}>
                                        {supplier.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-foreground truncate">{supplier.name}</p>
                                            {supplier.awarded > 0 && overallRank <= 3 && (
                                                <Badge className={cn(
                                                    'text-[10px] px-2 py-0',
                                                    overallRank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                                                    overallRank === 2 ? 'bg-slate-400/20 text-slate-600 border-slate-400/30' :
                                                    'bg-amber-700/20 text-amber-800 border-amber-700/30'
                                                )} variant="outline">
                                                    Top {overallRank}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {supplier.contactPerson && (
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Users className="h-3 w-3" />{supplier.contactPerson}
                                                </span>
                                            )}
                                            {supplier.email && (
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{supplier.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{supplier.awarded}</p>
                                            <p className="text-[10px] text-muted-foreground">Awarded</p>
                                        </div>
                                        {supplier.failed > 0 && (
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-red-500">{supplier.failed}</p>
                                                <p className="text-[10px] text-muted-foreground">Failed</p>
                                            </div>
                                        )}
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{supplier.total}</p>
                                            <p className="text-[10px] text-muted-foreground">Total</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs gap-1"
                                                onClick={() => { setSelectedSupplier(supplier as any); setProcModalOpen(true); }}
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Records
                                            </Button>
                                            {canEdit && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(supplier as any)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete <strong>{supplier.name}</strong>?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(supplier.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Table View ── */}
            {viewMode === 'table' && (
                <Card className="border border-border">
                    <CardContent className="p-0">
                        <div className="rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>Supplier / Company</TableHead>
                                        <TableHead>Contact Details</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="text-center">Awarded</TableHead>
                                        <TableHead className="text-center">Failed</TableHead>
                                        <TableHead>Added</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                No suppliers found.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSuppliers.map((supplier, displayIdx) => {
                                        const overallRank = rankedSuppliers.findIndex(s => s.id === supplier.id) + 1;
                                        return (
                                            <TableRow key={supplier.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-center">
                                                    {overallRank <= 3 ? <RankBadge rank={overallRank} /> : <span className="text-xs text-muted-foreground">#{overallRank}</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground flex items-center gap-2">
                                                            <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                                                            {supplier.name}
                                                        </span>
                                                        {supplier.contactPerson && (
                                                            <span className="text-xs text-muted-foreground mt-0.5 pl-6">Attn: {supplier.contactPerson}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        {supplier.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{supplier.email}</span>}
                                                        {supplier.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{supplier.phone}</span>}
                                                        {!supplier.email && !supplier.phone && <span className="italic">No contact</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs max-w-[180px]">
                                                    {supplier.address ? (
                                                        <span className="flex items-start gap-1">
                                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                            <span className="truncate">{supplier.address}</span>
                                                        </span>
                                                    ) : <span className="italic">No address</span>}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${supplier.awarded > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                                        <Trophy className="w-3 h-3" />{supplier.awarded}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${supplier.failed > 0 ? 'bg-red-500/15 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                                                        <XCircle className="w-3 h-3" />{supplier.failed}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {supplier.createdAt ? format(new Date(supplier.createdAt), 'MMM d, yyyy') : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => { setSelectedSupplier(supplier as any); setProcModalOpen(true); }}
                                                        >
                                                            <Eye className="h-3 w-3" /> Records
                                                        </Button>
                                                        {canEdit && (
                                                            <>
                                                                <Button variant="ghost" size="icon" onClick={() => openEdit(supplier as any)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Delete <strong>{supplier.name}</strong>? This cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDelete(supplier.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit Supplier</DialogTitle>
                            <DialogDescription>Update the details of the supplier.</DialogDescription>
                        </DialogHeader>
                        <SupplierForm data={formData} onChange={setFormData} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Procurement Records Modal */}
            <SupplierProcurementsModal
                supplier={selectedSupplier}
                procurements={procurements}
                open={procModalOpen}
                onClose={() => { setProcModalOpen(false); setSelectedSupplier(null); }}
            />
        </div>
    );
}
