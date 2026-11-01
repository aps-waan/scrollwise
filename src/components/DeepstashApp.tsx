import React, { useState, useEffect, useRef } from 'react';
import { FlipCard } from './FlipCard';
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
  Lightbulb,
  ArrowUp,
  Shield,
  ExternalLink
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
  cover_image?: string;
  read_time?: string;
  tags: string[];
  summary: string;
  chapters: Chapter[];
  status?: 'published' | 'draft';
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

interface DeepstashAppProps {
  onOpenAdmin?: () => void;
}

export const DeepstashApp: React.FC<DeepstashAppProps> = ({ onOpenAdmin }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'for_you' | 'library' | 'stash'>('for_you');
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active card index tracking for each book (idea tabs)
  const [activeCardByBook, setActiveCardByBook] = useState<Record<string, number>>({});

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

  // Reading history tracking (used strictly by ML recommender)
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

  // Load published books from backend
  const loadPublishedBooks = () => {
    const savedBookId = localStorage.getItem('scrollwise_active_book_id');
    
    // Always fetch published books from server API first
    fetch('/api/books')
      .then((res) => {
        if (!res.ok) throw new Error('API fetch failed');
        return res.json();
      })
      .then((data: Book[]) => {
        // Filter strictly to published books
        const publishedOnly = data.filter((b) => b.status === 'published' || !b.status);
        setBooks(publishedOnly);
        if (publishedOnly.length > 0) {
          const target = (savedBookId && publishedOnly.find((b) => b.id === savedBookId)) || publishedOnly[0];
          setActiveBook(target);
          fetchRecommendations(target.id, readHistory, publishedOnly);
        }
      })
      .catch(() => {
        // Fallback to static books.json
        fetch('/books.json')
          .then((res) => res.json())
          .then((data: Book[]) => {
            const publishedOnly = data.filter((b) => b.status === 'published' || !b.status);
            setBooks(publishedOnly);
            if (publishedOnly.length > 0) {
              const target = (savedBookId && publishedOnly.find((b) => b.id === savedBookId)) || publishedOnly[0];
              setActiveBook(target);
              fetchRecommendations(target.id, readHistory, publishedOnly);
            }
          })
          .catch((err) => console.error('Failed to load published books:', err));
      });
  };

  useEffect(() => {
    loadPublishedBooks();
  }, []);

  // Hybrid ML Recommender: Surprise SVD + TF-IDF (Strictly for User Recommendations)
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
      // Offline fallback
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

    // 1. If activeBook exists, prioritize at top
    if (activeBook && bookMap.has(activeBook.id)) {
      rankedList.push({
        ...activeBook,
        hybrid_score: activeBook.hybrid_score || 98,
      });
      addedIds.add(activeBook.id);
    }

    // 2. Add recommended books from ML engine
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

  // Toggle stash for card
  const toggleStashCard = (book: Book, card: FlashCard, cardIndex: number) => {
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
        fetchRecommendations(book.id, nextHist);
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

      {/* ======================================================== */}
      {/* 1. TOP HEADER (Pure Consumer Discovery Bar)              */}
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
              <span className="text-[10px] text-white/50 font-medium">Academic Micro-Learning</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search published books, authors, mental models..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/10 transition-all backdrop-blur-md"
            />
          </div>
        </div>

        {/* Right: Admin Portal Entry Link */}
        <div className="flex items-center gap-3">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              title="Access Admin Publishing Portal"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin Portal</span>
            </button>
          )}
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
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
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
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
              <span className="font-semibold text-white/80">Published Collection</span>
              <span className="text-amber-400 font-bold">{books.length} Books</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full w-[85%] rounded-full" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50 pt-1">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Rank: Active Scholar</span>
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
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
                    className="mt-2 px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-white/90 cursor-pointer"
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
                          className="text-white/40 hover:text-white transition-colors cursor-pointer"
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
          {/* VIEW: LIBRARY CATALOG (Browse Published Books)       */}
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
                    Explore manually curated mental models across {books.length} published books.
                  </p>
                </div>
                <span className="text-xs text-white/40 font-mono">
                  Showing {rankedBooks.length} Published Titles
                </span>
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
                      <span className="text-[11px] text-white/40">
                        {book.chapters?.[0]?.cards?.length || 0} Flashcards
                      </span>

                      <button
                        onClick={() => {
                          setActiveBook(book);
                          setActiveTab('for_you');
                        }}
                        className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform cursor-pointer"
                      >
                        Explore Ideas →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: FOR YOU (Feed of Published Books with Tabs)    */}
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
                        Personalized Feed
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
                        Hybrid ML Active
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                      {activeDiscipline === 'all'
                        ? 'For You: Distilled Mental Models & Flashcards'
                        : `${activeDiscipline}: Curated Flashcards`}
                    </h2>
                    <p className="text-xs text-white/50">
                      Curated mental models and published ideas, ranked by Hybrid Collaborative & Content ML.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{rankedBooks.length} Books Available</span>
                </div>
              </div>

              {/* Feed of Published Books with Working Tabs */}
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
                      {/* 1. Book Header */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Centered, Clean Book Icon Avatar or Cover Image */}
                          <div
                            className="w-12 h-14 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 border border-white/15 overflow-hidden"
                            style={{
                              backgroundColor: book.color || '#6366f1',
                              backgroundImage:
                                'linear-gradient(135deg, rgba(255,255,255,0.3), transparent)',
                            }}
                          >
                            {book.cover_image ? (
                              <img
                                src={book.cover_image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookOpen className="w-5 h-5 text-white" />
                            )}
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

                        {/* Top Right ML Match Badge */}
                        <div className="flex items-center gap-2 shrink-0">
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

                        {/* Progress Bar */}
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-linear-to-r from-amber-400 to-indigo-500 h-full transition-all duration-300"
                            style={{
                              width: `${((currentIdx + 1) / Math.max(1, cards.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* 3. INTERACTIVE 3D FLIPCARD */}
                      <div className="relative">
                        <FlipCard
                          key={`${book.id}-${currentIdx}`}
                          height={360}
                          frontLabel="Summary Principle"
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

                        {/* Navigation Chevron Buttons */}
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

                      {/* 4. Bottom Action Bar: Like, Stash, Share */}
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

                        <span className="text-[11px] text-white/40 italic hidden sm:inline">
                          Idea {currentIdx + 1} of {cards.length}
                        </span>
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
            <span className="text-[10px] text-white/40">Hybrid ML</span>
          </div>

          <p className="text-[11px] text-white/50 leading-relaxed -mt-3">
            Ranked seamlessly by latent reading patterns (Surprise SVD) & discipline affinity (TF-IDF).
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
    </div>
  );
};

export default DeepstashApp;
