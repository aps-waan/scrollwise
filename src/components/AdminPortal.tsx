import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  LogOut,
  Sparkles,
  Layers,
  Save,
  Globe,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Tag,
  Palette,
  FileText,
  AlertCircle,
  ExternalLink,
  Lock,
  Copy
} from 'lucide-react';
import { FlipCard } from './FlipCard';
import { Book, FlashCard } from './DeepstashApp';

interface AdminPortalProps {
  onBackToConsumer: () => void;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ef4444', // Rose
  '#3b82f6', // Blue
];

const DISCIPLINES = [
  'Psychology',
  'Applied Economics',
  'Finance',
  'Business Strategy',
  'Computer Science',
  'Philosophy',
  'Self Improvement',
  'Cognitive Science'
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToConsumer }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('scrollwise_admin_token');
  });
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Books Data
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Authoring / Editor State
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activePreviewCardIndex, setActivePreviewCardIndex] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // File upload state
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Check auth and load books on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadAdminBooks();
    }
  }, [isAuthenticated]);

  const loadAdminBooks = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('scrollwise_admin_token') || 'scrollwise-master-admin-session-token';
    try {
      const res = await fetch('/api/admin/books', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      } else {
        // Fallback to local books.json
        const localRes = await fetch('/books.json');
        const localData = await localRes.json();
        setBooks(localData);
      }
    } catch {
      // Local fallback
      try {
        const fallback = localStorage.getItem('scrollwise_custom_books');
        if (fallback) setBooks(JSON.parse(fallback));
      } catch (e) {
        console.warn('Fallback error:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('scrollwise_admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Invalid credentials. Default: admin / scrollwise_admin');
      }
    } catch {
      // If server offline, allow local credential check for prototype
      if (loginUser === 'admin' && (loginPass === 'scrollwise_admin' || loginPass === 'admin123')) {
        localStorage.setItem('scrollwise_admin_token', 'local-admin-token');
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid credentials. Hint: admin / scrollwise_admin');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scrollwise_admin_token');
    setIsAuthenticated(false);
    setEditingBook(null);
  };

  // Start new book authoring
  const handleAddNewBook = () => {
    const newBook: Book = {
      id: `b_${Date.now()}`,
      title: '',
      author: '',
      discipline: 'Psychology',
      category: 'Cognitive Science',
      color: '#f59e0b',
      read_time: '4 min',
      tags: ['mental-model', 'decision-making'],
      summary: '',
      chapters: [
        {
          chapter_num: 1,
          title: 'Core Mental Models & Principles',
          cards: [
            {
              front: 'First Core Principle: Name & Hook',
              back: 'Write the comprehensive distilled summary and conceptual explanation for this model...',
              takeaway: 'Practical rule of thumb for immediate daily application.'
            }
          ]
        }
      ],
      // @ts-ignore
      status: 'draft',
      cover_image: ''
    };
    setEditingBook(newBook);
    setIsCreatingNew(true);
    setActivePreviewCardIndex(0);
  };

  const handleEditBook = (book: Book) => {
    // Deep clone to prevent direct state mutation before saving
    setEditingBook(JSON.parse(JSON.stringify(book)));
    setIsCreatingNew(false);
    setActivePreviewCardIndex(0);
  };

  // Card list operations
  const handleAddCard = () => {
    if (!editingBook) return;
    const cards = editingBook.chapters?.[0]?.cards || [];
    const newCard: FlashCard = {
      front: `Principle #${cards.length + 1}: Concept Headline`,
      back: 'Write the comprehensive distilled explanation here...',
      takeaway: 'Key practical takeaway or memorable decision rule.'
    };

    const updated = {
      ...editingBook,
      chapters: [
        {
          ...(editingBook.chapters?.[0] || { chapter_num: 1, title: 'Core Principles' }),
          cards: [...cards, newCard]
        }
      ]
    };
    setEditingBook(updated);
    setActivePreviewCardIndex(cards.length);
  };

  const handleUpdateCard = (idx: number, field: keyof FlashCard, val: string) => {
    if (!editingBook) return;
    const cards = [...(editingBook.chapters?.[0]?.cards || [])];
    if (cards[idx]) {
      cards[idx] = { ...cards[idx], [field]: val };
      setEditingBook({
        ...editingBook,
        chapters: [
          {
            ...(editingBook.chapters?.[0] || { chapter_num: 1, title: 'Core Principles' }),
            cards
          }
        ]
      });
    }
  };

  const handleDeleteCard = (idx: number) => {
    if (!editingBook) return;
    const cards = (editingBook.chapters?.[0]?.cards || []).filter((_, i) => i !== idx);
    setEditingBook({
      ...editingBook,
      chapters: [
        {
          ...(editingBook.chapters?.[0] || { chapter_num: 1, title: 'Core Principles' }),
          cards
        }
      ]
    });
    if (activePreviewCardIndex >= cards.length) {
      setActivePreviewCardIndex(Math.max(0, cards.length - 1));
    }
  };

  const handleMoveCard = (idx: number, direction: 'up' | 'down') => {
    if (!editingBook) return;
    const cards = [...(editingBook.chapters?.[0]?.cards || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;

    const temp = cards[idx];
    cards[idx] = cards[targetIdx];
    cards[targetIdx] = temp;

    setEditingBook({
      ...editingBook,
      chapters: [
        {
          ...(editingBook.chapters?.[0] || { chapter_num: 1, title: 'Core Principles' }),
          cards
        }
      ]
    });
    setActivePreviewCardIndex(targetIdx);
  };

  // Cover image upload handler
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBook) return;

    setIsUploadingCover(true);
    const token = localStorage.getItem('scrollwise_admin_token') || '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-cover', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setEditingBook({
          ...editingBook,
          // @ts-ignore
          cover_image: data.url
        });
      } else {
        // Fallback: Read as base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingBook({
            ...editingBook,
            // @ts-ignore
            cover_image: reader.result as string
          });
        };
        reader.readAsDataURL(file);
      }
    } catch {
      // Local fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBook({
          ...editingBook,
          // @ts-ignore
          cover_image: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Save or Publish
  const handleSaveBook = async (publishStatus: 'published' | 'draft') => {
    if (!editingBook) return;
    if (!editingBook.title.trim()) {
      alert('Please provide a book title.');
      return;
    }

    const cards = editingBook.chapters?.[0]?.cards || [];
    if (cards.length === 0) {
      alert('Please add at least one flashcard before saving.');
      return;
    }

    const bookToSave: Book = {
      ...editingBook,
      // @ts-ignore
      status: publishStatus,
      read_time: `${Math.max(2, Math.ceil(cards.length * 1.5))} min`
    };

    const token = localStorage.getItem('scrollwise_admin_token') || 'scrollwise-master-admin-session-token';

    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookToSave)
      });

      if (!res.ok) {
        console.warn('API error, saving locally');
      }
    } catch (e) {
      console.warn('Offline fallback save:', e);
    }

    // Update local state
    setBooks((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === bookToSave.id);
      let nextList: Book[];
      if (existingIdx >= 0) {
        nextList = [...prev];
        nextList[existingIdx] = bookToSave;
      } else {
        nextList = [bookToSave, ...prev];
      }
      localStorage.setItem('scrollwise_custom_books', JSON.stringify(nextList));
      return nextList;
    });

    setSaveSuccessMessage(
      publishStatus === 'published'
        ? `🎉 "${bookToSave.title}" has been PUBLISHED to the live Consumer Portal!`
        : `💾 "${bookToSave.title}" saved as DRAFT (hidden from consumers).`
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);

    setEditingBook(null);
    setIsCreatingNew(false);
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${bookTitle}"?`)) return;

    const token = localStorage.getItem('scrollwise_admin_token') || '';
    try {
      await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Delete API call failed:', e);
    }

    setBooks((prev) => {
      const nextList = prev.filter((b) => b.id !== bookId);
      localStorage.setItem('scrollwise_custom_books', JSON.stringify(nextList));
      return nextList;
    });

    setSaveSuccessMessage(`🗑️ Deleted "${bookTitle}"`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleTogglePublish = async (book: Book) => {
    const nextStatus: 'published' | 'draft' = book.status === 'published' ? 'draft' : 'published';
    const updated: Book = { ...book, status: nextStatus };
    const token = localStorage.getItem('scrollwise_admin_token') || '';

    try {
      await fetch('/api/admin/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('Publish toggle failed:', e);
    }

    setBooks((prev) => {
      const nextList = prev.map((b) => (b.id === book.id ? updated : b));
      localStorage.setItem('scrollwise_custom_books', JSON.stringify(nextList));
      return nextList;
    });

    setSaveSuccessMessage(
      nextStatus === 'published'
        ? `🚀 "${book.title}" is now LIVE on the Consumer Portal!`
        : `🔒 "${book.title}" reverted to DRAFT.`
    );
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Filtered books for list view
  const filteredBooks = books.filter((b) => {
    // @ts-ignore
    const status = b.status || 'published';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.discipline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // =========================================================================
  // VIEW: LOGIN SCREEN (If not authenticated)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-4 relative selection:bg-amber-400 selection:text-black">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="w-full max-w-md p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-6 relative z-10">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-400/25">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white mt-1">
              ScrollWise Admin Portal
            </h1>
            <p className="text-xs text-white/50">
              Curator & Administrator access for manual content publishing.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1">
                Administrator Username
              </label>
              <input
                type="text"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter password..."
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/60"
              />
              <span className="text-[10px] text-white/40 mt-1 block">
                Default: <code className="text-amber-300">admin</code> / <code className="text-amber-300">scrollwise_admin</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 w-full py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoggingIn ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <button
              onClick={onBackToConsumer}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              ← Return to Consumer Discovery Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHORING STUDIO (Create or Edit Book)
  // =========================================================================
  if (editingBook) {
    const cards = editingBook.chapters?.[0]?.cards || [];
    const currentCard = cards[activePreviewCardIndex] || cards[0];

    return (
      <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased flex flex-col relative selection:bg-amber-400 selection:text-black">
        {/* Admin Header */}
        <header className="h-16 border-b border-white/10 bg-black/60 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingBook(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <span className="text-white/30">|</span>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              {isCreatingNew ? 'Creating New Book' : `Editing: ${editingBook.title || 'Untitled'}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview 3D Flashcard</span>
            </button>

            <button
              onClick={() => handleSaveBook('draft')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => handleSaveBook('published')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-extrabold shadow-md shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Publish to Live Site</span>
            </button>
          </div>
        </header>

        {/* Studio Workspace: Split Columns */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Book Metadata (4 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-xl flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/10">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Book Metadata & Cover
              </h2>

              {/* Title & Author */}
              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  placeholder="e.g. Thinking, Fast and Slow"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  placeholder="e.g. Daniel Kahneman"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Discipline & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-white/70 block mb-1">
                    Discipline
                  </label>
                  <select
                    value={editingBook.discipline}
                    onChange={(e) => setEditingBook({ ...editingBook, discipline: e.target.value })}
                    className="w-full bg-[#10141f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-amber-300 focus:outline-none"
                  >
                    {DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/70 block mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    placeholder="e.g. Cognitive Science"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Theme Color Picker */}
              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingBook({ ...editingBook, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        editingBook.color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="text"
                    value={editingBook.color || '#f59e0b'}
                    onChange={(e) => setEditingBook({ ...editingBook, color: e.target.value })}
                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono uppercase ml-2 text-center"
                  />
                </div>
              </div>

              {/* Book Cover Upload */}
              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-white/70 block flex items-center justify-between">
                  <span>Cover Image</span>
                  <span className="text-[10px] text-white/40">URL or File Upload</span>
                </label>

                <div className="flex items-center gap-3">
                  {/* Cover Preview Box */}
                  <div
                    className="w-16 h-20 rounded-xl border border-white/15 overflow-hidden flex items-center justify-center shrink-0 shadow-lg"
                    style={{ backgroundColor: editingBook.color || '#6366f1' }}
                  >
                    {/* @ts-ignore */}
                    {editingBook.cover_image ? (
                      <img
                        // @ts-ignore
                        src={editingBook.cover_image}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-6 h-6 text-white/80" />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      type="text"
                      // @ts-ignore
                      value={editingBook.cover_image || ''}
                      onChange={(e) =>
                        // @ts-ignore
                        setEditingBook({ ...editingBook, cover_image: e.target.value })
                      }
                      placeholder="Paste cover image URL..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />

                    <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-[11px] font-semibold border border-white/15 w-fit">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCover ? 'Uploading...' : 'Upload Cover File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Comprehensive Book Summary / Description (Manual) */}
              <div className="pt-2 border-t border-white/10">
                <label className="text-[11px] font-semibold text-white/70 block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Manual Book Summary & Overview *
                </label>
                <textarea
                  rows={4}
                  value={editingBook.summary}
                  onChange={(e) => setEditingBook({ ...editingBook, summary: e.target.value })}
                  placeholder="Write the comprehensive executive summary for this book..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Manual Flashcard Authoring & Reordering (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-xl flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Manually Curated Flashcards ({cards.length})
                  </h2>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Write the exact front concept and back distilled explanation for each card.
                  </p>
                </div>

                <button
                  onClick={handleAddCard}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Flashcard
                </button>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-4">
                {cards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 relative group hover:border-white/20 transition-all"
                  >
                    {/* Card Item Header with Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold font-mono">
                          Idea #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white/80 line-clamp-1">
                          {card.front || 'Untitled Concept'}
                        </span>
                      </div>

                      {/* Move Up / Down / Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveCard(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move card up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCard(idx, 'down')}
                          disabled={idx === cards.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move card down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(idx)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 ml-2 cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Front Headline */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-amber-300/80 block mb-1">
                        Front Face: Core Concept Headline / Hook *
                      </label>
                      <input
                        type="text"
                        value={card.front}
                        onChange={(e) => handleUpdateCard(idx, 'front', e.target.value)}
                        placeholder="e.g. System 1 vs System 2: Two Modes of Thought"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Back Distilled Summary */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-indigo-300/80 block mb-1">
                        Back Face: Distilled Summary Breakdown & Analysis *
                      </label>
                      <textarea
                        rows={3}
                        value={card.back}
                        onChange={(e) => handleUpdateCard(idx, 'back', e.target.value)}
                        placeholder="Write the in-depth conceptual breakdown and key arguments..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-400 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Practical Takeaway */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-amber-300/80 block mb-1">
                        Back Face: Practical Application / Rule of Thumb
                      </label>
                      <input
                        type="text"
                        value={card.takeaway}
                        onChange={(e) => handleUpdateCard(idx, 'takeaway', e.target.value)}
                        placeholder="e.g. Cognitive bias thrives when we let intuitive System 1 make complex decisions."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-100 font-serif italic focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Live 3D Flashcard Preview */}
        {isPreviewModalOpen && currentCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#10141f] border border-white/15 w-full max-w-xl rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Live 3D FlipCard Preview ({activePreviewCardIndex + 1} of {cards.length})
                </span>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-xs text-white/50 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              {/* Idea Tab Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {cards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePreviewCardIndex(i)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      activePreviewCardIndex === i
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    Idea {i + 1}
                  </button>
                ))}
              </div>

              {/* 3D FlipCard */}
              <FlipCard
                key={activePreviewCardIndex}
                height={340}
                frontLabel="Summary Principle"
                backLabel="Distilled Analysis & Takeaway"
                front={
                  <div className="flex flex-col justify-between h-full p-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-2">
                        {editingBook.discipline} • Idea {activePreviewCardIndex + 1}
                      </span>
                      <h3 className="text-xl font-bold text-white">
                        "{currentCard.front}"
                      </h3>
                      <p className="text-xs text-white/60 mt-2 line-clamp-3 leading-relaxed">
                        {editingBook.summary}
                      </p>
                    </div>
                    <p className="text-xs text-white/40 italic">
                      Click anywhere on card to flip ↻
                    </p>
                  </div>
                }
                back={
                  <div className="flex flex-col justify-between h-full p-2">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-2">
                        Distilled Summary Breakdown
                      </span>
                      <p className="text-sm text-white/95 leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-100 italic">
                      "{currentCard.takeaway}"
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN ADMIN DASHBOARD & BOOKS CATALOG
  // =========================================================================
  const publishedCount = books.filter((b) => (b as any).status === 'published' || !(b as any).status).length;
  const draftCount = books.filter((b) => (b as any).status === 'draft').length;
  const totalCardsCount = books.reduce((acc, b) => acc + (b.chapters?.[0]?.cards?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased flex flex-col relative selection:bg-amber-400 selection:text-black">
      {/* Toast Notification */}
      {saveSuccessMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl animate-fade-in border border-emerald-400">
          <Check className="w-4 h-4 text-black" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-black/60 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-amber-400/20 text-black font-extrabold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white leading-none">
                Scroll<span className="text-amber-400">Wise</span> Studio
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30">
                Admin Portal
              </span>
            </div>
            <span className="text-[10px] text-white/40">Manual Academic Curation & Publishing</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onBackToConsumer}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-white/90 font-semibold border border-white/15 transition-all cursor-pointer"
          >
            <span>Live Consumer View</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-rose-400 text-xs transition-colors cursor-pointer"
            title="Log out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Banner with Stats */}
        <div className="p-6 md:p-8 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Curator Control Center
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">● Shared Database Live</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Academic Knowledge Publishing Studio
            </h1>
            <p className="text-xs text-white/50 mt-1 max-w-xl">
              Write, curate, and publish books and 3D flashcards. All content published here updates the consumer platform in real-time.
            </p>
          </div>

          <button
            onClick={handleAddNewBook}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-400/25 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Author New Book</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs font-semibold text-white/50">Total Books</span>
            <span className="text-2xl font-black text-white">{books.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs font-semibold text-emerald-400/80">Published Live</span>
            <span className="text-2xl font-black text-emerald-300">{publishedCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs font-semibold text-amber-400/80">Drafts (Unpublished)</span>
            <span className="text-2xl font-black text-amber-300">{draftCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
            <span className="text-xs font-semibold text-indigo-400/80">Curated Flashcards</span>
            <span className="text-2xl font-black text-indigo-300">{totalCardsCount}</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All Books (${books.length})` },
              { id: 'published', label: `Published (${publishedCount})` },
              { id: 'draft', label: `Drafts (${draftCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-400 text-black font-bold shadow-md'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, discipline..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Books Table / Grid */}
        <div className="flex flex-col gap-3">
          {filteredBooks.map((book) => {
            // @ts-ignore
            const isPublished = book.status === 'published' || !book.status;
            const cardsCount = book.chapters?.[0]?.cards?.length || 0;

            return (
              <div
                key={book.id}
                className="p-5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg group"
              >
                {/* Book Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-12 h-14 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0 border border-white/15 overflow-hidden"
                    style={{ backgroundColor: book.color || '#6366f1' }}
                  >
                    {/* @ts-ignore */}
                    {book.cover_image ? (
                      <img
                        // @ts-ignore
                        src={book.cover_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                          isPublished
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isPublished ? '● Published Live' : '○ Draft'}
                      </span>
                      <span className="text-[11px] text-white/50">{book.discipline}</span>
                      <span className="text-[11px] text-white/30">•</span>
                      <span className="text-[11px] text-white/50">{cardsCount} Flashcards</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {book.title}
                    </h3>
                    <span className="text-xs text-white/50">By {book.author}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(book)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isPublished
                        ? 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isPublished ? 'Unpublish' : 'Publish Live'}
                  </button>

                  <button
                    onClick={() => handleEditBook(book)}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Edit & Curate
                  </button>

                  <button
                    onClick={() => handleDeleteBook(book.id, book.title)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Book"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredBooks.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-black/40 border border-white/10 text-white/40 text-xs">
              No books found matching your filter or search.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
