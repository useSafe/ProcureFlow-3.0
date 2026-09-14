import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteProcurement, updateProcurement, addProcurement, onProcurementsChange, onCabinetsChange, onShelvesChange, onFoldersChange, onDivisionsChange, onBoxesChange, recalculateAllFolders, onSuppliersChange } from '@/lib/storage';
import { Procurement, Cabinet, Shelf, Folder, Box, ProcurementStatus, UrgencyLevel, ProcurementFilters, Division } from '@/types/procurement';
import { Supplier } from '@/types/supplier';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import ProcurementDetailsDialog from '@/components/procurement/ProcurementDetailsDialog';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import { handleNumberInput, getDisplayValue, removeCommas } from '@/lib/number-utils';
import {
    Plus,
    Search,
    MoreVertical,
    FileText,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    MapPin,
    FilterX,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Eye,
    Activity,
    Calendar as CalendarIcon,
    Package,
    Loader2,
    Info,
    Upload,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProcurementProcessStatus, ProcurementType } from '@/types/core';

const MONTHS = [
    { value: 'JAN', label: 'Jan' },
    { value: 'FEB', label: 'Feb' },
    { value: 'MAR', label: 'Mar' },
    { value: 'APR', label: 'Apr' },
    { value: 'MAY', label: 'May' },
    { value: 'JUN', label: 'Jun' },
    { value: 'JUL', label: 'Jul' },
    { value: 'AUG', label: 'Aug' },
    { value: 'SEP', label: 'Sep' },
    { value: 'OCT', label: 'Oct' },
    { value: 'NOV', label: 'Nov' },
    { value: 'DEC', label: 'Dec' },
];

const checklistItems = CHECKLIST_ITEMS;

const MonitoringDateField = ({ label, value, onChange, disabled, activeColor = 'blue' }: { label: string; value: string | undefined; onChange: (date: string | undefined) => void; disabled: boolean; activeColor?: 'blue' | 'purple' | 'emerald' | 'amber' }) => {
    const activeClasses = {
        blue: { border: 'border-blue-500/30', bg: 'bg-blue-900/10', text: 'text-blue-400', checkBg: 'data-[state=checked]:bg-blue-600', checkBorder: 'data-[state=checked]:border-blue-600', ring: 'focus:ring-blue-500' },
        purple: { border: 'border-purple-500/30', bg: 'bg-purple-900/10', text: 'text-purple-400', checkBg: 'data-[state=checked]:bg-purple-600', checkBorder: 'data-[state=checked]:border-purple-600', ring: 'focus:ring-purple-500' },
        emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-900/10', text: 'text-emerald-400', checkBg: 'data-[state=checked]:bg-emerald-600', checkBorder: 'data-[state=checked]:border-emerald-600', ring: 'focus:ring-emerald-500' },
        amber: { border: 'border-amber-500/30', bg: 'bg-amber-900/10', text: 'text-amber-400', checkBg: 'data-[state=checked]:bg-amber-600', checkBorder: 'data-[state=checked]:border-amber-600', ring: 'focus:ring-amber-500' }
    }[activeColor] as any;

    return (
        <div className={`space-y-2 p-3 rounded-lg border transition-all ${disabled ? 'border-border bg-slate-900/30 opacity-50' : value ? `${activeClasses.border} ${activeClasses.bg}` : 'border-border bg-card/50'}`}>
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={!!value}
                    onCheckedChange={(c) => onChange(c ? (value || format(new Date(), 'MM/dd/yyyy')) : undefined)}
                    disabled={disabled}
                    className={`h-4 w-4 border-slate-500 ${activeClasses.checkBg} ${activeClasses.checkBorder} disabled:opacity-50`}
                />
                <span className={`text-sm font-medium ${value ? activeClasses.text : disabled ? 'text-slate-600' : 'text-muted-foreground'}`}>{label}</span>
            </div>
            <div className="pl-6">
                <input
                    type="text"
                    value={value || ''}
                    placeholder="Progress/Date..."
                    onChange={(e) => onChange(e.target.value || undefined)}
                    disabled={disabled}
                    className={`h-8 px-2 rounded-md bg-background border border-border text-muted-foreground text-xs w-full outline-none ${activeClasses.ring} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                />
            </div>
        </div>
    );
};

interface ProcurementListProps {
    forcedType?: string;
    pageTitle?: string;
}

const ProcurementList: React.FC<ProcurementListProps> = ({ forcedType, pageTitle }) => {
    // Helper Functions
    // Updated Helper to Determine CURRENT Progress Stage (Last Completed Step)
    const getNextStage = (procurement: Procurement): string => {
        // 1. Check if "Not yet Acted" (No dates set)
        // If Status is Failure/Cancelled/Returned, show that instead of next stage? 
        // User asked for "Progress Values should stick to plain text... and the value should be the next of the current setted date"
        // But if it's "Completed", what is the next stage? "Completed"?
        const pStatus = procurement.procurementStatus || 'Not yet Acted';

        if (pStatus === 'Completed') return 'Completed';
        if (pStatus === 'Failure') return 'Failure';
        if (pStatus === 'Cancelled') return 'Cancelled';
        if (pStatus === 'Returned PR to EU') return 'Returned PR to EU';

        const type = procurement.procurementType;

        // Define stages based on type
        // Regular Bidding
        if (type === 'Regular Bidding') {
            if (!procurement.receivedPrDate) return 'Received PR for Action';
            if (!procurement.prDeliberatedDate) return 'PR Deliberated';
            if (!procurement.publishedDate) return 'Published';
            if (!procurement.preBidDate) return 'Pre-bid';
            if (!procurement.bidOpeningDate) return 'Bid Opening';
            if (!procurement.bidEvaluationDate) return 'Bid Evaluation Report';
            if (!procurement.bacResolutionDate) return 'Add BAC Resolution';
            if (!procurement.postQualDate) return 'Post-Qualification';
            if (!procurement.postQualReportDate) return 'Post-Qualification Report';
            if (!procurement.forwardedOapiDate) return 'Forwarded to OAPIA'; // Typo in user prompt "Forwareded"
            if (!procurement.noaDate) return 'NOA';
            if (!procurement.contractDate) return 'Contract Date';
            if (!procurement.ntpDate) return 'NTP';
            // If NTP is set, maybe it's "Awarded"?
            return 'Awarded to Supplier';
        }

        // SVP and others (Default)
        // SVP Monitoring Process:
        // Received PR -> PR Deliberated -> Published -> RFQ for Canvass -> RFQ Opening -> BAC Resolution -> Forwarded GSD -> PO
        if (!procurement.receivedPrDate) return 'Received PR for Action';
        if (!procurement.prDeliberatedDate) return 'PR Deliberated';
        if (!procurement.publishedDate) return 'Published';
        if (!procurement.rfqCanvassDate) return 'RFQ for Canvass';
        if (!procurement.rfqOpeningDate) return 'RFQ Opening';
        if (!procurement.bacResolutionDate) return 'BAC Resolution';
        if (!procurement.forwardedGsdDate) return 'Forwarded GSD for P.O.';
        if (!procurement.poNtpForwardedGsdDate) return 'Add PO/NTP forwarded to GSD';

        return 'P.O. Created';
    };
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderIdFromUrl = searchParams.get('folderId');

    const [procurements, setProcurements] = useState<Procurement[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Location Data - Note: cabinets table stores Shelves (Tier 1), shelves table stores Cabinets (Tier 2)
    const [cabinets, setCabinets] = useState<Cabinet[]>([]); // These are actually Shelves (Tier 1)
    const [shelves, setShelves] = useState<Shelf[]>([]); // These are actually Cabinets (Tier 2)
    const [folders, setFolders] = useState<Folder[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [jumpPage, setJumpPage] = useState('');
    const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);



    // Filters (existing)
    const [filters, setFilters] = useState<ProcurementFilters>({
        search: '',
        cabinetId: '',
        shelfId: '',
        folderId: folderIdFromUrl || '',
        boxId: searchParams.get('boxId') || '',
        status: '', // kept for backward compatibility, not used for multi-select
        monthYear: '',
        urgencyLevel: '',
    });

    // New: multi-select status filter state (empty = all)

    const [statusFilters, setStatusFilters] = useState<string[]>(searchParams.get('status') ? [searchParams.get('status') as string] : []); // Procurement Status (Active/Archived)
    const [procurementStatusFilters, setProcurementStatusFilters] = useState<string[]>(searchParams.get('processStatus') ? [searchParams.get('processStatus') as string] : []);

    // Phase 6 Filters
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [filterDivision, setFilterDivision] = useState<string>(searchParams.get('division') || 'all_divisions');
    const [typeFilters, setTypeFilters] = useState<string[]>(searchParams.get('type') ? [searchParams.get('type') as string] : []); // Multi-select Type filter
    const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>(undefined);
    const [filterDateType, setFilterDateType] = useState<'dateAdded' | 'deadline' | 'createdAt'>('dateAdded');

    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const [isImportResultOpen, setIsImportResultOpen] = useState(false);
    const [importResults, setImportResults] = useState<{ imported: number; skipped: string[]; errors: string[] }>({ imported: 0, skipped: [], errors: [] });
    const importFileRef = React.useRef<HTMLInputElement>(null);

    // One-time automatic recalculation of stack numbers
    useEffect(() => {
        const runRecalc = async () => {
            if (!localStorage.getItem('has_recalculated_stacks_v3')) {
                try {
                    await recalculateAllFolders();
                    localStorage.setItem('has_recalculated_stacks_v3', 'true');
                    toast.success('System: Successfully recalibrated all folder stack numbers.');
                } catch (e) {
                    console.error("Failed to batch recalculate", e);
                }
            }
        };
        runRecalc();
    }, []);
    // Automatically determined export format based on forcedType
    const exportFormat = forcedType === 'SVP' ? 'svp' : forcedType === 'Regular Bidding' ? 'regular' : 'standard';

    const [exportFilters, setExportFilters] = useState<{
        storageStatus: string;
        division: string;
        year: string;
        abcRange: { min: string; max: string };
        bidAmountRange: { min: string; max: string };
        storageLocation: string;
        processStatus: string;
    }>({
        storageStatus: 'all',
        division: 'all',
        year: 'all',
        abcRange: { min: '', max: '' },
        bidAmountRange: { min: '', max: '' },
        storageLocation: 'all',
        processStatus: 'all'
    });

    // Compute Available Years for Export Dropdown
    const availableExportYears = useMemo(() => {
        const years = new Set<string>();
        procurements.forEach(p => {
            if (p.dateAdded) {
                try {
                    years.add(new Date(p.dateAdded).getFullYear().toString());
                } catch (e) { }
            }
        });
        return Array.from(years).sort().reverse();
    }, [procurements]);

    // Edit Modal State for PR Number Split
    const [editDivisionId, setEditDivisionId] = useState('');
    const [editPrMonth, setEditPrMonth] = useState('');
    const [editPrYear, setEditPrYear] = useState('');
    const [editPrSequence, setEditPrSequence] = useState('');
    const [editPrFormat, setEditPrFormat] = useState<'old' | 'new'>('old');
    const [isCheckingEditPr, setIsCheckingEditPr] = useState(false);
    const [editPrExists, setEditPrExists] = useState<boolean | null>(null);

    useEffect(() => {
        const unsub = onDivisionsChange(setDivisions);
        return () => unsub();
    }, []);

    // Live validation for Edit PR Number
    useEffect(() => {
        if (!editingProcurement) {
            setEditPrExists(null);
            return;
        }

        const isPrComplete = editPrFormat === 'old'
            ? !!(editDivisionId && editPrMonth && editPrYear && editPrSequence)
            : !!(editPrMonth && editPrYear && editPrSequence);

        if (!isPrComplete) {
            setEditPrExists(null);
            return;
        }

        const currentPrPreview = editPrFormat === 'old'
            ? `${divisions.find(d => d.id === editDivisionId)?.abbreviation}-${editPrMonth}-${editPrYear.length === 4 ? editPrYear.slice(-2) : editPrYear}-${editPrSequence}`
            : `${editPrYear}-${editPrMonth}-${editPrSequence}`;

        setIsCheckingEditPr(true);
        const timer = setTimeout(() => {
            const exists = procurements.some(p => p.prNumber === currentPrPreview && p.id !== editingProcurement.id);
            setEditPrExists(exists);
            setIsCheckingEditPr(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [editPrFormat, editDivisionId, editPrMonth, editPrYear, editPrSequence, divisions, procurements, editingProcurement]);
    const [viewProcurement, setViewProcurement] = useState<Procurement | null>(null);
    const [isNonProcurement, setIsNonProcurement] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sorting state
    const [sortField, setSortField] = useState<'name' | 'prNumber' | 'date' | 'stackNumber'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Relocate Modal State
    const [isRelocateDialogOpen, setIsRelocateDialogOpen] = useState(false);
    const [relocateProcurement, setRelocateProcurement] = useState<Procurement | null>(null);
    const [newStackNumber, setNewStackNumber] = useState<number | ''>('');

    const isFolderView = !!filters.folderId && filters.folderId !== 'all_folders';

    const itemsPerPage = 15;

    // --- Helper Functions ---


    const calculateStackNumbers = (procurements: Procurement[], folderId: string): Map<string, number> => {
        // Get all Available files in this folder, sorted by stackNumber then dateAdded
        const availableInFolder = procurements
            .filter(p => p.folderId === folderId && p.status === 'archived')
            .sort((a, b) => {
                // If both have stack numbers, use them
                if (a.stackNumber && b.stackNumber) {
                    return a.stackNumber - b.stackNumber;
                }
                // Otherwise sort by date added (older first)
                return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
            });

        // Assign sequential stack numbers
        const stackMap = new Map<string, number>();
        availableInFolder.forEach((p, index) => {
            stackMap.set(p.id, index + 1);
        });

        return stackMap;
    };

    // Update stack numbers for all files in a folder
    const updateStackNumbersForFolder = async (folderId: string) => {
        const stackMap = calculateStackNumbers(procurements, folderId);

        // Update each file in the folder
        for (const [procId, stackNum] of stackMap.entries()) {
            await updateProcurement(procId, { stackNumber: stackNum });
        }

        // Clear stack number for borrowed files in this folder
        const borrowedInFolder = procurements
            .filter(p => p.folderId === folderId && p.status === 'active');
        for (const proc of borrowedInFolder) {
            if (proc.stackNumber !== undefined) {
                await updateProcurement(proc.id, { stackNumber: undefined });
            }
        }
    };


    // Status change confirmation
    const [pendingStatusChange, setPendingStatusChange] = useState<{
        procurement: Procurement;
        newStatus: ProcurementStatus;
    } | null>(null);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

    // Borrow edit modal
    const [borrowEditModal, setBorrowEditModal] = useState<{
        procurement: Procurement;
        borrowedBy: string;
        borrowerDivision: string;
        borrowedDate?: string;
    } | null>(null);

    // Return modal
    const [returnModal, setReturnModal] = useState<{
        procurement: Procurement;
        returnedBy: string;
    } | null>(null);

    // Helper functions for status
    const getStatusLabel = (status: string): string => {
        if (status === 'processing') return 'Processing';
        return status === 'active' ? 'Borrowed' : 'Archived';
    };

    const getStatusColor = (status: ProcurementStatus): string => {
        return status === 'active'
            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    };

    // Status change workflow
    const handleStatusChange = (procurement: Procurement, newStatus: ProcurementStatus | 'processing') => {
        if (newStatus === 'active') {
            // Going to Borrowed - show edit modal
            setBorrowEditModal({
                procurement,
                borrowedBy: procurement.borrowedBy || '',
                borrowerDivision: procurement.borrowerDivision || '',
                borrowedDate: procurement.borrowedDate || new Date().toISOString()
            });
        } else if (newStatus === 'processing' as any) {
            // Set storageStatus to Processing (not yet physically filed)
            updateProcurement(procurement.id, { storageStatus: 'Processing' }, user?.email, user?.name)
                .then(() => toast.success('Status set to Processing'))
                .catch(() => toast.error('Failed to update status'));
        } else {
            // Going to Available (Archived) - show return modal
            setReturnModal({
                procurement,
                returnedBy: ''
            });
        }
    };

    const saveBorrowChanges = async () => {
        if (!borrowEditModal) return;

        try {
            await updateProcurement(borrowEditModal.procurement.id, {
                borrowedBy: borrowEditModal.borrowedBy,
                borrowerDivision: borrowEditModal.borrowerDivision,
                borrowedDate: borrowEditModal.borrowedDate || new Date().toISOString(),
                status: 'active'
            });

            // Recalculate stack numbers
            await updateStackNumbersForFolder(borrowEditModal.procurement.folderId);

            setBorrowEditModal(null);
            toast.success('Borrow details updated');
        } catch (error) {
            console.error('Failed to update borrow details:', error);
            toast.error('Failed to update borrow details');
        }
    };

    const confirmReturnFile = async () => {
        if (!returnModal) return;
        const { procurement, returnedBy } = returnModal;

        try {
            await updateProcurement(procurement.id, {
                status: 'archived',
                returnDate: new Date().toISOString(),
                returnedBy: returnedBy || undefined
            });

            // Recalculate stack numbers
            await updateStackNumbersForFolder(procurement.folderId);

            setReturnModal(null);
            toast.success('File returned and marked as archived');
        } catch (error) {
            toast.error('Failed to return file');
        }
    };

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubProcurements = onProcurementsChange((data) => {
            setProcurements(data);
            setIsLoading(false);
        });
        const unsubCabinets = onCabinetsChange(setCabinets);
        const unsubShelves = onShelvesChange(setShelves);
        const unsubFolders = onFoldersChange(setFolders);
        const unsubBoxes = onBoxesChange(setBoxes);
        const unsubDivisions = onDivisionsChange(setDivisions);
        const unsubSuppliers = onSuppliersChange(setSuppliers);

        return () => {
            unsubProcurements();
            unsubCabinets();
            unsubShelves();
            unsubFolders();
            unsubBoxes();
            unsubDivisions();
            unsubSuppliers();
        };
    }, []);

    useEffect(() => {
        if (folderIdFromUrl) {
            const folder = folders.find(f => f.id === folderIdFromUrl);
            if (folder) {
                const shelf = shelves.find(s => s.id === folder.shelfId);
                if (shelf) {
                    setFilters(prev => ({
                        ...prev,
                        cabinetId: shelf.cabinetId,
                        shelfId: folder.shelfId,
                        folderId: folderIdFromUrl,
                        boxId: ''
                    }));
                }
            }
        }
    }, [folderIdFromUrl, folders, shelves]);

    // Forced Type Effect
    useEffect(() => {
        if (forcedType) {
            setTypeFilters([forcedType]);
        }
    }, [forcedType]);

    // Read search parameter from URL and populate search box
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setFilters(prev => ({
                ...prev,
                search: searchFromUrl
            }));
        }

        const boxIdFromUrl = searchParams.get('boxId');
        if (boxIdFromUrl) {
            setFilters(prev => ({
                ...prev,
                boxId: boxIdFromUrl,
                // Clear shelf filters if box is selected
                cabinetId: '',
                shelfId: '',
                folderId: ''
            }));
        }
    }, [searchParams]);

    // Dynamic Edit Form Data
    const [editAvailableShelves, setEditAvailableShelves] = useState<Shelf[]>([]);
    const [editAvailableBoxes, setEditAvailableBoxes] = useState<Box[]>([]);
    const [editAvailableFolders, setEditAvailableFolders] = useState<Folder[]>([]);

    // Cascading Filter Data
    const [filterAvailableShelves, setFilterAvailableShelves] = useState<Shelf[]>([]);
    const [filterAvailableFolders, setFilterAvailableFolders] = useState<Folder[]>([]);

    // Filters (existing)
    // Update edit form cascading dropdowns
    useEffect(() => {
        if (editingProcurement && editingProcurement.cabinetId) {
            setEditAvailableShelves(shelves.filter(s => s.cabinetId === editingProcurement.cabinetId));
        } else {
            setEditAvailableShelves([]);
        }
    }, [editingProcurement?.cabinetId, shelves]);

    // Box filtering
    useEffect(() => {
        if (editingProcurement) {
            // If in Box Storage mode (boxId is not null), show all boxes
            // The user selects a box directly from the list
            if (editingProcurement.boxId !== null && editingProcurement.boxId !== undefined) {
                setEditAvailableBoxes(boxes);
            } else if (editingProcurement.shelfId) {
                // Legacy/Drawer mode: show boxes in specific shelf (if applicable)
                setEditAvailableBoxes(boxes.filter(b => b.shelfId === editingProcurement.shelfId));
            } else {
                setEditAvailableBoxes([]);
            }
        }
    }, [editingProcurement?.shelfId, editingProcurement?.boxId, boxes]);

    // Folder filtering (Tier 2 -> Tier 4 or Tier 3 -> Tier 4)
    useEffect(() => {
        if (editingProcurement) {
            if (editingProcurement.boxId) {
                // If Box is selected, show folders in that box
                setEditAvailableFolders(folders.filter(f => f.boxId === editingProcurement.boxId));
            } else if (editingProcurement.shelfId) {
                // If no Box, show folders in Cabinet (legacy/direct)
                setEditAvailableFolders(folders.filter(f => f.shelfId === editingProcurement.shelfId && !f.boxId));
            } else {
                setEditAvailableFolders([]);
            }
        } else {
            setEditAvailableFolders([]);
        }
    }, [editingProcurement?.shelfId, editingProcurement?.boxId, folders]);

    // Update filter cascading dropdowns
    useEffect(() => {
        if (filters.cabinetId) {
            setFilterAvailableShelves(shelves.filter(s => s.cabinetId === filters.cabinetId));
        } else {
            setFilterAvailableShelves([]);
        }
    }, [filters.cabinetId, shelves]);

    useEffect(() => {
        if (filters.boxId && filters.boxId !== 'all') {
            // Box filter selected: show folders belonging to that box
            setFilterAvailableFolders(folders.filter(f => f.boxId === filters.boxId));
        } else if (filters.shelfId) {
            // Shelf (cabinet) filter selected: show direct folders (no box)
            setFilterAvailableFolders(folders.filter(f => f.shelfId === filters.shelfId && !f.boxId));
        } else {
            setFilterAvailableFolders([]);
        }
    }, [filters.shelfId, filters.boxId, folders]);

    // build status options based on current procurements (fall back to common ones)
    // Filter options
    // build status options based on current procurements (fall back to common ones)
    // Filter options
    const statusOptions: string[] = ['active', 'archived', 'processing'];
    const typeOptions = ['Regular Bidding', 'SVP', 'Other Documents'];

    const toggleStatusFilter = (status: string) => {
        setStatusFilters(prev => {
            if (prev.includes(status)) return prev.filter(s => s !== status);
            return [...prev, status];
        });
    };



    const toggleTypeFilter = (type: string) => {
        setTypeFilters(prev => {
            if (prev.includes(type)) return prev.filter(t => t !== type);
            return [...prev, type];
        });
    };

    const toggleProcurementStatusFilter = (status: string) => {
        setProcurementStatusFilters(prev => {
            if (prev.includes(status)) return prev.filter(s => s !== status);
            return [...prev, status];
        });
    };

    const PROCESS_STATUS_OPTIONS = [
        'Completed',
        'Processing',
        'Failure',
        'Returned PR to EU',
        'Not yet Acted',
        'Cancelled'
    ] as const;



    const filteredProcurements = (procurements || []).filter(procurement => {
        const matchesSearch =
            procurement.prNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
            procurement.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            (procurement.projectName && procurement.projectName.toLowerCase().includes(filters.search.toLowerCase()));

        const matchesCabinet = !filters.cabinetId || filters.cabinetId === 'all_cabinets' || procurement.cabinetId === filters.cabinetId;
        const matchesShelf = !filters.shelfId || filters.shelfId === 'all_shelves' || procurement.shelfId === filters.shelfId;
        const matchesFolder = !filters.folderId || filters.folderId === 'all_folders' || procurement.folderId === filters.folderId;

        // New: multi-select status filtering (empty -> all)
        const matchesStatus = statusFilters.length === 0 || statusFilters.some(s => {
            if (s === 'active') return procurement.status === 'active';
            if (s === 'processing') return procurement.status === 'archived' && procurement.storageStatus === 'Processing';
            if (s === 'archived') return procurement.status === 'archived' && procurement.storageStatus !== 'Processing';
            return false;
        });


        const matchesUrgency = !filters.urgencyLevel || (filters.urgencyLevel as any) === 'all_urgency' || procurement.urgencyLevel === (filters.urgencyLevel as any);

        // Phase 6 Filters
        // Division (stored as name in procurement.division)
        const matchesDivision = !filterDivision || filterDivision === 'all_divisions' || procurement.division === filterDivision;

        // Type Filter (Multi-select)
        const matchesType = typeFilters.length === 0 || typeFilters.includes(procurement.procurementType || '');

        // Date Range (Dynamic)
        let dateToCompare = procurement.dateAdded;
        if (filterDateType === 'deadline') dateToCompare = procurement.deadline || '';
        else if (filterDateType === 'createdAt') dateToCompare = procurement.createdAt || procurement.dateAdded;

        const matchesDate = !filterDateRange || !filterDateRange.from || (
            dateToCompare && isWithinInterval(new Date(dateToCompare), {
                start: startOfDay(filterDateRange.from),
                end: endOfDay(filterDateRange.to || filterDateRange.from)
            })
        );

        // Process Status filter (multi-select, empty = all)
        const matchesProcurementStatus = procurementStatusFilters.length === 0 || procurementStatusFilters.includes(procurement.procurementStatus || 'Not yet Acted');

        const matchesBox = !filters.boxId || procurement.boxId === filters.boxId;

        return matchesSearch && matchesCabinet && matchesShelf && matchesFolder && matchesStatus && matchesUrgency && matchesDivision && matchesType && matchesDate && matchesBox && matchesProcurementStatus;
    }).sort((a, b) => {
        let comparison = 0;

        if (sortField === 'name') {
            comparison = a.description.localeCompare(b.description);
        } else if (sortField === 'prNumber') {
            comparison = a.prNumber.localeCompare(b.prNumber);
        } else if (sortField === 'date') {
            // Sort by exact system creation time for multi-user consistency
            comparison = new Date(a.createdAt || a.dateAdded).getTime() - new Date(b.createdAt || b.dateAdded).getTime();
        } else if (sortField === 'stackNumber') {
            // Sort by stack number (files without stack numbers go to end)
            const aStack = a.stackNumber || 999;
            const bStack = b.stackNumber || 999;
            comparison = aStack - bStack;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(filteredProcurements.length / itemsPerPage);
    const paginatedProcurements = filteredProcurements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleJumpToPage = () => {
        const page = parseInt(jumpPage);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPage('');
        } else {
            toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
        }
    };



    const clearFilters = () => {
        setFilters({
            search: '',
            cabinetId: '',
            shelfId: '',
            folderId: '',
            status: '',
            monthYear: '',
            urgencyLevel: '',
            boxId: '' // Clear boxId
        });
        // clear multi-select status
        setStatusFilters([]);
        setProcurementStatusFilters([]);

        setFilterDivision('all_divisions');
        setTypeFilters([]);
        setFilterDateRange(undefined);
        // reset sorting
        setSortField('date');
        setSortDirection('desc');
        setCurrentPage(1);
    };

    const handleEdit = (procurement: Procurement) => {
        setEditingProcurement(procurement);
        setIsEditDialogOpen(true);

        // Parse PR Number for Edit Modal
        const parts = procurement.prNumber.split('-');
        // Detect format: Old = DIV-MMM-YY-SEQ (parts[0] is alpha abbrev), New = YYYY-MMM-SEQ
        const isNewFormat = parts.length === 3 || /^\d{4}$/.test(parts[0]);
        if (isNewFormat && parts.length >= 3) {
            setEditPrFormat('new');
            setEditPrYear(parts[0]);
            setEditPrMonth(parts[1]);
            setEditPrSequence(parts.slice(2).join('-'));
            setEditDivisionId('');
        } else if (!isNewFormat && parts.length >= 4) {
            setEditPrFormat('old');
            const divAbbr = parts[0];
            const div = divisions.find(d => d.abbreviation === divAbbr);
            if (div) setEditDivisionId(div.id);
            else setEditDivisionId('');
            setEditPrMonth(parts[1]);
            setEditPrYear(parts[2]);
            setEditPrSequence(parts[3]);
        } else {
            setEditPrFormat('old');
            setEditDivisionId('');
            setEditPrMonth('');
            setEditPrYear('');
            setEditPrSequence('');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingProcurement) return;
        setIsSaving(true);
        try {
            await handleUpdateProcurement();
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateProcurement = async () => {
        if (!editingProcurement) return;

        // Reconstruct PR Number from split fields
        let finalPrNumber = editingProcurement.prNumber;
        if (editPrFormat === 'new') {
            if (editPrYear && editPrMonth && editPrSequence) {
                finalPrNumber = `${editPrYear}-${editPrMonth}-${editPrSequence}`;
            }
        } else {
            if (editDivisionId && editPrMonth && editPrYear && editPrSequence) {
                const div = divisions.find(d => d.id === editDivisionId);
                if (div) {
                    finalPrNumber = `${div.abbreviation}-${editPrMonth}-${editPrYear}-${editPrSequence}`;
                }
            }
        }

        // Check if the new PR number conflicts with an existing record (excluding self)
        const duplicateExists = procurements.some(p => p.prNumber === finalPrNumber && p.id !== editingProcurement.id);
        if (duplicateExists) {
            toast.warning(`⚠️ PR Number "${finalPrNumber}" already exists on another record. Saving anyway...`);
        }

        const updatedProcurement: Procurement = {
            ...editingProcurement,
            prNumber: finalPrNumber,
            // NOTE: division (End User) is already set on editingProcurement via the Edit modal's
            // End User dropdown — do NOT overwrite it with editDivisionId (which is the PR Number's division).
            // Parse financials
            abc: editingProcurement.abc ? parseFloat(removeCommas(String(editingProcurement.abc))) : undefined,
            bidAmount: editingProcurement.bidAmount ? parseFloat(removeCommas(String(editingProcurement.bidAmount))) : undefined,
        };

        // CRITICAL: Convert undefined monitoring fields to null so Firebase RTDB actually clears them.
        // JSON.parse(JSON.stringify()) strips undefined values, leaving old DB values untouched.
        // Setting to null explicitly tells Firebase to delete the field.
        const monitoringFields: (keyof Procurement)[] = [
            'receivedPrDate', 'prDeliberatedDate', 'publishedDate',
            'rfqCanvassDate', 'rfqOpeningDate', 'bacResolutionDate',
            'forwardedGsdDate', 'poNtpForwardedGsdDate',
            'preBidDate', 'bidOpeningDate', 'bidEvaluationDate',
            'postQualDate', 'postQualReportDate', 'forwardedOapiDate',
            'noaDate', 'contractDate', 'ntpDate', 'awardedToDate',
            'shoppingReceivedDate', 'shoppingBudgetCertDate', 'shoppingRfqDate',
            'shoppingCanvassDate', 'shoppingAbstractDate', 'shoppingPurchaseOrderDate',
        ];
        const savePayload: any = { ...updatedProcurement };
        monitoringFields.forEach(field => {
            if (savePayload[field] === undefined) savePayload[field] = null;
        });


        try {
            await updateProcurement(
                updatedProcurement.id,
                savePayload,
                user?.email,
                user?.name
            );
            setIsEditDialogOpen(false);
            setEditingProcurement(null);
            toast.success('Record updated successfully');
        } catch (error) {
            toast.error('Failed to update record');
        }
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteProcurement(deleteId);
            toast.success('Record deleted successfully');
            setDeleteId(null);
        }
    };

    const handleRelocateClick = (procurement: Procurement) => {
        setRelocateProcurement(procurement);
        setNewStackNumber(procurement.stackNumber || '');
        setIsRelocateDialogOpen(true);
    };

    const handleRelocateSave = async () => {
        if (!relocateProcurement || !newStackNumber) return;

        const folderId = relocateProcurement.folderId;
        if (!folderId) return;

        // Get all archived items in this folder, sorted by current stack number
        const folderItems = procurements
            .filter(p => p.folderId === folderId && p.status === 'archived' && p.id !== relocateProcurement.id)
            .sort((a, b) => (a.stackNumber || 0) - (b.stackNumber || 0));

        let targetStack = parseInt(String(newStackNumber));
        if (isNaN(targetStack) || targetStack < 1) targetStack = 1;
        if (targetStack > folderItems.length + 1) targetStack = folderItems.length + 1;

        // Find prev and next items around the insertion point
        // Indices are 0-based. Stack numbers are 1-based.
        // no opbe at Stack X, we insert at index X-1.
        // Prev item is at index X-2. Next item is at index X-1.

        let newOrderDate: number;

        if (targetStack === 1) {
            // Insert at start
            const firstItem = folderItems[0];
            const firstDate = firstItem?.stackOrderDate || new Date(firstItem?.dateAdded || Date.now()).getTime();
            newOrderDate = firstDate - 100000; // Subtract arbitrary time
        } else if (targetStack > folderItems.length) {
            // Insert at end
            const lastItem = folderItems[folderItems.length - 1];
            const lastDate = lastItem?.stackOrderDate || new Date(lastItem?.dateAdded || Date.now()).getTime();
            newOrderDate = lastDate + 100000;
        } else {
            // Insert in middle
            const prevItem = folderItems[targetStack - 2];
            const nextItem = folderItems[targetStack - 1];

            const prevDate = prevItem?.stackOrderDate || new Date(prevItem?.dateAdded || 0).getTime();
            const nextDate = nextItem?.stackOrderDate || new Date(nextItem?.dateAdded || 0).getTime();

            newOrderDate = (prevDate + nextDate) / 2;
        }

        try {
            await updateProcurement(
                relocateProcurement.id,
                { ...relocateProcurement, stackOrderDate: newOrderDate },
                user?.email,
                user?.name
            );
            await updateStackNumbersForFolder(folderId);
            toast.success('Stack number updated');
            setIsRelocateDialogOpen(false);
            setRelocateProcurement(null);
        } catch (error) {
            toast.error('Failed to update stack number');
        }
    };

    // Status change handlers


    // Helper to Determine CURRENT Progress Stage (Last Completed Step)
    const getCurrentStage = (p: Procurement) => {
        if (p.procurementType === 'SVP') {
            if (p.forwardedGsdDate) return 'Forwarded GSD for P.O.';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.rfqOpeningDate) return 'RFQ Opening';
            if (p.rfqCanvassDate) return 'RFQ for Canvass';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        } else {
            // Regular Bidding - Check in reverse chronological order (latest step first)
            if (p.awardedToDate) return 'Awarded to Supplier';
            if (p.forwardedOapiDate) return 'Forwarded to OAPIA';
            if (p.ntpDate) return 'NTP';
            if (p.contractDate) return 'Contract Date';
            if (p.noaDate) return 'NOA';
            if (p.postQualReportDate) return 'Post-Qualification Report';
            if (p.postQualDate) return 'Post-Qualification';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.bidEvaluationDate) return 'Bid Evaluation Report';
            if (p.bidOpeningDate) return 'Bid Opening';
            if (p.preBidDate) return 'Pre-bid';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        }
    };

    // Helper to get Latest Activity Date
    const getLatestActionDate = (p: Procurement) => {
        const dateStrings = [
            p.receivedPrDate, p.prDeliberatedDate, p.publishedDate, p.preBidDate, p.bidOpeningDate,
            p.bidEvaluationDate, p.bacResolutionDate, p.postQualDate, p.postQualReportDate,
            p.forwardedOapiDate, p.noaDate, p.contractDate, p.ntpDate, p.forwardedGsdDate,
            p.poNtpForwardedGsdDate, p.rfqCanvassDate, p.rfqOpeningDate, p.dateAdded, p.createdAt
        ];

        let maxTime = -Infinity;
        let hasValidDate = false;

        for (const ds of dateStrings) {
            if (!ds) continue;
            const d = new Date(ds);
            if (!isNaN(d.getTime())) {
                const t = d.getTime();
                if (t > maxTime) {
                    maxTime = t;
                    hasValidDate = true;
                }
            }
        }

        if (!hasValidDate) return null;
        return new Date(maxTime);
    };

    // Updated to show: Shelf-Cabinet-Folder (Legacy) OR Box-Folder (New)
    const getLocationString = (p: Procurement) => {
        if (p.storageStatus === 'Processing') {
            return 'Processing';
        }

        if (!p.boxId && !p.cabinetId && !p.shelfId && !p.folderId) {
            return 'Not yet filed';
        }

        if (p.boxId) {
            // Box Storage Mode: B{code}-{Fcode} (e.g., B1-F1)
            const box = boxes.find(b => b.id === p.boxId);
            const folder = folders.find(f => f.id === p.folderId);

            const boxCode = box ? box.code : '?';

            if (folder && folder.code) {
                return `${boxCode}-${folder.code}`;
            } else {
                return boxCode;
            }
        } else {
            // Drawer Storage Mode: D{code}-{Ccode}-{Fcode}
            const drawer = cabinets.find(c => c.id === p.cabinetId);
            const cabinet = shelves.find(s => s.id === p.shelfId);
            const folder = folders.find(f => f.id === p.folderId);

            const drawerCode = drawer ? drawer.code : '?';
            const cabinetCode = cabinet ? cabinet.code : '?';
            const folderCode = folder ? folder.code : '?';

            // Use simplified format if possible, but keep Drawer-Cabinet-Folder for now as requested default
            return `${drawerCode}-${cabinetCode}-${folderCode}`;
        }
    };

    const handleExportClick = () => {
        // Initialize export filters defaults
        setExportFilters({
            storageStatus: 'all',
            division: 'all',
            year: 'all',
            abcRange: { min: '', max: '' },
            bidAmountRange: { min: '', max: '' },
            storageLocation: 'all',
            processStatus: 'all'
        });
        setIsExportModalOpen(true);
    };

    const safeFormatDate = (val?: string, fmt = 'MMM d, yyyy'): string => {
        if (!val) return '';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return val; // return raw string if not parseable
            return format(d, fmt);
        } catch { return val; }
    };

    const handleExportConfirm = () => {
        // Filter procurements based on advanced Export Modal state
        const exportData = (procurements || []).filter(procurement => {
            // Lock to current page's procurement type
            const matchesType = !forcedType || procurement.procurementType === forcedType;

            // Storage Status
            const matchesStorageStatus = exportFilters.storageStatus === 'all' ||
                (exportFilters.storageStatus === 'borrowed' && procurement.status === 'active') ||
                (exportFilters.storageStatus === 'archived' && procurement.status === 'archived');

            // End User Division
            const matchesDivision = exportFilters.division === 'all' || procurement.division === exportFilters.division;

            // Date (Year) match against dateAdded
            const matchesYear = exportFilters.year === 'all' || (procurement.dateAdded && new Date(procurement.dateAdded).getFullYear().toString() === exportFilters.year);

            // ABC Range
            const minAbc = parseFloat(exportFilters.abcRange.min);
            const maxAbc = parseFloat(exportFilters.abcRange.max);
            const abc = procurement.abc || 0;
            const matchesAbcRange = (!exportFilters.abcRange.min || abc >= minAbc) && (!exportFilters.abcRange.max || abc <= maxAbc);

            // Bid Amount Range
            const minBid = parseFloat(exportFilters.bidAmountRange.min);
            const maxBid = parseFloat(exportFilters.bidAmountRange.max);
            const bid = procurement.bidAmount || 0;
            const matchesBidRange = (!exportFilters.bidAmountRange.min || bid >= minBid) && (!exportFilters.bidAmountRange.max || bid <= maxBid);

            // Storage Location filter by type (All / Drawers only / Boxes only)
            const isBox = !!procurement.boxId;
            const matchesStorageLoc =
                exportFilters.storageLocation === 'all' ||
                (exportFilters.storageLocation === 'drawers' && !isBox) ||
                (exportFilters.storageLocation === 'boxes' && isBox);

            // Process Status
            const matchesProcessStatus = exportFilters.processStatus === 'all' || procurement.procurementStatus === exportFilters.processStatus;

            return matchesType && matchesStorageStatus && matchesDivision && matchesYear && matchesAbcRange && matchesBidRange && matchesStorageLoc && matchesProcessStatus;
        }).map(p => {
            const checklist = p.checklist || {};

            if (exportFormat === 'svp') {
                return {
                    'Particulars/Project name': p.projectName || '',
                    'PR Number': p.prNumber,
                    'End User': p.division || '',
                    'ABC': p.abc ? `₱${p.abc.toLocaleString()}` : '',
                    'Status': p.status === 'active' ? 'Borrowed' : p.storageStatus || 'Archived',
                    'Storage Location': getLocationString(p),
                    'Stack Number': p.stackNumber || '',
                    'Process Status': p.procurementStatus || 'Not yet Acted',
                    'Urgency Level': p.urgencyLevel || 'None',
                    'Deadline': safeFormatDate(p.deadline),
                    'Borrowed by': p.borrowedBy || '',
                    'Borrower Division': p.borrowerDivision || '',
                    'Borrowed Date': safeFormatDate(p.borrowedDate),
                    'Return by': p.returnedBy || '',
                    'Return Date': safeFormatDate(p.returnDate),
                    'Date of Current Status': safeFormatDate(p.dateStatusUpdated),
                    'Remarks': p.description || '',
                    'Received PR to Action(Date)': safeFormatDate(p.receivedPrDate),
                    'PR Deliberated(Date)': safeFormatDate(p.prDeliberatedDate),
                    'Published(Date)': safeFormatDate(p.publishedDate),
                    'RFQ to Canvass(Date)': safeFormatDate(p.rfqCanvassDate),
                    'RFQ Opening(Date)': safeFormatDate(p.rfqOpeningDate),
                    'BAC Resolution(Date)': safeFormatDate(p.bacResolutionDate),
                    'Forwarded to GSD for P.O(Date)': safeFormatDate(p.forwardedGsdDate),
                    'PO/NTP Forwarded to GSD(Date)': safeFormatDate(p.poNtpForwardedGsdDate),
                    'Staff in Charge': p.createdByName || '',
                    'Supplier': p.supplier || '',
                    'Bid Amount': p.bidAmount ? `₱${p.bidAmount.toLocaleString()}` : '',
                    'Notes': p.notes || '',
                    'A.': checklist.purchaseRequest ? 'Yes' : '',
                    'B.': checklist.certificateOfFunds ? 'Yes' : '',
                    'C.': checklist.publicationInvitation ? 'Yes' : '',
                    'D.': checklist.minutesPreBid ? 'Yes' : '',
                    'E.': checklist.biddingDocuments ? 'Yes' : '',
                    'F.': checklist.supplementalBidBulletin ? 'Yes' : '',
                    'G.': checklist.inviteObservers ? 'Yes' : '',
                    'H.': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                    'I.': checklist.abstractBidsOpening ? 'Yes' : '',
                    'J.': checklist.minutesBidOpening ? 'Yes' : '',
                    'K.': checklist.postingCertification ? 'Yes' : '',
                    'L.': checklist.twgBidEvalReport ? 'Yes' : '',
                    'M.': checklist.abstractBidsEvaluated ? 'Yes' : '',
                    'N.': checklist.bacResolutionPostQual ? 'Yes' : '',
                    'O.': checklist.noticePostQual ? 'Yes' : '',
                    'O.2.': checklist.officialReceipt ? 'Yes' : '',
                    'O.4.': checklist.philgepsAwardNotice ? 'Yes' : '',
                    'P.': checklist.endorsementWithBacRes ? 'Yes' : '',
                    'Q.': checklist.endorsementForSignature ? 'Yes' : '',
                    'R.': checklist.noticeOfAward ? 'Yes' : '',
                    'S.': checklist.contractAgreement ? 'Yes' : '',
                    'T.': checklist.noticeToProceed ? 'Yes' : '',
                    'Date Added': safeFormatDate(p.dateAdded),
                    'Created At': safeFormatDate(p.createdAt),
                };
            }
            if (exportFormat === 'regular') {
                return {
                    'Particulars/Project name': p.projectName || '',
                    'PR Number': p.prNumber,
                    'End User': p.division || '',
                    'ABC': p.abc ? `₱${p.abc.toLocaleString()}` : '',
                    'Status': p.status === 'active' ? 'Borrowed' : p.storageStatus || 'Archived',
                    'Storage Location': getLocationString(p),
                    'Stack Number': p.stackNumber || '',
                    'Process Status': p.procurementStatus || 'Not yet Acted',
                    'Urgency Level': p.urgencyLevel || 'None',
                    'Deadline': safeFormatDate(p.deadline),
                    'Borrowed by': p.borrowedBy || '',
                    'Borrower Division': p.borrowerDivision || '',
                    'Borrowed Date': safeFormatDate(p.borrowedDate),
                    'Return by': p.returnedBy || '',
                    'Return Date': safeFormatDate(p.returnDate),
                    'Date of Current Status': safeFormatDate(p.dateStatusUpdated),
                    'Remarks': p.description || '',
                    'Received PR to Action(Date)': safeFormatDate(p.receivedPrDate),
                    'PR Deliberated(Date)': safeFormatDate(p.prDeliberatedDate),
                    'Published(Date)': safeFormatDate(p.publishedDate),
                    'Pre-Bid(Date)': safeFormatDate(p.preBidDate),
                    'Bid Opening(Date)': safeFormatDate(p.bidOpeningDate),
                    'Bid Evaluation Report(Date)': safeFormatDate(p.bidEvaluationDate),
                    'Post Qualification(Date)': safeFormatDate(p.postQualDate),
                    'Post Qualification Report(Date)': safeFormatDate(p.postQualReportDate),
                    'Forwarded to OAPIA(Date)': safeFormatDate(p.forwardedOapiDate),
                    'Notice of Award(Date)': safeFormatDate(p.noaDate),
                    'Contract Date(Date)': safeFormatDate(p.contractDate),
                    'Notice to Proceed(Date)': safeFormatDate(p.ntpDate),
                    'Awarded to Supplier(Date)': safeFormatDate(p.awardedToDate),
                    'Staff in Charge': p.createdByName || '',
                    'Supplier': p.supplier || '',
                    'Bid Amount': p.bidAmount ? `₱${p.bidAmount.toLocaleString()}` : '',
                    'Notes': p.notes || '',
                    'A.': checklist.purchaseRequest ? 'Yes' : '',
                    'B.': checklist.certificateOfFunds ? 'Yes' : '',
                    'C.': checklist.publicationInvitation ? 'Yes' : '',
                    'D.': checklist.minutesPreBid ? 'Yes' : '',
                    'E.': checklist.biddingDocuments ? 'Yes' : '',
                    'F.': checklist.supplementalBidBulletin ? 'Yes' : '',
                    'G.': checklist.inviteObservers ? 'Yes' : '',
                    'H.': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                    'I.': checklist.abstractBidsOpening ? 'Yes' : '',
                    'J.': checklist.minutesBidOpening ? 'Yes' : '',
                    'K.': checklist.postingCertification ? 'Yes' : '',
                    'L.': checklist.twgBidEvalReport ? 'Yes' : '',
                    'M.': checklist.abstractBidsEvaluated ? 'Yes' : '',
                    'N.': checklist.bacResolutionPostQual ? 'Yes' : '',
                    'O.': checklist.noticePostQual ? 'Yes' : '',
                    'O.2.': checklist.officialReceipt ? 'Yes' : '',
                    'O.4.': checklist.philgepsAwardNotice ? 'Yes' : '',
                    'P.': checklist.endorsementWithBacRes ? 'Yes' : '',
                    'Q.': checklist.endorsementForSignature ? 'Yes' : '',
                    'R.': checklist.noticeOfAward ? 'Yes' : '',
                    'S.': checklist.contractAgreement ? 'Yes' : '',
                    'T.': checklist.noticeToProceed ? 'Yes' : '',
                    'Date Added': safeFormatDate(p.dateAdded),
                    'Created At': safeFormatDate(p.createdAt),
                };
            }

            return {
                'PR Number/IB Number': p.prNumber,
                'Procurement Type': p.procurementType || '',
                'Project Name': p.projectName || '',
                'Description': p.description,
                'Division': p.division || '',
                'Status': p.status === 'active' ? 'Borrowed' : p.storageStatus || 'Archived',
                'Storage Location': getLocationString(p),
                'Stack Number': p.stackNumber || '',
                'Process Status': p.procurementStatus || 'Not yet Acted',
                'Urgency Level': p.urgencyLevel || 'None',
                'Deadline': safeFormatDate(p.deadline),
                'Borrowed By': p.borrowedBy || '',
                'Borrower Division': p.borrowerDivision || '',
                'Borrowed Date': safeFormatDate(p.borrowedDate),
                'Return By': p.returnedBy || '',
                'Return Date': safeFormatDate(p.returnDate),
                'Procurement Date': safeFormatDate(p.procurementDate),
                'Supplier': p.supplier || '',
                'Bid Amount': p.bidAmount ? `₱${p.bidAmount.toLocaleString()}` : '',
                'ABC': p.abc ? `₱${p.abc.toLocaleString()}` : '',
                'Tags': (p.tags || []).join(', '),
                'Created By': p.createdByName || '',
                'Created At': safeFormatDate(p.createdAt),
                'Date Added': safeFormatDate(p.dateAdded),

                // Documents Handed Over (Checklist A-T)
                'A': checklist.purchaseRequest ? 'Yes' : '',
                'B': checklist.certificateOfFunds ? 'Yes' : '',
                'C': checklist.publicationInvitation ? 'Yes' : '',
                'D': checklist.minutesPreBid ? 'Yes' : '',
                'E': checklist.biddingDocuments ? 'Yes' : '',
                'F': checklist.supplementalBidBulletin ? 'Yes' : '',
                'G': checklist.inviteObservers ? 'Yes' : '',
                'H': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                'I': checklist.abstractBidsOpening ? 'Yes' : '',
                'J': checklist.minutesBidOpening ? 'Yes' : '',
                'K': checklist.postingCertification ? 'Yes' : '',
                'L': checklist.twgBidEvalReport ? 'Yes' : '',
                'M': checklist.abstractBidsEvaluated ? 'Yes' : '',
                'N': checklist.bacResolutionPostQual ? 'Yes' : '',
                'O': checklist.noticePostQual ? 'Yes' : '',
                'O.2': checklist.officialReceipt ? 'Yes' : '',
                'O.4': checklist.philgepsAwardNotice ? 'Yes' : '',
                'P': checklist.endorsementWithBacRes ? 'Yes' : '',
                'Q': checklist.endorsementForSignature ? 'Yes' : '',
                'R': checklist.noticeOfAward ? 'Yes' : '',
                'S': checklist.contractAgreement ? 'Yes' : '',
                'T': checklist.noticeToProceed ? 'Yes' : '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Auto-size columns based on header/content length
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...exportData.map(row => (row[key] ? row[key].toString().length : 0))) + 2
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Records");
        XLSX.writeFile(wb, `procurement_records_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        setIsExportModalOpen(false);
        toast.success(`Exported ${exportData.length} records to Excel (XLSX)`);
    };



    const handleDownloadTemplate = (type: 'SVP' | 'Regular Bidding') => {
        let templateData: any = {};
        if (type === 'SVP') {
            templateData = {
                'Particulars/Project name': '', 'PR Number': '', 'End User': '', 'ABC': '', 'Status': '', 'Storage Location': '', 'Stack Number': '', 'Process Status': '', 'Borrowed by': '', 'Borrower Division': '', 'Borrowed Date': '', 'Return by': '', 'Return Date': '', 'Date of Current Status': '', 'Remarks': '', 'Received PR to Action(Date)': '', 'PR Deliberated(Date)': '', 'Published(Date)': '', 'RFQ to Canvass(Date)': '', 'RFQ Opening(Date)': '', 'BAC Resolution(Date)': '', 'Forwarded to GSD for P.O(Date)': '', 'PO/NTP Forwarded to GSD(Date)': '', 'Staff in Charge': '', 'Supplier': '', 'Bid Amount': '', 'A.': '', 'B.': '', 'C.': '', 'D.': '', 'E.': '', 'F.': '', 'G.': '', 'H.': '', 'I.': '', 'J.': '', 'K.': '', 'L.': '', 'M.': '', 'N.': '', 'O.': '', 'O.2.': '', 'O.4.': '', 'P.': '', 'Q.': '', 'R.': '', 'S.': '', 'T.': ''
            };
        } else {
            templateData = {
                'Particulars/Project name': '', 'PR Number': '', 'End User': '', 'ABC': '', 'Status': '', 'Storage Location': '', 'Stack Number': '', 'Process Status': '', 'Borrowed by': '', 'Borrower Division': '', 'Borrowed Date': '', 'Return by': '', 'Return Date': '', 'Date of Current Status': '', 'Remarks': '', 'Received PR to Action(Date)': '', 'PR Deliberated(Date)': '', 'Published(Date)': '', 'Pre-Bid(Date)': '', 'Bid Opening(Date)': '', 'Bid Evaluation Report(Date)': '', 'Post Qualification(Date)': '', 'Post Qualification Report(Date)': '', 'Forwarded to OAPIA(Date)': '', 'Notice of Award(Date)': '', 'Contract Date(Date)': '', 'Notice to Proceed(Date)': '', 'Awarded to Supplier(Date)': '', 'Staff in Charge': '', 'Supplier': '', 'Bid Amount': '', 'A.': '', 'B.': '', 'C.': '', 'D.': '', 'E.': '', 'F.': '', 'G.': '', 'H.': '', 'I.': '', 'J.': '', 'K.': '', 'L.': '', 'M.': '', 'N.': '', 'O.': '', 'O.2.': '', 'O.4.': '', 'P.': '', 'Q.': '', 'R.': '', 'S.': '', 'T.': ''
            };
        }

        const ws = XLSX.utils.json_to_sheet([templateData]);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `import_template_${type.replace(' ', '_').toLowerCase()}.csv`;
        link.click();
        toast.success(`Downloaded ${type} Import Template!`);
    };

    // ── CSV Import ────────────────────────────────────────────────────
    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so the same file can be re-selected
        e.target.value = '';

        setIsImporting(true);
        const results = { imported: 0, skipped: [] as string[], errors: [] as string[] };

        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

            if (rows.length === 0) {
                toast.error('The CSV file is empty or unreadable.');
                setIsImporting(false);
                return;
            }

            // Existing PR numbers used for duplicate check
            const existingPRs = new Set(procurements.map(p => p.prNumber.trim()));

            // Helper: parse ₱-prefixed money string → number
            const parseMoney = (v: string): number => {
                if (!v) return 0;
                const clean = String(v).replace(/[₱,\s]/g, '');
                const n = parseFloat(clean);
                return isNaN(n) ? 0 : n;
            };

            // Helper: parse date string → ISO string or undefined
            const parseDate = (v: any): string | undefined => {
                if (!v || String(v).trim() === '') return undefined;
                // Try native Date parsing
                const d = new Date(String(v));
                if (!isNaN(d.getTime())) return d.toISOString();
                return undefined;
            };

            // Helper: 'Yes' → true, else false
            const yesNo = (v: any): boolean => String(v).toLowerCase().trim() === 'yes';

            for (const row of rows) {
                // Detect which export format by checking for known column names
                const isSVP = 'Particulars/Project name' in row && 'RFQ to Canvass(Date)' in row;
                const isRegular = 'Particulars/Project name' in row && 'Bid Opening(Date)' in row;
                const isGeneral = 'PR Number/IB Number' in row;

                // PR Number
                const prNumber = String(row['PR Number'] || row['PR Number/IB Number'] || '').trim();
                if (!prNumber) { results.errors.push('Row missing PR Number — skipped'); continue; }

                if (existingPRs.has(prNumber)) {
                    results.skipped.push(prNumber);
                    continue;
                }

                try {
                    // Status mapping
                    const rawStatus = String(row['Status'] || '').trim().toLowerCase();
                    const status: 'active' | 'archived' =
                        rawStatus === 'borrowed' || rawStatus === 'active' ? 'active' : 'archived';

                    // Checklist mapping (SVP/Regular: 'A.' key; General: 'A' key)
                    const ck = (key: string) => yesNo(row[key] || row[key + '.'] || '');

                    // Procurement type
                    let procurementType: 'SVP' | 'Regular Bidding' | undefined;
                    if (isSVP) procurementType = 'SVP';
                    else if (isRegular) procurementType = 'Regular Bidding';
                    else procurementType = (row['Procurement Type'] as any) || 'SVP';

                    // Storage Location parsing back to IDs
                    let boxId: string | undefined;
                    let cabinetId: string | undefined;
                    let shelfId: string | undefined;
                    let folderId: string | undefined;

                    const storageLocStr = String(row['Storage Location'] || row['Location'] || '').trim();
                    if (storageLocStr && storageLocStr !== '-') {
                        const parts = storageLocStr.split('-');
                        if (parts.length === 2) {
                            const b = boxes.find(x => x.code === parts[0]);
                            const f = folders.find(x => x.code === parts[1]);
                            if (b) boxId = b.id;
                            if (f) folderId = f.id;
                        } else if (parts.length === 3) {
                            const c = cabinets.find(x => x.code === parts[0]);
                            const s = shelves.find(x => x.code === parts[1]);
                            const f = folders.find(x => x.code === parts[2]);
                            if (c) cabinetId = c.id;
                            if (s) shelfId = s.id;
                            if (f) folderId = f.id;
                        } else if (parts.length === 1) {
                            const b = boxes.find(x => x.code === parts[0]);
                            if (b) boxId = b.id;
                        }
                    }

                    const procurement: any = {
                        prNumber,
                        procurementType,
                        status,
                        // Names / descriptions
                        projectName: row['Particulars/Project name'] || row['Project Name'] || '',
                        description: row['Remarks'] || row['Description'] || '',
                        division: row['End User'] || row['Division'] || '',
                        notes: row['Notes'] || '',
                        supplier: row['Supplier'] || '',

                        // Money
                        abc: parseMoney(row['ABC']) || undefined,
                        bidAmount: parseMoney(row['Bid Amount']) || undefined,

                        // Borrow fields
                        borrowedBy: row['Borrowed by'] || row['Borrowed By'] || '',
                        borrowerDivision: row['Borrower Division'] || '',
                        borrowedDate: parseDate(row['Borrowed Date']),
                        returnedBy: row['Return by'] || row['Return By'] || '',
                        returnDate: parseDate(row['Return Date']),
                        dateStatusUpdated: parseDate(row['Date of Current Status']),

                        // Process Status
                        procurementStatus: (row['Process Status'] || row['Progress Status'] || 'Not yet Acted') as any,

                        // Location IDs
                        boxId,
                        cabinetId,
                        shelfId,
                        folderId,

                        // Stack / tags
                        stackNumber: row['Stack Number'] ? parseInt(row['Stack Number']) : undefined,
                        tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()).filter(Boolean) : [],

                        // Monitoring — SVP dates
                        receivedPrDate: parseDate(row['Received PR to Action(Date)']),
                        prDeliberatedDate: parseDate(row['PR Deliberated(Date)']),
                        publishedDate: parseDate(row['Published(Date)']),
                        rfqCanvassDate: parseDate(row['RFQ to Canvass(Date)']),
                        rfqOpeningDate: parseDate(row['RFQ Opening(Date)']),
                        bacResolutionDate: parseDate(row['BAC Resolution(Date)']),
                        forwardedGsdDate: parseDate(row['Forwarded to GSD for P.O(Date)']),
                        poNtpForwardedGsdDate: parseDate(row['PO/NTP Forwarded to GSD(Date)']),

                        // Monitoring — Regular Bidding dates
                        preBidDate: parseDate(row['Pre-Bid(Date)']),
                        bidOpeningDate: parseDate(row['Bid Opening(Date)']),
                        bidEvaluationDate: parseDate(row['Bid Evaluation Report(Date)']),
                        postQualDate: parseDate(row['Post Qualification(Date)']),
                        postQualReportDate: parseDate(row['Post Qualification Report(Date)']),
                        forwardedOapiDate: parseDate(row['Forwarded to OAPIA(Date)']),
                        noaDate: parseDate(row['Notice of Award(Date)']),
                        contractDate: parseDate(row['Contract Date(Date)']),
                        ntpDate: parseDate(row['Notice to Proceed(Date)']),
                        awardedToDate: parseDate(row['Awarded to Supplier(Date)']),

                        // General export dates
                        procurementDate: parseDate(row['Procurement Date']),
                        dateAdded: parseDate(row['Date Added']) || new Date().toISOString(),

                        // Checklist (try both 'A.' and 'A' formats)
                        checklist: {
                            purchaseRequest: ck('A'),
                            certificateOfFunds: ck('B'),
                            publicationInvitation: ck('C'),
                            minutesPreBid: ck('D'),
                            biddingDocuments: ck('E'),
                            supplementalBidBulletin: ck('F'),
                            inviteObservers: ck('G'),
                            biddersTechFinancialProposals: ck('H'),
                            abstractBidsOpening: ck('I'),
                            minutesBidOpening: ck('J'),
                            postingCertification: ck('K'),
                            twgBidEvalReport: ck('L'),
                            abstractBidsEvaluated: ck('M'),
                            bacResolutionPostQual: ck('N'),
                            noticePostQual: ck('O'),
                            officialReceipt: ck('O.2') || ck('O.2.') || false,
                            philgepsAwardNotice: ck('O.4') || ck('O.4.') || false,
                            endorsementWithBacRes: ck('P'),
                            endorsementForSignature: ck('Q'),
                            noticeOfAward: ck('R'),
                            contractAgreement: ck('S'),
                            noticeToProceed: ck('T'),
                        },
                    };

                    // Strip undefined values to keep Firebase clean
                    Object.keys(procurement).forEach(k => procurement[k] === undefined && delete procurement[k]);

                    await addProcurement(
                        procurement,
                        user?.email || 'import',
                        user?.name || 'Import'
                    );
                    existingPRs.add(prNumber); // Prevent same-run duplicates
                    results.imported++;
                } catch (rowErr) {
                    results.errors.push(`${prNumber}: ${(rowErr as Error).message}`);
                }
            }
        } catch (err) {
            toast.error('Failed to read CSV file.');
            console.error(err);
        }

        setIsImporting(false);
        setImportResults(results);
        setIsImportResultOpen(true);
    };

    const handleExportPDFSummary = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Procurement Records - Summary Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy - hh:mm a')}`, 14, 28);

        const summaryData = filteredProcurements.map(p => [
            p.prNumber,
            p.description.substring(0, 40) + (p.description.length > 40 ? '...' : ''),
            getLocationString(p),
            p.status,
            format(new Date(p.dateAdded), 'MMM d, yyyy')
        ]);

        autoTable(doc, {
            head: [['PR Number', 'Description', 'Location', 'Status', 'Date Added']],
            body: summaryData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
        });

        doc.save(`procurement-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF summary exported successfully');
    };

    const handleExportPDFFull = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Procurement Records - Full Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy - hh:mm a')}`, 14, 28);

        const fullData = filteredProcurements.map(p => [
            p.prNumber,
            p.description.substring(0, 30) + (p.description.length > 30 ? '...' : ''),
            getLocationString(p),
            p.status,
            p.urgencyLevel,
            format(new Date(p.dateAdded), 'MMM d, yyyy'),
            p.tags.join(', ').substring(0, 20),
            p.createdByName || 'N/A'
        ]);

        autoTable(doc, {
            head: [['PR #', 'Description', 'Location', 'Status', 'Urgency', 'Date', 'Tags', 'Created By']],
            body: fullData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 8 },
        });

        doc.save(`procurement-full-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF full report exported successfully');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;

        try {
            await deleteProcurement(deleteId);
            toast.success('Record deleted successfully');
            setDeleteId(null);
            if (selectedIds.includes(deleteId)) {
                setSelectedIds(prev => prev.filter(id => id !== deleteId));
            }
        } catch (error) {
            toast.error('Failed to delete record');
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = paginatedProcurements.map(p => p.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = paginatedProcurements.map(p => p.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        try {
            await Promise.all(selectedIds.map(id => deleteProcurement(id)));

            toast.success(`${selectedIds.length} records deleted successfully`);
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete some records');
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-white">{pageTitle || "Records"}</h1>

                    </div>

                    <p className="text-muted-foreground mt-1">View and manage file tracking records</p>
                </div>

                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Selected ({selectedIds.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border text-foreground">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {selectedIds.length} Records?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                        This action cannot be undone. This will permanently delete the selected procurement records.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-border text-white hover:bg-muted">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {!['viewer', 'archiver'].includes(user?.role || '') && (
                        <Button onClick={() => navigate('/procurement/add')} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Record
                        </Button>
                    )}
                    {(typeFilters.includes('SVP') || typeFilters.includes('Regular Bidding')) && !['viewer', 'archiver'].includes(user?.role || '') && (
                        <Button onClick={handleExportClick} className="bg-emerald-600 hover:bg-emerald-700">
                            <FileText className="mr-2 h-4 w-4" />
                            Export as CSV
                        </Button>
                    )}
                    {/* Import CSV (admin / bac-staff only) */}
                    {!['viewer', 'archiver'].includes(user?.role || '') && (
                        <>
                            <input
                                ref={importFileRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={handleImportCSV}
                            />
                            <Button
                                onClick={() => importFileRef.current?.click()}
                                disabled={isImporting}
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                {isImporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {isImporting ? 'Importing…' : 'Import CSV'}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-border text-muted-foreground hover:bg-muted">
                                        <Download className="mr-2 h-4 w-4" />
                                        Template
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-card border-border text-foreground">
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('SVP')} className="hover:bg-muted cursor-pointer">
                                        <Download className="mr-2 h-4 w-4" /> SVP Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('Regular Bidding')} className="hover:bg-muted cursor-pointer">
                                        <Download className="mr-2 h-4 w-4" /> Regular Bidding Template
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>

            <Card className="border-none bg-background shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search and Date Range */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search PR Number, Project Name or description..."
                                    className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                            {/* Date Range Filter (Typable) */}
                            <div className="flex items-center gap-2 bg-card rounded-md border border-border p-1 min-w-fit">
                                <Select value={filterDateType} onValueChange={(val: any) => setFilterDateType(val)}>
                                    <SelectTrigger className="w-[140px] h-6 text-xs border-none bg-transparent focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="createdAt">Date Created</SelectItem>
                                        <SelectItem value="deadline">Procurement Deadline</SelectItem>
                                        <SelectItem value="dateAdded">Record Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1 px-2 border-l border-border">
                                    <span className="text-xs text-muted-foreground">From:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-white text-xs focus:ring-0 w-[110px] h-6"
                                        value={filterDateRange?.from ? format(filterDateRange.from, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => setFilterDateRange(prev => ({ from: e.target.value ? new Date(e.target.value) : undefined, to: prev?.to }))}
                                    />
                                </div>
                                <div className="flex items-center gap-1 px-2 border-l border-border">
                                    <span className="text-xs text-muted-foreground">To:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-white text-xs focus:ring-0 w-[110px] h-6"
                                        value={filterDateRange?.to ? format(filterDateRange.to, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => setFilterDateRange(prev => ({ from: prev?.from, to: e.target.value ? new Date(e.target.value) : undefined }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Location Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {/* Box Filter */}
                            <div className="bg-card rounded-md border border-border p-1">
                                <Select
                                    value={filters.boxId || "all"}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, boxId: val === "all" ? "" : val, cabinetId: "", shelfId: "", folderId: "" }))}
                                    disabled={!!filters.cabinetId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Boxes" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="all">All Boxes</SelectItem>
                                        {boxes.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Cabinet Filter */}
                            <div className="bg-card rounded-md border border-border p-1">
                                <Select
                                    value={filters.cabinetId || "all"}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, cabinetId: val === "all" ? "" : val, shelfId: "", folderId: "", boxId: "" }))} // Clear box if shelf selected
                                    disabled={!!filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Drawers" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="all">All Drawers</SelectItem>
                                        {cabinets.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-card rounded-md border border-border p-1">
                                <Select
                                    value={filters.shelfId}
                                    onValueChange={(value) => setFilters({
                                        ...filters,
                                        shelfId: value,
                                        folderId: '' // Reset child
                                    })}
                                    disabled={!filters.cabinetId || !!filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Cabinet" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="all_shelves">All Cabinets</SelectItem>
                                        {filterAvailableShelves.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-card rounded-md border border-border p-1">
                                <Select
                                    value={filters.folderId}
                                    onValueChange={(value) => setFilters({ ...filters, folderId: value })}
                                    disabled={!filters.shelfId && !filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Folder" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="all_folders">All Folders</SelectItem>
                                        {filterAvailableFolders.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 3: Properties & Sort */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* STATUS multi-select dropdown */}
                            <div className="flex-1 min-w-[120px] bg-card rounded-md border border-border p-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>Status</span>
                                                {statusFilters.length > 0 && (
                                                    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-medium">
                                                        {statusFilters.length}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-card border-border text-foreground p-3 w-56">
                                        <div className="mb-2 text-muted-foreground text-sm">Select status</div>
                                        <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                            {statusOptions.map((status) => (
                                                <div key={status} className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={statusFilters.includes(status)}
                                                        onCheckedChange={() => toggleStatusFilter(status)}
                                                        className="border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatusFilter(status)}
                                                        className="text-sm text-foreground text-left w-full"
                                                    >
                                                        {getStatusLabel(status)}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>



                            {/* Process Status Filter (Multi-select) */}
                            <div className="flex-1 min-w-[140px] bg-card rounded-md border border-border p-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>Process Status</span>
                                                {procurementStatusFilters.length > 0 && (
                                                    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-medium">
                                                        {procurementStatusFilters.length}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-card border-border text-foreground p-3 w-56">
                                        <div className="mb-2 text-muted-foreground text-sm">Select process status</div>
                                        <div className="flex flex-col gap-2">
                                            {PROCESS_STATUS_OPTIONS.map((status) => (
                                                <div key={status} className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={procurementStatusFilters.includes(status)}
                                                        onCheckedChange={() => toggleProcurementStatusFilter(status)}
                                                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleProcurementStatusFilter(status)}
                                                        className="text-sm text-foreground text-left w-full"
                                                    >
                                                        {status}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>


                            {/* Division Filter */}
                            <div className="flex-1 min-w-[150px] bg-card rounded-md border border-border p-1">
                                <Select
                                    value={filterDivision}
                                    onValueChange={setFilterDivision}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Divisions" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="all_divisions">All Divisions</SelectItem>
                                        {divisions.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((d) => (
                                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type Filter (Multi-select) - OR specific column toggles? */}
                            {!forcedType && (
                                <div className="flex-1 min-w-[120px] bg-card rounded-md border border-border p-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span>Type</span>
                                                    {typeFilters.length > 0 && (
                                                        <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-medium">
                                                            {typeFilters.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="bg-card border-border text-foreground p-3 w-56">
                                            <div className="mb-2 text-muted-foreground text-sm">Select type</div>
                                            <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                                {typeOptions.map((type) => (
                                                    <div key={type} className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={typeFilters.includes(type)}
                                                            onCheckedChange={() => toggleTypeFilter(type)}
                                                            className="border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTypeFilter(type)}
                                                            className="text-sm text-foreground text-left w-full"
                                                        >
                                                            {type}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}

                            {/* SORT controls */}
                            <div className="flex-none flex items-center gap-2 bg-card rounded-md border border-border p-1">
                                <Select value={sortField} onValueChange={(value) => setSortField(value as 'name' | 'prNumber' | 'date' | 'stackNumber')}>
                                    <SelectTrigger className="w-[120px] border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="prNumber">PR Number</SelectItem>
                                        <SelectItem value="date">Date Added</SelectItem>
                                        <SelectItem value="stackNumber">Stack Number</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="h-6 w-8 text-muted-foreground hover:text-white"
                                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                className="bg-card border-border text-muted-foreground hover:text-white ml-auto h-8 px-3"
                                title="Clear Filters"
                            >
                                <FilterX className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="w-[50px]">
                                        {!['viewer', 'archiver'].includes(user?.role || '') && (
                                            <Checkbox
                                                checked={paginatedProcurements.length > 0 && paginatedProcurements.every(p => selectedIds.includes(p.id))}
                                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        )}
                                    </TableHead>
                                    <TableHead className="text-muted-foreground w-[100px]">{forcedType === 'Regular Bidding' ? 'IB Number' : 'PR Number'}</TableHead>
                                    <TableHead className="text-muted-foreground">Project Title (Particulars)</TableHead>
                                    {forcedType === 'Regular Bidding' && <TableHead className="text-muted-foreground">ABC</TableHead>}
                                    <TableHead className="text-muted-foreground w-[90px]">End User</TableHead>
                                    {!forcedType && <TableHead className="text-muted-foreground w-[100px]">Type</TableHead>}
                                    <TableHead className="text-muted-foreground w-[100px]">Location</TableHead>
                                    <TableHead className="text-center text-muted-foreground w-[70px]">Stack #</TableHead>
                                    {/* <TableHead className="text-muted-foreground w-[100px]">Urgency / Deadline</TableHead> */}
                                    <TableHead className="text-muted-foreground w-[120px]">Current Progress</TableHead>
                                    <TableHead className="text-muted-foreground w-[110px]">Status</TableHead>
                                    <TableHead className="text-muted-foreground w-[120px]">Date Progress Updated</TableHead>
                                    <TableHead className="text-right text-muted-foreground w-[140px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedProcurements.length === 0 ? (
                                    <TableRow className="border-border">
                                        <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProcurements.map((procurement) => {
                                        const pStatus = procurement.procurementStatus || 'Not yet Acted';

                                        // Current Stage (Last Completed Step)
                                        const getLastStage = (p: Procurement) => {
                                            if (p.procurementType === 'Regular Bidding') {
                                                // Regular Bidding - Check in reverse chronological order (latest first)
                                                if (p.awardedToDate) return 'Awarded to Supplier';
                                                if (p.forwardedOapiDate) return 'To OAPIA';
                                                if (p.ntpDate) return 'NTP';
                                                if (p.contractDate) return 'Contract Date';
                                                if (p.noaDate) return 'NOA';
                                                if (p.postQualReportDate) return 'Post-Qual Report';
                                                if (p.postQualDate) return 'Post-Qual';
                                                if (p.bidEvaluationDate) return 'Bid Eval Report';
                                                if (p.bidOpeningDate) return 'Bid Opening';
                                                if (p.preBidDate) return 'Pre-bid';
                                                if (p.publishedDate) return 'Published';
                                                if (p.prDeliberatedDate) return 'PR Deliberated';
                                                if (p.receivedPrDate) return 'Received PR for Action';
                                                return 'Not yet Acted';
                                            } else if (p.procurementType === 'Shopping') {
                                                if (p.shoppingPurchaseOrderDate) return 'PO Issued';
                                                if (p.shoppingAbstractDate) return 'Abstract';
                                                if (p.shoppingCanvassDate) return 'Canvass / Price Inquiry';
                                                if (p.shoppingRfqDate) return 'RFQ Prep';
                                                if (p.shoppingBudgetCertDate) return 'Budget Cert';
                                                if (p.shoppingReceivedDate) return 'Received PR for Action';
                                                return 'Not yet Acted';
                                            } else {
                                                // SVP
                                                if (p.poNtpForwardedGsdDate) return 'Add PO/NTP to GSD';
                                                if (p.forwardedGsdDate) return 'Forwarded GSD for P.O.';
                                                if (p.bacResolutionDate) return 'BAC Resolution';
                                                if (p.rfqOpeningDate) return 'RFQ Opening';
                                                if (p.rfqCanvassDate) return 'RFQ for Canvass';
                                                if (p.publishedDate) return 'Published';
                                                if (p.prDeliberatedDate) return 'PR Deliberated';
                                                if (p.receivedPrDate) return 'Received PR for Action';
                                                return 'Not yet Acted';
                                            }
                                        };
                                        const currentStage = getLastStage(procurement);

                                        // Determine Effective Status for Coloring
                                        // User logic: "Completed(Green), Processing(Yellow), Returned PR to EU(Purple), Not yet Acted(Gray), Failure(Red), Cancelled(Red Orange)"
                                        let effectiveStatus = pStatus || 'Not yet Acted';

                                        // If status is Pending (legacy), treat as Processing
                                        if (pStatus === 'Pending') effectiveStatus = 'Processing';

                                        // Row Background & Border Classes
                                        let bgClass = '';
                                        let borderClass = '';
                                        let textStatusClass = '';

                                        // Pure vivid colors: Completed=Green, Processing=Yellow, Returned PR=Purple, Failure=Red, Cancelled=Orange, Not yet Acted=Gray
                                        switch (effectiveStatus) {
                                            case 'Completed':
                                            case 'Success': // Legacy
                                                bgClass = 'bg-green-500/25 hover:bg-green-500/35';
                                                borderClass = 'border-l-4 border-l-green-500';
                                                textStatusClass = 'text-green-400 font-semibold';
                                                break;
                                            case 'Processing':
                                            case 'In Progress': // Legacy data support
                                                bgClass = 'bg-yellow-400/20 hover:bg-yellow-400/30';
                                                borderClass = 'border-l-4 border-l-yellow-400';
                                                textStatusClass = 'text-yellow-400 font-semibold';
                                                break;
                                            case 'Returned PR to EU':
                                            case 'Return PR to EU' as any:
                                                bgClass = 'bg-purple-500/25 hover:bg-purple-500/35';
                                                borderClass = 'border-l-4 border-l-purple-500';
                                                textStatusClass = 'text-purple-400 font-semibold';
                                                break;
                                            case 'Failure':
                                            case 'Failed': // Legacy
                                                bgClass = 'bg-red-500/25 hover:bg-red-500/35';
                                                borderClass = 'border-l-4 border-l-red-500';
                                                textStatusClass = 'text-red-400 font-semibold';
                                                break;
                                            case 'Cancelled':
                                                bgClass = 'bg-orange-500/25 hover:bg-orange-500/35';
                                                borderClass = 'border-l-4 border-l-orange-500';
                                                textStatusClass = 'text-orange-400 font-semibold';
                                                break;
                                            case 'Not yet Acted':
                                            default:
                                                bgClass = 'bg-slate-500/10 hover:bg-slate-500/20';
                                                borderClass = 'border-l-4 border-l-slate-500';
                                                textStatusClass = 'text-muted-foreground';
                                                break;
                                        }

                                        // Find Division Acronym
                                        const div = divisions.find(d => d.name === procurement.division);
                                        const divAcronym = div ? div.abbreviation : (procurement.division || '-');

                                        return (
                                            <TableRow key={procurement.id} className={`border-border transition-colors ${bgClass}`}>
                                                <TableCell className={`${borderClass}`}>
                                                    {!['viewer', 'archiver'].includes(user?.role || '') && (
                                                        <Checkbox
                                                            checked={selectedIds.includes(procurement.id)}
                                                            onCheckedChange={(checked) => handleSelectOne(procurement.id, checked as boolean)}
                                                            className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium text-white text-xs w-[140px]">
                                                    {procurement.prNumber}
                                                </TableCell>
                                                <TableCell className="max-w-[250px] truncate text-muted-foreground font-medium" title={procurement.projectName || ''}>
                                                    {procurement.projectName || '-'}
                                                    <div className="text-[10px] text-muted-foreground italic truncate">{procurement.description}</div>
                                                </TableCell>
                                                {forcedType === 'Regular Bidding' && (
                                                    <TableCell className="text-muted-foreground">
                                                        {procurement.abc ? `₱${procurement.abc.toLocaleString()}` : '-'}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-muted-foreground text-xs" title={procurement.division || ''}>
                                                    {divAcronym}
                                                </TableCell>
                                                {!forcedType && (
                                                    <TableCell className="text-muted-foreground">
                                                        {procurement.procurementType === 'Regular Bidding' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                Regular
                                                            </span>
                                                        ) : procurement.procurementType === 'SVP' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                SVP
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-muted-foreground border border-slate-500/20">
                                                                {procurement.procurementType || '-'}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <span className="font-mono text-xs bg-slate-800/50 px-1.5 py-0.5 rounded border border-border/50">
                                                            {getLocationString(procurement)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-muted-foreground text-xs font-mono">
                                                        {procurement.stackNumber ? `${procurement.stackNumber}` : '-'}
                                                    </span>
                                                </TableCell>
                                                {/* <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex w-max items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${procurement.urgencyLevel === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                procurement.urgencyLevel === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                                    procurement.urgencyLevel === 'Low' ? 'bg-slate-500/10 text-muted-foreground border-slate-500/20' :
                                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            }`}>
                                                            {procurement.urgencyLevel || 'Medium'}
                                                        </span>
                                                        {procurement.deadline && (
                                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                <CalendarIcon className="w-3 h-3 inline mr-1" />
                                                                {format(new Date(procurement.deadline), 'MMM d, yyyy')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell> */}
                                                <TableCell className="text-xs font-medium">
                                                    {/* "Current Progress" shows the NEXT stage/step */}
                                                    <span className={`${textStatusClass}`} title={`Status: ${effectiveStatus}`}>
                                                        {currentStage}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={procurement.status === 'active' ? 'active' : (procurement.storageStatus === 'Processing' ? 'processing' : 'archived')}
                                                        onValueChange={(value) => handleStatusChange(procurement, value as any)}
                                                        disabled={['viewer', 'archiver'].includes(user?.role || '')}
                                                    >
                                                        <SelectTrigger className={`w-[115px] h-7 text-xs border ${procurement.status === 'active'
                                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                                : procurement.storageStatus === 'Processing'
                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                    : 'bg-slate-700/50 text-muted-foreground border-border'
                                                            }`}>
                                                            <SelectValue>
                                                                {procurement.status === 'active' ? 'Borrowed' : procurement.storageStatus === 'Processing' ? 'Processing' : 'In Storage'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                            <SelectItem value="active" className="text-orange-400 focus:text-orange-400 text-xs">Borrowed</SelectItem>
                                                            <SelectItem value="processing" className="text-blue-400 focus:text-blue-400 text-xs">Processing</SelectItem>
                                                            <SelectItem value="archived" className="text-slate-300 focus:text-white text-xs">In Storage</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {(() => {
                                                        const latest = getLatestActionDate(procurement);
                                                        return latest ? format(latest, 'MMM d, yyyy') : '-';
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Reorder Stack Number button */}
                                                        {procurement.folderId && !['viewer', 'archiver'].includes(user?.role || '') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRelocateClick(procurement)}
                                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                                title="Reorder Stack Number"
                                                            >
                                                                <ArrowUp className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => navigate(`/procurement/progress?search=${encodeURIComponent(procurement.prNumber)}`)}
                                                            className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                                            title="View Progress Tracking"
                                                        >
                                                            <Activity className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewProcurement(procurement)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-slate-700/50"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {!['viewer', 'archiver'].includes(user?.role || '') && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEdit(procurement)}
                                                                    className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                                    title="Edit Details"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => setDeleteId(procurement.id)}
                                                                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="bg-card border-border text-foreground">
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                                            <AlertDialogDescription className="text-muted-foreground">
                                                                                This action cannot be undone. This will permanently delete the procurement record.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel className="bg-transparent border-border text-white hover:bg-muted">Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Legend Card - Floating Bottom Right */}
                    {/* Legend Popover - Fixed Bottom Right */}
                    <div className="fixed bottom-6 right-6 z-50">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-full bg-card border-border shadow-lg hover:bg-muted text-muted-foreground hover:text-white transition-all hover:scale-105"
                                >
                                    <Info className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-card border-border p-4 shadow-xl mb-2 mr-2" align="end" side="top">
                                <h4 className="font-semibold text-white mb-3 text-sm border-b border-border pb-2">Status Legend</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Completed</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Processing</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Returned PR to EU</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Not yet Acted</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Failure</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.5)]"></div>
                                        <span className="text-xs text-muted-foreground">Cancelled</span>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {paginatedProcurements.length} of {filteredProcurements.length} records
                            <span className="mx-2">•</span>
                            Page {currentPage} of {totalPages}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Go to:</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="#"
                                    className="w-16 h-8 bg-background border-border text-foreground text-xs"
                                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleJumpToPage}
                                    className="h-8 px-2 bg-card border-border text-foreground hover:bg-muted"
                                >
                                    Go
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="bg-card border-border text-foreground disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="bg-card border-border text-foreground disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Edit Dialog - Fixed Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="border-border bg-background text-white max-w-7xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Edit Record</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Update the procurement details and location.
                        </DialogDescription>
                    </DialogHeader>

                    {editingProcurement && (<>
                        <div className="flex-1 overflow-y-auto p-6 pt-2">
                            <div className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        {!['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <Label className="text-muted-foreground">PR Number Construction</Label>
                                                    <div className="flex bg-card p-1 rounded-lg border border-border text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditPrFormat('old')}
                                                            className={`px-3 py-1 rounded-md font-medium transition-all ${editPrFormat === 'old' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                        >
                                                            Old (Div-Mon-Yr-#)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditPrFormat('new')}
                                                            className={`px-3 py-1 rounded-md font-medium transition-all ${editPrFormat === 'new' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                        >
                                                            New (Yr-Mon-#)
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={`grid gap-2 items-end p-3 rounded-lg bg-card/50 border border-border/50 ${editPrFormat === 'old' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                                    {editPrFormat === 'old' && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Division</Label>
                                                            <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                                                                <SelectTrigger className="bg-card border-border text-foreground h-8 text-xs">
                                                                    <SelectValue placeholder="Div" />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                                    {divisions.map(div => (
                                                                        <SelectItem key={div.id} value={div.id}>{div.abbreviation}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Month</Label>
                                                        <Select value={editPrMonth} onValueChange={setEditPrMonth}>
                                                            <SelectTrigger className="bg-card border-border text-foreground h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                                {MONTHS.map(m => (
                                                                    <SelectItem key={m.value} value={m.value}>{m.value}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Year</Label>
                                                        <Input
                                                            value={editPrYear}
                                                            onChange={(e) => setEditPrYear(e.target.value)}
                                                            className="bg-card border-border text-foreground h-8 text-xs"
                                                            maxLength={4}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Seq</Label>
                                                        <Input
                                                            value={editPrSequence}
                                                            onChange={(e) => setEditPrSequence(e.target.value)}
                                                            className="bg-card border-border text-foreground h-8 text-xs"
                                                            maxLength={7}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground flex flex-col gap-1">
                                                    <div className="flex justify-between items-center">
                                                        <span>Preview: <span className="font-mono text-emerald-400 font-bold ml-1">
                                                            {editPrFormat === 'old'
                                                                ? (editDivisionId && divisions.find(d => d.id === editDivisionId)
                                                                    ? `${divisions.find(d => d.id === editDivisionId)?.abbreviation}-${editPrMonth}-${editPrYear.length === 4 ? editPrYear.slice(-2) : editPrYear}-${editPrSequence}`
                                                                    : 'XXX-XXX-XX-XXX')
                                                                : (editPrYear && editPrMonth && editPrSequence ? `${editPrYear}-${editPrMonth}-${editPrSequence}` : 'XXXX-XXX-XXXX')
                                                            }
                                                        </span></span>
                                                        <span>Current: <span className="font-mono text-emerald-500">{editingProcurement.prNumber}</span></span>
                                                    </div>
                                                    <div className="flex justify-start">
                                                        {isCheckingEditPr ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                                                <span className="text-[10px] text-muted-foreground italic">Validating ID...</span>
                                                            </div>
                                                        ) : (editPrExists !== null && (
                                                            editPrExists
                                                                ? <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse">PR Existed</span>
                                                                : <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">PR still not on Records</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Project Name</Label>
                                        <Input
                                            value={editingProcurement.projectName || ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, projectName: e.target.value })}
                                            className="bg-card border-border text-foreground"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Procurement Date</Label>
                                        <Input
                                            type="date"
                                            value={editingProcurement.procurementDate ? format(new Date(editingProcurement.procurementDate), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, procurementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                            className="bg-card border-border text-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Date Added</Label>
                                        <Input
                                            type="date"
                                            value={format(new Date(editingProcurement.dateAdded), 'yyyy-MM-dd')}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, dateAdded: e.target.value ? new Date(e.target.value).toISOString() : editingProcurement.dateAdded })}
                                            className="bg-card border-border text-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">End User (Division)</Label>
                                        <Select
                                            value={editingProcurement.division || ''}
                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, division: val })}
                                        >
                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                <SelectValue placeholder="Select Division" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Project Description</Label>
                                    <Textarea
                                        value={editingProcurement.description}
                                        onChange={(e) => setEditingProcurement({ ...editingProcurement, description: e.target.value })}
                                        className="bg-card border-border text-foreground"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Procurement Type Dropdown - Restricted or Full based on type */}
                                    {!['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Procurement Type</Label>
                                            <Select
                                                value={(editingProcurement.procurementType || 'Regular Bidding') as any}
                                                onValueChange={(value) => setEditingProcurement({ ...editingProcurement, procurementType: value as any })}
                                            >
                                                <SelectTrigger className="bg-card border-border text-foreground">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-border text-foreground">
                                                    {['Regular Bidding', 'SVP', 'Receipt', 'Official Receipt'].includes(editingProcurement.procurementType || 'Regular Bidding') ? (
                                                        <>
                                                            <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                                            <SelectItem value="SVP">Small Value Procurement (SVP)</SelectItem>
                                                            <SelectItem value="Receipt">Receipt</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                                            <SelectItem value="SVP">Small Value Procurement (SVP)</SelectItem>
                                                            <SelectItem value="Shopping">Shopping</SelectItem>
                                                            <SelectItem value="Direct Contracting">Direct Contracting</SelectItem>
                                                            <SelectItem value="Negotiated Procurement">Negotiated Procurement</SelectItem>
                                                            <SelectItem value="Attendance Sheets">Attendance Sheet</SelectItem>
                                                            <SelectItem value="Receipt">Receipt</SelectItem>
                                                            <SelectItem value="Others">Others</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-5">
                                        <Label className="text-muted-foreground">Process Status</Label>
                                        <Select
                                            value={editingProcurement.procurementStatus || 'Not yet Acted'}
                                            onValueChange={(value) => setEditingProcurement({ ...editingProcurement, procurementStatus: value })}
                                        >
                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border text-foreground">
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Processing">Processing</SelectItem>
                                                <SelectItem value="Returned PR to EU">Returned PR to EU</SelectItem>
                                                <SelectItem value="Not yet Acted">Not yet Acted</SelectItem>
                                                <SelectItem value="Failure">Failure</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Financial Information */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">ABC (Approved Budget for Contract)</Label>
                                            <Input
                                                type="text"
                                                value={getDisplayValue(String(editingProcurement.abc || ''))}
                                                onChange={(e) => handleNumberInput(e.target.value, (val) => setEditingProcurement({ ...editingProcurement, abc: val as any }))}
                                                placeholder="5,000,000.00"
                                                className="bg-card border-border text-foreground font-mono"
                                            />
                                            <p className="text-xs text-muted-foreground">Amount in Philippine Pesos</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Bid Amount (Contract Price)</Label>
                                            <Input
                                                type="text"
                                                value={getDisplayValue(String(editingProcurement.bidAmount || ''))}
                                                onChange={(e) => handleNumberInput(e.target.value, (val) => setEditingProcurement({ ...editingProcurement, bidAmount: val as any }))}
                                                placeholder="5,000,000.00"
                                                className="bg-card border-border text-foreground font-mono"
                                            />
                                            <p className="text-xs text-muted-foreground">Actual awarded/contract amount</p>
                                        </div>
                                    </div>


                                    {/* Supplier/Awarded to - All types */}
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Supplier / Awarded to <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                                        <Select
                                            value={editingProcurement.supplier || 'none'}
                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, supplier: val === 'none' ? '' : val })}
                                        >
                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                <SelectValue placeholder="Select Supplier" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                <SelectItem value="none" className="text-muted-foreground italic">No Supplier selected</SelectItem>
                                                {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>


                            {/* Monitoring Process (Standard Grid) */}
                            <div className="bg-background p-4 rounded-lg border border-border border-l-4 border-l-blue-500 space-y-4  mt-4 mb-4 shadow-sm min-h-[100px]">
                                <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                                            Monitoring Process
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Update key dates. Use checkboxes to enable/disable steps.</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] h-6 px-2 bg-slate-800 border-border text-muted-foreground hover:text-white hover:bg-slate-700"
                                            onClick={() => {
                                                const today = format(new Date(), 'MM/dd/yyyy');
                                                const isRegular = editingProcurement?.procurementType === 'Regular Bidding';
                                                const isShopping = editingProcurement?.procurementType === 'Shopping';
                                                setEditingProcurement(prev => ({
                                                    ...prev!,
                                                    receivedPrDate: isShopping ? undefined : today,
                                                    prDeliberatedDate: isShopping ? undefined : today,
                                                    publishedDate: isShopping ? undefined : today,
                                                    shoppingReceivedDate: isShopping ? today : undefined,
                                                    shoppingBudgetCertDate: isShopping ? today : undefined,
                                                    shoppingRfqDate: isShopping ? today : undefined,
                                                    shoppingCanvassDate: isShopping ? today : undefined,
                                                    shoppingAbstractDate: isShopping ? today : undefined,
                                                    shoppingPurchaseOrderDate: isShopping ? today : undefined,
                                                    ...(isRegular ? {
                                                        preBidDate: today,
                                                        bidOpeningDate: today,
                                                        bidEvaluationDate: today,
                                                        bacResolutionDate: today,
                                                        postQualDate: today,
                                                        postQualReportDate: today,
                                                        forwardedOapiDate: today,
                                                        noaDate: today,
                                                        contractDate: today,
                                                        ntpDate: today,
                                                        awardedToDate: today,
                                                    } : isShopping ? {} : {
                                                        rfqCanvassDate: today,
                                                        rfqOpeningDate: today,
                                                        bacResolutionDate: today,
                                                        forwardedGsdDate: today,
                                                        poNtpForwardedGsdDate: today,
                                                    })
                                                }));
                                            }}
                                        >
                                            Check All
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] h-6 px-2 bg-slate-800 border-border text-muted-foreground hover:text-white hover:bg-slate-700"
                                            onClick={() => {
                                                setEditingProcurement(prev => ({
                                                    ...prev!,
                                                    receivedPrDate: undefined,
                                                    prDeliberatedDate: undefined,
                                                    publishedDate: undefined,
                                                    preBidDate: undefined,
                                                    bidOpeningDate: undefined,
                                                    bidEvaluationDate: undefined,
                                                    bacResolutionDate: undefined,
                                                    postQualDate: undefined,
                                                    postQualReportDate: undefined,
                                                    forwardedOapiDate: undefined,
                                                    noaDate: undefined,
                                                    contractDate: undefined,
                                                    ntpDate: undefined,
                                                    awardedToDate: undefined,
                                                    rfqCanvassDate: undefined,
                                                    rfqOpeningDate: undefined,
                                                    forwardedGsdDate: undefined,
                                                    poNtpForwardedGsdDate: undefined,
                                                    shoppingReceivedDate: undefined,
                                                    shoppingBudgetCertDate: undefined,
                                                    shoppingRfqDate: undefined,
                                                    shoppingCanvassDate: undefined,
                                                    shoppingAbstractDate: undefined,
                                                    shoppingPurchaseOrderDate: undefined,
                                                }));
                                            }}
                                        >
                                            Uncheck All
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Pre-Procurement */}
                                    {editingProcurement.procurementType !== 'Shopping' && (
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="Received PR to Action" value={editingProcurement.receivedPrDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, receivedPrDate: d, ...(!d ? { prDeliberatedDate: undefined, publishedDate: undefined, preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={false} activeColor="blue" />
                                                <MonitoringDateField label="PR Deliberated" value={editingProcurement.prDeliberatedDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, prDeliberatedDate: d, ...(!d ? { publishedDate: undefined, preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.receivedPrDate} activeColor="blue" />
                                                <MonitoringDateField label="Published" value={editingProcurement.publishedDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, publishedDate: d, ...(!d ? { preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.prDeliberatedDate} activeColor="blue" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bidding / Canvass */}
                                    <div className="space-y-2">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {editingProcurement.procurementType === 'Regular Bidding' ? (
                                                <>
                                                    <MonitoringDateField label="Pre-Bid" value={editingProcurement.preBidDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, preBidDate: d, ...(!d ? { bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.publishedDate} activeColor="purple" />
                                                    <MonitoringDateField label="Bid Opening" value={editingProcurement.bidOpeningDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bidOpeningDate: d, ...(!d ? { bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.preBidDate} activeColor="purple" />
                                                    <MonitoringDateField label="Bid Evaluation Report" value={editingProcurement.bidEvaluationDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bidEvaluationDate: d, ...(!d ? { bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bidOpeningDate} activeColor="purple" />
                                                </>
                                            ) : editingProcurement.procurementType === 'Shopping' ? (
                                                <>
                                                    <MonitoringDateField label="Received PR to Action" value={editingProcurement.shoppingReceivedDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingReceivedDate: d, ...(!d ? { shoppingBudgetCertDate: undefined, shoppingRfqDate: undefined, shoppingCanvassDate: undefined, shoppingAbstractDate: undefined, shoppingPurchaseOrderDate: undefined } : {}) })} disabled={false} activeColor="amber" />
                                                    <MonitoringDateField label="Budget Certification (CNAS)" value={editingProcurement.shoppingBudgetCertDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingBudgetCertDate: d, ...(!d ? { shoppingRfqDate: undefined, shoppingCanvassDate: undefined, shoppingAbstractDate: undefined, shoppingPurchaseOrderDate: undefined } : {}) })} disabled={!editingProcurement.shoppingReceivedDate} activeColor="amber" />
                                                    <MonitoringDateField label="RFQ Preparation" value={editingProcurement.shoppingRfqDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingRfqDate: d, ...(!d ? { shoppingCanvassDate: undefined, shoppingAbstractDate: undefined, shoppingPurchaseOrderDate: undefined } : {}) })} disabled={!editingProcurement.shoppingBudgetCertDate} activeColor="amber" />
                                                    <MonitoringDateField label="Canvass / Price Inquiry" value={editingProcurement.shoppingCanvassDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingCanvassDate: d, ...(!d ? { shoppingAbstractDate: undefined, shoppingPurchaseOrderDate: undefined } : {}) })} disabled={!editingProcurement.shoppingRfqDate} activeColor="amber" />
                                                    <MonitoringDateField label="Abstract & LCRB" value={editingProcurement.shoppingAbstractDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingAbstractDate: d, ...(!d ? { shoppingPurchaseOrderDate: undefined } : {}) })} disabled={!editingProcurement.shoppingCanvassDate} activeColor="amber" />
                                                    <MonitoringDateField label="Purchase Order Issued" value={editingProcurement.shoppingPurchaseOrderDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, shoppingPurchaseOrderDate: d })} disabled={!editingProcurement.shoppingAbstractDate} activeColor="amber" />
                                                </>
                                            ) : (
                                                <>
                                                    <MonitoringDateField label="RFQ to Canvass" value={editingProcurement.rfqCanvassDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, rfqCanvassDate: d, ...(!d ? { rfqOpeningDate: undefined, bacResolutionDate: undefined, forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.publishedDate} activeColor="purple" />
                                                    <MonitoringDateField label="RFQ Opening" value={editingProcurement.rfqOpeningDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, rfqOpeningDate: d, ...(!d ? { bacResolutionDate: undefined, forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.rfqCanvassDate} activeColor="purple" />
                                                    <MonitoringDateField label="BAC Resolution" value={editingProcurement.bacResolutionDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bacResolutionDate: d, ...(!d ? { forwardedGsdDate: undefined, poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.rfqOpeningDate} activeColor="purple" />
                                                    <MonitoringDateField label="Forwarded to GSD for P.O" value={editingProcurement.forwardedGsdDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, forwardedGsdDate: d, ...(!d ? { poNtpForwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.bacResolutionDate} activeColor="purple" />
                                                    <MonitoringDateField label="PO/NTP Forwarded to GSD" value={editingProcurement.poNtpForwardedGsdDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, poNtpForwardedGsdDate: d })} disabled={!editingProcurement.forwardedGsdDate} activeColor="purple" />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Qualification & Award */}
                                    <div className="space-y-2">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {editingProcurement.procurementType === 'Regular Bidding' && (
                                                <>
                                                    <MonitoringDateField label="BAC Resolution" value={editingProcurement.bacResolutionDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bacResolutionDate: d, ...(!d ? { postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bidEvaluationDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Post Qualification" value={editingProcurement.postQualDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, postQualDate: d, ...(!d ? { postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bacResolutionDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Post Qualification Report" value={editingProcurement.postQualReportDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, postQualReportDate: d, ...(!d ? { forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.postQualDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Forwarded to OAPIA" value={editingProcurement.forwardedOapiDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, forwardedOapiDate: d, ...(!d ? { noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.postQualReportDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Notice of Award" value={editingProcurement.noaDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, noaDate: d, ...(!d ? { contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.forwardedOapiDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Contract Date" value={editingProcurement.contractDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, contractDate: d, ...(!d ? { ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.noaDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Notice to Proceed" value={editingProcurement.ntpDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, ntpDate: d, ...(!d ? { awardedToDate: undefined } : {}) })} disabled={!editingProcurement.contractDate} activeColor="emerald" />
                                                </>
                                            )}

                                            {editingProcurement.procurementType === 'Regular Bidding' ? (
                                                <>
                                                    {/* Awarded to (Date + Supplier Name) - Regular Bidding Only */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className={`text-xs ${!editingProcurement.ntpDate ? 'text-slate-600' : 'text-muted-foreground'}`}>Awarded Date</Label>
                                                            <Checkbox
                                                                checked={!!editingProcurement.awardedToDate}
                                                                onCheckedChange={(checked) => {
                                                                    const newDate = checked ? (editingProcurement.awardedToDate || new Date().toISOString()) : undefined;
                                                                    setEditingProcurement({ ...editingProcurement, awardedToDate: newDate });
                                                                }}
                                                                disabled={!editingProcurement.ntpDate}
                                                                className="h-3.5 w-3.5 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 disabled:opacity-50"
                                                            />
                                                        </div>
                                                        <Input
                                                            type="date"
                                                            value={editingProcurement.awardedToDate ? format(new Date(editingProcurement.awardedToDate), 'yyyy-MM-dd') : ''}
                                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, awardedToDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                            disabled={!editingProcurement.ntpDate}
                                                            className={`bg-card border-border text-foreground h-8 text-xs ${!editingProcurement.ntpDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className={`text-xs ${!editingProcurement.awardedToDate ? 'text-slate-600' : 'text-muted-foreground'}`}>Supplier</Label>
                                                        </div>
                                                        <Select
                                                            value={editingProcurement.supplier || 'none'}
                                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, supplier: val === 'none' ? '' : val })}
                                                            disabled={!editingProcurement.awardedToDate || !editingProcurement.ntpDate}
                                                        >
                                                            <SelectTrigger className={`bg-card border-border text-foreground h-8 text-xs ${!editingProcurement.awardedToDate || !editingProcurement.ntpDate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                <SelectValue placeholder="Supplier Name" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                                <SelectItem value="none" className="text-muted-foreground italic text-xs">No Supplier</SelectItem>
                                                                {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                                                    <SelectItem key={s.id} value={s.name} className="text-xs">{s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </>
                                            ) : (
                                                /* SVP: no extra block needed here — handled in canvass section above */
                                                null
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checklist (Always shown for reference, or user can ignore) */}
                            {editingProcurement && !['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                <div className="bg-background p-4 rounded-lg border border-border space-y-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">Attached Documents</h3>
                                            <p className="text-xs text-muted-foreground">Combined Checklist</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Replace the Check All button */}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] h-6 px-2 bg-slate-800 border-border text-muted-foreground hover:text-white"
                                                onClick={() => {
                                                    // Create a new checklist object with all items checked
                                                    // Dynamic Check All
                                                    const allChecked = checklistItems.reduce((acc, item) => ({ ...acc, [item.key]: true }), {});

                                                    setEditingProcurement(prev => ({
                                                        ...prev!,
                                                        checklist: allChecked
                                                    }));
                                                }}
                                            >
                                                Check All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] h-6 px-2 bg-slate-800 border-border text-muted-foreground hover:text-white"
                                                onClick={() => {
                                                    // Create a new checklist object with all items unchecked
                                                    // Dynamic Clear All
                                                    const allUnchecked = checklistItems.reduce((acc, item) => ({ ...acc, [item.key]: false }), {});

                                                    setEditingProcurement(prev => ({
                                                        ...prev!,
                                                        checklist: allUnchecked
                                                    }));
                                                }}
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-xs max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {checklistItems.map((item) => (
                                            <div key={item.key} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50">
                                                <Checkbox
                                                    id={`edit-${item.key}`}
                                                    checked={editingProcurement.checklist?.[item.key as keyof typeof editingProcurement.checklist] || false}
                                                    onCheckedChange={(checked) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        checklist: {
                                                            ...editingProcurement.checklist,
                                                            [item.key]: checked
                                                        } as any
                                                    })}
                                                    className="h-3 w-3 border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <Label
                                                    htmlFor={`edit-${item.key}`}
                                                    className="text-[10px] leading-none text-muted-foreground cursor-pointer"
                                                >
                                                    {item.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}




                            <div className="space-y-4 border-t border-border pt-4">
                                <div className="border border-border p-4 rounded-xl bg-slate-800/20 space-y-4 mb-6">
                                    <Label className="text-muted-foreground">Status / Storage Status</Label>
                                    <Select 
                                        value={editingProcurement.status === 'active' ? 'Borrowed' : (editingProcurement.storageStatus || 'Processing')} 
                                        onValueChange={(val: any) => {
                                            if (val === 'Borrowed') {
                                                setEditingProcurement({ ...editingProcurement, status: 'active' });
                                            } else {
                                                setEditingProcurement({ ...editingProcurement, status: 'archived', storageStatus: val });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-card border-border text-foreground w-full max-w-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            <SelectItem value="Borrowed">Borrowed</SelectItem>
                                            <SelectItem value="Processing">Processing</SelectItem>
                                            <SelectItem value="In Storage">In Storage</SelectItem>
                                            <SelectItem value="Archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(editingProcurement.storageStatus === 'In Storage' || editingProcurement.storageStatus === 'Archived') && editingProcurement.status !== 'active' && (
                                    <>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-lg font-semibold text-white">Location</Label>
                                            <div className="flex bg-card p-1 rounded-lg border border-border">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Switch to Drawer Mode (Clear Box ID)
                                                        setEditingProcurement({ ...editingProcurement, boxId: null, folderId: null });
                                                    }}
                                                    className={`px-3 py-1 text-xs rounded-md transition-all ${!editingProcurement.boxId ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Drawer Storage
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Switch to Box Mode (Clear Cabinet/Shelf)
                                                        setEditingProcurement({ ...editingProcurement, cabinetId: null, shelfId: null, folderId: null, boxId: '' });
                                                    }}
                                                    className={`px-3 py-1 text-xs rounded-md transition-all ${editingProcurement.boxId !== null && editingProcurement.boxId !== undefined ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Box Storage
                                                </button>
                                            </div>
                                        </div>

                                        <div className="animate-in fade-in">
                                            {editingProcurement.boxId !== null && editingProcurement.boxId !== undefined ? (
                                                // Box Storage Mode
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">Box</Label>
                                                        <Select
                                                            value={editingProcurement.boxId || ''}
                                                            onValueChange={(val) => {
                                                                setEditingProcurement({
                                                                    ...editingProcurement,
                                                                    boxId: val,
                                                                    folderId: null // Reset folder
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                                <SelectValue placeholder="Select Box" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground">
                                                                {boxes.map((b) => (
                                                                    <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">Folder in Box (Optional)</Label>
                                                        <Select
                                                            value={editingProcurement.folderId || ''}
                                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, folderId: val })}
                                                            disabled={!editingProcurement.boxId}
                                                        >
                                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                                <SelectValue placeholder="Select Folder" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground">
                                                                {folders.filter(f => f.boxId === editingProcurement.boxId).map((f) => (
                                                                    <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Drawer Storage Mode
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">Drawer</Label>
                                                        <Select
                                                            value={editingProcurement.cabinetId || ''}
                                                            onValueChange={(val) => {
                                                                setEditingProcurement({
                                                                    ...editingProcurement,
                                                                    cabinetId: val,
                                                                    shelfId: null,
                                                                    folderId: null
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                                <SelectValue placeholder="Select Drawer" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground">
                                                                {cabinets.map((c) => (
                                                                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">Cabinet</Label>
                                                        <Select
                                                            value={editingProcurement.shelfId || ''}
                                                            onValueChange={(val) => {
                                                                setEditingProcurement({
                                                                    ...editingProcurement,
                                                                    shelfId: val,
                                                                    folderId: null
                                                                });
                                                            }}
                                                            disabled={!editingProcurement.cabinetId}
                                                        >
                                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                                <SelectValue placeholder="Select Cabinet" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground">
                                                                {shelves.filter(s => s.cabinetId === editingProcurement.cabinetId).map((s) => (
                                                                    <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">Folder (Optional)</Label>
                                                        <Select
                                                            value={editingProcurement.folderId || ''}
                                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, folderId: val })}
                                                            disabled={!editingProcurement.shelfId}
                                                        >
                                                            <SelectTrigger className="bg-card border-border text-foreground">
                                                                <SelectValue placeholder="Select Folder" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border text-foreground">
                                                                {folders.filter(f => f.shelfId === editingProcurement.shelfId && !f.boxId).map((f) => (
                                                                    <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="border-t border-border pt-4">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Select
                                        value={editingProcurement.status}
                                        onValueChange={(val) => {
                                            const newStatus = val as ProcurementStatus;
                                            const updates = { ...editingProcurement, status: newStatus };

                                            // Auto-set borrowed date if moving to active and no date set
                                            if (newStatus === 'active' && !updates.borrowedDate) {
                                                const now = new Date();
                                                // Adjust for offset if needed, or just use ISO (common practice)
                                                // Using local YYYY-MM-DD for input compatibility or ISO for storage
                                                updates.borrowedDate = now.toISOString();
                                            }

                                            setEditingProcurement(updates);
                                        }}
                                    >
                                        <SelectTrigger className="bg-card border-border text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            <SelectItem value="archived">Archived (In Storage)</SelectItem>
                                            <SelectItem value="active">Borrowed (Out)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Borrower Information Section - Always shown when Active */}
                            {
                                editingProcurement.status === 'active' && (
                                    <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                            <h4 className="text-amber-400 font-semibold text-sm">Borrowed Information</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Who Borrows</Label>
                                                <Input
                                                    value={editingProcurement.borrowedBy || ''}
                                                    onChange={(e) => setEditingProcurement({ ...editingProcurement, borrowedBy: e.target.value })}
                                                    className="bg-card border-amber-500/30 text-white focus:border-amber-500"
                                                    placeholder="Enter borrower name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Division Who Borrows</Label>
                                                <Select
                                                    value={editingProcurement.borrowerDivision || ''}
                                                    onValueChange={(val) => setEditingProcurement({ ...editingProcurement, borrowerDivision: val })}
                                                >
                                                    <SelectTrigger className="bg-card border-amber-500/30 text-white focus:border-amber-500">
                                                        <SelectValue placeholder="Select Division" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                                        {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">When Was Borrowed</Label>
                                                <Input
                                                    type="date"
                                                    value={editingProcurement.borrowedDate ? format(new Date(editingProcurement.borrowedDate), 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        borrowedDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
                                                    })}
                                                    className="bg-card border-amber-500/30 text-white focus:border-amber-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Return Date</Label>
                                                <Input
                                                    type="date"
                                                    value={editingProcurement.returnDate ? format(new Date(editingProcurement.returnDate), 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => setEditingProcurement({ ...editingProcurement, returnDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                    className="bg-card border-amber-500/30 text-white focus:border-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }


                            {/* Record History Section */}
                            <div className="space-y-4 border-t border-border pt-4">
                                <Label className="text-lg font-semibold text-white">Record History</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Created By</Label>
                                        <Input
                                            value={`${editingProcurement.createdByName || 'Unknown'} (${editingProcurement.createdBy || 'N/A'})`}
                                            disabled
                                            className="bg-card/50 border-border text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Created At</Label>
                                        <Input
                                            value={format(new Date(editingProcurement.createdAt), 'MMMM d, yyyy - hh:mm a')}
                                            disabled
                                            className="bg-card/50 border-border text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {
                                    editingProcurement.editedBy && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Last Edited By</Label>
                                                <Input
                                                    value={`${editingProcurement.editedByName || 'Unknown'} (${editingProcurement.editedBy})`}
                                                    disabled
                                                    className="bg-card/50 border-border text-muted-foreground cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Last Edited At</Label>
                                                <Input
                                                    value={editingProcurement.lastEditedAt ? format(new Date(editingProcurement.lastEditedAt), 'MMMM d, yyyy - hh:mm a') : 'N/A'}
                                                    disabled
                                                    className="bg-card/50 border-border text-muted-foreground cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        </div>

                        <DialogFooter className="p-6 pt-2 border-t border-border bg-background">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-border text-white hover:bg-muted">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={isSaving || (editingProcurement?.storageStatus === 'In Storage' && !((!editingProcurement.boxId ? (editingProcurement.cabinetId && editingProcurement.shelfId) : (editingProcurement.boxId))))} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </>)
                    }
                </DialogContent>
            </Dialog>

            {/* Return Modal */}
            <Dialog open={!!returnModal} onOpenChange={() => setReturnModal(null)}>
                <DialogContent className="bg-background border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle>Return File</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Mark this file as returned. Optionally specify who returned it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="returnedBy" className="text-muted-foreground">Returned By (Optional)</Label>
                            <Input
                                id="returnedBy"
                                value={returnModal?.returnedBy || ''}
                                onChange={(e) => setReturnModal(prev =>
                                    prev ? { ...prev, returnedBy: e.target.value } : null
                                )}
                                placeholder="Enter name"
                                className="bg-card border-border text-foreground"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReturnModal(null)}
                            className="border-border text-white hover:bg-muted"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmReturnFile}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Confirm Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Borrow Edit Modal */}
            <Dialog open={!!borrowEditModal} onOpenChange={() => setBorrowEditModal(null)}>
                <DialogContent className="bg-background border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle>Borrow File</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Enter the borrower details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="borrowedBy" className="text-muted-foreground">Borrowed By *</Label>
                            <Input
                                id="borrowedBy"
                                value={borrowEditModal?.borrowedBy || ''}
                                onChange={(e) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowedBy: e.target.value } : null
                                )}
                                placeholder="Enter name"
                                className="bg-card border-border text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="borrowedDate" className="text-muted-foreground">Borrowed Date</Label>
                            <Input
                                id="borrowedDate"
                                type="date"
                                value={borrowEditModal?.borrowedDate ? format(new Date(borrowEditModal.borrowedDate), 'yyyy-MM-dd') : ''}
                                onChange={(e) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowedDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null
                                )}
                                className="bg-card border-border text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="division" className="text-muted-foreground">Borrower Division *</Label>
                            <Select
                                value={borrowEditModal?.borrowerDivision}
                                onValueChange={(val) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowerDivision: val } : null
                                )}
                            >
                                <SelectTrigger className="bg-card border-border text-foreground">
                                    <SelectValue placeholder="Select Division" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground h-[200px]">
                                    {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                        <SelectItem key={d.id} value={d.name}>{d.name} ({d.abbreviation})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBorrowEditModal(null)}
                            className="border-border text-white hover:bg-muted"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={saveBorrowChanges}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Configuration Dialog */}
            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen} >
                <DialogContent className="bg-card border-border text-foreground max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Export CSV Configuration</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Select filters to apply to the exported data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        {/* Storage Status */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Storage Status</Label>
                            <Select
                                value={exportFilters.storageStatus}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, storageStatus: val }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="borrowed">Borrowed</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* End User (Divisions) */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">End User (Division)</Label>
                            <Select
                                value={exportFilters.division}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, division: val }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="All Divisions" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                    <SelectItem value="all">All Divisions</SelectItem>
                                    {divisions.map((d) => (
                                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date (Year) */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Date (Year)</Label>
                            <Select
                                value={exportFilters.year}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, year: val }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="All Years" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground max-h-[200px]">
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableExportYears.map((y) => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Range of ABC */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Range of ABC</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min ABC"
                                    className="bg-background border-border text-foreground h-9"
                                    value={exportFilters.abcRange.min}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        abcRange: { ...prev.abcRange, min: e.target.value }
                                    }))}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max ABC"
                                    className="bg-background border-border text-foreground h-9"
                                    value={exportFilters.abcRange.max}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        abcRange: { ...prev.abcRange, max: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>

                        {/* Range of Bid Amount */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Range of Bid Amount</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min Bid"
                                    className="bg-background border-border text-foreground h-9"
                                    value={exportFilters.bidAmountRange.min}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        bidAmountRange: { ...prev.bidAmountRange, min: e.target.value }
                                    }))}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max Bid"
                                    className="bg-background border-border text-foreground h-9"
                                    value={exportFilters.bidAmountRange.max}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        bidAmountRange: { ...prev.bidAmountRange, max: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>

                        {/* Storage Location */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Storage Location</Label>
                            <Select
                                value={exportFilters.storageLocation}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, storageLocation: val }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="All Storage" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="all">All Storage</SelectItem>
                                    <SelectItem value="drawers">Drawers only</SelectItem>
                                    <SelectItem value="boxes">Boxes only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Process Status */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Process Status</Label>
                            <Select
                                value={exportFilters.processStatus}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, processStatus: val }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground max-h-[250px]">
                                    <SelectItem value="all">All Process Status</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Processing">Processing</SelectItem>
                                    <SelectItem value="Returned PR to EU">Returned PR to EU</SelectItem>
                                    <SelectItem value="Not yet Acted">Not yet Acted</SelectItem>
                                    <SelectItem value="Failure">Failure</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportModalOpen(false)} className="border-border text-white hover:bg-muted">
                            Cancel
                        </Button>
                        <Button onClick={handleExportConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Export CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ProcurementDetailsDialog
                open={!!viewProcurement}
                onOpenChange={(open) => !open && setViewProcurement(null)}
                procurement={viewProcurement}
                getLocationString={getLocationString}
            />
            {/* Relocate/Reorder Dialog */}
            <Dialog open={isRelocateDialogOpen} onOpenChange={setIsRelocateDialogOpen}>
                <DialogContent className="bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle>Relocate / Reorder</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Enter the new stack number for this document.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stack-number" className="text-right text-muted-foreground">Stack #</Label>
                            <Input
                                id="stack-number"
                                type="number"
                                value={newStackNumber}
                                onChange={(e) => setNewStackNumber(e.target.value ? parseInt(e.target.value) : '')}
                                className="col-span-3 bg-background border-border text-foreground"
                                placeholder="Enter stack number"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRelocateDialogOpen(false)} className="border-border text-white hover:bg-muted">
                            Cancel
                        </Button>
                        <Button onClick={handleRelocateSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Update Stack Number
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Result Modal */}
            <Dialog open={isImportResultOpen} onOpenChange={setIsImportResultOpen}>
                <DialogContent className="bg-card border-border text-foreground max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Upload className="h-5 w-5 text-violet-400" />
                            Import Complete
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Summary of CSV import results.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Counters */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <p className="text-2xl font-bold text-emerald-400">{importResults.imported}</p>
                                <p className="text-xs text-muted-foreground mt-1">Imported</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-2xl font-bold text-amber-400">{importResults.skipped.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Skipped (Duplicates)</p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-2xl font-bold text-red-400">{importResults.errors.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Errors</p>
                            </div>
                        </div>

                        {/* Skipped PRs */}
                        {importResults.skipped.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" /> Skipped — already exist in database
                                </p>
                                <div className="max-h-28 overflow-y-auto space-y-1">
                                    {importResults.skipped.map((pr, i) => (
                                        <p key={i} className="text-xs text-muted-foreground font-mono">{pr}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {importResults.errors.length > 0 && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Row Errors
                                </p>
                                <div className="max-h-28 overflow-y-auto space-y-1">
                                    {importResults.errors.map((err, i) => (
                                        <p key={i} className="text-xs text-red-300 font-mono">{err}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All OK message */}
                        {importResults.errors.length === 0 && importResults.skipped.length === 0 && importResults.imported > 0 && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                All records imported successfully!
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsImportResultOpen(false)} className="bg-violet-600 hover:bg-violet-700">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

    );
};

export default ProcurementList;
