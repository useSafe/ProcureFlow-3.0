import React, { useState } from 'react';
import {
    BookOpen, ChevronDown, ChevronRight, Info, AlertCircle,
    FileText, FolderOpen, BarChart2, Users, Settings, Plus,
    Archive, Truck, Map, Search, Download, Upload,
    CheckCircle, ArrowRight, Layers, Package, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StepItem {
    step: number;
    title: string;
    desc: string;
}

interface GuideSection {
    id: string;
    icon: any;
    title: string;
    badge?: string;
    badgeColor?: string;
    intro: string;
    steps: StepItem[];
    tips?: string[];
    warnings?: string[];
    image?: string;
}

const guideSections: GuideSection[] = [
    {
        id: 'dashboard',
        icon: BarChart2,
        title: 'Dashboard',
        badge: 'Overview',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        intro: 'The Dashboard gives you a real-time snapshot of the entire procurement system — KPIs, charts, urgent deadlines, and more.',
        steps: [
            { step: 1, title: 'Access the Dashboard', desc: 'Click "Dashboard" in the sidebar. It loads automatically after login.' },
            { step: 2, title: 'Read the KPI cards', desc: 'The top row shows Total Records, With Suppliers, Completed, Processing, Other Docs, SVP, and Regular Bidding counts. Click any card to filter the Records page.' },
            { step: 3, title: 'Filter by Year/Division', desc: 'Use the dropdowns at the top-right of the Dashboard to narrow charts and KPIs to a specific year or end-user division.' },
            { step: 4, title: 'Deadlines Calendar', desc: 'Days with HIGH urgency records are highlighted RED; LOW urgency days are highlighted YELLOW. Hover over a highlighted day to see which procurements are due.' },
            { step: 5, title: 'Urgent Procurement list', desc: 'The right panel lists all High/Low urgency records with deadlines. Click any item to go directly to that record in the Records page.' },
        ],
        tips: ['Records marked as "Done" urgency are excluded from all counters.', 'Hover a calendar cell to see the PR numbers due on that day.'],
        image: '/dashboard_guide.png'
    },
    {
        id: 'add',
        icon: Plus,
        title: 'Add Procurement',
        badge: 'Admin / BAC Staff',
        badgeColor: 'bg-emerald-500/20 text-emerald-400',
        intro: 'Create new procurement records — SVP, Regular Bidding, or Shopping — with full monitoring dates and location assignment.',
        steps: [
            { step: 1, title: 'Navigate to Add Procurement', desc: 'Click "Add Procurement" in the Records section of the sidebar, or use the "+ Add Record" quick action in the top bar.' },
            { step: 2, title: 'Select the Procurement Type', desc: 'Choose SVP, Regular Bidding, Shopping, or other types from the dropdown. The form adjusts to show relevant date fields.' },
            { step: 3, title: 'Fill in basic info', desc: 'Enter the PR Number, Project Name (Particulars), End User Division, ABC amount, and Supplier (if already known).' },
            { step: 4, title: 'Set Process Status', desc: 'Choose from: Completed, Processing, Returned PR to EU, Not yet Acted, Failure, or Cancelled.' },
            { step: 5, title: 'Set Storage Status', desc: 'Choose "Processing" if the file is still being worked on, or "In Storage" to assign it to a physical location (Drawer/Cabinet/Folder or Box).' },
            { step: 6, title: 'Fill Monitoring Dates', desc: 'Enter relevant dates (Received PR, PR Deliberated, Published, etc.) as they occur throughout the procurement lifecycle.' },
            { step: 7, title: 'Save the Record', desc: 'Click "Save Procurement Record". The record appears immediately in the Records page and Dashboard.' },
        ],
        tips: [
            'PR Numbers auto-generate sequence numbers — you can override them.',
            'You can save records without assigning a storage location if the status is not "In Storage".',
        ],
        warnings: ['Do not create duplicate PR Numbers — the system will warn you if a conflict is detected.'],
        image: '/add_procurement_guide.png'
    },
    {
        id: 'records',
        icon: FileText,
        title: 'Procurement Records',
        badge: 'All Roles',
        badgeColor: 'bg-purple-500/20 text-purple-400',
        intro: 'The Records page is the central hub for viewing, filtering, editing, and exporting all procurement data.',
        steps: [
            { step: 1, title: 'Search records', desc: 'Use the search bar to find records by PR Number, Project Name, or Description.' },
            { step: 2, title: 'Filter by Date', desc: 'Select a date type (Date Created, Procurement Deadline, or Record Date) and enter a From/To range to filter results.' },
            { step: 3, title: 'Filter by Status', desc: 'Click the status filter badges (Borrowed, Processing, In Storage) to show only records with those physical statuses.' },
            { step: 4, title: 'Filter by Process Status', desc: 'Use the Process Status multi-select to show records by workflow stage (Completed, Processing, etc.).' },
            { step: 5, title: 'Edit a record', desc: 'Click the pencil icon on any row to open the Edit Modal. Update any field — PR Number, status, location, dates — and save.' },
            { step: 6, title: 'Change file status', desc: 'Use the inline status dropdown in the table row to change: Borrowed → Processing → In Storage. Borrowed triggers a borrow details form.' },
            { step: 7, title: 'View full details', desc: 'Click the eye icon to open the full details dialog with timeline, monitoring dates, and checklist.' },
            { step: 8, title: 'Export to CSV', desc: 'Click "Export CSV" to download records. Use the Export Modal to filter by year, division, status, and process status before exporting.' },
        ],
        tips: [
            'Click column headers to sort records.',
            'The "Date Added" filter targets when the record was manually dated; "Date Created" is the system timestamp.',
            'Status changes to "Borrowed" require entering borrower name and division.',
        ],
    },
    {
        id: 'urgent',
        icon: AlertCircle,
        title: 'Urgent Records',
        badge: 'Priority Tracking',
        badgeColor: 'bg-red-500/20 text-red-400',
        intro: 'The Urgent Records page lets you assign urgency levels and action deadlines to any procurement record.',
        steps: [
            { step: 1, title: 'Open Urgent Records', desc: 'Click "Urgent Records" in the Main section of the sidebar. The badge shows the current count of High/Low urgency active records.' },
            { step: 2, title: 'Filter by urgency level', desc: 'Click the colored badge buttons at the top (Critical, High, Medium, Low, Done) to filter the list.' },
            { step: 3, title: 'Edit urgency/deadline', desc: 'Click the pencil icon on a record to activate inline editing — change the urgency level and set a deadline date.' },
            { step: 4, title: 'Save changes', desc: 'Click the green save icon. The Dashboard and notification bell will immediately reflect the updated urgency.' },
            { step: 5, title: 'Mark as Done', desc: 'Set urgency to "Done" to exclude the record from all urgent counters and the Deadlines Calendar.' },
            { step: 6, title: 'Reset urgency', desc: 'Click the reset icon (↺) during edit mode and confirm to clear all urgency and deadline data for a record.' },
        ],
        tips: ['Records marked "Done" are excluded from the Dashboard urgent count and calendar.'],
        warnings: ['Only Admin and BAC Staff can edit urgency. Viewers can see but not modify.'],
    },
    {
        id: 'storage',
        icon: Archive,
        title: 'Storage Module',
        badge: 'Admin / Archiver',
        badgeColor: 'bg-amber-500/20 text-amber-400',
        intro: 'Manage the physical file storage hierarchy: Drawers → Cabinets → Folders, or Boxes → Folders.',
        steps: [
            { step: 1, title: 'Access Storage', desc: 'Click "Storage" in the sidebar. Use the tabs to switch between Drawers, Cabinets, Folders, and Boxes.' },
            { step: 2, title: 'Create a Drawer', desc: 'In the Drawers tab, click "Add Drawer". Enter a name and code (e.g. D1). Drawers are the top-level physical containers.' },
            { step: 3, title: 'Add Cabinets to a Drawer', desc: 'In the Cabinets tab, select a Drawer from the filter, then click "Add Cabinet". Each Cabinet is a section within a Drawer.' },
            { step: 4, title: 'Add Folders', desc: 'Folders belong to either a Cabinet or a Box. Create them in the Folders tab. Set a color for easy visual identification.' },
            { step: 5, title: 'Add Boxes', desc: 'Boxes are independent storage containers. Create them in the Boxes tab. Folders can be placed inside Boxes.' },
            { step: 6, title: 'Assign files to locations', desc: 'When editing a procurement record, set Storage Status to "In Storage", then select the Drawer → Cabinet → Folder chain (or Box → Folder).' },
        ],
        tips: [
            'Use the Visual Map page to see an interactive layout of all storage locations and their contents.',
            'Stack numbers within a folder auto-recalculate when files are borrowed or returned.',
        ],
    },
    {
        id: 'suppliers',
        icon: Truck,
        title: 'Suppliers',
        badge: 'Admin / BAC Staff',
        badgeColor: 'bg-cyan-500/20 text-cyan-400',
        intro: 'The Suppliers page centralizes all supplier data and links procurement records to supplier profiles.',
        steps: [
            { step: 1, title: 'View Suppliers', desc: 'Open "Suppliers" from the System section. See all registered suppliers with their procurement history and win/loss stats.' },
            { step: 2, title: 'Add a Supplier', desc: 'Click "Add Supplier", fill in the name, address, contact, and TIN. Save to register them in the system.' },
            { step: 3, title: 'Link to a Procurement', desc: 'When adding or editing a procurement record, type the supplier name in the Supplier field. It will match against registered suppliers.' },
            { step: 4, title: 'Filter by process status', desc: 'Use the status dropdown in Suppliers page to see only suppliers with records at a specific process stage (e.g., Completed or Processing).' },
        ],
    },
    {
        id: 'visual',
        icon: Map,
        title: 'Visual Map',
        badge: 'All Roles',
        badgeColor: 'bg-indigo-500/20 text-indigo-400',
        intro: 'The Visual Map provides an interactive graphical representation of all physical storage locations and their contents.',
        steps: [
            { step: 1, title: 'Open the Visual Map', desc: 'Click "Visual Map" in the Main section of the sidebar.' },
            { step: 2, title: 'Navigate the map', desc: 'The map shows Drawers at the top level. Click a Drawer to expand its Cabinets, then click a Cabinet to see its Folders and file counts.' },
            { step: 3, title: 'Click a Folder', desc: 'Clicking a Folder shows all procurement records stored in it, with their stack numbers.' },
            { step: 4, title: 'View Box Storage', desc: 'The Box view shows all Boxes and their folder contents separately from the Drawer hierarchy.' },
        ],
        tips: ['Color-coded folders make it easy to identify different end-user divisions at a glance.'],
    },
    {
        id: 'users',
        icon: Users,
        title: 'User Management',
        badge: 'Admin Only',
        badgeColor: 'bg-rose-500/20 text-rose-400',
        intro: 'Create, deactivate, and manage system user accounts and their roles.',
        steps: [
            { step: 1, title: 'Access User Management', desc: 'Click "User Management" in the System section. Only Admins can access this page.' },
            { step: 2, title: 'Add a user', desc: 'Click "Add User". Enter name, email, password, and assign a role: Admin, BAC Staff, Archiver, or Viewer.' },
            { step: 3, title: 'Edit a user', desc: 'Click the pencil icon on a user to update their name, role, or status. Deactivate users instead of deleting to preserve audit trails.' },
            { step: 4, title: 'Role permissions', desc: 'Admin: full access. BAC Staff: add/edit records, urgency. Archiver: storage management. Viewer: read-only.' },
        ],
        warnings: ['You cannot delete your own account. Deactivate users who should no longer have access.'],
    },
    {
        id: 'settings',
        icon: Settings,
        title: 'Settings',
        badge: 'All Roles',
        badgeColor: 'bg-slate-500/20 text-slate-400',
        intro: 'Configure system preferences, alarm thresholds, theme, and profile settings.',
        steps: [
            { step: 1, title: 'Open Settings', desc: 'Click the gear icon in the top bar, or "Settings" in the System section of the sidebar.' },
            { step: 2, title: 'Change theme', desc: 'Toggle between Dark and Light mode. The preference is saved per browser.' },
            { step: 3, title: 'Set alarm thresholds', desc: 'Configure notification timing for deadline alerts (e.g., alert when a deadline is within 7 days).' },
            { step: 4, title: 'Profile info', desc: 'View your current role and account info. Contact an Admin to change your name or role.' },
        ],
    },
];

export default function ManualGuide() {
    const [openSections, setOpenSections] = useState<string[]>(['dashboard']);

    const toggle = (id: string) => {
        setOpenSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const expandAll = () => setOpenSections(guideSections.map(s => s.id));
    const collapseAll = () => setOpenSections([]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-blue-400" />
                        System Manual Guide
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Step-by-step documentation for all modules in the ProcureFlow system.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={expandAll}
                        className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Quick Nav */}
            <div className="flex flex-wrap gap-2">
                {guideSections.map(section => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => {
                                setOpenSections(prev => prev.includes(section.id) ? prev : [...prev, section.id]);
                                setTimeout(() => {
                                    document.getElementById(`guide-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 50);
                            }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Icon className="h-3 w-3" />
                            {section.title}
                        </button>
                    );
                })}
            </div>

            {/* Sections */}
            <div className="space-y-3">
                {guideSections.map(section => {
                    const Icon = section.icon;
                    const isOpen = openSections.includes(section.id);
                    return (
                        <div
                            key={section.id}
                            id={`guide-${section.id}`}
                            className="border border-border rounded-xl bg-card overflow-hidden"
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggle(section.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Icon className="h-4.5 w-4.5 text-foreground" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">{section.title}</span>
                                            {section.badge && (
                                                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', section.badgeColor)}>
                                                    {section.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{section.intro}</p>
                                    </div>
                                </div>
                                {isOpen
                                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                }
                            </button>

                            {/* Section Body */}
                            {isOpen && (
                                <div className="border-t border-border px-5 py-4 space-y-5">
                                    {/* Intro */}
                                    <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                        <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-muted-foreground">{section.intro}</p>
                                    </div>

                                    {/* Image */}
                                    {section.image && (
                                        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                                            <img src={section.image} alt={`${section.title} interface screenshot`} className="w-full object-cover" />
                                        </div>
                                    )}

                                    {/* Steps */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Steps</h3>
                                        <div className="space-y-2">
                                            {section.steps.map(step => (
                                                <div key={step.step} className="flex gap-3">
                                                    <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                        {step.step}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tips */}
                                    {section.tips && section.tips.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Tips</h3>
                                            <ul className="space-y-1.5">
                                                {section.tips.map((tip, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                        {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {section.warnings && section.warnings.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Important</h3>
                                            <ul className="space-y-1.5">
                                                {section.warnings.map((warn, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-amber-400">
                                                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                        {warn}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-xs text-muted-foreground border-t border-border">
                ProcureFlow System Manual · For assistance, contact your system administrator.
            </div>
        </div>
    );
}
