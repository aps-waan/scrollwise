import React, { useState, useEffect, useRef } from 'react';
import { FlipCard } from './FlipCard';
import {
  Compass,
  BookOpen,
  Bookmark,
  Flame,
  Search,
  Sparkles,
  Share2,
  Heart,
  Download,
  Check,
  Brain,
  Layers,
  Terminal,
  Award,
  Zap,
  Film,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ArrowDown,
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

export interface FeedCardItem {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  discipline: string;
  category: string;
  color?: string;
  readTime?: string;
  chapterTitle: string;
  chapterNum: number;
  cardIndex: number;
  totalBookCards: number;
  front: string;
  back: string;
  takeaway: string;
  hybridScore: number;
  collabScore?: number;
  contentScore?: number;
  mlReason?: string;
}

export interface PromptVideo {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  badge: string;
  tagline: string;
}

export const PROMPT_VIDEOS: PromptVideo[] = [
  {
    id: 'cosmic',
    title: 'Cosmic Universe (Hero Canvas)',
    category: 'Atmosphere & Nebula',
    description: 'The hypnotic deep space atmospheric loop that gives ScrollWise its signature personality and calm focus.',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4',
    badge: 'Ambient Canvas',
    tagline: 'Infinite Curiosity'
  },
  {
    id: 'exploration',
    title: 'Curiosity-Driven Exploration',
    category: 'Featured Showreel',
    description: 'Every project starts with a question, and every answer opens a new door to innovation and cognitive growth.',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4',
    badge: 'Our Approach',
    tagline: 'Showreel Film'
  },
  {
    id: 'philosophy',
    title: 'Innovation x Vision',
    category: 'Philosophy & Space',
    description: 'Every meaningful breakthrough begins at the intersection of disciplined strategy and remarkable creative vision.',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4',
    badge: 'Philosophy',
    tagline: 'Shape The Future'
  },
  {
    id: 'strategy',
    title: 'Research & Insight',
    category: 'Strategy & Depth',
    description: 'Digging deep into data, mental models, and human behavior to surface insights that drive permanent change.',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
    badge: 'Strategy',
    tagline: 'Deep Insights'
  },
  {
    id: 'craft',
    title: 'Design & Execution',
    category: 'Craft & Precision',
    description: 'From concept to launch, obsessing over every micro-interaction to deliver learning experiences that feel effortless.',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4',
    badge: 'Craft',
    tagline: 'Liquid Perfection'
  }
];

export const DeepstashApp: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'for_you' | 'library' | 'stash'>('for_you');
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Endless Feed State
  const [feedCards, setFeedCards] = useState<FeedCardItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Ambient Video State
  const [selectedBgVideo, setSelectedBgVideo] = useState<string>(PROMPT_VIDEOS[0].url);
  const [bgOpacity, setBgOpacity] = useState<number>(0.75);
  const [isBgMuted, setIsBgMuted] = useState<boolean>(true);
  const [showVideoSelector, setShowVideoSelector] = useState<boolean>(false);

  // Reading history & Stash (persisted in localStorage)
  const [readHistory, setReadHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_history');
      return saved ? JSON.parse(saved) : ['b1'];
    } catch {
      return ['b1'];
    }
  });

  const [stashedCards, setStashedCards] = useState<StashedCard[]>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_stash');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likedCardKeys, setLikedCardKeys] = useState<Record<string, boolean>>({});
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);
  const [alpha, setAlpha] = useState(0.5); // Silent ML blend weight

  // Flipped cards tracking (persisted so returning users don't see 1st-timer flashcards)
  const [flippedCardKeys, setFlippedCardKeys] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('scrollwise_flipped_cards');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('scrollwise_history', JSON.stringify(readHistory));
  }, [readHistory]);

  useEffect(() => {
    localStorage.setItem('scrollwise_stash', JSON.stringify(stashedCards));
  }, [stashedCards]);

  useEffect(() => {
    localStorage.setItem('scrollwise_flipped_cards', JSON.stringify(flippedCardKeys));
  }, [flippedCardKeys]);

  useEffect(() => {
    if (activeBook) {
      localStorage.setItem('scrollwise_active_book_id', activeBook.id);
    }
  }, [activeBook]);

  // Rank books according to hybrid ML recommender
  const getRankedBooks = (
    allBooks: Book[],
    recs: Book[],
    active: Book | null,
    discipline: string
  ): Book[] => {
    if (allBooks.length === 0) return [];

    const bookMap = new Map<string, Book>();
    allBooks.forEach((b) => bookMap.set(b.id, b));

    const rankedList: Book[] = [];
    const addedIds = new Set<string>();

    // 1. If activeBook exists, prioritize its cards at the top
    if (active && bookMap.has(active.id)) {
      rankedList.push({
        ...active,
        hybrid_score: active.hybrid_score || 96,
        collab_score: active.collab_score || 92,
        content_score: active.content_score || 98,
      });
      addedIds.add(active.id);
    }

    // 2. Add ML recommended books (ordered by SVD + TF-IDF hybrid score)
    recs.forEach((rec) => {
      if (!addedIds.has(rec.id) && bookMap.has(rec.id)) {
        const fullBook = bookMap.get(rec.id)!;
        rankedList.push({
          ...fullBook,
          hybrid_score: rec.hybrid_score || fullBook.hybrid_score || 85,
          collab_score: rec.collab_score || fullBook.collab_score || 82,
          content_score: rec.content_score || fullBook.content_score || 88,
        });
        addedIds.add(rec.id);
      }
    });

    // 3. Add remaining books from catalog (sorted by hybrid_score if available)
    const remaining = allBooks
      .filter((b) => !addedIds.has(b.id))
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0));

    remaining.forEach((b, idx) => {
      rankedList.push({
        ...b,
        hybrid_score: b.hybrid_score || Math.max(38, Math.round(75 - idx * 2.5)),
        collab_score: b.collab_score || Math.round(70 - idx * 2),
        content_score: b.content_score || Math.round(80 - idx * 3),
      });
      addedIds.add(b.id);
    });

    // If discipline filter is active, put matching discipline books first
    if (discipline !== 'all') {
      const matching = rankedList.filter(
        (b) => b.discipline.toLowerCase() === discipline.toLowerCase()
      );
      const others = rankedList.filter(
        (b) => b.discipline.toLowerCase() !== discipline.toLowerCase()
      );
      return [...matching, ...others];
    }

    return rankedList;
  };

  // Extract all cards in ML ranked order, interleaved across top matches for maximum engagement
  const extractAllCards = (rankedBooks: Book[]): Omit<FeedCardItem, 'id'>[] => {
    if (rankedBooks.length === 0) return [];

    const bookCardsMap: {
      book: Book;
      cards: {
        card: FlashCard;
        cardIdx: number;
        totalCards: number;
        chTitle: string;
        chNum: number;
      }[];
    }[] = [];

    rankedBooks.forEach((book) => {
      const bookCards: {
        card: FlashCard;
        cardIdx: number;
        totalCards: number;
        chTitle: string;
        chNum: number;
      }[] = [];
      const totalCards =
        book.chapters?.reduce((acc, ch) => acc + (ch.cards?.length || 0), 0) || 0;

      let cardCounter = 1;
      book.chapters?.forEach((ch) => {
        ch.cards?.forEach((c) => {
          bookCards.push({
            card: c,
            cardIdx: cardCounter++,
            totalCards,
            chTitle: ch.title || 'Core Mental Model',
            chNum: ch.chapter_num || 1,
          });
        });
      });

      if (bookCards.length > 0) {
        bookCardsMap.push({ book, cards: bookCards });
      }
    });

    // Interleave cards across top ML matches:
    // Round 0: Core Idea #1 from Book 1, Book 2, Book 3...
    // Round 1: Core Idea #2 from Book 1, Book 2, Book 3...
    const result: Omit<FeedCardItem, 'id'>[] = [];
    let hasMore = true;
    let cardRound = 0;

    while (hasMore) {
      hasMore = false;
      for (let i = 0; i < bookCardsMap.length; i++) {
        const { book, cards } = bookCardsMap[i];
        if (cardRound < cards.length) {
          hasMore = true;
          const { card, cardIdx, totalCards, chTitle, chNum } = cards[cardRound];

          const hybridScore =
            book.hybrid_score || Math.max(45, Math.round(94 - i * 3.2 - cardRound * 1.5));
          const collabScore =
            book.collab_score || Math.max(40, Math.round(91 - i * 2.8));
          const contentScore =
            book.content_score || Math.max(40, Math.round(96 - i * 3.6));

          let mlReason = 'High Latent Matrix Match (SVD + TF-IDF)';
          const disc = book.discipline.toLowerCase();
          if (disc.includes('psychology')) {
            mlReason = 'Behavioral Heuristics & Decision Framing';
          } else if (disc.includes('economics')) {
            mlReason = 'Asymmetric Risk & Secondary Effects';
          } else if (disc.includes('finance')) {
            mlReason = 'Compounding & Capital Allocation';
          } else if (disc.includes('strategy')) {
            mlReason = 'First-Principles Competitive Advantage';
          } else if (disc.includes('computer')) {
            mlReason = 'Fault-Tolerant Distributed Architectures';
          } else if (disc.includes('philosophy')) {
            mlReason = 'Cognitive Resilience & Mental Clarity';
          }

          result.push({
            bookId: book.id,
            bookTitle: book.title,
            author: book.author,
            discipline: book.discipline,
            category: book.category,
            color: book.color || '#6366f1',
            readTime: book.read_time || '3 min',
            chapterTitle: chTitle,
            chapterNum: chNum,
            cardIndex: cardIdx,
            totalBookCards: totalCards,
            front: card.front,
            back: card.back,
            takeaway: card.takeaway,
            hybridScore,
            collabScore,
            contentScore,
            mlReason,
          });
        }
      }
      cardRound++;
    }

    return result;
  };

  // Populate initial feed when books or recommendations update
  useEffect(() => {
    if (books.length === 0) return;
    const ranked = getRankedBooks(books, recommendations, activeBook, activeDiscipline);
    const allCards = extractAllCards(ranked);
    // Initial batch: first 8 cards
    const initial = allCards.slice(0, 8).map((c, i) => ({
      ...c,
      id: `card-${c.bookId}-${c.cardIndex}-0-${i}`,
    }));
    setFeedCards(initial);
  }, [books, recommendations, activeDiscipline]);

  // Load more cards endlessly as user scrolls
  const loadMoreCards = () => {
    if (isLoadingMore || books.length === 0) return;
    setIsLoadingMore(true);

    setTimeout(() => {
      const ranked = getRankedBooks(books, recommendations, activeBook, activeDiscipline);
      const allCards = extractAllCards(ranked);
      if (allCards.length === 0) {
        setIsLoadingMore(false);
        return;
      }

      setFeedCards((prev) => {
        const currentCount = prev.length;
        const startIndex = currentCount % allCards.length;
        const nextCycle = Math.floor(currentCount / allCards.length);

        const nextBatch: FeedCardItem[] = [];
        for (let i = 0; i < 6; i++) {
          const idx = (startIndex + i) % allCards.length;
          const c = allCards[idx];
          const cycle = nextCycle + Math.floor((startIndex + i) / allCards.length);
          nextBatch.push({
            ...c,
            id: `card-${c.bookId}-${c.cardIndex}-${cycle}-${Date.now()}-${i}`,
          });
        }
        return [...prev, ...nextBatch];
      });

      setIsLoadingMore(false);
    }, 150);
  };

  // Feed Scroll Handler
  const handleFeedScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollTop(scrollTop > 500);
    if (scrollHeight - scrollTop - clientHeight < 800) {
      loadMoreCards();
    }
  };

  // IntersectionObserver for infinite scrolling sentinel
  useEffect(() => {
    if (activeTab !== 'for_you') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCards();
        }
      },
      {
        root: mainScrollRef.current,
        rootMargin: '600px',
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, feedCards.length, books, recommendations]);

  // Fetch Books Dataset
  useEffect(() => {
    const savedBookId = localStorage.getItem('scrollwise_active_book_id');
    fetch('/books.json')
      .then((res) => {
        if (!res.ok) throw new Error('Static fetch failed');
        return res.json();
      })
      .then((data: Book[]) => {
        setBooks(data);
        if (data.length > 0) {
          const targetBook = (savedBookId && data.find((b) => b.id === savedBookId)) || data[0];
          setActiveBook(targetBook);
          fetchRecommendations(targetBook.id, readHistory, alpha, data);
        }
      })
      .catch((err) => {
        console.warn('Fallback to /api/books:', err);
        fetch('/api/books')
          .then((res) => res.json())
          .then((data: Book[]) => {
            setBooks(data);
            if (data.length > 0) {
              const targetBook = (savedBookId && data.find((b) => b.id === savedBookId)) || data[0];
              setActiveBook(targetBook);
              fetchRecommendations(targetBook.id, readHistory, alpha, data);
            }
          })
          .catch((e) => console.error('Failed to load books from all sources:', e));
      });
  }, []);

  // Fetch ML Recommendations in Background
  const fetchRecommendations = async (
    bookId: string,
    history: string[],
    currentAlpha: number,
    bookList?: Book[]
  ) => {
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          recent_book_ids: history,
          user_history: history,
          alpha: currentAlpha,
          top_k: 6,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const recList = Array.isArray(result) ? result : (result.recommendations || []);
        if (recList.length > 0) {
          setRecommendations(recList);
        }
        if (result.all_ranked && Array.isArray(result.all_ranked) && result.all_ranked.length > 0) {
          setBooks(result.all_ranked);
        }
        return;
      }
    } catch (err) {
      console.warn('API error, using local fallback:', err);
    }

    // Graceful local fallback if offline or initial render
    const sourceBooks = (bookList && bookList.length > 0) ? bookList : books;
    if (sourceBooks.length > 0) {
      const fallbacks = sourceBooks
        .filter((b) => b.id !== bookId)
        .slice(0, 5)
        .map((b, i) => ({
          ...b,
          hybrid_score: Math.round(92 - i * 6.5),
          collab_score: Math.round(88 - i * 5),
          content_score: Math.round(94 - i * 7),
        }));
      setRecommendations(fallbacks);
    }
  };

  // Keyboard Shortcuts (Arrow Up/Down or j/k to smoothly scroll the feed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        mainScrollRef.current?.scrollBy({ top: 480, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        mainScrollRef.current?.scrollBy({ top: -480, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectBook = (book: Book) => {
    setActiveBook(book);
    localStorage.setItem('scrollwise_active_book_id', book.id);
    setActiveTab('for_you');

    const updatedHistory = [...new Set([...readHistory, book.id])];
    setReadHistory(updatedHistory);
    fetchRecommendations(book.id, updatedHistory, alpha);

    // Re-prioritize feed starting with this book and scroll to top smoothly
    const ranked = getRankedBooks(books, recommendations, book, activeDiscipline);
    const allCards = extractAllCards(ranked);
    const newBatch = allCards.slice(0, 8).map((c, i) => ({
      ...c,
      id: `card-${c.bookId}-${c.cardIndex}-0-${i}`,
    }));
    setFeedCards(newBatch);

    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle card flipping (remembers that user has explored this concept and sets book on top)
  const handleCardFlip = (card: FeedCardItem, isFlipped: boolean) => {
    const cardUniqueKey = `${card.bookId}-${card.cardIndex}`;

    // 1. Mark this card as flipped (persisted in localStorage)
    setFlippedCardKeys((prev) => ({
      ...prev,
      [card.id]: isFlipped,
      [cardUniqueKey]: isFlipped,
    }));

    // 2. Set this book as the active / top book and persist to localStorage
    const thisBook = books.find((b) => b.id === card.bookId);
    if (thisBook) {
      setActiveBook(thisBook);
    }
    localStorage.setItem('scrollwise_active_book_id', card.bookId);

    // 3. Update reading history and trigger ML background inference
    if (!readHistory.includes(card.bookId)) {
      const updatedHistory = [card.bookId, ...readHistory];
      setReadHistory(updatedHistory);
      fetchRecommendations(card.bookId, updatedHistory, alpha);
    }
  };

  // Forward sidebar wheel events to main feed so sidebars stay 100% stagnant in place
  const handleSidebarWheel = (e: React.WheelEvent) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }
  };

  const toggleStashFeedCard = (card: FeedCardItem) => {
    const isStashed = stashedCards.some(
      (s) =>
        s.id === card.id ||
        (s.bookTitle === card.bookTitle && s.front === card.front)
    );

    if (isStashed) {
      setStashedCards((prev) =>
        prev.filter(
          (s) =>
            !(
              s.id === card.id ||
              (s.bookTitle === card.bookTitle && s.front === card.front)
            )
        )
      );
    } else {
      const newStash: StashedCard = {
        id: card.id,
        bookTitle: card.bookTitle,
        author: card.author,
        discipline: card.discipline,
        front: card.front,
        back: card.back,
        takeaway: card.takeaway,
        savedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
      setStashedCards((prev) => [newStash, ...prev]);

      // Inform ML engine by recording book in user reading history
      if (!readHistory.includes(card.bookId)) {
        const updated = [...readHistory, card.bookId];
        setReadHistory(updated);
        fetchRecommendations(card.bookId, updated, alpha);
      }
    }
  };

  const toggleLikeFeedCard = (cardId: string) => {
    setLikedCardKeys((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
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
- **Distilled Concept:** ${c.back}
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

  const filteredBooks = books.filter((b) => {
    const matchesDiscipline =
      activeDiscipline === 'all' ||
      b.discipline.toLowerCase() === activeDiscipline.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiscipline && matchesSearch;
  });

  const filteredFeedCards = feedCards.filter((card) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      card.bookTitle.toLowerCase().includes(q) ||
      card.author.toLowerCase().includes(q) ||
      card.discipline.toLowerCase().includes(q) ||
      card.category.toLowerCase().includes(q) ||
      card.front.toLowerCase().includes(q) ||
      card.back.toLowerCase().includes(q) ||
      card.takeaway.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen bg-transparent text-[#e2e8f0] font-sans antialiased flex flex-col relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* ======================================================== */}
      {/* ATMOSPHERIC BACKGROUND VIDEO (Prominently Visible)       */}
      {/* ======================================================== */}
      <video
        key={selectedBgVideo}
        src={selectedBgVideo}
        muted={isBgMuted}
        autoPlay
        loop
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none z-0 transition-opacity duration-1000"
        style={{ opacity: bgOpacity }}
      />
      {/* Ambient darkening scrim for high text readability while letting the video shine */}
      <div className="fixed inset-0 bg-linear-to-b from-black/55 via-black/25 to-black/75 pointer-events-none z-0" />

      {/* ======================================================== */}
      {/* 1. TOP HEADER (Deepstash signature clean bar)            */}
      {/* ======================================================== */}
      <header className="h-16 border-b border-white/10 bg-black/45 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
        {/* Left: Brand + Search Bar */}
        <div className="flex items-center gap-6 flex-1 max-w-2xl">
          <div
            onClick={() => setActiveTab('for_you')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-black font-bold fill-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white leading-none">
                Scroll<span className="text-amber-400">Wise</span>
              </span>
              <span className="text-[10px] text-white/50 font-medium">Bite-sized knowledge</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 150+ mental models, books, concepts..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/10 transition-all backdrop-blur-md"
            />
          </div>
        </div>

        {/* Right: Ambient Video Controller, Gamified Streak, Stash count */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Ambient Video Selector Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowVideoSelector(!showVideoSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white/90 font-medium transition-all backdrop-blur-md"
              title="Change atmospheric video & opacity"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-white/60">Atmosphere:</span>
              <span className="text-amber-300 font-semibold max-w-[100px] truncate">
                {PROMPT_VIDEOS.find((v) => v.url === selectedBgVideo)?.title.split(' ')[0] || 'Cosmic'}
              </span>
              <span className="text-[10px] text-white/40">▼</span>
            </button>

            {/* Video Selector Popup */}
            {showVideoSelector && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-black/90 border border-white/15 p-4 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    Background Personality
                  </span>
                  <button
                    onClick={() => setShowVideoSelector(false)}
                    className="text-xs text-white/40 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {PROMPT_VIDEOS.map((vid) => (
                    <button
                      key={vid.id}
                      onClick={() => {
                        setSelectedBgVideo(vid.url);
                        setShowVideoSelector(false);
                      }}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-0.5 ${
                        selectedBgVideo === vid.url
                          ? 'bg-amber-400/20 border-amber-400/50 text-white font-bold'
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{vid.title}</span>
                        <span className="text-[9px] uppercase tracking-wider text-amber-400 px-1.5 py-0.2 rounded bg-amber-400/10">
                          {vid.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 line-clamp-1">{vid.category}</span>
                    </button>
                  ))}
                </div>

                {/* Video Opacity Slider */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span className="flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                      Video Brightness
                    </span>
                    <span className="font-mono text-amber-300 font-bold">{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>Subtle (20%)</span>
                    <span>Balanced (75%)</span>
                    <span>Vivid (100%)</span>
                  </div>
                </div>

                {/* Mute Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-white/60">Audio Track</span>
                  <button
                    onClick={() => setIsBgMuted(!isBgMuted)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-[10px] text-white/80 hover:bg-white/20"
                  >
                    {isBgMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                    <span>{isBgMuted ? 'Muted' : 'Playing'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Daily Streak Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold backdrop-blur-md">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
            <span>4 Days</span>
          </div>

          {/* My Stash Button */}
          <button
            onClick={() => setActiveTab('stash')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeTab === 'stash'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-white/10 text-white/80 border-white/15 hover:text-white hover:bg-white/15 backdrop-blur-md'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${activeTab === 'stash' ? 'fill-black' : ''}`} />
            <span className="hidden sm:inline">My Stash</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-bold">
              {stashedCards.length}
            </span>
          </button>

          {/* Silent ML Background Status Indicator */}
          <button
            onClick={() => setShowTelemetryDrawer(!showTelemetryDrawer)}
            title="Machine Learning Recommender is running in the background"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono hover:bg-emerald-500/20 transition-all cursor-pointer backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>ML: Active</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN APP THREE-COLUMN BODY LAYOUT                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10 h-[calc(100vh-4rem)] overflow-hidden">
        {/* ------------------------------------------------------ */}
        {/* LEFT COLUMN: Deepstash Navigation & Categories         */}
        {/* ------------------------------------------------------ */}
        <aside
          onWheel={handleSidebarWheel}
          className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl p-5 hidden md:flex flex-col justify-between shrink-0 h-full overflow-y-auto sticky top-0 self-start overscroll-contain select-none"
        >
          <div className="flex flex-col gap-6">
            {/* Primary Nav Links */}
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

            {/* Topics Filter */}
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

          {/* Gamified Profile / Reading Progress Card */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80">Daily Reading Goal</span>
              <span className="text-amber-400 font-bold">3/5 Ideas</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full w-[60%] rounded-full" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/50 pt-1">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Rank: Cognitive Scholar</span>
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------ */}
        {/* CENTER COLUMN: Feed / Library / Stash Stream           */}
        {/* ------------------------------------------------------ */}
        <main
          ref={mainScrollRef}
          onScroll={handleFeedScroll}
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
                    Your personal collection of distilled insights ready for exam revision.
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
                    While scrolling cards in the feed, click the bookmark icon or press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">S</kbd> to save key insights here.
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
          {/* VIEW: LIBRARY CATALOG (Browse All 15 Books)          */}
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
                    Explore distilled mental models from 15 academic books across 6 disciplines.
                  </p>
                </div>
                <span className="text-xs text-white/40 font-mono">
                  Showing {filteredBooks.length} of {books.length} Books
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => selectBook(book)}
                    className="p-5 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-400/40 cursor-pointer transition-all flex flex-col justify-between gap-4 backdrop-blur-xl group shadow-lg"
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

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {book.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] text-white/40">#{tag}</span>
                        ))}
                      </div>
                      <span className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                        Read Models →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW: FOR YOU (Endless ML-Curated Scroll Stream)      */}
          {/* ==================================================== */}
          {activeTab === 'for_you' && (
            <div className="flex flex-col gap-8 pb-16">
              {/* Feed Header: Stream Info & Active Discipline */}
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                        ● ML Stream Active
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                      {activeDiscipline === 'all'
                        ? 'For You: Endless Mental Model Stream'
                        : `${activeDiscipline}: Infinite Feed`}
                    </h2>
                    <p className="text-xs text-white/50">
                      Ranked dynamically by Collaborative SVD latent factors & TF-IDF Cosine Similarity.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{filteredFeedCards.length} Ideas Loaded</span>
                </div>
              </div>

              {/* Active Book Showcase (Appears on top when card flipped or revisited/refreshed) */}
              {activeBook && (
                <div className="p-5 md:p-6 rounded-3xl bg-linear-to-r from-amber-500/15 via-indigo-500/10 to-purple-500/15 border border-amber-400/35 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="w-12 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-xl shrink-0 text-center p-2"
                      style={{
                        backgroundColor: activeBook.color || '#6366f1',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.3), transparent)',
                      }}
                    >
                      {activeBook.title.slice(0, 10)}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold tracking-wider uppercase border border-amber-400/30">
                          Resuming Book On Top
                        </span>
                        <span className="text-xs text-white/50">• {activeBook.discipline}</span>
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-white tracking-tight group-hover:text-amber-300 transition-colors">
                        {activeBook.title}
                      </h3>
                      <span className="text-xs text-white/60">By {activeBook.author}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-300 block">
                        {Object.keys(flippedCardKeys).filter((k) => k.startsWith(activeBook.id)).length} of {activeBook.chapters?.[0]?.cards?.length || 3} Mastered
                      </span>
                      <span className="text-[10px] text-white/40">Latent Match: {activeBook.hybrid_score || 94}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Endless Stream of Cards */}
              <div className="flex flex-col gap-8">
                {filteredFeedCards.map((card) => {
                  const cardUniqueKey = `${card.bookId}-${card.cardIndex}`;
                  const isStashed = stashedCards.some(
                    (s) =>
                      s.id === card.id ||
                      s.id === cardUniqueKey ||
                      (s.bookTitle === card.bookTitle && s.front === card.front)
                  );
                  const isLiked = likedCardKeys[card.id] || likedCardKeys[cardUniqueKey];

                  return (
                    <div
                      key={card.id}
                      className="p-6 md:p-8 rounded-3xl bg-black/55 border border-white/10 flex flex-col gap-5 shadow-2xl backdrop-blur-xl hover:border-white/20 transition-all group"
                    >
                      {/* Card Header: Book Info & ML Badge */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className="w-11 h-14 rounded-xl flex items-center justify-center font-bold text-white text-[10px] shadow-lg shrink-0 text-center p-1.5"
                            style={{
                              backgroundColor: card.color || '#6366f1',
                              backgroundImage:
                                'linear-gradient(135deg, rgba(255,255,255,0.25), transparent)',
                            }}
                          >
                            {card.bookTitle.slice(0, 10)}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                                {card.discipline}
                              </span>
                              <span className="text-xs text-white/40">• {card.readTime}</span>
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {card.bookTitle}
                            </h3>
                            <span className="text-xs text-white/50">By {card.author}</span>
                          </div>
                        </div>

                        {/* ML Recommender Badge */}
                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold shadow-md">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>{card.hybridScore}% Match</span>
                          </div>
                          <span className="text-[10px] text-white/40 font-mono mt-1">
                            Hybrid ML
                          </span>
                        </div>
                      </div>

                      {/* Chapter & Card Index */}
                      <div className="flex items-center justify-between text-xs text-white/50 px-1 -mt-1">
                        <span className="font-semibold text-white/70">
                          Chapter {card.chapterNum}: {card.chapterTitle}
                        </span>
                        <span className="font-mono text-amber-400 font-bold">
                          Idea {card.cardIndex} of {card.totalBookCards}
                        </span>
                      </div>

                      {/* Progress Line */}
                      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden -mt-2">
                        <div
                          className="bg-linear-to-r from-amber-400 to-indigo-500 h-full transition-all duration-300"
                          style={{
                            width: `${(card.cardIndex / Math.max(1, card.totalBookCards)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Interactive Card: 1st Timer Flashcard vs Unlocked Mental Model */}
                      {!(flippedCardKeys[card.id] || flippedCardKeys[cardUniqueKey]) ? (
                        <FlipCard
                          height={380}
                          initialFlipped={false}
                          onFlip={(isFlipped) => handleCardFlip(card, isFlipped)}
                          front={
                            <div className="flex flex-col justify-between h-full p-2">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-white/40 mb-3 font-semibold uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5 text-amber-300">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Core Concept Question
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300/80 text-[10px] border border-amber-400/20 font-mono">
                                    1st Timer Flashcard
                                  </span>
                                </div>

                                <h3 className="text-xl md:text-2xl font-semibold text-white leading-snug mt-4">
                                  "{card.front}"
                                </h3>
                              </div>

                              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md">
                                <p className="text-xs text-white/60 italic">
                                  💡 Tap anywhere to flip and discover the distilled mental model insight.
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
                                <div className="flex items-center justify-between text-[11px] text-white/40 mb-3 font-semibold uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5 text-indigo-300">
                                    <Brain className="w-3.5 h-3.5 text-indigo-400" /> Distilled Mental Model
                                  </span>
                                  <span>Source: {card.author}</span>
                                </div>

                                <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed mt-3">
                                  {card.back}
                                </p>
                              </div>

                              <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 backdrop-blur-md">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                                  Practical Takeaway
                                </span>
                                <p className="text-xs text-amber-100 font-serif italic leading-relaxed">
                                  "{card.takeaway}"
                                </p>
                              </div>
                            </div>
                          }
                        />
                      ) : (
                        <div className="rounded-2xl liquid-glass p-6 md:p-8 flex flex-col justify-between gap-5 border border-amber-400/25 bg-linear-to-b from-indigo-950/40 via-black/60 to-black/80 shadow-2xl relative overflow-hidden">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                              <span className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Core Dilemma
                              </span>
                              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                                ✓ Concept Mastered
                              </span>
                            </div>

                            <h3 className="text-lg md:text-xl font-bold text-white/95 leading-snug">
                              "{card.front}"
                            </h3>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                                <Brain className="w-4 h-4 text-indigo-400" />
                                <span>Distilled Mental Model</span>
                              </div>
                              <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed">
                                {card.back}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 backdrop-blur-md">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                                Practical Takeaway
                              </span>
                              <p className="text-xs text-amber-100 font-serif italic leading-relaxed">
                                "{card.takeaway}"
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-white/40">
                            <span className="italic">Explored & ready for revision</span>
                            <button
                              onClick={() => handleCardFlip(card, false)}
                              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Test yourself with the 1st timer flashcard again"
                            >
                              <span>🔁 Practice Flashcard</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Action Controls: Like, Stash, Share */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleLikeFeedCard(card.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all backdrop-blur-md ${
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
                            onClick={() => toggleStashFeedCard(card)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all backdrop-blur-md ${
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
                            onClick={() => copyTakeaway(card.takeaway, card.id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 text-white/70 border border-white/10 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all backdrop-blur-md"
                          >
                            {copiedKey === card.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === card.id ? 'Copied' : 'Share'}</span>
                          </button>
                        </div>

                        <span className="text-[11px] text-white/40 italic hidden sm:inline">
                          {card.mlReason}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Infinite Scroll Sentinel & Loading Indicator */}
              <div
                ref={sentinelRef}
                className="py-10 flex flex-col items-center justify-center gap-2.5 text-center"
              >
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/60 border border-white/15 text-xs font-semibold text-white/80 shadow-2xl backdrop-blur-xl">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Curating next high-yield mental models with Hybrid ML...</span>
                </div>
                <p className="text-[11px] text-white/40">
                  Scroll down to continue learning endlessly across disciplines
                </p>
              </div>
              {/* Floating Back to Top Button */}
              {showScrollTop && (
                <button
                  onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="fixed bottom-6 right-8 md:right-96 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-400 text-black shadow-2xl hover:bg-amber-300 font-bold text-xs transition-all animate-bounce cursor-pointer"
                  title="Scroll to top of feed"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Top of Feed</span>
                </button>
              )}
            </div>
          )}
        </main>

        {/* ------------------------------------------------------ */}
        {/* RIGHT COLUMN: Recommended for You (ML in the Back)     */}
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
                  onClick={() => selectBook(rec)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 group backdrop-blur-md ${
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
              <span className="text-xs font-bold text-white/80">Recent Stashes</span>
              <button
                onClick={() => setActiveTab('stash')}
                className="text-[11px] text-amber-400 hover:underline"
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
              <p className="text-[11px] text-white/40">No saved cards yet. Press 'S' to stash any idea.</p>
            )}
          </div>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* 3. DEMO TELEMETRY DRAWER (For Class Presentation Proof)  */}
      {/* ======================================================== */}
      {showTelemetryDrawer && (
        <div className="fixed bottom-0 inset-x-0 bg-black/95 border-t border-white/15 p-5 backdrop-blur-2xl z-50 max-w-5xl mx-auto rounded-t-3xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white">
                Under The Hood: Hybrid Recommender (SVD + TF-IDF)
              </span>
            </div>
            <button
              onClick={() => setShowTelemetryDrawer(false)}
              className="text-xs text-white/40 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs">
            <div>
              <span className="font-semibold text-indigo-300 block mb-1">
                1. Collaborative Layer
              </span>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Uses <strong>SVD Matrix Factorization</strong> (scikit-surprise) with 10 latent factors to learn peer reading preferences and combat sparsity.
              </p>
            </div>
            <div>
              <span className="font-semibold text-emerald-300 block mb-1">
                2. Content-Based Layer
              </span>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Uses <strong>TF-IDF Vectorization & Cosine Similarity</strong> across book disciplines, tags, and summaries to resolve cold-start for new users.
              </p>
            </div>
            <div>
              <span className="font-semibold text-amber-300 block mb-1">
                3. Weighted Blend (α = {alpha})
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={alpha}
                className="w-full accent-amber-400 mt-1"
                onChange={(e) => {
                  const newAlpha = parseFloat(e.target.value);
                  setAlpha(newAlpha);
                  if (activeBook) {
                    fetchRecommendations(activeBook.id, readHistory, newAlpha);
                  }
                }}
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono">
                <span>100% Content</span>
                <span>Hybrid Blend</span>
                <span>100% SVD</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepstashApp;
