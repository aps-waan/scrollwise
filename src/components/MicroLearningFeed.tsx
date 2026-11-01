import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlipCard } from './FlipCard';
import { Sparkles, Brain, Cpu, Layers, BookOpen, ChevronRight, ChevronLeft, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

interface FlashCard {
  front: string;
  back: string;
  takeaway: string;
}

interface Chapter {
  chapter_num: number;
  title: string;
  cards: FlashCard[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  discipline: string;
  category: string;
  tags: string[];
  summary: string;
  chapters: Chapter[];
  collab_score?: number;
  content_score?: number;
  hybrid_score?: number;
}

export const MicroLearningFeed: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [recentBookIds, setRecentBookIds] = useState<string[]>(['b1']);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [alpha, setAlpha] = useState(0.5); // 50% SVD, 50% Content
  const [loadingML, setLoadingML] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'feed' | 'telemetry'>('feed');

  // Load books on mount
  useEffect(() => {
    fetch('/api/books')
      .then((res) => res.json())
      .then((data: Book[]) => {
        setBooks(data);
        if (data.length > 0) {
          setActiveBook(data[0]);
        }
      })
      .catch((err) => console.error('Error loading books:', err));
  }, []);

  // Fetch ML Recommendations whenever recentBookIds or alpha changes
  useEffect(() => {
    if (recentBookIds.length === 0) return;
    setLoadingML(true);

    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recent_book_ids: recentBookIds,
        alpha: alpha,
      }),
    })
      .then((res) => res.json())
      .then((recs: Book[]) => {
        setRecommendations(recs);
        setLoadingML(false);
      })
      .catch((err) => {
        console.error('Error fetching ML recommendations:', err);
        setLoadingML(false);
      });
  }, [recentBookIds, alpha]);

  const selectBook = (book: Book) => {
    setActiveBook(book);
    setCardIndex(0);
    if (!recentBookIds.includes(book.id)) {
      setRecentBookIds((prev) => [book.id, ...prev.slice(0, 4)]);
    }
  };

  const currentCards = activeBook?.chapters?.[0]?.cards || [];
  const currentCard = currentCards[cardIndex];

  const filteredBooks =
    disciplineFilter === 'all'
      ? books
      : books.filter((b) => b.discipline.toLowerCase() === disciplineFilter.toLowerCase());

  return (
    <section id="feed" className="bg-black py-24 md:py-32 px-6 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-125 bg-indigo-950/20 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass text-indigo-300 text-xs font-medium uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Active Micro-Learning & SVD Matrix Recommender
          </div>
          <h2 className="text-4xl md:text-6xl text-white tracking-tight font-instrument">
            Distilled Knowledge <span className="italic text-white/50">in 30-Second</span> Cards
          </h2>
          <p className="text-white/60 text-sm md:text-base mt-4 leading-relaxed">
            Replace passive doomscrolling with 3D flashcards distilled from seminal non-fiction.
            Our active Hybrid Machine Learning system continuously personalizes your feed.
          </p>
        </div>

        {/* Top Discipline Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {['all', 'Psychology', 'Applied Economics', 'Finance', 'Business Strategy', 'Computer Science'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setDisciplineFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  disciplineFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-white text-black font-semibold shadow-lg shadow-white/10'
                    : 'liquid-glass text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat === 'all' ? '🌐 All Disciplines' : cat}
              </button>
            )
          )}
        </div>

        {/* Main Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Book Library Selection (4 Cols) */}
          <div className="lg:col-span-4 liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-white/50 font-semibold flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Library Catalog
              </span>
              <span className="text-xs text-white/40">{filteredBooks.length} Books</span>
            </div>

            <div className="flex flex-col gap-2 max-h-110 overflow-y-auto pr-1">
              {filteredBooks.map((book) => {
                const isActive = activeBook?.id === book.id;
                const isRead = recentBookIds.includes(book.id);

                return (
                  <button
                    key={book.id}
                    onClick={() => selectBook(book)}
                    className={`text-left p-3.5 rounded-2xl transition-all flex flex-col gap-1 border ${
                      isActive
                        ? 'bg-white/10 border-indigo-400/50 shadow-md'
                        : 'bg-white/2 border-white/5 hover:bg-white/6 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-medium">
                        {book.discipline}
                      </span>
                      {isRead && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Read
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-white tracking-tight line-clamp-1">
                      {book.title}
                    </span>
                    <span className="text-xs text-white/40">{book.author}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: ReactBits 3D FlipCard Interactive Viewer (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {activeBook && currentCard ? (
              <div className="flex flex-col gap-4">
                {/* Active Book Info Header */}
                <div className="liquid-glass rounded-2xl px-5 py-3 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{activeBook.title}</h3>
                    <p className="text-xs text-white/50">
                      Chapter {activeBook.chapters[0]?.chapter_num}: {activeBook.chapters[0]?.title}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-indigo-300 liquid-glass px-2.5 py-1 rounded-full">
                    Card {cardIndex + 1}/{currentCards.length}
                  </span>
                </div>

                {/* 3D FlipCard Component */}
                <FlipCard
                  height={380}
                  front={
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <span className="inline-block text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-2">
                          {activeBook.category} • Concept Question
                        </span>
                        <h4 className="text-lg md:text-xl font-medium text-white leading-snug mt-2">
                          "{currentCard.front}"
                        </h4>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white/4 border border-white/5 mt-4">
                        <p className="text-xs text-white/60 italic leading-relaxed">
                          ⚡ Tap anywhere on this card to flip and reveal Daniel Kahneman / author's mental model insight.
                        </p>
                      </div>
                    </div>
                  }
                  back={
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <span className="inline-block text-[11px] uppercase tracking-wider text-purple-400 font-semibold mb-2">
                          Distilled Academic Model
                        </span>
                        <p className="text-sm md:text-base text-purple-100 font-medium leading-relaxed mt-2">
                          {currentCard.back}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 mt-4">
                        <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                          Practical Takeaway
                        </span>
                        <p className="text-xs text-purple-200/80 leading-relaxed">
                          {currentCard.takeaway}
                        </p>
                      </div>
                    </div>
                  }
                />

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setCardIndex((prev) => Math.max(0, prev - 1))}
                    disabled={cardIndex === 0}
                    className="flex-1 liquid-glass rounded-xl py-3 px-4 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 border border-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Card
                  </button>
                  <button
                    onClick={() =>
                      setCardIndex((prev) => Math.min(currentCards.length - 1, prev + 1))
                    }
                    disabled={cardIndex >= currentCards.length - 1}
                    className="flex-1 bg-white text-black rounded-xl py-3 px-4 text-xs font-bold hover:bg-white/90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-white/10"
                  >
                    Next Card <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="liquid-glass rounded-3xl p-12 text-center text-white/50">
                Select a book to start studying
              </div>
            )}
          </div>

          {/* Right Column: Live Hybrid ML Recommender System (3 Cols) */}
          <div className="lg:col-span-3 liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-indigo-300 font-semibold flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-400" />
                Hybrid ML Engine
              </span>
              {loadingML && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            </div>

            {/* Hybrid Formulation Breakdown */}
            <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> SVD Collab
                </span>
                <span className="font-mono text-white/90 font-bold">
                  {Math.round(alpha * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" /> TF-IDF Content
                </span>
                <span className="font-mono text-white/90 font-bold">
                  {Math.round((1 - alpha) * 100)}%
                </span>
              </div>

              {/* Alpha Weight Slider */}
              <div className="mt-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono">
                  <span>Pure Content</span>
                  <span>Hybrid Blend</span>
                  <span>Pure SVD</span>
                </div>
              </div>
            </div>

            {/* Recommendations Shelf */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                Ranked For Your Profile
              </span>

              {recommendations.length > 0 ? (
                recommendations.slice(0, 4).map((rec, idx) => (
                  <button
                    key={rec.id}
                    onClick={() => selectBook(rec)}
                    className="p-3 rounded-2xl liquid-glass border border-white/5 hover:border-indigo-400/40 text-left transition-all group flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-mono">#{idx + 1} Rank</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {rec.hybrid_score}% Match
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {rec.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                      <span>SVD: {rec.collab_score}%</span>
                      <span>•</span>
                      <span>TFIDF: {rec.content_score}%</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-xs text-white/40 text-center py-6">
                  Computing latent matrix factorization...
                </div>
              )}
            </div>

            {/* Terminal Live Telemetry Hint */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-[11px] text-white/50 font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Real-time SVD & cosine vectors logged to terminal.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MicroLearningFeed;
