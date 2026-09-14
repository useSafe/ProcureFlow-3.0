import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { db } from '@/lib/firebase';
import { onUsersChange } from '@/lib/storage';
import { ref, onValue } from 'firebase/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  Users,
  ChevronDown,
  ChevronRight,
  Map,
  ChevronLeft,
  Building2,
  Library,
  Activity,
  Truck,
  Database,
  Search,
  Plus,
  AlertCircle,
  BookOpen,
  Settings,
  Info,
  Bell,
  Eye,
  Clock,
  CalendarDays,
  X,
  UserCircle,
  Wifi,
  WifiOff,
  Coffee,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInCalendarDays, format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AIChatbot from '@/components/AIChatbot';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path?: string;
  label: string;
  icon: any;
  allowedRoles?: string[];
  children?: NavItem[];
}

const ALL_ROLES = ['admin', 'bac-staff', 'archiver', 'viewer'];
const ADMIN_ONLY = ['admin'];
const ADMIN_BAC = ['admin', 'bac-staff'];
const ADMIN_ARCHIVER = ['admin', 'archiver'];
const ADMIN_BAC_VIEWER = ['admin', 'bac-staff', 'viewer'];

const navSections = [
  {
    title: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/urgent-records', label: 'Urgent Records', icon: AlertCircle, allowedRoles: ADMIN_BAC_VIEWER },
      { path: '/visual-allocation', label: 'Visual Map', icon: Map, allowedRoles: ALL_ROLES },
    ],
  },
  {
    title: 'Records',
    items: [
      { path: '/procurement/add', label: 'Add Procurement', icon: Plus, allowedRoles: ADMIN_BAC },
      { path: '/procurement?tab=records', label: 'Procurement Records', icon: FileText },
      { path: '/procurement/progress', label: 'Progress Tracking', icon: Activity, allowedRoles: ADMIN_BAC_VIEWER },
    ],
  },
  {
    title: 'Storage',
    items: [
      { path: '/storage', label: 'Storage', icon: Library, allowedRoles: ADMIN_ARCHIVER },
    ],
  },
  {
    title: 'System',
    items: [
      { path: '/suppliers', label: 'Suppliers', icon: Truck, allowedRoles: ADMIN_BAC },
      { path: '/divisions', label: 'Divisions', icon: Building2, allowedRoles: ADMIN_ONLY },
      { path: '/users', label: 'User Management', icon: Users, allowedRoles: ADMIN_ONLY },
      { path: '/manual', label: 'Manual Guide', icon: BookOpen, allowedRoles: ALL_ROLES },
      { path: '/settings', label: 'Settings', icon: Settings, allowedRoles: ALL_ROLES },
    ],
  },
];

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isPathActive(itemPath: string | undefined, currentPath: string, currentSearch: string): boolean {
  if (!itemPath) return false;
  const [p, q] = itemPath.split('?');
  if (p !== currentPath) return false;
  if (!q) return true;
  const itemParams = new URLSearchParams(q);
  const currentParams = new URLSearchParams(currentSearch);
  for (const [k, v] of itemParams.entries()) {
    if (currentParams.get(k) !== v) return false;
  }
  return true;
}

// ── Clock Component ──────────────────────────────────────────────────────────
const LiveClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [alarm, setAlarm] = useState<{ isOpen: boolean, title: string, message: string, icon: any } | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      setTime(now);
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      if (s === 0) {
        if (h === 8 && m === 0) {
          const key = `start-${now.toDateString()}`;
          if (!notifiedRef.current.has(key)) {
            notifiedRef.current.add(key);
            setAlarm({ isOpen: true, title: 'Good morning!', message: 'Working hours have started (8:00 AM)', icon: Sunrise });
          }
        } else if (h === 12 && m === 0) {
          const key = `lunch-${now.toDateString()}`;
          if (!notifiedRef.current.has(key)) {
            notifiedRef.current.add(key);
            setAlarm({ isOpen: true, title: 'Lunch time!', message: 'It\'s 12:00 PM. Take a break!', icon: Coffee });
          }
        } else if (h === 18 && m === 0) {
          const key = `packup-${now.toDateString()}`;
          if (!notifiedRef.current.has(key)) {
            notifiedRef.current.add(key);
            setAlarm({ isOpen: true, title: 'Pack up time!', message: 'Working hours end at 6:00 PM. Have a good evening!', icon: Sunset });
          }
        }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const timeStr = `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;

  const shiftIcon = hours >= 6 && hours < 12 ? Sunrise : hours >= 12 && hours < 18 ? Coffee : Sunset;
  const ShiftIcon = shiftIcon;

  return (
    <>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/50">
        <ShiftIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-mono font-medium text-foreground tabular-nums">{timeStr}</span>
      </div>

      <Dialog open={alarm?.isOpen || false} onOpenChange={(open) => setAlarm(prev => prev ? { ...prev, isOpen: open } : null)}>
        <DialogContent className="max-w-sm bg-card border-border sm:rounded-2xl text-center flex flex-col items-center py-10 shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-in zoom-in-90 duration-300">
          {alarm?.icon && <alarm.icon className="h-20 w-20 text-primary animate-bounce mb-6" />}
          <DialogTitle className="text-2xl font-bold text-foreground mb-2">{alarm?.title}</DialogTitle>
          <p className="text-sm text-muted-foreground mb-8">{alarm?.message}</p>
          <Button size="lg" onClick={() => setAlarm(prev => prev ? { ...prev, isOpen: false } : null)} className="w-full max-w-[200px] rounded-full text-base font-semibold shadow-lg">
            Got it, thanks!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Deadline Calendar Popover ─────────────────────────────────────────────────
interface DeadlineCalendarProps {
  procurements: any[];
}

const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ procurements }) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const today = new Date();

  const deadlineDates = procurements
    .filter(p => p.deadline)
    .map(p => ({ date: new Date(p.deadline!), prNumber: p.prNumber, urgency: p.urgencyLevel }));

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0=Sun

  const getDeadlinesForDay = (day: Date) =>
    deadlineDates.filter(d => isSameDay(d.date, day));

  return (
    <div className="w-80 p-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Blanks for offset */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDow }).map((_, i) => <div key={`blank-${i}`} />)}
        {days.map(day => {
          const dl = getDeadlinesForDay(day);
          const isToday = isSameDay(day, today);
          const hasCritical = dl.some(d => d.urgency === 'Critical');
          const hasHigh = dl.some(d => d.urgency === 'High');
          return (
            <TooltipProvider key={day.toISOString()} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'relative flex items-center justify-center text-[11px] h-7 rounded cursor-default transition-colors',
                    isToday ? 'bg-foreground text-background font-bold' : 'hover:bg-muted',
                    dl.length > 0 && !isToday ? 'font-semibold' : ''
                  )}>
                    {format(day, 'd')}
                    {dl.length > 0 && (
                      <span className={cn(
                        'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                        hasCritical ? 'bg-red-500' : hasHigh ? 'bg-orange-500' : 'bg-blue-500'
                      )} />
                    )}
                  </div>
                </TooltipTrigger>
                {dl.length > 0 && (
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    <p className="font-semibold mb-1">{format(day, 'MMM d')} Deadlines:</p>
                    {dl.slice(0, 5).map((d, i) => (
                      <p key={i} className="truncate">{d.prNumber} ({d.urgency})</p>
                    ))}
                    {dl.length > 5 && <p>+{dl.length - 5} more</p>}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {[
          { color: 'bg-red-500', label: 'High' },
          { color: 'bg-blue-500', label: 'Low' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', l.color)} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Deadline List (Clickable to Records) ─────────────────────────────────────
interface NotificationPanelProps {
  procurements: any[];
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ procurements, onClose }) => {
  const navigate = useNavigate();

  const upcoming = procurements
    .filter(p => {
      if (p.urgencyLevel === 'Done') return false;
      if (p.urgencyLevel === 'High' || p.urgencyLevel === 'Low') {
        if (!p.deadline) return true; // Show even without deadline
        try {
          const days = differenceInCalendarDays(new Date(p.deadline), new Date());
          return days >= 0 && days <= 30;
        } catch { return false; }
      }
      return false;
    })
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 20);

  const overdue = procurements
    .filter(p => {
      if (!p.deadline || p.urgencyLevel === 'Done') return false;
      if (p.urgencyLevel === 'High' || p.urgencyLevel === 'Low') {
        try { return differenceInCalendarDays(new Date(p.deadline), new Date()) < 0; }
        catch { return false; }
      }
      return false;
    })
    .slice(0, 5);

  const getDaysLabel = (deadline?: string) => {
    if (!deadline) return { text: 'No deadline', cls: 'text-muted-foreground' };
    const days = differenceInCalendarDays(new Date(deadline), new Date());
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, cls: 'text-red-500' };
    if (days === 0) return { text: 'Due today', cls: 'text-red-500 font-bold' };
    if (days <= 3) return { text: `${days}d left`, cls: 'text-orange-500' };
    if (days <= 7) return { text: `${days}d left`, cls: 'text-amber-500' };
    return { text: `${days}d left`, cls: 'text-muted-foreground' };
  };

  const handleRecordClick = (prNumber: string) => {
    navigate(`/procurement?tab=records&search=${encodeURIComponent(prNumber)}`);
    onClose();
  };

  return (
    <div className="w-80 flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold">Urgent Deadlines</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="p-2 space-y-1">
          {overdue.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider px-2 pt-1">Overdue</p>
              {overdue.map(p => {
                const dl = getDaysLabel(p.deadline!);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleRecordClick(p.prNumber)}
                    className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.prNumber}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.projectName || p.description || '—'}</p>
                    </div>
                    <span className={cn('text-[10px] shrink-0', dl.cls)}>{dl.text}</span>
                  </button>
                );
              })}
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2">Upcoming (30 days)</p>
              {upcoming.map(p => {
                const dl = getDaysLabel(p.deadline);
                const urgencyDot = p.urgencyLevel === 'High' ? 'bg-red-500' : 'bg-blue-500';
                return (
                  <button
                    key={p.id}
                    onClick={() => handleRecordClick(p.prNumber)}
                    className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', urgencyDot)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.prNumber}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.deadline ? format(new Date(p.deadline), 'MMM d, yyyy') : 'No deadline'}</p>
                    </div>
                    <span className={cn('text-[10px] shrink-0', dl.cls)}>{dl.text}</span>
                  </button>
                );
              })}
            </>
          )}
          {overdue.length === 0 && upcoming.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 gap-2">
              <Bell className="h-8 w-8" />
              <p className="text-xs">No urgent deadlines</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── NavContent──────────────────────────────────────────────────────────────
interface NavContentProps {
  user: any;
  dbSize: number;
  isCollapsed: boolean;
  isOnline: boolean;
  openDropdowns: string[];
  urgentCount: number;
  currentPath: string;
  currentSearch: string;
  onToggleDropdown: (label: string) => void;
  onSetMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  highlightedNav: string | null;
  setHighlightedNav: (val: string | null) => void;
}

const NavContent = memo(({
  user,
  dbSize,
  isCollapsed,
  isOnline,
  openDropdowns,
  urgentCount,
  currentPath,
  currentSearch,
  onToggleDropdown,
  onSetMobileOpen,
  onLogout,
  highlightedNav,
  setHighlightedNav,
}: NavContentProps) => {
  const usedStorageMB = dbSize / (1024 * 1024);
  const maxStorageMB = 1024;
  const storagePercent = Math.min((usedStorageMB / maxStorageMB) * 100, 100);

  const isRoleAllowed = (allowedRoles?: string[]) => {
    if (!allowedRoles) return true;
    return allowedRoles.includes(user?.role || '');
  };

  const renderItem = (item: NavItem) => {
    if (!isRoleAllowed(item.allowedRoles)) return null;

    const Icon = item.icon;
    const isActive = isPathActive(item.path, currentPath, currentSearch);
    const showBadge = item.label === 'Urgent Records' && urgentCount > 0;

    if (item.children) {
      const visibleChildren = item.children.filter(c => isRoleAllowed(c.allowedRoles));
      if (visibleChildren.length === 0) return null;

      const isOpen = openDropdowns.includes(item.label) && !isCollapsed;
      const hasActiveChild = visibleChildren.some(c => isPathActive(c.path, currentPath, currentSearch));

      return (
        <Collapsible key={item.label} open={isOpen} onOpenChange={() => onToggleDropdown(item.label)}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                hasActiveChild
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
              {!isCollapsed && (isOpen
                ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-5 space-y-0.5 mt-0.5">
            {visibleChildren.map(child => {
              const ChildIcon = child.icon;
              const isChildActive = isPathActive(child.path, currentPath, currentSearch);
              return (
                <Link
                  key={child.path}
                  to={child.path!}
                  onClick={() => onSetMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                    isChildActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const isHighlighted = highlightedNav === 'add-proc' && item.label === 'Add Procurement';

    return (
      <TooltipProvider key={item.path} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.path!}
              onClick={() => { onSetMobileOpen(false); setHighlightedNav(null); }}
              className={cn(
                'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/20 text-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 animate-pulse',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="flex-1">{item.label}</span>}
              {!isCollapsed && showBadge && (
                <span className="sidebar-badge">{urgentCount > 99 ? '99+' : urgentCount}</span>
              )}
              {isCollapsed && showBadge && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="text-xs z-50">
              {item.label}{showBadge ? ` (${urgentCount})` : ''}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 border-b border-border px-4 py-4 h-16', isCollapsed && 'justify-center')}>
        <img src="/logo.png" alt="Logo" className="h-7 w-7 shrink-0" />
        {!isCollapsed && <span className="text-base font-semibold text-foreground truncate tracking-tight">ProcureFlow</span>}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-4 p-3 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, idx) => {
          const hasVisible = section.items.some(item =>
            !item.allowedRoles || item.allowedRoles.includes(user?.role || '') ||
            (item as any).children?.some((c: NavItem) => !c.allowedRoles || c.allowedRoles.includes(user?.role || ''))
          );
          if (!hasVisible) return null;

          return (
            <div key={idx} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  {section.title}
                </div>
              )}
              {section.items.map(item => renderItem(item))}
            </div>
          );
        })}
      </nav>

      {/* Storage Usage — below nav, above logout */}
      <div className="border-t border-border">
        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-3 h-3" />
                DB Storage
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {storagePercent.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={storagePercent}
              className={cn('h-1.5 bg-muted', storagePercent > 80 ? '[&>div]:bg-red-500' : storagePercent > 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500')}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
              <span>{formatBytes(dbSize)}</span>
              <span>1 GB</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2">
                  <div className="relative h-6 w-6">
                    <Database className="h-4 w-4 text-muted-foreground mx-auto mt-1" />
                    {storagePercent > 80 && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs z-50">
                DB: {formatBytes(dbSize)} / 1 GB ({storagePercent.toFixed(1)}%)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Logout */}
        <div className="px-3 pb-3">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLogout}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isCollapsed && 'Logout'}
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="text-xs z-50">Logout</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
});

NavContent.displayName = 'NavContent';

// ═══════════════════════════════════════════════════════════════════════════════
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { dbSize, procurements } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>(['Procurement']);
  const [isOnline, setIsOnline] = useState(true);
  const [processFlowOpen, setProcessFlowOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [highlightedNav, setHighlightedNav] = useState<string | null>(null);

  useEffect(() => {
    const handleHighlight = (e: any) => {
      setHighlightedNav(e.detail);
      // Remove highlight after 5 seconds if not clicked
      setTimeout(() => setHighlightedNav(null), 5000);
    };
    window.addEventListener('highlight-nav', handleHighlight);
    return () => window.removeEventListener('highlight-nav', handleHighlight);
  }, []);

  const isFirstMount = React.useRef(true);

  const urgentCount = React.useMemo(() => procurements.filter(p => {
    if (p.urgencyLevel === 'Done') return false;
    if (p.urgencyLevel === 'High' || p.urgencyLevel === 'Low') return true;
    return false;
  }).length, [procurements]);

  const deadlineCount = React.useMemo(() => procurements.filter(p => {
    if (p.urgencyLevel === 'Done') return false;
    if (p.urgencyLevel !== 'High' && p.urgencyLevel !== 'Low') return false;
    if (!p.deadline) return true; // Include urgent without deadline
    try { return differenceInCalendarDays(new Date(p.deadline), new Date()) <= 30; }
    catch { return false; }
  }).length, [procurements]);

  useEffect(() => {
    if (!user) return;
    const unsub = onUsersChange(users => {
      const current = users.find(u => u.id === user.id);
      if (!current) {
        setForceDeleteOpen(true);
      } else if (current.status !== 'active') {
        logout();
        toast.error('Your account has been deactivated by an administrator.');
        navigate('/login');
      }
    });
    return () => unsub();
  }, [user, logout, navigate]);

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const updateStatus = (connected: boolean) => {
      setIsOnline(prev => {
        if (prev === connected) return prev;
        if (!isFirstMount.current) {
          connected ? toast.success('Network connection restored') : toast.error('Network connection lost');
        }
        return connected;
      });
      if (isFirstMount.current) isFirstMount.current = false;
    };
    const unsub = onValue(connectedRef, snap => updateStatus(!!snap.val()));
    const handleOffline = () => updateStatus(false);
    window.addEventListener('offline', handleOffline);
    return () => { unsub(); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleLogout = useCallback(() => {
    logout(); navigate('/login');
  }, [logout, navigate]);

  const handleToggleDropdown = useCallback((label: string) => {
    setIsCollapsed(prev => {
      if (prev) {
        setOpenDropdowns([label]);
        return false;
      }
      return prev;
    });
    setOpenDropdowns(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  }, []);

  const handleSetMobileOpen = useCallback((open: boolean) => setMobileOpen(open), []);

  const navProps: NavContentProps = {
    user,
    dbSize,
    isCollapsed,
    isOnline,
    openDropdowns,
    urgentCount,
    currentPath: location.pathname,
    currentSearch: location.search,
    onToggleDropdown: handleToggleDropdown,
    onSetMobileOpen: handleSetMobileOpen,
    onLogout: handleLogout,
    highlightedNav,
    setHighlightedNav,
  };

  const quickActions = [
    { label: 'Add Record', icon: Plus, path: '/procurement?tab=add', roles: ['admin', 'bac-staff'] },
    { label: 'Records', icon: Eye, path: '/procurement?tab=records', roles: null },
    { label: 'Visual Map', icon: Map, path: '/visual-allocation', roles: null },
  ];

  // User initials / avatar
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const avatarColor = user?.role === 'admin' ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
    user?.role === 'bac-staff' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
    user?.role === 'archiver' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
    'bg-muted text-muted-foreground';

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Force-delete dialog */}
      <AlertDialog open={forceDeleteOpen} onOpenChange={setForceDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Account Deleted</AlertDialogTitle>
            <AlertDialogDescription>
              Your account has been <strong>force deleted</strong> by the administrator. You will be logged out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => { setForceDeleteOpen(false); logout(); navigate('/login'); }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Process Flow Modal */}
      <Dialog open={processFlowOpen} onOpenChange={setProcessFlowOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Process Flow Guide
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground space-y-2">
            <p>Refer to the Process Flow page for detailed procurement workflow steps.</p>
            <Button
              variant="outline"
              onClick={() => { setProcessFlowOpen(false); navigate('/process-flow'); }}
              className="mt-2"
            >
              Open Full Guide
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop Sidebar */}
      <aside className={cn(
        'dark hidden border-r border-border bg-background text-foreground lg:flex flex-col h-screen sticky top-0 transition-all duration-200 z-20',
        isCollapsed ? 'w-[52px]' : 'w-56'
      )}>
        <NavContent {...navProps} />
        <button
          onClick={() => setIsCollapsed(p => !p)}
          className="absolute -right-3 top-[72px] bg-background border border-border rounded-full p-1 shadow-sm hover:bg-accent transition-colors z-30"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="dark flex h-14 items-center justify-between border-b border-border bg-background text-foreground px-4 sticky top-0 z-10 gap-3">
          {/* Left: mobile hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="dark w-56 p-0 bg-background border-r border-border text-foreground">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <NavContent {...navProps} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm text-foreground">ProcureFlow</span>
          </div>

          {/* Desktop quick search */}
          <div className="hidden lg:flex flex-1 max-w-xs relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && navSearch.trim()) {
                  navigate(`/procurement?tab=records&search=${encodeURIComponent(navSearch.trim())}`);
                  setNavSearch('');
                }
              }}
              className="pl-8 h-8 text-xs bg-background border-border focus-visible:ring-1"
            />
          </div>

          {/* Center: Live Clock */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-start lg:justify-center">
            <LiveClock />
            <div className="hidden lg:flex items-center gap-1.5">
              {quickActions.map(action => {
                if (action.roles && !action.roles.includes(user?.role || '')) return null;
                const Icon = action.icon;
                return (
                  <Button
                    key={action.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(action.path)}
                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Right: utility icons + user account */}
          <div className="flex items-center gap-1">
            {/* Network status */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn('h-2 w-2 rounded-full mx-1', isOnline ? 'bg-emerald-500' : 'bg-red-500')} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{isOnline ? 'Online' : 'Offline'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Process Flow Info */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setProcessFlowOpen(true)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Process Flow Guide</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications + Calendar */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                      >
                        <Bell className="h-4 w-4" />
                        {deadlineCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 sidebar-badge text-[9px] min-w-[16px] h-4 flex items-center justify-center">
                            {deadlineCount > 9 ? '9+' : deadlineCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Notifications & Deadlines</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent align="end" className="p-0 w-auto" sideOffset={8}>
                <NotificationPanel procurements={procurements} onClose={() => setNotifOpen(false)} />
              </PopoverContent>
            </Popover>

            {/* Settings */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User Account — clickable, links to Settings > Profile */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/settings')}
                    className="ml-1 flex items-center gap-2 pl-2 border-l border-border hover:bg-muted/50 rounded-md px-2 py-1 transition-colors"
                  >
                    <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border border-border', avatarColor)}>
                      {userInitial}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-semibold text-foreground leading-none">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5 flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-red-500')} />
                        {user?.role?.replace('-', ' ')}
                      </p>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Account Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      {/* Global AI Chatbot */}
      <AIChatbot />
    </div>
  );
};

export default AppLayout;