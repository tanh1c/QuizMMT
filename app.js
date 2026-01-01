// Quiz Application Logic
const state = {
    allQuestions: [],
    selectedQuestions: [],
    currentQuestionIndex: 0,
    navPage: 0,
    pageSize: 40,
    userAnswers: {},
    flaggedQuestions: new Set(),
    reviewMode: false,
    activeQuizId: null, // Track current quiz type
    timer: null,
    timeRemaining: 0,
    elapsedTime: 0,
    chapters: [],
    config: {
        shuffleQuestions: true,
        shuffleAnswers: true,
        timeLimit: 0, // 0 = unlimited
    }
};

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const submitBtn = document.getElementById('submit-btn');

// Initialize
async function init() {
    const categories = {
        mmt: {
            containerId: 'chapter-list-mmt',
            chapters: [
                { id: 'chap1', name: 'Chương 1', file: 'Question/chap1.json' },
                { id: 'chap2', name: 'Chương 2', file: 'Question/chap2.json' },
                { id: 'chap3', name: 'Chương 3', file: 'Question/chap3.json' },
                { id: 'chap4,5', name: 'Chương 4 & 5', file: 'Question/chap4,5.json' },
                { id: 'chap6,7,8', name: 'Chương 6, 7 & 8', file: 'Question/chap6,7,8.json' }
            ]
        },
        cnxh: {
            containerId: 'chapter-list-cnxh',
            chapters: [
                { id: 'Chuong2_p1', name: 'Chương 2 (P1)', file: 'Question/Chuong2_p1.json' },
                { id: 'Chuong2_p2', name: 'Chương 2 (P2)', file: 'Question/Chuong2_p2.json' },
                { id: 'Chuong4', name: 'Chương 4', file: 'Question/Chuong4.json' },
                { id: 'Chuong5', name: 'Chương 5', file: 'Question/Chuong5.json' },
                { id: 'Chuong6_p1', name: 'Chương 6 (P1)', file: 'Question/Chuong6_p1.json' },
                { id: 'Chuong6_p2_1', name: 'Chương 6 (P2-1)', file: 'Question/Chuong6_p2_1.json' },
                { id: 'Chuong6_p2_2', name: 'Chương 6 (P2-2)', file: 'Question/Chuong6_p2_2.json' },
                { id: 'Chuong7', name: 'Chương 7', file: 'Question/Chuong7.json' },
                { id: 'OnTap', name: 'Ôn tập tổng hợp', file: 'Question/OnTap.json' }
            ]
        }
    };

    for (const catKey in categories) {
        const category = categories[catKey];
        const container = document.getElementById(category.containerId);

        for (const chap of category.chapters) {
            try {
                const response = await fetch(chap.file);
                const data = await response.json();
                const questions = data.quiz.questions.map(q => ({
                    ...q,
                    chapterId: chap.id,
                    chapterName: chap.name
                }));

                state.allQuestions.push(...questions);
                state.chapters.push({
                    ...chap,
                    count: questions.length
                });

                renderChapterCard(chap, questions.length, container);
            } catch (e) {
                console.error(`Error loading ${chap.file}:`, e);
            }
        }
    }

    setupEventListeners();
    renderHistory();
    renderCustomQuizzes();
    setupFileUpload();

    // Fix "all" chapter selection
    const allChapCard = document.querySelector('.chapter-card[data-chapter="all"]');
    if (allChapCard) {
        allChapCard.onclick = () => {
            document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('selected'));
            allChapCard.classList.add('selected');
        };
        // Show progress if exists
        const saved = localStorage.getItem('quiz_progress_all');
        if (saved) {
            const tag = document.createElement('div');
            tag.className = 'progress-tag';
            tag.textContent = 'Đang làm...';
            allChapCard.style.position = 'relative';
            allChapCard.appendChild(tag);
        }
    }
}

function renderHistory() {
    const historyListEl = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');

    if (history.length === 0) return;

    historyListEl.innerHTML = '';
    history.reverse().forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <h4>${item.title}</h4>
                <div class="history-meta">${item.date} • ${item.totalQuestions} câu</div>
            </div>
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div class="history-score">${item.score}/${item.totalQuestions}</div>
                <button class="btn-outline btn-history-review" onclick="viewHistoryItem(${history.length - 1 - index})">Xem lại</button>
            </div>
        `;
        historyListEl.appendChild(div);
    });
}

function viewHistoryItem(index) {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const item = history[index];
    if (!item) return;

    state.selectedQuestions = item.questions;
    state.userAnswers = item.userAnswers;
    state.reviewMode = true;
    state.currentQuestionIndex = 0;
    state.navPage = 0;

    homeScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    renderSideNav();
    renderQuestion();
}

function renderChapterCard(chap, count, container) {
    const card = document.createElement('div');
    card.className = 'chapter-card premium-card';
    card.dataset.chapter = chap.id;
    card.innerHTML = `
        <h3>${chap.name}</h3>
        <p class="meta">${count} câu hỏi</p>
    `;

    // Show progress tag if exists
    const saved = localStorage.getItem(`quiz_progress_${chap.id}`);
    if (saved) {
        const tag = document.createElement('div');
        tag.className = 'progress-tag';
        tag.textContent = 'Đang làm...';
        card.style.position = 'relative';
        card.appendChild(tag);
    }

    card.onclick = () => {
        document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    };
    container.appendChild(card);
}

function setupEventListeners() {
    startBtn.onclick = startQuiz;
    nextBtn.onclick = () => navigate(1);
    prevBtn.onclick = () => navigate(-1);
    submitBtn.onclick = endQuiz;
    document.getElementById('flag-btn').onclick = toggleFlag;
    document.getElementById('review-btn').onclick = startReview;

    document.getElementById('back-home-btn').onclick = () => {
        if (state.reviewMode) {
            quizScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
            return;
        }
        if (confirm('Lưu lại tiến trình và quay về trang chủ?')) {
            saveProgress();
            clearInterval(state.timer);
            quizScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
            location.reload(); // Refresh to show progress tags
        }
    };

    document.getElementById('shuffle-questions').onchange = (e) => state.config.shuffleQuestions = e.target.checked;
    document.getElementById('shuffle-answers').onchange = (e) => state.config.shuffleAnswers = e.target.checked;
    document.getElementById('time-limit').onchange = (e) => state.config.timeLimit = parseInt(e.target.value);

    document.getElementById('clear-data-btn').onclick = clearAllData;

    // Keyboard navigation: Enter, ArrowRight to go next, ArrowLeft to go back
    document.addEventListener('keydown', (e) => {
        if (quizScreen.classList.contains('hidden')) return;

        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            if (state.currentQuestionIndex < state.selectedQuestions.length - 1) {
                navigate(1);
            }
        } else if (e.key === 'ArrowLeft') {
            if (state.currentQuestionIndex > 0) {
                navigate(-1);
            }
        }
    });
}

function toggleFlag() {
    const idx = state.currentQuestionIndex;
    if (state.flaggedQuestions.has(idx)) {
        state.flaggedQuestions.delete(idx);
    } else {
        state.flaggedQuestions.add(idx);
    }
    renderQuestion();
}

function startQuiz() {
    const selectedChap = document.querySelector('.chapter-card.selected');
    if (!selectedChap) {
        alert('Vui lòng chọn một chương để bắt đầu!');
        return;
    }

    const chapId = selectedChap.dataset.chapter;
    state.activeQuizId = chapId;

    // Check for saved progress
    const saved = localStorage.getItem(`quiz_progress_${chapId}`);
    if (saved && !state.reviewMode) {
        const data = JSON.parse(saved);
        if (confirm(`Bạn có muốn tiếp tục tiến trình đang dở của ${selectedChap.querySelector('h3').textContent} không?`)) {
            state.selectedQuestions = data.questions;
            state.userAnswers = data.userAnswers;
            state.flaggedQuestions = new Set(data.flaggedQuestions);
            state.currentQuestionIndex = data.currentIndex;
            state.timeRemaining = data.timeRemaining;
            state.elapsedTime = data.elapsedTime;
            state.navPage = Math.floor(state.currentQuestionIndex / state.pageSize);

            homeScreen.classList.add('hidden');
            quizScreen.classList.remove('hidden');
            renderSideNav();
            startTimer();
            renderQuestion();
            return;
        } else {
            localStorage.removeItem(`quiz_progress_${chapId}`);
        }
    }

    state.selectedQuestions = chapId === 'all'
        ? [...state.allQuestions]
        : state.allQuestions.filter(q => q.chapterId === chapId);

    if (state.config.shuffleQuestions) {
        state.selectedQuestions = shuffle(state.selectedQuestions);
    }

    if (state.config.shuffleAnswers) {
        state.selectedQuestions = state.selectedQuestions.map(q => ({
            ...q,
            options: shuffle([...q.options])
        }));
    }

    state.currentQuestionIndex = 0;
    state.navPage = 0;
    state.userAnswers = {};
    state.flaggedQuestions = new Set();
    state.reviewMode = false;
    state.timeRemaining = state.config.timeLimit * 60;
    state.elapsedTime = 0;

    homeScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

    // Reset UI states
    document.getElementById('flag-btn').classList.remove('hidden');
    submitBtn.classList.add('btn-success');
    submitBtn.textContent = "Nộp bài ngay";

    renderSideNav();
    startTimer();
    renderQuestion();
}

function renderSideNav() {
    const grid = document.getElementById('side-nav-grid');
    const pagination = document.getElementById('nav-pagination');
    grid.innerHTML = '';
    pagination.innerHTML = '';

    const start = state.navPage * state.pageSize;
    const end = Math.min(start + state.pageSize, state.selectedQuestions.length);
    const totalPages = Math.ceil(state.selectedQuestions.length / state.pageSize);

    for (let i = start; i < end; i++) {
        const box = document.createElement('div');
        box.className = 'nav-box';
        if (state.currentQuestionIndex === i) box.classList.add('current');
        if (state.userAnswers[i] !== undefined) box.classList.add('answered');
        if (state.flaggedQuestions.has(i)) box.classList.add('flagged');

        if (state.reviewMode) {
            const correctOpt = state.selectedQuestions[i].options.find(o => o.is_correct);
            const isCorrect = state.userAnswers[i] === correctOpt.text;
            box.classList.add(isCorrect ? 'correct' : 'incorrect');
        }

        box.innerHTML = `
            ${i + 1}
            <div class="nav-flag-indicator">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
        `;
        box.id = `nav-box-${i}`;
        box.onclick = () => {
            state.currentQuestionIndex = i;
            renderQuestion();
        };
        grid.appendChild(box);
    }

    if (totalPages > 1) {
        const prevPage = document.createElement('button');
        prevPage.className = 'btn-outline btn-nav-page';
        prevPage.textContent = '← Trước';
        prevPage.disabled = state.navPage === 0;
        prevPage.onclick = () => {
            state.navPage--;
            renderSideNav();
        };

        const nextPage = document.createElement('button');
        nextPage.className = 'btn-outline btn-nav-page';
        nextPage.textContent = 'Sau →';
        nextPage.disabled = state.navPage === totalPages - 1;
        nextPage.onclick = () => {
            state.navPage++;
            renderSideNav();
        };

        pagination.appendChild(prevPage);
        pagination.appendChild(nextPage);
    }
}

function renderQuestion() {
    const q = state.selectedQuestions[state.currentQuestionIndex];
    const questionTextEl = document.getElementById('question-text');
    const optionsListEl = document.getElementById('options-list');
    const questionCounter = document.getElementById('question-counter');
    const progressFill = document.getElementById('progress-fill');
    const chapTitle = document.getElementById('current-chap-title');

    chapTitle.textContent = q.chapterName;
    questionCounter.textContent = `Câu ${state.currentQuestionIndex + 1}/${state.selectedQuestions.length}`;
    progressFill.style.width = `${((state.currentQuestionIndex + 1) / state.selectedQuestions.length) * 100}%`;

    // Simple markdown table support
    let formattedText = q.question_text.replace(/\n/g, '<br>');
    if (formattedText.includes('|')) {
        formattedText = parseMarkdownTable(q.question_text);
    }
    questionTextEl.innerHTML = formattedText;

    optionsListEl.innerHTML = '';
    q.options.forEach((opt, index) => {
        const item = document.createElement('div');
        item.className = 'option-item';

        const isSelected = state.userAnswers[state.currentQuestionIndex] === opt.text;
        if (isSelected) item.classList.add('selected');

        if (state.reviewMode) {
            if (opt.is_correct) {
                item.classList.add('correct');
                if (!isSelected) item.classList.add('should-have-selected');
            } else if (isSelected) {
                item.classList.add('incorrect');
            }
        }

        item.innerHTML = `
            <div class="option-id">${String.fromCharCode(65 + index)}</div>
            <div class="option-text">${opt.text}</div>
            ${state.reviewMode && opt.is_correct ? '<div class="review-indicator correct-text">✓ Đáp án đúng</div>' : ''}
            ${state.reviewMode && isSelected && !opt.is_correct ? '<div class="review-indicator incorrect-text">✕ Bạn đã chọn</div>' : ''}
        `;

        item.onclick = () => {
            if (state.reviewMode) return; // Disable selection in review mode
            state.userAnswers[state.currentQuestionIndex] = opt.text;
            saveProgress(); // Auto save on every click
            renderQuestion();
        };
        optionsListEl.appendChild(item);
    });

    // Update navigation buttons
    prevBtn.style.visibility = state.currentQuestionIndex === 0 ? 'hidden' : 'visible';

    // Auto-switch side nav page if question is out of current page
    const expectedPage = Math.floor(state.currentQuestionIndex / state.pageSize);
    if (expectedPage !== state.navPage) {
        state.navPage = expectedPage;
        renderSideNav();
    } else {
        // Just update classes if on same page
        document.querySelectorAll('.nav-box').forEach(box => {
            box.classList.remove('current');
        });
        const currentNavBox = document.getElementById(`nav-box-${state.currentQuestionIndex}`);
        if (currentNavBox) currentNavBox.classList.add('current');

        Object.keys(state.userAnswers).forEach(idx => {
            const box = document.getElementById(`nav-box-${idx}`);
            if (box) box.classList.add('answered');
        });

        // Update Flag indicators in sidebar
        const start = state.navPage * state.pageSize;
        const end = Math.min(start + state.pageSize, state.selectedQuestions.length);
        for (let i = start; i < end; i++) {
            const box = document.getElementById(`nav-box-${i}`);
            if (box) {
                if (state.flaggedQuestions.has(i)) {
                    box.classList.add('flagged');
                } else {
                    box.classList.remove('flagged');
                }
            }
        }

        // Update Flag button state
        const flagBtn = document.getElementById('flag-btn');
        if (state.flaggedQuestions.has(state.currentQuestionIndex)) {
            flagBtn.classList.add('active');
            flagBtn.innerHTML = `<svg class="flag-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Đã đánh dấu`;
        } else {
            flagBtn.classList.remove('active');
            flagBtn.innerHTML = `<svg class="flag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Đánh dấu`;
        }
    }

    // In our new UI, we have a dedicated submit button and a next button
    if (state.currentQuestionIndex === state.selectedQuestions.length - 1) {
        nextBtn.style.visibility = 'hidden';
        if (!state.reviewMode) {
            submitBtn.classList.remove('hidden');
        }
    } else {
        nextBtn.style.visibility = 'visible';
        nextBtn.textContent = 'Câu tiếp theo';
        if (!state.reviewMode) {
            submitBtn.classList.add('hidden');
        }
    }

    if (state.reviewMode) {
        submitBtn.classList.remove('hidden');
        submitBtn.classList.remove('btn-success');
        submitBtn.textContent = "Quay về trang chủ";
        submitBtn.onclick = () => {
            location.href = 'index.html';
        };
        document.getElementById('flag-btn').classList.add('hidden');
    }

    nextBtn.onclick = () => navigate(1);
}

function navigate(direction) {
    state.currentQuestionIndex += direction;
    renderQuestion();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTimer() {
    if (state.timer) clearInterval(state.timer);

    const timerVal = document.getElementById('timer-val');
    const sideTimerVal = document.getElementById('side-timer-val');
    const timerDisplay = document.getElementById('quiz-timer');
    const timerLabel = document.querySelector('.timer-label');

    if (state.config.timeLimit === 0) {
        if (timerLabel) timerLabel.textContent = "Thời gian đã trôi qua";
    } else {
        if (timerLabel) timerLabel.textContent = "Thời gian còn lại";
    }

    state.timer = setInterval(() => {
        let timeStr = "";

        if (state.config.timeLimit === 0) {
            state.elapsedTime++;
            const mins = Math.floor(state.elapsedTime / 60);
            const secs = state.elapsedTime % 60;
            timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            state.timeRemaining--;
            const mins = Math.floor(state.timeRemaining / 60);
            const secs = state.timeRemaining % 60;
            timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (state.timeRemaining <= 60) {
                timerDisplay.classList.add('low');
            }

            if (state.timeRemaining <= 0) {
                clearInterval(state.timer);
                endQuiz();
            }
        }

        timerVal.textContent = timeStr;
        if (sideTimerVal) sideTimerVal.textContent = timeStr;
    }, 1000);
}

function endQuiz() {
    if (state.reviewMode) {
        quizScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        return;
    }

    if (state.timeRemaining > 0 && state.config.timeLimit !== 0 && !confirm('Bạn có chắc chắn muốn nộp bài?')) return;

    // Remove saved progress for this chapter as it's finished
    localStorage.removeItem(`quiz_progress_${state.activeQuizId}`);

    clearInterval(state.timer);
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    calculateResults();
    saveToHistory();
}

function saveProgress() {
    if (state.reviewMode) return;
    const data = {
        questions: state.selectedQuestions,
        userAnswers: state.userAnswers,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        currentIndex: state.currentQuestionIndex,
        timeRemaining: state.timeRemaining,
        elapsedTime: state.elapsedTime,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(`quiz_progress_${state.activeQuizId}`, JSON.stringify(data));
}

function saveToHistory() {
    let totalCorrect = 0;
    state.selectedQuestions.forEach((q, idx) => {
        const correctOpt = q.options.find(o => o.is_correct);
        if (state.userAnswers[idx] === correctOpt.text) totalCorrect++;
    });

    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const title = state.activeQuizId === 'all' ? 'Tổng hợp' : state.selectedQuestions[0].chapterName;

    history.push({
        title: title,
        date: new Date().toLocaleString('vi-VN'),
        score: totalCorrect,
        totalQuestions: state.selectedQuestions.length,
        questions: state.selectedQuestions,
        userAnswers: state.userAnswers
    });

    // Limit history to last 20 items
    if (history.length > 20) history.shift();

    localStorage.setItem('quiz_history', JSON.stringify(history));
}

function clearAllData() {
    if (confirm('⚠️ CẢNH BÁO: Bạn sẽ xóa TOÀN BỘ lịch sử làm bài và tiến trình đang dở. Hành động này KHÔNG THỂ hoàn tác!\n\nBạn có chắc chắn muốn tiếp tục?')) {
        // Clear all quiz-related data from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('quiz_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        alert('Đã xóa toàn bộ dữ liệu!');
        location.reload();
    }
}

function calculateResults() {
    let totalCorrect = 0;
    const chapStats = {};

    state.selectedQuestions.forEach((q, idx) => {
        const userAns = state.userAnswers[idx];
        const correctOpt = q.options.find(o => o.is_correct);
        const isCorrect = userAns === correctOpt.text;

        if (isCorrect) totalCorrect++;

        if (!chapStats[q.chapterId]) {
            chapStats[q.chapterId] = { name: q.chapterName, correct: 0, total: 0 };
        }
        chapStats[q.chapterId].total++;
        if (isCorrect) chapStats[q.chapterId].correct++;
    });

    document.getElementById('total-score').textContent = `${totalCorrect}/${state.selectedQuestions.length}`;

    const statsGrid = document.getElementById('chapter-stats');
    statsGrid.innerHTML = '';

    Object.values(chapStats).forEach(stat => {
        const item = document.createElement('div');
        item.className = 'premium-card';
        const percent = Math.round((stat.correct / stat.total) * 100);
        item.innerHTML = `
            <h4>${stat.name}</h4>
            <p style="font-size: 1.5rem; font-weight: 700; margin: 10px 0;">${percent}%</p>
            <p class="meta">${stat.correct}/${stat.total} câu đúng</p>
        `;
        statsGrid.appendChild(item);
    });
}

function parseMarkdownTable(text) {
    const lines = text.split('\n');
    let html = '';
    let inTable = false;

    lines.forEach(line => {
        if (line.trim().startsWith('|')) {
            if (!inTable) {
                html += '<table>';
                inTable = true;
            }
            const cells = line.split('|').filter(c => c.trim().length > 0 || c === '');
            if (line.includes('---')) return; // Skip separator row

            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${cell.trim()}</td>`;
            });
            html += '</tr>';
        } else {
            if (inTable) {
                html += '</table>';
                inTable = false;
            }
            html += line + '<br>';
        }
    });

    if (inTable) html += '</table>';
    return html;
}

function startReview() {
    state.reviewMode = true;
    state.currentQuestionIndex = 0;
    state.navPage = 0;

    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

    renderSideNav();
    renderQuestion();
}

// ===================== CUSTOM QUIZ UPLOAD =====================

function setupFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('quiz-file-input');

    if (!uploadArea || !fileInput) return;

    uploadArea.onclick = () => fileInput.click();

    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };

    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('dragover');
    };

    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processUploadedFile(file);
    };

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) processUploadedFile(file);
    };
}

function processUploadedFile(file) {
    if (!file.name.endsWith('.json')) {
        alert('Vui lòng chọn file JSON!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate structure
            if (!data.quiz || !data.quiz.questions || !Array.isArray(data.quiz.questions)) {
                alert('File JSON không đúng định dạng! Vui lòng tải file mẫu để xem cấu trúc.');
                return;
            }

            // Check if questions have required fields
            for (const q of data.quiz.questions) {
                if (!q.question_text || !q.options || !Array.isArray(q.options)) {
                    alert('Một số câu hỏi thiếu thông tin bắt buộc (question_text, options).');
                    return;
                }
                const hasCorrect = q.options.some(o => o.is_correct === true);
                if (!hasCorrect) {
                    alert(`Câu hỏi "${q.question_text.substring(0, 30)}..." không có đáp án đúng (is_correct: true).`);
                    return;
                }
            }

            // Save to localStorage
            const customQuizzes = JSON.parse(localStorage.getItem('quiz_custom') || '[]');
            const quizId = 'custom_' + Date.now();
            const quizName = data.quiz.title || file.name.replace('.json', '');

            customQuizzes.push({
                id: quizId,
                name: quizName,
                questions: data.quiz.questions,
                uploadedAt: new Date().toLocaleString('vi-VN')
            });

            localStorage.setItem('quiz_custom', JSON.stringify(customQuizzes));

            alert(`Đã thêm bộ đề "${quizName}" với ${data.quiz.questions.length} câu hỏi!`);
            renderCustomQuizzes();

        } catch (err) {
            console.error(err);
            alert('Lỗi khi đọc file JSON. Vui lòng kiểm tra lại định dạng file.');
        }
    };
    reader.readAsText(file);
}

function renderCustomQuizzes() {
    const container = document.getElementById('custom-quiz-list');
    if (!container) return;

    const customQuizzes = JSON.parse(localStorage.getItem('quiz_custom') || '[]');

    container.innerHTML = '';

    if (customQuizzes.length === 0) {
        container.innerHTML = '<p class="meta" style="grid-column: 1/-1; text-align: center;">Chưa có bộ đề tự tạo nào</p>';
        return;
    }

    customQuizzes.forEach((quiz, index) => {
        const card = document.createElement('div');
        card.className = 'chapter-card premium-card';
        card.dataset.chapter = quiz.id;
        card.style.position = 'relative';

        card.innerHTML = `
            <h3>${quiz.name}</h3>
            <p class="meta">${quiz.questions.length} câu hỏi</p>
            <div class="custom-card-actions">
                <button class="btn-outline btn-delete-quiz" onclick="event.stopPropagation(); deleteCustomQuiz(${index})">Xóa</button>
            </div>
        `;

        card.onclick = () => {
            document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };

        // Check for saved progress
        const saved = localStorage.getItem(`quiz_progress_${quiz.id}`);
        if (saved) {
            const tag = document.createElement('div');
            tag.className = 'progress-tag';
            tag.textContent = 'Đang làm...';
            card.appendChild(tag);
        }

        container.appendChild(card);

        // Add to allQuestions for "Tổng hợp" mode
        quiz.questions.forEach(q => {
            const exists = state.allQuestions.find(aq =>
                aq.question_text === q.question_text && aq.chapterId === quiz.id
            );
            if (!exists) {
                state.allQuestions.push({
                    ...q,
                    chapterId: quiz.id,
                    chapterName: quiz.name
                });
            }
        });
    });
}

function deleteCustomQuiz(index) {
    if (!confirm('Bạn có chắc muốn xóa bộ đề này?')) return;

    const customQuizzes = JSON.parse(localStorage.getItem('quiz_custom') || '[]');
    const quizId = customQuizzes[index].id;

    // Remove associated progress
    localStorage.removeItem(`quiz_progress_${quizId}`);

    // Remove quiz
    customQuizzes.splice(index, 1);
    localStorage.setItem('quiz_custom', JSON.stringify(customQuizzes));

    location.reload();
}

init();
