import React, { useState, useEffect, useRef } from 'react';
import { FlipCard } from './FlipCard';
import { SummaryDeployerModal } from './SummaryDeployerModal';
import {
  Compass,
  BookOpen,
  Bookmark,
  Search,
  Sparkles,
  Share2,
  Heart,
  Download,
  Check,
  Brain,
  Layers,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Lightbulb,
  ArrowUp
} from 'lucide-react';

export interface FlashCard {
  front: string;
  back: string;
  takeaway: string;
}

export interface Chapter {
  chapter_num: number;
  title: string;
  cards: FlashCard[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  discipline: string;
  category: string;
  color?: string;
  read_time?: string;
  tags: string[];
  summary: string;
  chapters: Chapter[];
  hybrid_score?: number;
  collab_score?: number;
  content_score?: number;
}

export interface StashedCard {
  id: string;
  bookTitle: string;
  author: string;
  discipline: string;
  front: string;
  back: string;
  takeaway: string;
  savedAt: string;
}

export const DeepstashApp: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_custom_books');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'for_you' | 'library' | 'stash'>('for_you');
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active card index tracking for each book (for working tabs!)
  const [activeCardByBook, setActiveCardByBook] = useState<Record<string, number>>({});

  // Summary Deployer Modal State
  const [isDeployerOpen, setIsDeployerOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stash and Likes State (persisted)
  const [stashedCards, setStashedCards] = useState<StashedCard[]>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_stash');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likedCardKeys, setLikedCardKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Reading history tracking
  const [readHistory, setReadHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_history');
      return saved ? JSON.parse(saved) : ['b1'];
    } catch {
      return ['b1'];
    }
  });

  // Save stash & history to localStorage
  useEffect(() => {
    localStorage.setItem('scrollwise_stash', JSON.stringify(stashedCards));
  }, [stashedCards]);

  useEffect(() => {
    localStorage.setItem('scrollwise_history', JSON.stringify(readHistory));
  }, [readHistory]);

  // Load books dataset (merging static books.json + custom saved books)
  useEffect(() => {
    const savedBookId = localStorage.getItem('scrollwise_active_book_id');
    fetch('/books.json')
      .then((res) => {
        if (!res.ok) throw new Error('Static fetch failed');
        return res.json();
      })
      .then((data: Book[]) => {
        // Merge with local custom books
        let merged = data;
        try {
          const localSaved = localStorage.getItem('scrollwise_custom_books');
          if (localSaved) {
            const parsedLocal: Book[] = JSON.parse(localSaved);
            const localMap = new Map(parsedLocal.map((b) => [b.id, b]));
            merged = data.map((b) => (localMap.has(b.id) ? localMap.get(b.id)! : b));
            // Add any custom books not in initial json
            parsedLocal.forEach((b) => {
              if (!merged.some((m) => m.id === b.id)) {
                merged.unshift(b);
              }
            });
          }
        } catch (e) {
          console.warn('Error reading local custom books:', e);
        }

        setBooks(merged);
        if (merged.length > 0) {
          const target = (savedBookId && merged.find((b) => b.id === savedBookId)) || merged[0];
          setActiveBook(target);
          fetchRecommendations(target.id, readHistory, merged);
        }
      })
      .catch((err) => {
        console.warn('Fallback to /api/books:', err);
        fetch('/api/books')
          .then((res) => res.json())
          .then((data: Book[]) => {
            setBooks(data);
            if (data.length > 0) {
              const target = (savedBookId && data.find((b) => b.id === savedBookId)) || data[0];
              setActiveBook(target);
              fetchRecommendations(target.id, readHistory, data);
            }
          })
          .catch((e) => console.error('Failed to load books:', e));
      });
  }, []);

  // Fetch ML recommendations
  const fetchRecommendations = async (bookId: string, history: string[], bookList?: Book[]) => {
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          recent_book_ids: history,
          user_history: history,
          alpha: 0.5,
          top_k: 6,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const recList = Array.isArray(result) ? result : result.recommendations || [];
        if (recList.length > 0) {
          setRecommendations(recList);
        }
        return;
      }
    } catch {
      // offline fallback
    }

    const source = bookList && bookList.length > 0 ? bookList : books;
    if (source.length > 0) {
      const fallbacks = source
        .filter((b) => b.id !== bookId)
        .slice(0, 5)
        .map((b, i) => ({
          ...b,
          hybrid_score: Math.max(50, 93 - i * 4),
        }));
      setRecommendations(fallbacks);
    }
  };

  // Rank books according to hybrid ML recommender
  const getRankedBooks = (): Book[] => {
    if (books.length === 0) return [];

    const bookMap = new Map<string, Book>();
    books.forEach((b) => bookMap.set(b.id, b));

    const rankedList: Book[] = [];
    const addedIds = new Set<string>();

    // 1. If activeBook exists, place at the top
    if (activeBook && bookMap.has(activeBook.id)) {
      rankedList.push({
        ...activeBook,
        hybrid_score: activeBook.hybrid_score || 98,
      });
      addedIds.add(activeBook.id);
    }

    // 2. Add recommended books
    recommendations.forEach((rec) => {
      if (!addedIds.has(rec.id) && bookMap.has(rec.id)) {
        const full = bookMap.get(rec.id)!;
        rankedList.push({
          ...full,
          hybrid_score: rec.hybrid_score || full.hybrid_score || 88,
        });
        addedIds.add(rec.id);
      }
    });

    // 3. Add remaining books
    const remaining = books
      .filter((b) => !addedIds.has(b.id))
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0));

    remaining.forEach((b, idx) => {
      rankedList.push({
        ...b,
        hybrid_score: b.hybrid_score || Math.max(45, 85 - idx * 2),
      });
      addedIds.add(b.id);
    });

    // Filter by discipline
    let result = rankedList;
    if (activeDiscipline !== 'all') {
      const match = rankedList.filter(
        (b) => b.discipline.toLowerCase() === activeDiscipline.toLowerCase()
      );
      const others = rankedList.filter(
        (b) => b.discipline.toLowerCase() !== activeDiscipline.toLowerCase()
      );
      result = [...match, ...others];
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.discipline.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q)
      );
    }

    return result;
  };

  // Deploy user entered summary onto flashcards
  const handleDeploySummary = async (updatedBook: Book) => {
    setBooks((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === updatedBook.id);
      let nextList: Book[];
      if (existingIdx >= 0) {
        nextList = [...prev];
        nextList[existingIdx] = updatedBook;
      } else {
        nextList = [updatedBook, ...prev];
      }
      localStorage.setItem('scrollwise_custom_books', JSON.stringify(nextList));
      return nextList;
    });

    setActiveBook(updatedBook);
    setActiveCardByBook((prev) => ({ ...prev, [updatedBook.id]: 0 }));
    setActiveTab('for_you');
    localStorage.setItem('scrollwise_active_book_id', updatedBook.id);

    // Show toast
    setToastMessage(`✨ Successfully deployed flashcards for "${updatedBook.title}"!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Persist to backend server if online
    try {
      await fetch('/api/books/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook),
      });
    } catch {
      // offline fallback
    }
  };

  // Toggle stash for card
  const toggleStashCard = (
    book: Book,
    card: FlashCard,
    cardIndex: number
  ) => {
    const cardId = `${book.id}-${cardIndex}`;
    const exists = stashedCards.some(
      (s) => s.id === cardId || (s.bookTitle === book.title && s.front === card.front)
    );

    if (exists) {
      setStashedCards((prev) =>
        prev.filter(
          (s) => !(s.id === cardId || (s.bookTitle === book.title && s.front === card.front))
        )
      );
    } else {
      const newStash: StashedCard = {
        id: cardId,
        bookTitle: book.title,
        author: book.author,
        discipline: book.discipline,
        front: card.front,
        back: card.back,
        takeaway: card.takeaway,
        savedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
      setStashedCards((prev) => [newStash, ...prev]);

      if (!readHistory.includes(book.id)) {
        const nextHist = [book.id, ...readHistory];
        setReadHistory(nextHist);
      }
    }
  };

  const copyTakeaway = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportMarkdown = () => {
    if (stashedCards.length === 0) return;
    const content = `# ScrollWise Study Deck
Exported on ${new Date().toLocaleDateString()}

${stashedCards
  .map(
    (c, i) => `## ${i + 1}. ${c.front}
- **Source:** ${c.bookTitle} by ${c.author} (${c.discipline})
- **Distilled Summary:** ${c.back}
- **Practical Takeaway:** *"${c.takeaway}"*
- **Saved on:** ${c.savedAt}
`
  )
  .join('\n---\n\n')}`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ScrollWise_Study_Deck_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSidebarWheel = (e: React.WheelEvent) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }
  };

  const rankedBooks = getRankedBooks();

  return (
    <div className="h-screen bg-[#090b10] text-[#e2e8f0] font-sans antialiased flex flex-col relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* Subtle Atmospheric Ambient Glow */}
      <div className="fixed inset-0 bg-radial from-indigo-950/20 via-[#0a0d14]/90 to-[#07090e] pointer-events-none z-0" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-400 text-black font-bold text-xs shadow-2xl shadow-amber-400/30 animate-fade-in border border-amber-300">
          <Sparkles className="w-4 h-4 fill-black text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP HEADER (Clean, Uncluttered, Purposeful)            */}
      {/* ======================================================== */}
      <header className="h-16 border-b border-white/10 bg-black/60 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6 flex-1 max-w-2xl">
          <div
            onClick={() => {
              setActiveTab('for_you');
              setActiveDiscipline('all');
            }}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-black font-bold fill-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white leading-none">
                Scroll<span className="text-amber-400">Wise</span>
              </span>
              <span className="text-[10px] text-white/50 font-medium">Interactive Book Summaries</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books, authors, mental models..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/10 transition-all backdrop-blur-md"
            />
          </div>
        </div>

        {/* Right: Enter Book Summary Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBookToEdit(null);
              setIsDeployerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-400/20 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
            <span>Enter Book Summary</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN APP THREE-COLUMN BODY LAYOUT                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10 h-[calc(100vh-4rem)] overflow-hidden">
        {/* ------------------------------------------------------ */}
        {/* LEFT COLUMN: Sidebar Navigation & Disciplines           */}
        {/* ------------------------------------------------------ */}
        <aside
          onWheel={handleSidebarWheel}
          className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl p-5 hidden md:flex flex-col justify-between shrink-0 h-full overflow-y-auto sticky top-0 self-start overscroll-contain select-none"
        >
          <div className="flex flex-col gap-6">
            {/* Nav Tabs */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('for_you');
                  setActiveDiscipline('all');
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  activeTab === 'for_you'
                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 shadow-lg shadow-amber-400/10'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>For You (Feed)</span>
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  activeTab === 'library'
                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Library Catalog</span>
              </button>

              <button
                onClick={() => setActiveTab('stash')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  activeTab === 'stash'
                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4 text-rose-400" />
                <span>Saved Ideas ({stashedCards.length})</span>
              </button>
            </div>

            {/* Disciplines & Categories */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-3">
                Disciplines & Topics
              </span>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: 'All Knowledge', icon: '🌐' },
                  { id: 'Psychology', label: 'Psychology', icon: '🧠' },
                  { id: 'Applied Economics', label: 'Economics', icon: '📈' },
                  { id: 'Finance', label: 'Finance & Wealth', icon: '💰' },
                  { id: 'Business Strategy', label: 'Strategy', icon: '♟️' },
                  { id: 'Computer Science', label: 'Computer Science', icon: '💻' },
                  { id: 'Philosophy', label: 'Philosophy', icon: '🏛️' },
                  { id: 'Self Improvement', label: 'Self Improvement', icon: '⚡' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveDiscipline(cat.id);
                      if (activeTab === 'stash') setActiveTab('for_you');
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                      activeDiscipline === cat.id
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reading Scholar Badge */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80">Interactive Flashcards</span>
              <span className="text-amber-400 font-bold">{books.length} Books</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full w-[80%] rounded-full" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50 pt-1">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Rank: Master Synthesizer</span>
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------ */}
        {/* CENTER COLUMN: Feed / Library / Stash Stream           */}
        {/* ------------------------------------------------------ */}
        <main
          ref={mainScrollRef}
          onScroll={(e) => {
            setShowScrollTop(e.currentTarget.scrollTop > 500);
          }}
          className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-y-auto scroll-smooth h-full relative focus:outline-none"
        >
          {/* ==================================================== */}
          {/* VIEW: MY STASH (Saved Flashcards & Markdown Export)   */}
          {/* ==================================================== */}
          {activeTab === 'stash' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-6 h-6 text-amber-400 fill-amber-400" />
                    My Stash
                  </h2>
                  <p className="text-xs text-white/50 mt-1">
                    Your personal collection of distilled insights ready for fast review and synthesis.
                  </p>
                </div>
                {stashedCards.length > 0 && (
                  <button
                    onClick={exportMarkdown}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
                  >
                    <Download className="w-4 h-4" /> Export Markdown (.md)
                  </button>
                )}
              </div>

              {stashedCards.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-black/50 border border-white/10 flex flex-col items-center gap-3 backdrop-blur-xl">
                  <Bookmark className="w-10 h-10 text-white/20" />
                  <p className="text-sm font-semibold text-white/60">Your stash is currently empty.</p>
                  <p className="text-xs text-white/40 max-w-sm">
                    While exploring book flashcards in the feed, click "Stash Card" to save key takeaways here.
                  </p>
                  <button
                    onClick={() => setActiveTab('for_you')}
                    className="mt-2 px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-white/90"
                  >
                    Browse Feed
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stashedCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col justify-between gap-4 hover:border-amber-400/40 transition-all backdrop-blur-xl shadow-xl"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-white/40">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-medium">
                            {card.discipline}
                          </span>
                          <span>Saved {card.savedAt}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">"{card.front}"</h4>
                        <p className="text-xs text-white/70 leading-relaxed">{card.back}</p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-amber-300/80 italic font-serif">
                          "{card.takeaway}"
                        </span>
                        <button
                          onClick={() => copyTakeaway(card.takeaway, card.id)}
                          className="text-white/40 hover:text-white transition-colors"
                          title="Copy Takeaway"
                        >
                          {copiedKey === card.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: LIBRARY CATALOG (Browse All Books)              */}
          {/* ==================================================== */}
          {activeTab === 'library' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                    Library Catalog
                  </h2>
                  <p className="text-xs text-white/50 mt-1">
                    Explore distilled summaries and mental models across {books.length} books.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBookToEdit(null);
                    setIsDeployerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                  + Add Book Summary
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rankedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-5 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between gap-4 backdrop-blur-xl group shadow-lg"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-semibold">
                          {book.discipline}
                        </span>
                        <span className="text-white/40">{book.read_time || '4 min'}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <span className="text-xs text-white/50">By {book.author}</span>
                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{book.summary}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setBookToEdit(book);
                          setIsDeployerOpen(true);
                        }}
                        className="text-xs text-white/60 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Summary
                      </button>

                      <button
                        onClick={() => {
                          setActiveBook(book);
                          setActiveTab('for_you');
                        }}
                        className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform"
                      >
                        View Flashcards →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: FOR YOU (Interactive Flashcards with Working Tabs)*/}
          {/* ==================================================== */}
          {activeTab === 'for_you' && (
            <div className="flex flex-col gap-8 pb-16">
              {/* Feed Header */}
              <div className="p-5 md:p-6 rounded-3xl bg-black/55 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center text-black shadow-lg shadow-amber-400/20 shrink-0">
                    <Compass className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Personalized Book Summaries
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                      {activeDiscipline === 'all'
                        ? 'For You: Distilled Mental Models & Flashcards'
                        : `${activeDiscipline}: Interactive Flashcards`}
                    </h2>
                    <p className="text-xs text-white/50">
                      Each card summarizes core principles into flippable, high-impact mental models.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBookToEdit(null);
                    setIsDeployerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 font-bold text-xs border border-white/15 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Deploy My Own Summary</span>
                </button>
              </div>

              {/* Endless Stream of Complete Book Units with Working Tabs */}
              <div className="flex flex-col gap-8">
                {rankedBooks.map((book) => {
                  const cards = book.chapters?.[0]?.cards || [];
                  if (cards.length === 0) return null;

                  const currentIdx = Math.min(
                    activeCardByBook[book.id] || 0,
                    Math.max(0, cards.length - 1)
                  );
                  const currentCard = cards[currentIdx];
                  const cardUniqueKey = `${book.id}-${currentIdx}`;

                  const isStashed = stashedCards.some(
                    (s) =>
                      s.id === cardUniqueKey ||
                      (s.bookTitle === book.title && s.front === currentCard.front)
                  );
                  const isLiked = likedCardKeys[cardUniqueKey] || false;

                  return (
                    <div
                      key={book.id}
                      className="p-6 md:p-8 rounded-3xl bg-black/60 border border-white/10 flex flex-col gap-5 shadow-2xl backdrop-blur-xl hover:border-white/20 transition-all group"
                    >
                      {/* 1. Book Header with Clean Avatar & Actions */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Centered, Elegant Book Icon Avatar (No text overlap bug!) */}
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 border border-white/15"
                            style={{
                              backgroundColor: book.color || '#6366f1',
                              backgroundImage:
                                'linear-gradient(135deg, rgba(255,255,255,0.3), transparent)',
                            }}
                          >
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                                {book.discipline}
                              </span>
                              <span className="text-xs text-white/40">• {book.read_time || '4 min'}</span>
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {book.title}
                            </h3>
                            <span className="text-xs text-white/50">By {book.author}</span>
                          </div>
                        </div>

                        {/* Top Right Badges & Edit Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setBookToEdit(book);
                              setIsDeployerOpen(true);
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                            title="Edit or replace the summary for this book"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Edit Summary</span>
                          </button>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold shadow-md">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>{book.hybrid_score || 94}% Match</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. REAL INTERACTIVE WORKING TABS */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-white/50 px-1">
                          <span className="font-semibold text-white/70 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            Flashcard Takeaways
                          </span>
                          <span className="font-mono text-amber-400 font-bold">
                            Idea {currentIdx + 1} of {cards.length}
                          </span>
                        </div>

                        {/* Interactive Pill Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {cards.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                setActiveCardByBook((prev) => ({
                                  ...prev,
                                  [book.id]: idx,
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                                currentIdx === idx
                                  ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-lg shadow-amber-400/25 scale-[1.02]'
                                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <span>Idea {idx + 1}</span>
                              <span className="text-[10px] max-w-[130px] truncate opacity-85 hidden sm:inline">
                                • {c.front}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-linear-to-r from-amber-400 to-indigo-500 h-full transition-all duration-300"
                            style={{
                              width: `${((currentIdx + 1) / Math.max(1, cards.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* 3. INTERACTIVE 3D FLIPCARD (ALWAYS FLIPPABLE!) */}
                      <div className="relative">
                        <FlipCard
                          key={`${book.id}-${currentIdx}`}
                          height={360}
                          frontLabel="Core Summary Insight"
                          backLabel="Distilled Analysis & Takeaway"
                          front={
                            <div className="flex flex-col justify-between h-full p-2">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-white/40 mb-3 font-semibold uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5 text-amber-300">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    Summary Principle #{currentIdx + 1}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300/80 text-[10px] border border-amber-400/20 font-mono">
                                    Interactive Flashcard
                                  </span>
                                </div>

                                <h3 className="text-xl md:text-2xl font-bold text-white leading-snug mt-2">
                                  "{currentCard.front}"
                                </h3>

                                <p className="text-xs md:text-sm text-white/60 mt-3 line-clamp-3 leading-relaxed">
                                  {book.summary}
                                </p>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md">
                                <p className="text-xs text-white/60 italic flex items-center gap-2">
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Tap anywhere to flip and discover the full breakdown & takeaway.</span>
                                </p>
                                <span className="text-xs text-amber-400 font-bold shrink-0 ml-2">
                                  Flip ↻
                                </span>
                              </div>
                            </div>
                          }
                          back={
                            <div className="flex flex-col justify-between h-full p-2">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-white/40 mb-2 font-semibold uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5 text-indigo-300">
                                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                                    Distilled Summary & Analysis
                                  </span>
                                  <span>{book.author}</span>
                                </div>

                                <p className="text-sm md:text-base text-white/95 font-medium leading-relaxed mt-2">
                                  {currentCard.back}
                                </p>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 backdrop-blur-md">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                                  Practical Application / Rule of Thumb
                                </span>
                                <p className="text-xs text-amber-100 font-serif italic leading-relaxed">
                                  "{currentCard.takeaway}"
                                </p>
                              </div>
                            </div>
                          }
                        />

                        {/* Navigation Chevron Buttons (Next / Prev) */}
                        {cards.length > 1 && (
                          <div className="flex items-center justify-between pt-3">
                            <button
                              onClick={() =>
                                setActiveCardByBook((prev) => ({
                                  ...prev,
                                  [book.id]: Math.max(0, currentIdx - 1),
                                }))
                              }
                              disabled={currentIdx === 0}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                currentIdx === 0
                                  ? 'opacity-30 cursor-not-allowed border-transparent'
                                  : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer'
                              }`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" /> Previous Idea
                            </button>

                            <button
                              onClick={() =>
                                setActiveCardByBook((prev) => ({
                                  ...prev,
                                  [book.id]: Math.min(cards.length - 1, currentIdx + 1),
                                }))
                              }
                              disabled={currentIdx === cards.length - 1}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                currentIdx === cards.length - 1
                                  ? 'opacity-30 cursor-not-allowed border-transparent'
                                  : 'bg-white/5 border-white/10 hover:bg-white/15 text-amber-300 hover:text-amber-200 cursor-pointer'
                              }`}
                            >
                              Next Idea <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 4. Bottom Action Bar: Like, Stash, Share, Edit */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setLikedCardKeys((prev) => ({
                                ...prev,
                                [cardUniqueKey]: !prev[cardUniqueKey],
                              }))
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isLiked
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-black/50 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`}
                            />
                            <span>{isLiked ? 'Liked' : 'Like'}</span>
                          </button>

                          <button
                            onClick={() => toggleStashCard(book, currentCard, currentIdx)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isStashed
                                ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20 font-bold'
                                : 'bg-black/50 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${isStashed ? 'fill-black' : ''}`}
                            />
                            <span>{isStashed ? 'Stashed' : 'Stash Card'}</span>
                          </button>

                          <button
                            onClick={() => copyTakeaway(currentCard.takeaway, cardUniqueKey)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 text-white/70 border border-white/10 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all cursor-pointer"
                          >
                            {copiedKey === cardUniqueKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === cardUniqueKey ? 'Copied' : 'Share'}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setBookToEdit(book);
                            setIsDeployerOpen(true);
                          }}
                          className="text-xs text-white/40 hover:text-amber-300 transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Customize Summary</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Back to Top */}
              {showScrollTop && (
                <button
                  onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="fixed bottom-6 right-8 md:right-96 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-400 text-black shadow-2xl hover:bg-amber-300 font-bold text-xs transition-all cursor-pointer animate-bounce"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Top of Feed</span>
                </button>
              )}
            </div>
          )}
        </main>

        {/* ------------------------------------------------------ */}
        {/* RIGHT COLUMN: Recommended Books Shelf                  */}
        {/* ------------------------------------------------------ */}
        <aside
          onWheel={handleSidebarWheel}
          className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl p-5 hidden xl:flex flex-col gap-6 shrink-0 h-full overflow-y-auto sticky top-0 self-start overscroll-contain select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Recommended For You
              </span>
            </div>
            <span className="text-[10px] text-white/40">Personalized</span>
          </div>

          <p className="text-[11px] text-white/50 leading-relaxed -mt-3">
            Ranked seamlessly by latent reading patterns and discipline affinity.
          </p>

          {/* Recommendations List */}
          <div className="flex flex-col gap-3">
            {recommendations.length > 0 ? (
              recommendations.slice(0, 5).map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    setActiveBook(rec);
                    setActiveTab('for_you');
                  }}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 group backdrop-blur-md cursor-pointer ${
                    activeBook?.id === rec.id
                      ? 'bg-amber-400/20 border-amber-400/50 shadow-lg shadow-amber-400/10'
                      : 'bg-black/45 border-white/10 hover:border-amber-400/40 hover:bg-black/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300">
                      {rec.hybrid_score ? `${rec.hybrid_score}% Match` : 'Recommended'}
                    </span>
                    <span className="text-[10px] text-white/40">{rec.discipline}</span>
                  </div>

                  <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {rec.title}
                  </span>
                  <span className="text-[11px] text-white/40">{rec.author}</span>
                </button>
              ))
            ) : (
              <div className="text-xs text-white/40 text-center py-6">
                Curating personalized recommendations...
              </div>
            )}
          </div>

          {/* Quick Stash Preview Widget */}
          <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/80">Saved Ideas</span>
              <button
                onClick={() => setActiveTab('stash')}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                View all ({stashedCards.length})
              </button>
            </div>

            {stashedCards.length > 0 ? (
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col gap-1 backdrop-blur-md">
                <span className="text-[11px] font-bold text-white line-clamp-1">
                  "{stashedCards[0].front}"
                </span>
                <span className="text-[10px] text-white/40">{stashedCards[0].bookTitle}</span>
              </div>
            ) : (
              <p className="text-[11px] text-white/40">No saved cards yet. Click "Stash Card" on any insight.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Summary Deployer Modal */}
      <SummaryDeployerModal
        isOpen={isDeployerOpen}
        onClose={() => setIsDeployerOpen(false)}
        books={books}
        initialBook={bookToEdit}
        onDeploy={handleDeploySummary}
      />
    </div>
  );
};

export default DeepstashApp;
