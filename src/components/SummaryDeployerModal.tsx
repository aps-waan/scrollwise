import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, X, Plus, Trash2, Check, ArrowRight, Wand2, Layers, Lightbulb } from 'lucide-react';
import { Book, FlashCard } from './DeepstashApp';

interface SummaryDeployerModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  initialBook?: Book | null;
  onDeploy: (updatedBook: Book) => void;
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

export const SummaryDeployerModal: React.FC<SummaryDeployerModalProps> = ({
  isOpen,
  onClose,
  books,
  initialBook,
  onDeploy,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string>('new');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [discipline, setDiscipline] = useState('Psychology');
  const [color, setColor] = useState('#f59e0b');
  const [rawSummary, setRawSummary] = useState('');
  const [parsedCards, setParsedCards] = useState<FlashCard[]>([]);
  const [activePreviewCardIndex, setActivePreviewCardIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize modal state whenever opened
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      return;
    }

    if (initialBook) {
      setSelectedBookId(initialBook.id);
      setTitle(initialBook.title);
      setAuthor(initialBook.author);
      setDiscipline(initialBook.discipline || 'General');
      setColor(initialBook.color || '#f59e0b');
      setRawSummary(initialBook.summary || '');
      const existingCards = initialBook.chapters?.[0]?.cards || [];
      if (existingCards.length > 0) {
        setParsedCards([...existingCards]);
      } else {
        autoParseIntoCards(initialBook.summary || '', initialBook.title);
      }
    } else {
      setSelectedBookId('new');
      setTitle('');
      setAuthor('');
      setDiscipline('Self Improvement');
      setColor('#f59e0b');
      setRawSummary('');
      setParsedCards([]);
    }
  }, [isOpen, initialBook]);

  // When dropdown selection changes
  const handleSelectBookChange = (bookId: string) => {
    setSelectedBookId(bookId);
    if (bookId === 'new') {
      setTitle('');
      setAuthor('');
      setDiscipline('Self Improvement');
      setColor('#f59e0b');
      setRawSummary('');
      setParsedCards([]);
      return;
    }

    const found = books.find((b) => b.id === bookId);
    if (found) {
      setTitle(found.title);
      setAuthor(found.author);
      setDiscipline(found.discipline || 'General');
      setColor(found.color || '#f59e0b');
      setRawSummary(found.summary || '');
      const existingCards = found.chapters?.[0]?.cards || [];
      if (existingCards.length > 0) {
        setParsedCards([...existingCards]);
      } else {
        autoParseIntoCards(found.summary || '', found.title);
      }
    }
  };

  // Intelligent parser: splits raw summary into structured flashcards
  const autoParseIntoCards = (text: string, currentTitle: string) => {
    if (!text.trim()) {
      setParsedCards([]);
      return;
    }

    // Split by double newlines or numbered lines or bullet points
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const generated: FlashCard[] = [];

    // Check if user entered numbered or bullet items
    const bulletPattern = /^(\d+[\.\)]|\-|\*|•)\s*(.*)/;

    let tempTitle = '';
    let tempBody: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(bulletPattern);

      if (match) {
        if (tempTitle || tempBody.length > 0) {
          const bodyText = tempBody.join(' ') || tempTitle;
          generated.push({
            front: tempTitle || `Key Insight #${generated.length + 1}`,
            back: bodyText,
            takeaway: `Master the principle of ${tempTitle || 'this concept'} for immediate practical decision-making.`,
          });
          tempTitle = '';
          tempBody = [];
        }

        // Clean content after bullet
        const content = match[2];
        if (content.includes(':')) {
          const [h, ...rest] = content.split(':');
          tempTitle = h.trim();
          tempBody.push(rest.join(':').trim());
        } else {
          tempTitle = content;
        }
      } else {
        // Plain text paragraphs
        if (!tempTitle) {
          if (line.includes(':')) {
            const [h, ...rest] = line.split(':');
            tempTitle = h.trim();
            tempBody.push(rest.join(':').trim());
          } else if (line.length < 90) {
            tempTitle = line;
          } else {
            tempTitle = `Key Insight #${generated.length + 1}`;
            tempBody.push(line);
          }
        } else {
          tempBody.push(line);
        }
      }
    }

    if (tempTitle || tempBody.length > 0) {
      const bodyText = tempBody.join(' ') || tempTitle;
      generated.push({
        front: tempTitle || `Summary Insight #${generated.length + 1}`,
        back: bodyText,
        takeaway: `Apply this insight from ${currentTitle || 'the book'} consistently to compound your mental models.`,
      });
    }

    // Fallback if only 1 card or simple text
    if (generated.length === 0 && text.trim().length > 0) {
      generated.push({
        front: `Core Essence of ${currentTitle || 'the Book'}`,
        back: text.trim(),
        takeaway: `Continuous deliberate application of core mental models generates asymmetric lifelong leverage.`,
      });
    }

    setParsedCards(generated);
    setActivePreviewCardIndex(0);
  };

  const handleRawSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawSummary(val);
    autoParseIntoCards(val, title);
  };

  const handleCardFieldChange = (index: number, field: keyof FlashCard, val: string) => {
    setParsedCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddCard = () => {
    setParsedCards((prev) => [
      ...prev,
      {
        front: `Key Concept #${prev.length + 1}`,
        back: 'Distilled summary explanation and core principles...',
        takeaway: 'Memorable rule of thumb and actionable practical takeaway.',
      },
    ]);
    setActivePreviewCardIndex(parsedCards.length);
  };

  const handleRemoveCard = (index: number) => {
    setParsedCards((prev) => prev.filter((_, i) => i !== index));
    if (activePreviewCardIndex >= parsedCards.length - 1) {
      setActivePreviewCardIndex(Math.max(0, parsedCards.length - 2));
    }
  };

  const handleDeploy = () => {
    if (!title.trim()) {
      alert('Please enter a book title.');
      return;
    }

    const cardsToDeploy: FlashCard[] =
      parsedCards.length > 0
        ? parsedCards
        : [
            {
              front: `Core Idea: ${title}`,
              back: rawSummary.trim() || 'Distilled book summary and key takeaways.',
              takeaway: 'Focus on understanding first principles and practicing mental models.',
            },
          ];

    const targetId = selectedBookId === 'new' ? `book-${Date.now()}` : selectedBookId;

    const updatedBook: Book = {
      id: targetId,
      title: title.trim(),
      author: author.trim() || 'Independent Scholar',
      discipline: discipline.trim() || 'General Knowledge',
      category: discipline.trim() || 'General Knowledge',
      color: color,
      read_time: `${Math.max(2, Math.ceil(cardsToDeploy.length * 1.5))} min`,
      tags: [discipline.toLowerCase().replace(/\s+/g, '-'), 'summary', 'flashcards'],
      summary: rawSummary.trim() || cardsToDeploy[0].back.slice(0, 160),
      chapters: [
        {
          chapter_num: 1,
          title: 'Distilled Book Summary & Core Insights',
          cards: cardsToDeploy,
        },
      ],
      hybrid_score: 98,
      collab_score: 95,
      content_score: 99,
    };

    setIsSuccess(true);
    setTimeout(() => {
      onDeploy(updatedBook);
      onClose();
    }, 600);
  };

  // Sample prompt filler for quick testing
  const handleLoadSampleSummary = () => {
    setTitle('The Almanack of Naval Ravikant');
    setAuthor('Eric Jorgenson');
    setDiscipline('Applied Economics');
    setColor('#10b981');
    const sample = `1. Building Specific Knowledge: Specific knowledge cannot be taught, but it can be learned. It is found by pursuing your genuine curiosity and passion rather than whatever is hot right now.
2. Leverage Is the Ultimate Equalizer: Fortunes require leverage. Business leverage comes from capital, people, and products with no marginal cost of replication (code and media).
3. Judgment Over Hard Work: In an age of infinite leverage, judgment is far more important than how many hours you put in. One good decision can be worth millions.
4. Happiness Is a Choice: Happiness is not something you inherit or choose, but a skill you develop through mindfulness, peace, and managing your desires.`;
    setRawSummary(sample);
    autoParseIntoCards(sample, 'The Almanack of Naval Ravikant');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#10141f] border border-white/15 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-400 to-indigo-500 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-400/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Deploy Book Summary Over Flashcards
              </h2>
              <p className="text-xs text-white/50">
                Type or paste your summary — we automatically transform it into sleek, interactive flashcards!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Top Bar: Book Selection & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5">
                Target Book in Catalog
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => handleSelectBookChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              >
                <option value="new" className="bg-[#131722] text-amber-300 font-bold">
                  ➕ + Create New Book Summary
                </option>
                {books.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#131722]">
                    📖 {b.title} ({b.author})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5">
                Book Title
              </label>
              <input
                type="text"
                placeholder="e.g. The Psychology of Money"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (rawSummary) autoParseIntoCards(rawSummary, e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5">
                Author
              </label>
              <input
                type="text"
                placeholder="e.g. Morgan Housel"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          {/* Discipline & Color Palette */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white/70">Discipline / Shelf:</span>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-medium focus:outline-none"
              >
                <option value="Psychology">Psychology</option>
                <option value="Finance">Finance & Wealth</option>
                <option value="Applied Economics">Applied Economics</option>
                <option value="Business Strategy">Business Strategy</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Philosophy">Philosophy</option>
                <option value="Self Improvement">Self Improvement</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/60">Card Glow Color:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadSampleSummary}
              className="text-xs text-amber-300/80 hover:text-amber-200 underline font-medium ml-auto flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              Fill with sample summary
            </button>
          </div>

          {/* Large Summary Input Area */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                Enter Book Summary / Key Points
              </label>
              <span className="text-[11px] text-white/40">
                Auto-generates {parsedCards.length} interactive flashcard{parsedCards.length === 1 ? '' : 's'}
              </span>
            </div>
            <textarea
              rows={5}
              placeholder="Paste or write your book summary here. Numbered ideas (1., 2., 3.) or bullet points will each become a separate interactive flashcard!"
              value={rawSummary}
              onChange={handleRawSummaryChange}
              className="w-full bg-black/40 border border-white/15 rounded-2xl p-4 text-xs md:text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed font-sans"
            />
          </div>

          {/* Live Flashcard Preview & Fine-Tune Tabs */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Flashcards Preview & Fine-Tuning
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                  {parsedCards.length} Cards Ready
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCard}
                className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-xl border border-amber-400/20 transition-all font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Card
              </button>
            </div>

            {/* Pill Tabs for each card */}
            {parsedCards.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {parsedCards.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePreviewCardIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                      activePreviewCardIndex === idx
                        ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-md'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>Card {idx + 1}</span>
                    <span className="text-[10px] max-w-[100px] truncate opacity-80">
                      {c.front.slice(0, 16)}...
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Currently Active Card Editor */}
            {parsedCards.length > 0 && parsedCards[activePreviewCardIndex] && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    Card {activePreviewCardIndex + 1} of {parsedCards.length}
                  </span>
                  {parsedCards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(activePreviewCardIndex)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete Card
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-white/60 block mb-1">
                      Front Side: Summary Core Concept / Headline
                    </label>
                    <input
                      type="text"
                      value={parsedCards[activePreviewCardIndex].front}
                      onChange={(e) =>
                        handleCardFieldChange(activePreviewCardIndex, 'front', e.target.value)
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white/60 block mb-1">
                      Back Side: Practical Takeaway / Rule of Thumb
                    </label>
                    <input
                      type="text"
                      value={parsedCards[activePreviewCardIndex].takeaway}
                      onChange={(e) =>
                        handleCardFieldChange(activePreviewCardIndex, 'takeaway', e.target.value)
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400/50 italic"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/60 block mb-1">
                    Back Side: Distilled Summary Explanation
                  </label>
                  <textarea
                    rows={2}
                    value={parsedCards[activePreviewCardIndex].back}
                    onChange={(e) =>
                      handleCardFieldChange(activePreviewCardIndex, 'back', e.target.value)
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDeploy}
            disabled={isSuccess}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-400/25 transition-all transform hover:-translate-y-0.5"
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4 text-black animate-scale-up" />
                Deployed Successfully!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                Deploy Over Flashcards ({parsedCards.length || 1})
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
