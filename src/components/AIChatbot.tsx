import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface QuickAction {
    label: string;
    action: () => void;
}

const SYSTEM_KNOWLEDGE = `You are ProcureBot, the AI assistant for ProcureFlow — a procurement records and file storage tracking system used by a government procurement office (BAC - Bids and Awards Committee).

You help users navigate the system, answer procurement process questions, and provide guidance on Philippine Government Procurement Law (RA 9184).

Key modules: Dashboard, Add Procurement, Procurement Records, Urgent Records, Progress Tracking, Storage (Drawers/Cabinets/Folders/Boxes), Visual Map, Suppliers, Divisions, User Management, Manual Guide, Settings.

Procurement types: SVP (Small Value Procurement), Regular Bidding, Shopping.
Process statuses: Completed, Processing, Returned PR to EU, Not yet Acted, Failure, Cancelled.
Storage statuses: Borrowed, Processing, In Storage, Archived.
Urgency levels: Critical, High, Medium, Low, Done, None.

Navigation shortcuts you can guide users to:
- /dashboard - Dashboard
- /procurement?tab=add - Add Procurement
- /procurement?tab=records - Procurement Records
- /urgent-records - Urgent Records
- /procurement?tab=tracking - Progress Tracking
- /storage - Storage Module
- /visual-allocation - Visual Map
- /suppliers - Suppliers
- /manual - Manual Guide

Keep answers concise and helpful. If asked to navigate, provide the route.`;

const QUICK_PROMPTS = [
    'How do I add a new procurement record?',
    'What is the SVP process?',
    'How do I set urgency on a record?',
    'How do storage locations work?',
    'What does Processing status mean?',
    'How do I export records to CSV?',
];

function generateResponse(message: string, navigate: (path: string) => void): { text: string; navigateTo?: string } {
    const lower = message.toLowerCase();

    // Navigation intents
    if (lower.includes('go to dashboard') || lower.includes('open dashboard')) {
        return { text: 'Taking you to the Dashboard now! 📊', navigateTo: '/dashboard' };
    }
    if (lower.includes('navigate') && lower.includes('add proc')) {
        return { text: 'Highlighting the Add Procurement link for you. Look at the sidebar! 👀', highlightNav: 'add-proc' };
    }
    if (lower.includes('add procurement') || lower.includes('new record') || lower.includes('new procurement')) {
        return { text: 'Opening the Add Procurement form for you. Fill in the PR Number, Project Name, and select the procurement type to get started. ➕', navigateTo: '/procurement?tab=add' };
    }
    if (lower.includes('records') && !lower.includes('urgent')) {
        return { text: 'Navigating to Procurement Records. Use the filters at the top to narrow down by date, status, or process status. 📋', navigateTo: '/procurement?tab=records' };
    }
    if (lower.includes('urgent')) {
        return { text: 'Opening Urgent Records. You can set urgency levels (Critical/High/Medium/Low/Done) and deadlines for any procurement here. 🚨', navigateTo: '/urgent-records' };
    }
    if (lower.includes('storage') || lower.includes('drawer') || lower.includes('cabinet') || lower.includes('folder')) {
        return { text: 'Going to the Storage module. Here you can manage Drawers, Cabinets, Folders, and Boxes for physical file storage. 📦', navigateTo: '/storage' };
    }
    if (lower.includes('visual map') || lower.includes('visual allocation')) {
        return { text: 'Opening the Visual Map — an interactive view of all storage locations and their contents. 🗺️', navigateTo: '/visual-allocation' };
    }
    if (lower.includes('supplier')) {
        return { text: 'Navigating to Suppliers. You can view procurement history and award statistics per supplier. 🚚', navigateTo: '/suppliers' };
    }
    if (lower.includes('manual') || lower.includes('guide') || lower.includes('help') || lower.includes('how to')) {
        if (lower.includes('how to') && (lower.includes('svp') || lower.includes('bidding') || lower.includes('process'))) {
            // Keep in chat
        } else {
            return { text: 'Opening the Manual Guide — step-by-step documentation for every module in ProcureFlow. 📖', navigateTo: '/manual' };
        }
    }
    if (lower.includes('settings')) {
        return { text: 'Going to Settings where you can change your theme, alarm thresholds, and profile info. ⚙️', navigateTo: '/settings' };
    }
    if (lower.includes('progress') || lower.includes('tracking')) {
        return { text: 'Opening Progress Tracking to see all procurement records organized by their workflow stage. 📈', navigateTo: '/procurement?tab=tracking' };
    }

    // SVP process
    if (lower.includes('svp') && lower.includes('process')) {
        return { text: `**SVP (Small Value Procurement) Process:**\n\n1. **Received PR for Action** — Receive the Purchase Request from the end user\n2. **PR Deliberated** — BAC deliberates and approves the PR\n3. **Published** — Post to PhilGEPS\n4. **RFQ for Canvass** — Send Request for Quotation to at least 3 suppliers\n5. **RFQ Opening** — Open and compare quotations\n6. **BAC Resolution** — BAC issues resolution approving the award\n7. **Forwarded to GSD for P.O.** — Forward to GSO for Purchase Order issuance\n\nAll dates are tracked in the monitoring sheet. Set status to **"Processing"** while ongoing, **"Completed"** when done.` };
    }

    // Regular Bidding process
    if ((lower.includes('regular bidding') || lower.includes('bidding process'))) {
        return { text: `**Regular Bidding Process:**\n\n1. Received PR for Action\n2. PR Deliberated\n3. Published (PhilGEPS)\n4. Pre-Bid Conference\n5. Bid Opening\n6. Bid Evaluation Report\n7. Post-Qualification\n8. Post-Qualification Report\n9. BAC Resolution\n10. Forwarded to OAPIA\n11. Notice of Award (NOA)\n12. Contract Signing\n13. Notice to Proceed (NTP)\n14. Awarded to Supplier\n\nThis is governed by **RA 9184** and its IRR.` };
    }

    // Shopping process
    if (lower.includes('shopping') && lower.includes('process')) {
        return { text: `**Shopping Process (Section 52 of RA 9184):**\n\n1. Received PR\n2. Budget Certification\n3. RFQ for Canvass\n4. Canvass/Evaluation\n5. Abstract of Quotations\n6. Purchase Order issuance\n\nShopping is used for readily available goods with amounts ≤ the threshold set by GPPB.` };
    }

    // Urgency
    if (lower.includes('urgency') || lower.includes('urgent')) {
        return { text: `**Urgency Levels in ProcureFlow:**\n\n🔴 **Critical** — Immediate action needed\n🟠 **High** — Action required soon (appears in Deadlines Calendar)\n🟡 **Medium** — Monitor closely\n🔵 **Low** — Low priority (appears in Deadlines Calendar)\n✅ **Done** — Resolved, excluded from all counters\n⚫ **None** — No urgency set\n\nTo set urgency: Go to **Urgent Records** and click the ✏️ pencil icon on any record.` };
    }

    // Storage
    if (lower.includes('storage') || lower.includes('location') || lower.includes('drawer') || lower.includes('box')) {
        return { text: `**Storage Hierarchy in ProcureFlow:**\n\n**Drawer Storage:**\nDrawer → Cabinet → Folder → File\n\n**Box Storage:**\nBox → Folder → File\n\nWhen adding/editing a record, set the **Storage Status** to:\n- **Processing** — File is still being worked on\n- **In Storage** — File is physically filed (you can assign a location)\n- **Borrowed** — File has been taken out\n- **Archived** — File is archived\n\nUse the **Visual Map** to see an interactive layout of all locations.` };
    }

    // CSV Export
    if (lower.includes('export') || lower.includes('csv') || lower.includes('download')) {
        return { text: `**Exporting Records to CSV:**\n\n1. Go to **Procurement Records**\n2. Click the **Export CSV** button (top right)\n3. In the Export Modal, filter by:\n   - Year, Division, Storage Status\n   - Process Status (Completed, Processing, etc.)\n   - ABC range, Bid Amount range\n4. Click **Export** — a CSV file downloads immediately\n\nThe export includes all monitoring dates, supplier info, stack numbers, and checklist items.` };
    }

    // Status meaning
    if (lower.includes('processing') && lower.includes('status')) {
        return { text: `**"Processing" Status** means the procurement record is currently being worked on — it hasn't been physically filed in storage yet. This is the default status for new records.\n\nIt's different from the **Process Status** (e.g., "Not yet Acted", "Completed") which tracks the procurement workflow stage.` };
    }

    // RA 9184
    if (lower.includes('ra 9184') || lower.includes('republic act 9184') || lower.includes('procurement law')) {
        return { text: `**Republic Act 9184** — Government Procurement Reform Act\n\nKey provisions:\n- **Section 10**: Competitive Bidding as default mode\n- **Section 48**: Alternative Methods (SVP, Shopping, etc.)\n- **Section 52**: Shopping mode of procurement\n- **Section 54**: Negotiated Procurement\n\nThe BAC (Bids and Awards Committee) is responsible for all procurement activities and is composed of at least 5 members with a BAC Secretariat for support.` };
    }

    // PR Number
    if (lower.includes('pr number') || lower.includes('purchase request')) {
        return { text: `**PR Number Format in ProcureFlow:**\n\n**Old Format:** DIV-MMM-YY-SEQ (e.g., IT-JAN-24-001)\n**New Format:** YYYY-MMM-SEQ (e.g., 2025-JAN-001)\n\nPR Numbers auto-generate sequence numbers when adding new records. You can override them manually. The system warns you if a duplicate PR Number is detected.` };
    }

    // Default
    return { text: `I can help you with:\n\n• 🗺️ **Navigation** — "Go to [page name]"\n• 📋 **Procurement processes** — SVP, Regular Bidding, Shopping\n• 📦 **Storage guidance** — Drawers, Cabinets, Folders, Boxes\n• 🚨 **Urgency tracking** — Setting deadlines and priority levels\n• 📊 **System features** — Filtering, exporting, editing records\n• ⚖️ **RA 9184** — Procurement law questions\n\nWhat would you like to know?` };
}

export default function AIChatbot() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false });
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: "👋 Hi! I'm **ProcureBot**, your ProcureFlow assistant.\n\nI can help you navigate the system, answer procurement process questions, and guide you through RA 9184.\n\nWhat can I help you with?",
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            inputRef.current?.focus();
        }
    }, [messages, isOpen, isMinimized]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.isDragging) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setPosition({
                x: dragRef.current.initialX + dx,
                y: dragRef.current.initialY + dy
            });
        };
        const handleMouseUp = () => {
            if (dragRef.current.isDragging) {
                dragRef.current.isDragging = false;
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (isOpen && !target.closest('.drag-handle')) return;
        
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y,
            isDragging: true
        };
    };

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

        const { text: responseText, navigateTo, highlightNav } = generateResponse(text, navigate) as { text: string, navigateTo?: string, highlightNav?: string };
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);

        if (navigateTo) {
            setTimeout(() => navigate(navigateTo), 800);
        }
        if (highlightNav) {
            window.dispatchEvent(new CustomEvent('highlight-nav', { detail: highlightNav }));
        }
    };

    const formatMessage = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Bold: **text**
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return (
                <span key={i}>
                    <span dangerouslySetInnerHTML={{ __html: formatted }} />
                    {i < lines.length - 1 && <br />}
                </span>
            );
        });
    };

    const clearChat = () => {
        setMessages([{
            id: '0',
            role: 'assistant',
            content: "Chat cleared! How can I help you? 😊",
            timestamp: new Date(),
        }]);
    };

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        // Prevent click if we were dragging
                        if (Math.abs(position.x - dragRef.current.initialX) > 5 || Math.abs(position.y - dragRef.current.initialY) > 5) {
                            return;
                        }
                        setIsOpen(true); setIsMinimized(false); 
                    }}
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group drag-handle cursor-move"
                    title="Open ProcureBot AI Assistant"
                >
                    <Bot className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div 
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                    className={cn(
                    'fixed bottom-6 right-6 z-50 w-[360px] rounded-2xl shadow-2xl border border-border bg-card flex flex-col transition-all duration-300',
                    isMinimized ? 'h-[52px]' : 'h-[520px]'
                )}>
                    {/* Header */}
                    <div onMouseDown={handleMouseDown} className="drag-handle cursor-move flex items-center justify-between px-4 py-3 border-b border-border rounded-t-2xl bg-primary/10">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                <Bot className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">ProcureBot</p>
                                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Online · AI Assistant
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={clearChat}
                                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                title="Clear chat"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setIsMinimized(m => !m)}
                                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {messages.map(msg => (
                                    <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                        {msg.role === 'assistant' && (
                                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                                <Bot className="h-3 w-3 text-primary" />
                                            </div>
                                        )}
                                        <div className={cn(
                                            'max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-muted text-foreground rounded-bl-none'
                                        )}>
                                            {formatMessage(msg.content)}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                                <User className="h-3 w-3 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <Bot className="h-3 w-3 text-primary" />
                                        </div>
                                        <div className="bg-muted rounded-2xl rounded-bl-none px-3 py-2">
                                            <div className="flex gap-1 items-center h-4">
                                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Prompts */}
                            {messages.length <= 1 && (
                                <div className="px-3 pb-2">
                                    <p className="text-[10px] text-muted-foreground mb-1.5">Quick questions:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {QUICK_PROMPTS.map(prompt => (
                                            <button
                                                key={prompt}
                                                onClick={() => sendMessage(prompt)}
                                                className="text-[10px] px-2 py-1 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-3 border-t border-border">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                                        placeholder="Ask anything about ProcureFlow..."
                                        className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                        onClick={() => sendMessage(input)}
                                        disabled={!input.trim() || isTyping}
                                        className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
