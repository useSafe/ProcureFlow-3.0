import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, FileArchive, Eye, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { ref, push, set, update, remove, onValue } from 'firebase/database';

// ── Types ──────────────────────────────────────────────────────────────────
export interface OtherDocument {
    id: string;
    prNumber?: string; // Optional PR Number — auto-generated if blank
    title: string;
    documentType: string;
    registrationNumber?: string;
    issuingAuthority?: string;
    issueDate?: string;
    expiryDate?: string;
    description?: string;
    tags?: string[];
    createdAt: string;
    createdBy: string;
}

const DOCUMENT_TYPES = [
    'Registration Certificate',
    'License',
    'Permit',
    'Memorandum of Agreement',
    'Contract',
    'Certificate of Compliance',
    'Accreditation',
    'PhilGEPS Registration',
    'Tax Clearance',
    'Business Permit',
    'Other',
];

const ITEMS_PER_PAGE = 10;

// ── Firebase helpers ───────────────────────────────────────────────────────
const useOtherDocuments = () => {
    const [docs, setDocs] = React.useState<OtherDocument[]>([]);
    React.useEffect(() => {
        const r = ref(db, 'otherDocuments');
        const unsub = onValue(r, snap => {
            if (!snap.exists()) { setDocs([]); return; }
            const data = snap.val();
            const arr = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
            setDocs(arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
        return () => unsub();
    }, []);
    return docs;
};

const addOtherDocument = async (data: Omit<OtherDocument, 'id'>) => {
    const r = ref(db, 'otherDocuments');
    const newRef = push(r);
    await set(newRef, data);
};

const updateOtherDocument = async (id: string, data: Partial<OtherDocument>) => {
    await update(ref(db, `otherDocuments/${id}`), data);
};

const deleteOtherDocument = async (id: string) => {
    await remove(ref(db, `otherDocuments/${id}`));
};

// ── Form ─────────────────────────────────────────────────────────────────────
interface FormData {
    prNumber: string;
    title: string;
    documentType: string;
    registrationNumber: string;
    issuingAuthority: string;
    issueDate: string;
    expiryDate: string;
    description: string;
    tags: string;
}

const emptyForm = (): FormData => ({
    prNumber: '', title: '', documentType: '', registrationNumber: '', issuingAuthority: '',
    issueDate: '', expiryDate: '', description: '', tags: '',
});

const generatePrNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `OD-${year}-${month}-${rand}`;
};

// ── Main Component ────────────────────────────────────────────────────────────
const OtherDocuments: React.FC = () => {
    const { user } = useAuth();
    const docs = useOtherDocuments();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewDoc, setViewDoc] = useState<OtherDocument | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm());
    const [currentPage, setCurrentPage] = useState(1);

    const canEdit = !['viewer'].includes(user?.role || '');

    const filteredDocs = useMemo(() => docs.filter(d => {
        const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
            (d.prNumber && d.prNumber.toLowerCase().includes(search.toLowerCase())) ||
            (d.registrationNumber && d.registrationNumber.toLowerCase().includes(search.toLowerCase())) ||
            (d.issuingAuthority && d.issuingAuthority.toLowerCase().includes(search.toLowerCase()));
        const matchType = typeFilter === 'all' || d.documentType === typeFilter;
        return matchSearch && matchType;
    }), [docs, search, typeFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredDocs.length / ITEMS_PER_PAGE));
    const paginated = filteredDocs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    React.useEffect(() => setCurrentPage(1), [search, typeFilter]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.documentType) {
            toast.error('Title and Document Type are required');
            return;
        }
        try {
            await addOtherDocument({
                prNumber: formData.prNumber.trim() || generatePrNumber(),
                title: formData.title,
                documentType: formData.documentType,
                registrationNumber: formData.registrationNumber || undefined,
                issuingAuthority: formData.issuingAuthority || undefined,
                issueDate: formData.issueDate || undefined,
                expiryDate: formData.expiryDate || undefined,
                description: formData.description || undefined,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                createdAt: new Date().toISOString(),
                createdBy: user?.name || 'Unknown',
            });
            toast.success('Document added successfully');
            setIsAddOpen(false);
            setFormData(emptyForm());
        } catch { toast.error('Failed to add document'); }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        try {
            await updateOtherDocument(editingId, {
                prNumber: formData.prNumber.trim() || undefined,
                title: formData.title,
                documentType: formData.documentType,
                registrationNumber: formData.registrationNumber || undefined,
                issuingAuthority: formData.issuingAuthority || undefined,
                issueDate: formData.issueDate || undefined,
                expiryDate: formData.expiryDate || undefined,
                description: formData.description || undefined,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            });
            toast.success('Document updated');
            setIsEditOpen(false);
            setEditingId(null);
        } catch { toast.error('Failed to update document'); }
    };

    const openEdit = (doc: OtherDocument) => {
        setEditingId(doc.id);
        setFormData({
            prNumber: doc.prNumber || '',
            title: doc.title,
            documentType: doc.documentType,
            registrationNumber: doc.registrationNumber || '',
            issuingAuthority: doc.issuingAuthority || '',
            issueDate: doc.issueDate || '',
            expiryDate: doc.expiryDate || '',
            description: doc.description || '',
            tags: doc.tags?.join(', ') || '',
        });
        setIsEditOpen(true);
    };

    const isExpired = (expiryDate?: string) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    const isExpiringSoon = (expiryDate?: string) => {
        if (!expiryDate) return false;
        const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
    };

    const DocumentForm = () => (
        <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                {/* PR Number — optional, auto-generated */}
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">
                        PR Number
                        <span className="text-muted-foreground text-xs ml-2">(optional — auto-generated if blank)</span>
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            value={formData.prNumber}
                            onChange={e => setFormData({ ...formData, prNumber: e.target.value })}
                            placeholder="e.g. OD-2025-01-1234 (leave blank to auto-generate)"
                            className="font-mono text-xs"
                        />
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, prNumber: generatePrNumber() })}
                            className="px-3 py-2 rounded-md border border-border bg-muted text-xs text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                        >
                            Generate
                        </button>
                    </div>
                </div>
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">Title <span className="text-destructive">*</span></Label>
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Document title" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Document Type <span className="text-destructive">*</span></Label>
                    <Select value={formData.documentType} onValueChange={v => setFormData({ ...formData, documentType: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                            {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Registration / Certificate No.</Label>
                    <Input value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} placeholder="e.g. REG-2024-001" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Issuing Authority</Label>
                    <Input value={formData.issuingAuthority} onChange={e => setFormData({ ...formData, issuingAuthority: e.target.value })} placeholder="e.g. DTI, SEC, BIR" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Issue Date</Label>
                    <Input type="date" value={formData.issueDate} onChange={e => setFormData({ ...formData, issueDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Expiry Date</Label>
                    <Input type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                    <Input value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g. annual, legal, government" />
                </div>
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">Description / Notes</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Additional notes..." />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters + header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileArchive className="h-5 w-5 text-muted-foreground" />
                        Other Documents & Registrations
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage entity registrations, licenses, permits and other official documents.</p>
                </div>
                {canEdit && (
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setFormData(emptyForm()); setIsAddOpen(true); }}>
                        <Plus className="h-3.5 w-3.5" /> Add Document
                    </Button>
                )}
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[260px] h-8 text-sm" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground self-center ml-auto">{filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}</span>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                            <TableHead>PR Number</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Reg. Number</TableHead>
                                <TableHead>Issuing Authority</TableHead>
                                <TableHead>Issue Date</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-sm">
                                        No documents found. Add your first document above.
                                    </TableCell>
                                </TableRow>
                            ) : paginated.map(doc => (
                                <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-mono text-xs text-muted-foreground">{doc.prNumber || '—'}</TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm text-foreground">{doc.title}</p>
                                        {doc.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.description}</p>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.documentType}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{doc.registrationNumber || '—'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{doc.issuingAuthority || '—'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {doc.issueDate ? format(new Date(doc.issueDate), 'MMM d, yyyy') : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {doc.expiryDate ? (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpired(doc.expiryDate) ? 'bg-red-500/15 text-red-500' : isExpiringSoon(doc.expiryDate) ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                                {isExpired(doc.expiryDate) ? '⚠ Expired' : isExpiringSoon(doc.expiryDate) ? '⚡ Soon' : format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                                            </span>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(doc.tags || []).slice(0, 2).map(t => (
                                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                                            ))}
                                            {(doc.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{doc.tags!.length - 2}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewDoc(doc); setIsViewOpen(true); }}>
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            {canEdit && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(doc)}>
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
                                                                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                                                <AlertDialogDescription>Delete <strong>{doc.title}</strong>? This cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteOtherDocument(doc.id).then(() => toast.success('Document deleted'))} className="bg-destructive">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredDocs.length)} of {filteredDocs.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleAdd}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><FileArchive className="h-4 w-4" /> Add Document / Registration</DialogTitle>
                            <DialogDescription>Add a new entity document, registration, license, or permit.</DialogDescription>
                        </DialogHeader>
                        <DocumentForm />
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Document</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Edit Document</DialogTitle>
                        </DialogHeader>
                        <DocumentForm />
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                {viewDoc && (
                    <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileArchive className="h-4 w-4" />
                                {viewDoc.title}
                            </DialogTitle>
                            <Badge variant="outline" className="w-fit text-xs">{viewDoc.documentType}</Badge>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            {[
                                { label: 'PR Number', value: viewDoc.prNumber },
                                { label: 'Registration No.', value: viewDoc.registrationNumber },
                                { label: 'Issuing Authority', value: viewDoc.issuingAuthority },
                                { label: 'Issue Date', value: viewDoc.issueDate ? format(new Date(viewDoc.issueDate), 'MMMM d, yyyy') : undefined },
                                { label: 'Expiry Date', value: viewDoc.expiryDate ? format(new Date(viewDoc.expiryDate), 'MMMM d, yyyy') : undefined },
                                { label: 'Added by', value: viewDoc.createdBy },
                                { label: 'Added on', value: format(new Date(viewDoc.createdAt), 'MMMM d, yyyy') },
                            ].map(row => row.value ? (
                                <div key={row.label} className="flex justify-between text-sm border-b border-border pb-2 last:border-0">
                                    <span className="text-muted-foreground">{row.label}</span>
                                    <span className="font-medium text-foreground">{row.value}</span>
                                </div>
                            ) : null)}
                            {viewDoc.description && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                    <p className="text-sm text-foreground bg-muted/50 rounded-md p-2">{viewDoc.description}</p>
                                </div>
                            )}
                            {viewDoc.tags && viewDoc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {viewDoc.tags.map(t => (
                                        <span key={t} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground flex items-center gap-1">
                                            <Tag className="h-2.5 w-2.5" />{t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};

export default OtherDocuments;
