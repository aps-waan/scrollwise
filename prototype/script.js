// ==========================================================================
// SCROLLWISE — CLIENT SCRIPT
// ==========================================================================

// Core DOM Elements
const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const feed = document.getElementById("feed");
const homePage = document.getElementById("homePage");
const toast = document.getElementById("toast");

// Study Detail Modal Data
const details = {
  confirmation: {
    title: "Confirmation Bias (Psych 101)",
    text: "Confirmation bias describes our cognitive tendency to favour, search for, and recall information that validates preexisting hypotheses while systematically ignoring or downweighting contradictory evidence. It impacts student research, term papers, and executive decision-making under stress.",
    takeaway: "When writing research papers or designing experiments, actively seek out the strongest counter-argument first: formulate a disconfirmation test before solidifying your final conclusion.",
    source: "Required Course Reading: Thinking, Fast and Slow · Daniel Kahneman"
  },
  wealth: {
    title: "Wealth ≠ Income (Applied Econ 204)",
    text: "Income is the inflow of money (starting salary, freelance pay). Wealth is the unconsumed capital retained over time — providing students and graduates with the autonomy to take calculated risks, change careers, and decline unfavorable offers.",
    takeaway: "During your first 24 months post-graduation, avoid rapid lifestyle inflation: maintaining low fixed expenses generates compound career flexibility that outlasts material status symbols.",
    source: "Recommended Reading: The Psychology of Money · Morgan Housel"
  },
  systems: {
    title: "Systems Over Goals (Study Habits)",
    text: "Goals are helpful for setting direction, but ineffective for day-to-day academic momentum. You do not rise to the level of your ambitions; you fall to the level of your study systems. Consistent routines compound even on low-motivation exam weeks.",
    takeaway: "Engineer friction inversion: place your smartphone in another room during study blocks (adds 20s of friction) and keep your assignment workspace open on your laptop (removes 2 clicks of friction).",
    source: "Required Reading: Atomic Habits · James Clear"
  },
  create: {
    title: "Create, Don't Just Compete (Strategy 310)",
    text: "Inside crowded, existing markets, competitors fight for tiny fractions of market share by copying standard feature sets. Truly innovative student projects establish distinct new categories, solving neglected friction points rather than mimicking incumbents.",
    takeaway: "Do not build a generic copy of an existing platform. Solve a hyper-specific student friction (like bite-sized micro-learning on campus) 10x better than existing tools.",
    source: "Recommended Reading: Zero to One · Peter Thiel"
  }
};

// State Management
let saved = JSON.parse(localStorage.getItem("scrollwiseSaved") || "[]");
let quizAnswered = Number(localStorage.getItem("scrollwiseQuizAnswered") || 0);
let quizCorrect = Number(localStorage.getItem("scrollwiseQuizCorrect") || 0);
let currentTheme = localStorage.getItem("scrollwiseTheme") || "dark";

// --------------------------------------------------------------------------
// 1. TOAST NOTIFICATIONS
// --------------------------------------------------------------------------
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// --------------------------------------------------------------------------
// 2. THEME ENGINE (CAMPUS DARK / CAMPUS LIGHT / LATE NIGHT STUDY)
// --------------------------------------------------------------------------
function applyTheme(themeName) {
  // normalize legacy theme names
  if (themeName === "night") themeName = "dark";
  if (themeName === "parchment" || themeName === "daylight") themeName = "light";

  currentTheme = themeName;
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("scrollwiseTheme", themeName);

  document.querySelectorAll(".theme-opt").forEach(opt => {
    opt.classList.toggle("active", opt.dataset.themeVal === themeName);
  });
}

const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeMenu = document.getElementById("themeMenu");

if (themeToggleBtn && themeMenu) {
  themeToggleBtn.addEventListener("click", e => {
    e.stopPropagation();
    themeMenu.classList.toggle("hidden");
  });

  document.querySelectorAll(".theme-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.themeVal);
      themeMenu.classList.add("hidden");
      showToast(`Switched to ${btn.querySelector("span:nth-child(2)").textContent}`);
    });
  });

  document.addEventListener("click", e => {
    if (!themeMenu.contains(e.target) && e.target !== themeToggleBtn) {
      themeMenu.classList.add("hidden");
    }
  });
}

// Initialize theme from storage
applyTheme(currentTheme);

// --------------------------------------------------------------------------
// 3. AUTH & SESSION LOGIC
// --------------------------------------------------------------------------

function openApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  renderSaved();
  updateStats();
  syncActiveFolio();
}

function openLogin() {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  localStorage.setItem("scrollwiseLoggedIn", "1");
  openApp();
  showToast("Welcome back to ScrollWise");
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("scrollwiseLoggedIn");
  openLogin();
  showToast("Logged out of prototype");
});

document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => navigate(btn.dataset.nav));
});

function navigate(target) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  const targetPage = document.getElementById(target + "Page");
  if (targetPage) targetPage.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === target);
  });

  if (target === "home") {
    setTimeout(syncActiveFolio, 50);
  }
}



// --------------------------------------------------------------------------
// 5. BOOKMARK / STUDY DECK SYSTEM
// --------------------------------------------------------------------------
function syncSaveButtonStates() {
  document.querySelectorAll(".idea-card").forEach(card => {
    const titleEl = card.querySelector("h3");
    if (!titleEl) return;
    const title = titleEl.textContent.trim();
    const saveBtn = card.querySelector(".action.save");
    if (!saveBtn) return;

    const isSaved = saved.some(item => item.key === title);
    saveBtn.classList.toggle("saved", isSaved);
    const iconSpan = saveBtn.querySelector(".action-icon");
    const textSpan = saveBtn.querySelector(".action-text");
    if (iconSpan) iconSpan.textContent = isSaved ? "♥" : "♡";
    if (textSpan) textSpan.textContent = isSaved ? "Saved" : "Save to Deck";
  });
}

document.querySelectorAll(".action.save").forEach(button => {
  const card = button.closest(".idea-card");
  if (!card) return;
  const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
  const sourceEl = card.querySelector(".source-line");
  const source = sourceEl ? sourceEl.textContent.trim() : "ScrollWise";
  const topic = card.dataset.topic || "General";
  const key = title;

  button.addEventListener("click", () => {
    const exists = saved.some(item => item.key === key);
    if (exists) {
      saved = saved.filter(item => item.key !== key);
      button.classList.remove("saved");
      const iconSpan = button.querySelector(".action-icon");
      const textSpan = button.querySelector(".action-text");
      if (iconSpan) iconSpan.textContent = "♡";
      if (textSpan) textSpan.textContent = "Save to Deck";
      showToast("Removed from Study Deck");
    } else {
      saved.push({ key, title, source, topic });
      button.classList.add("saved");
      const iconSpan = button.querySelector(".action-icon");
      const textSpan = button.querySelector(".action-text");
      if (iconSpan) iconSpan.textContent = "♥";
      if (textSpan) textSpan.textContent = "Saved";
      showToast("Saved to your Study Deck");
    }
    localStorage.setItem("scrollwiseSaved", JSON.stringify(saved));
    renderSaved();
    updateStats();
  });
});

function renderSaved() {
  const box = document.getElementById("savedList");
  const countEl = document.getElementById("savedDeckCount");
  if (countEl) countEl.textContent = saved.length;

  if (!box) return;

  if (!saved.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📖</div>
        <h3>Your Study Deck is empty</h3>
        <p>While scrolling through the daily feed, tap <strong>Save to Deck</strong> on any card to bookmark concepts here for quick exam review.</p>
      </div>`;
    return;
  }

  box.innerHTML = saved.map(item => `
    <div class="saved-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.source)}</p>
      </div>
      <button class="circle-btn unsave" data-key="${escapeHtml(item.key)}" title="Remove from study deck" aria-label="Remove item">
        ♥
      </button>
    </div>
  `).join("");

  box.querySelectorAll(".unsave").forEach(button => {
    button.addEventListener("click", () => {
      const keyToRemove = button.dataset.key;
      saved = saved.filter(item => item.key !== keyToRemove);
      localStorage.setItem("scrollwiseSaved", JSON.stringify(saved));
      renderSaved();
      updateStats();
      syncSaveButtonStates();
      showToast("Card removed from Study Deck");
    });
  });
}

function updateStats() {
  const savedStat = document.getElementById("savedStat");
  const scoreStat = document.getElementById("scoreStat");
  if (savedStat) savedStat.textContent = saved.length;
  if (scoreStat) {
    scoreStat.textContent = quizAnswered ? Math.round((quizCorrect / quizAnswered) * 100) + "%" : "0%";
  }
}

// --------------------------------------------------------------------------
// 6. EXPORT STUDY NOTES (MARKDOWN / TEXT)
// --------------------------------------------------------------------------
const exportNotesBtn = document.getElementById("exportNotesBtn");
if (exportNotesBtn) {
  exportNotesBtn.addEventListener("click", () => {
    if (!saved.length) {
      showToast("Save cards first to export notes!");
      return;
    }

    const markdownContent = [
      "# ScrollWise Study Notes — Semester Exam Prep",
      `Exported: ${new Date().toLocaleDateString()} • Campus Edition`,
      "",
      "---",
      "",
      ...saved.map((item, idx) => `### ${idx + 1}. ${item.title}\n- **Source:** ${item.source}\n- **Saved to:** Student Study Deck\n`)
    ].join("\n");

    if (navigator.clipboard) {
      navigator.clipboard.writeText(markdownContent).then(() => {
        showToast("Study notes copied to clipboard (Markdown)");
      }).catch(() => {
        downloadTextFile("ScrollWise_StudyNotes.md", markdownContent);
      });
    } else {
      downloadTextFile("ScrollWise_StudyNotes.md", markdownContent);
    }
  });
}

function downloadTextFile(filename, text) {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  showToast("Downloaded " + filename);
}

// --------------------------------------------------------------------------
// 7. DETAIL NOTES MODAL
// --------------------------------------------------------------------------
const detailModal = document.getElementById("detailModal");
const closeModal = document.getElementById("closeModal");
const copyModalTakeawayBtn = document.getElementById("copyModalTakeawayBtn");

document.querySelectorAll(".detail-btn").forEach(button => {
  button.addEventListener("click", () => {
    const dataKey = button.dataset.detail;
    const data = details[dataKey];
    if (!data) return;

    document.getElementById("detailTitle").textContent = data.title;
    document.getElementById("detailText").textContent = data.text;
    document.getElementById("detailTakeaway").textContent = data.takeaway;
    document.getElementById("detailSource").textContent = data.source;
    detailModal.classList.remove("hidden");
  });
});

if (closeModal) {
  closeModal.addEventListener("click", () => detailModal.classList.add("hidden"));
}

if (detailModal) {
  const backdrop = detailModal.querySelector(".modal-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", () => detailModal.classList.add("hidden"));
  }
}

if (copyModalTakeawayBtn) {
  copyModalTakeawayBtn.addEventListener("click", () => {
    const takeaway = document.getElementById("detailTakeaway").textContent;
    navigator.clipboard.writeText(takeaway).then(() => {
      showToast("Study takeaway copied to clipboard");
    }).catch(() => {
      showToast("Takeaway ready");
    });
  });
}

// --------------------------------------------------------------------------
// 8. SHARE / COPY STUDY NOTES
// --------------------------------------------------------------------------
document.querySelectorAll(".share-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    const card = btn.closest(".idea-card");
    const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "ScrollWise Concept";
    const source = card.querySelector(".source-line") ? card.querySelector(".source-line").textContent.trim() : "";
    const shareText = `📚 Study Note: “${title}” — ${source} (via ScrollWise Campus)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Concept note copied to clipboard");
      }).catch(() => {
        showToast("Ready to share note");
      });
    } else {
      showToast("Copied note");
    }
  });
});

// --------------------------------------------------------------------------
// 9. ACTIVE RECALL CHECKPOINT QUIZ
// --------------------------------------------------------------------------
let quizLocked = false;

document.querySelectorAll(".quiz-option").forEach(option => {
  option.addEventListener("click", () => {
    if (quizLocked) return;
    quizLocked = true;

    const options = document.querySelectorAll(".quiz-option");
    options.forEach(item => {
      item.classList.remove("correct", "wrong");
      item.disabled = true;
    });

    const correct = option.dataset.correct === "true";
    option.classList.add(correct ? "correct" : "wrong");

    quizAnswered += 1;
    if (correct) quizCorrect += 1;

    localStorage.setItem("scrollwiseQuizAnswered", quizAnswered);
    localStorage.setItem("scrollwiseQuizCorrect", quizCorrect);

    const feedback = document.getElementById("quizFeedback");
    if (feedback) {
      feedback.textContent = correct
        ? "✓ Correct — In cognitive psychology, actively hunting for disconfirming proof neutralizes confirmation bias."
        : "Not quite — confirmation bias is counteracted by deliberately searching for disconfirming evidence.";
      feedback.style.color = correct ? "#10b981" : "#f43f5e";
    }
    updateStats();
  });
});

// --------------------------------------------------------------------------
// 10. FOLIO RAIL & VIEWPORT TRACKER
// --------------------------------------------------------------------------
const railItems = document.querySelectorAll(".rail-item");

function syncActiveFolio() {
  if (!homePage) return;
  const cards = document.querySelectorAll("#feed .idea-card:not(.hidden)");
  if (!cards.length) return;

  const scrollPos = homePage.scrollTop;
  let activeIndex = 0;
  let minDiff = Infinity;

  cards.forEach((card, idx) => {
    const diff = Math.abs(card.offsetTop - scrollPos - 92);
    if (diff < minDiff) {
      minDiff = diff;
      activeIndex = idx;
    }
  });

  railItems.forEach(item => {
    const itemIdx = Number(item.dataset.cardIdx);
    item.classList.toggle("active", itemIdx === activeIndex);
  });

  const viewedStat = document.getElementById("viewedStat");
  if (viewedStat) {
    viewedStat.textContent = Math.max(1, activeIndex + 1);
  }
}

homePage.addEventListener("scroll", syncActiveFolio, { passive: true });

railItems.forEach(item => {
  item.addEventListener("click", () => {
    const idx = Number(item.dataset.cardIdx);
    const targetCard = document.querySelector(`.idea-card[data-index="${idx}"]`);
    if (targetCard) {
      homePage.scrollTo({
        top: targetCard.offsetTop - 92,
        behavior: "smooth"
      });
    }
  });
});

// --------------------------------------------------------------------------
// 11. TOPIC FILTERING
// --------------------------------------------------------------------------
const filterStrip = document.getElementById("filterStrip");
const filterLabel = document.getElementById("filterLabel");
const topicEmptyState = document.getElementById("topicEmptyState");

function applyTopicFilter(topic) {
  let anyVisible = false;
  document.querySelectorAll("#feed .idea-card").forEach(card => {
    const cardTopic = card.dataset.topic;
    if (!cardTopic) {
      card.classList.remove("hidden");
      return;
    }
    if (cardTopic.toLowerCase() === topic.toLowerCase()) {
      card.classList.remove("hidden");
      anyVisible = true;
    } else {
      card.classList.add("hidden");
    }
  });

  if (filterLabel) filterLabel.textContent = "Module: " + topic;
  if (filterStrip) filterStrip.classList.remove("hidden");
  if (topicEmptyState) topicEmptyState.classList.toggle("hidden", anyVisible);
}

function clearTopicFilter() {
  document.querySelectorAll("#feed .idea-card").forEach(card => card.classList.remove("hidden"));
  if (filterStrip) filterStrip.classList.add("hidden");
  if (topicEmptyState) topicEmptyState.classList.add("hidden");
}

const clearFilterBtn = document.getElementById("clearFilter");
if (clearFilterBtn) {
  clearFilterBtn.addEventListener("click", () => {
    clearTopicFilter();
    showToast("Showing all study cards");
  });
}

document.querySelectorAll(".topic-card").forEach(card => {
  card.addEventListener("click", () => {
    const topic = card.dataset.topic;
    applyTopicFilter(topic);
    showToast(`Filtered feed for ${topic}`);
    navigate("home");
    setTimeout(() => {
      homePage.scrollTo({ top: 0, behavior: "smooth" });
      syncActiveFolio();
    }, 60);
  });
});

// --------------------------------------------------------------------------
// 12. FEATURED COURSE READINGS & PDF VIEWER
// --------------------------------------------------------------------------
const pdfModal = document.getElementById("pdfModal");
const pdfFrame = document.getElementById("pdfFrame");
const pdfModalTitle = document.getElementById("pdfModalTitle");
const pdfOpenNewTab = document.getElementById("pdfOpenNewTab");
const closePdfModal = document.getElementById("closePdfModal");

function openPdfReader(src, title) {
  if (pdfModalTitle) pdfModalTitle.textContent = title;
  if (pdfFrame) pdfFrame.src = src;
  if (pdfOpenNewTab) pdfOpenNewTab.href = src;
  if (pdfModal) pdfModal.classList.remove("hidden");
}

function closePdfReader() {
  if (pdfModal) pdfModal.classList.add("hidden");
  if (pdfFrame) pdfFrame.src = "";
}

document.querySelectorAll(".featured-book").forEach(card => {
  const trigger = () => {
    const pdf = card.dataset.pdf;
    if (pdf) {
      openPdfReader(pdf, card.dataset.title || "Course Reading");
    } else {
      const bookTitle = card.dataset.title;
      applyTopicFilter("Psychology");
      navigate("home");
      showToast(`Showing cards from ${bookTitle}`);
    }
  };

  card.addEventListener("click", trigger);
  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      trigger();
    }
  });
});

if (closePdfModal) closePdfModal.addEventListener("click", closePdfReader);
if (pdfModal) {
  const backdrop = pdfModal.querySelector(".modal-backdrop");
  if (backdrop) backdrop.addEventListener("click", closePdfReader);
}

// --------------------------------------------------------------------------
// 13. QUICK SEARCH SYSTEM
// --------------------------------------------------------------------------
const searchBtn = document.getElementById("searchBtn");
const searchOverlay = document.getElementById("searchOverlay");
const quickSearchInput = document.getElementById("quickSearchInput");
const searchResultsList = document.getElementById("searchResultsList");
const closeSearchBtn = document.getElementById("closeSearchBtn");

const catalogIndex = [
  { title: "Confirmation Bias", kicker: "Psychology 101 · Dual Process Theory", topic: "Psychology", index: 1 },
  { title: "Wealth ≠ Income", kicker: "Applied Econ 204 · Optionality", topic: "Money", index: 2 },
  { title: "Systems Over Goals", kicker: "Study Habits · Friction Inversion", topic: "Habits", index: 3 },
  { title: "Create, Don't Just Compete", kicker: "Strategy 310 · Zero to One", topic: "Business", index: 4 },
  { title: "Active Recall Checkpoint", kicker: "Cognitive Science · Testing Effect", topic: "Active Recall", index: 5 },
  { title: "Thinking, Fast and Slow", kicker: "Psychology Required Reading · Daniel Kahneman", topic: "Psychology", index: 1 },
  { title: "The 48 Laws of Power", kicker: "Strategy Seminar PDF · Robert Greene", pdf: "48-laws-of-power.pdf" }
];

function openSearch() {
  if (!searchOverlay) return;
  searchOverlay.classList.remove("hidden");
  quickSearchInput.value = "";
  quickSearchInput.focus();
  renderSearchResults("");
}

function closeSearch() {
  if (!searchOverlay) return;
  searchOverlay.classList.add("hidden");
}

function renderSearchResults(query) {
  if (!searchResultsList) return;
  const q = query.trim().toLowerCase();

  if (!q) {
    searchResultsList.innerHTML = `<div class="search-prompt-hint">Type to discover concepts, authors, or course tags...</div>`;
    return;
  }

  const matches = catalogIndex.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.kicker.toLowerCase().includes(q) ||
    (item.topic && item.topic.toLowerCase().includes(q))
  );

  if (!matches.length) {
    searchResultsList.innerHTML = `<div class="search-prompt-hint">No concepts found matching “${escapeHtml(query)}”</div>`;
    return;
  }

  searchResultsList.innerHTML = matches.map(item => `
    <div class="search-result-item" data-idx="${item.index !== undefined ? item.index : ''}" data-pdf="${item.pdf || ''}">
      <div>
        <div class="search-res-title">${escapeHtml(item.title)}</div>
        <div class="search-res-sub">${escapeHtml(item.kicker)}</div>
      </div>
      <span class="topic-arrow">→</span>
    </div>
  `).join("");

  searchResultsList.querySelectorAll(".search-result-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = el.dataset.idx;
      const pdf = el.dataset.pdf;
      closeSearch();

      if (pdf) {
        openPdfReader(pdf, "The 48 Laws of Power");
      } else if (idx !== "") {
        navigate("home");
        clearTopicFilter();
        const targetCard = document.querySelector(`.idea-card[data-index="${idx}"]`);
        if (targetCard) {
          setTimeout(() => {
            homePage.scrollTo({
              top: targetCard.offsetTop - 92,
              behavior: "smooth"
            });
            syncActiveFolio();
          }, 60);
        }
      }
    });
  });
}

if (searchBtn) searchBtn.addEventListener("click", openSearch);
if (closeSearchBtn) closeSearchBtn.addEventListener("click", closeSearch);
if (quickSearchInput) {
  quickSearchInput.addEventListener("input", e => renderSearchResults(e.target.value));
}
if (searchOverlay) {
  searchOverlay.addEventListener("click", e => {
    if (e.target === searchOverlay) closeSearch();
  });
}

// --------------------------------------------------------------------------
// 14. KEYBOARD SHORTCUTS
// --------------------------------------------------------------------------
document.addEventListener("keydown", e => {
  // ESC closes any open overlay
  if (e.key === "Escape") {
    if (searchOverlay && !searchOverlay.classList.contains("hidden")) closeSearch();
    if (detailModal && !detailModal.classList.contains("hidden")) detailModal.classList.add("hidden");
    if (pdfModal && !pdfModal.classList.contains("hidden")) closePdfReader();
    if (themeMenu && !themeMenu.classList.contains("hidden")) themeMenu.classList.add("hidden");
    return;
  }

  // ⌘K or / opens search if not currently typing in an input
  const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
  if (!isInput && ((e.metaKey && e.key === "k") || (e.ctrlKey && e.key === "k") || e.key === "/")) {
    e.preventDefault();
    openSearch();
    return;
  }

  // When on home page and not typing in an input, allow J/K or Arrow Down/Up for card jumping
  const isHomeActive = document.getElementById("homePage").classList.contains("active");
  if (!isInput && isHomeActive && searchOverlay.classList.contains("hidden") && detailModal.classList.contains("hidden")) {
    const cards = Array.from(document.querySelectorAll("#feed .idea-card:not(.hidden)"));
    if (!cards.length) return;

    const scrollPos = homePage.scrollTop;
    let activeIndex = 0;
    let minDiff = Infinity;
    cards.forEach((card, idx) => {
      const diff = Math.abs(card.offsetTop - scrollPos - 72);
      if (diff < minDiff) {
        minDiff = diff;
        activeIndex = idx;
      }
    });

    if (e.key === "j" || e.key === "ArrowDown") {
      if (activeIndex < cards.length - 1) {
        e.preventDefault();
        homePage.scrollTo({
          top: cards[activeIndex + 1].offsetTop - 72,
          behavior: "smooth"
        });
      }
    } else if (e.key === "k" || e.key === "ArrowUp") {
      if (activeIndex > 0) {
        e.preventDefault();
        homePage.scrollTo({
          top: cards[activeIndex - 1].offsetTop - 72,
          behavior: "smooth"
        });
      }
    } else if (e.key.toLowerCase() === "b") {
      const currentCard = cards[activeIndex];
      const saveBtn = currentCard ? currentCard.querySelector(".action.save") : null;
      if (saveBtn) {
        e.preventDefault();
        saveBtn.click();
      }
    }
  }
});

// --------------------------------------------------------------------------
// 15. UTILITIES & INITIALIZATION
// --------------------------------------------------------------------------
function escapeHtml(value) {
  if (!value) return "";
  return value.replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

// Initial state sync
syncSaveButtonStates();
renderSaved();
updateStats();

if (localStorage.getItem("scrollwiseLoggedIn") === "1") {
  openApp();
}
