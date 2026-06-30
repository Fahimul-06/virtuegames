import { useEffect, useState } from 'react';
import { HelpCircle, Plus, MessageSquare, AlertCircle, Check, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { SupportTicket, TicketReply } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/Modal';

const STATUS_STYLES: Record<string, string> = {
  open: 'text-blue-400 bg-blue-400/10',
  in_progress: 'text-yellow-400 bg-yellow-400/10',
  resolved: 'text-emerald-400 bg-emerald-400/10',
  closed: 'text-gray-400 bg-gray-400/10',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

export default function SupportPage() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, TicketReply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('general');
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [message, setMessage] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, [user]);

  const loadReplies = async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at');
    setReplies((prev) => ({ ...prev, [ticketId]: data ?? [] }));
  };

  const toggleTicket = async (id: string) => {
    if (expandedTicket === id) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(id);
      if (!replies[id]) await loadReplies(id);
    }
  };

  const handleNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);
    setFormError('');

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({ subject, category, priority })
      .select()
      .single();

    if (error || !ticket) { setFormError('Failed to create ticket. Please try again.'); setFormLoading(false); return; }

    await supabase.from('ticket_replies').insert({
      ticket_id: ticket.id,
      message,
      is_staff: false,
    });

    setFormSuccess('Ticket submitted! We\'ll respond within 24 hours.');
    await loadTickets();
    setFormLoading(false);
    setTimeout(() => {
      setNewTicketModal(false);
      setSubject(''); setCategory('general'); setPriority('normal'); setMessage('');
      setFormSuccess('');
    }, 2000);
  };

  const handleReply = async (ticketId: string) => {
    const text = replyText[ticketId]?.trim();
    if (!text || !user) return;
    await supabase.from('ticket_replies').insert({ ticket_id: ticketId, message: text, is_staff: false });
    setReplyText((prev) => ({ ...prev, [ticketId]: '' }));
    await loadReplies(ticketId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to access support.</p>
          <button onClick={() => navigate('auth')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="py-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-1">Support</h1>
            <p className="text-gray-500 text-sm">We're here to help. Average response time: 2 hours.</p>
          </div>
          <button
            onClick={() => setNewTicketModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
          >
            <Plus size={16} /> New Ticket
          </button>
        </div>

        {/* Quick help cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Billing Issues', cat: 'billing' as const },
            { label: 'Technical Support', cat: 'technical' as const },
            { label: 'GPU Help', cat: 'gpu' as const },
            { label: 'Gaming Issues', cat: 'gaming' as const },
            { label: 'Account Help', cat: 'account' as const },
            { label: 'General Inquiry', cat: 'general' as const },
          ].map((item) => (
            <button
              key={item.cat}
              onClick={() => { setCategory(item.cat); setNewTicketModal(true); }}
              className="p-4 rounded-xl bg-gray-900 border border-white/5 hover:border-white/10 hover:bg-gray-800 transition-all text-left"
            >
              <div className="text-white text-sm font-medium">{item.label}</div>
              <div className="text-gray-600 text-xs mt-0.5">Click to open ticket</div>
            </button>
          ))}
        </div>

        {/* Ticket list */}
        <div className="space-y-3">
          {loading ? (
            <>
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-900 animate-pulse" />)}
            </>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No tickets yet</p>
              <button onClick={() => setNewTicketModal(true)} className="text-cyan-400 text-sm hover:text-cyan-300">
                Open your first support ticket →
              </button>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleTicket(ticket.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <MessageSquare size={16} className="text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="text-white text-sm font-medium">{ticket.subject}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs capitalize ${PRIORITY_STYLES[ticket.priority]}`}>{ticket.priority}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-gray-500 text-xs capitalize">{ticket.category}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-gray-600 text-xs">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[ticket.status]}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    {expandedTicket === ticket.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>
                </button>

                {expandedTicket === ticket.id && (
                  <div className="border-t border-white/5 p-5">
                    <div className="space-y-3 mb-4">
                      {(replies[ticket.id] ?? []).map((reply) => (
                        <div key={reply.id} className={`flex gap-3 ${reply.is_staff ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                            reply.is_staff ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {reply.is_staff ? 'CP' : 'U'}
                          </div>
                          <div className={`max-w-sm px-4 py-2.5 rounded-xl text-sm ${
                            reply.is_staff ? 'bg-gray-800 text-gray-300' : 'bg-cyan-500/10 border border-cyan-500/20 text-gray-200'
                          }`}>
                            {reply.message}
                            <div className="text-gray-600 text-xs mt-1">
                              {new Date(reply.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText[ticket.id] ?? ''}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleReply(ticket.id)}
                          placeholder="Add a reply..."
                          className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                        <button
                          onClick={() => handleReply(ticket.id)}
                          className="p-2.5 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 transition-all"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <Modal open={newTicketModal} onClose={() => { setNewTicketModal(false); setFormError(''); setFormSuccess(''); }} title="Open Support Ticket" size="md">
        <div className="p-6">
          {formSuccess ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check size={16} /> {formSuccess}
            </div>
          ) : (
            <form onSubmit={handleNewTicket} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Brief description of your issue"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    {(['general', 'billing', 'technical', 'gpu', 'gaming', 'account'] as const).map((c) => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                      <option key={p} value={p} className="capitalize">{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe your issue in detail..."
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {formLoading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
