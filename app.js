// Quiz Application Logic
const state = {
    allQuestions: [],
    selectedQuestions: [],
    currentQuestionIndex: 0,
    navPage: 0,
    pageSize: 40,
    userAnswers: {},
    flaggedQuestions: new Set(),
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
const chapterList = document.getElementById('chapter-list');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const submitBtn = document.getElementById('submit-btn');

// Initialize
async function init() {
    const chaptersToLoad = [
        { id: 'chap1', name: 'Chương 1', file: 'Question/chap1.json' },
        { id: 'chap2', name: 'Chương 2', file: 'Question/chap2.json' },
        { id: 'chap3', name: 'Chương 3', file: 'Question/chap3.json' },
        { id: 'chap4,5', name: 'Chương 4 & 5', file: 'Question/chap4,5.json' },
        { id: 'chap6,7,8', name: 'Chương 6, 7 & 8', file: 'Question/chap6,7,8.json' }
    ];

    for (const chap of chaptersToLoad) {
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

            renderChapterCard(chap, questions.length);
        } catch (e) {
            console.error(`Error loading ${chap.file}:`, e);
        }
    }

    setupEventListeners();

    // Fix "all" chapter selection
    const allChapCard = document.querySelector('.chapter-card[data-chapter="all"]');
    if (allChapCard) {
        allChapCard.onclick = () => {
            document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('selected'));
            allChapCard.classList.add('selected');
        };
    }
}

function renderChapterCard(chap, count) {
    const card = document.createElement('div');
    card.className = 'chapter-card premium-card';
    card.dataset.chapter = chap.id;
    card.innerHTML = `
        <h3>${chap.name}</h3>
        <p class="meta">${count} câu hỏi</p>
    `;
    card.onclick = () => {
        document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    };
    chapterList.appendChild(card);
}

function setupEventListeners() {
    startBtn.onclick = startQuiz;
    nextBtn.onclick = () => navigate(1);
    prevBtn.onclick = () => navigate(-1);
    submitBtn.onclick = endQuiz;
    document.getElementById('flag-btn').onclick = toggleFlag;

    document.getElementById('back-home-btn').onclick = () => {
        if (confirm('Dừng bài thi và quay về trang chủ? Toàn bộ tiến trình sẽ bị mất.')) {
            clearInterval(state.timer);
            quizScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        }
    };

    document.getElementById('shuffle-questions').onchange = (e) => state.config.shuffleQuestions = e.target.checked;
    document.getElementById('shuffle-answers').onchange = (e) => state.config.shuffleAnswers = e.target.checked;
    document.getElementById('time-limit').onchange = (e) => state.config.timeLimit = parseInt(e.target.value);
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
    state.timeRemaining = state.config.timeLimit * 60;
    state.elapsedTime = 0;

    homeScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

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
        if (state.userAnswers[state.currentQuestionIndex] === opt.text) {
            item.classList.add('selected');
        }

        item.innerHTML = `
            <div class="option-id">${String.fromCharCode(65 + index)}</div>
            <div class="option-text">${opt.text}</div>
        `;

        item.onclick = () => {
            state.userAnswers[state.currentQuestionIndex] = opt.text;
            renderQuestion(); // Re-render to update selected state
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
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.style.visibility = 'visible';
        nextBtn.textContent = 'Câu tiếp theo';
        // We keep the submit button visible but maybe less prominent until the end
        // Or we can choose to only show it at the very last question
        submitBtn.classList.add('hidden');
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
    if (state.timeRemaining > 0 && !confirm('Bạn có chắc chắn muốn nộp bài?')) return;

    clearInterval(state.timer);
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    calculateResults();
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

init();
