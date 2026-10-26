// js/quiz.js

// HTML側で customCorrectSound が設定されていればそれを使い、なければ ringring.mp3 を使う
const correctSound = new Audio(window.customCorrectSound || '../assets/sounds/ringring.mp3');
const errorSound = new Audio(window.customErrorSound || '../assets/sounds/buzzer.mp3');

let isPlaying = false;
let selectedChoices = {};

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.75;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function shuffle(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

document.addEventListener("DOMContentLoaded", () => {
    const quizList = document.getElementById('quiz-list');
    if (!quizList || typeof quizData === 'undefined') return;

    quizData.forEach((data, i) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        const imageHTML = data.img ? `<img src="../${data.img}" class="question-img" alt="問題画像" loading="lazy">` : "";

        if (data.type === "choice") {
            let buttonsHTML = data.choices.map(c =>
                `<button class="choice-btn" onclick="selectChoice(${i}, '${c}', this)">${c}</button>`
            ).join('');

            card.innerHTML = `
                ${imageHTML}
                <div><strong>Q${i + 1}</strong> <span class="level-label">選択問題</span></div>
                <span class="translation">${data.jp}</span>
                <div class="word-base">${data.word || "???"} ➔ ?</div>
                <div class="choice-grid" id="choices-${i}">
                    ${buttonsHTML}
                </div>
                <div class="controls">
                    <div id="msg-${i}" class="result-msg"></div>
                    <div class="button-group">
                        <button class="btn btn-check" id="check-btn-${i}" onclick="checkChoice(${i}, '${data.answer}')">CHECK</button>
                    </div>
                    <div id="comment-${i}" class="teacher-comment"></div>
                </div>
            `;
            quizList.appendChild(card);
        } else {
            const shuffledTiles = shuffle(data.tiles);
            card.innerHTML = `
                ${imageHTML}
                <div><strong>Q${i + 1}</strong> <span class="level-label">並び替え</span></div>
                <span class="translation">${data.jp}</span>
                <div class="drop-container">
                    <div class="drop-area" id="drop-${i}"></div>
                    <span class="period-mark" id="period-${i}">.</span>
                </div>
                <div class="pool-area" id="pool-${i}"></div>
                <div class="controls">
                    <div id="msg-${i}" class="result-msg"></div>
                    <div class="button-group">
                        <button class="btn btn-reset" onclick="resetOrder(${i})">RESET</button>
                        <button class="btn btn-check" id="check-btn-${i}" onclick="checkOrder(${i})">CHECK</button>
                    </div>
                    <div id="comment-${i}" class="teacher-comment"></div>
                </div>
            `;

            quizList.appendChild(card);
            const pool = document.getElementById(`pool-${i}`);
            shuffledTiles.forEach(text => {
                const tile = document.createElement('div');
                tile.className = 'chunk-tile';
                tile.textContent = text;
                tile.onclick = () => moveTile(tile, i);
                pool.appendChild(tile);
            });
        }
    });
});

function selectChoice(idx, choiceStr, btnEl) {
    if (isPlaying) return;
    selectedChoices[idx] = choiceStr;
    const btns = document.getElementById(`choices-${idx}`).children;
    for (let b of btns) b.classList.remove('selected');
    btnEl.classList.add('selected');
}

function checkChoice(idx, answer) {
    if (isPlaying) return;
    const msg = document.getElementById(`msg-${idx}`);
    const checkBtn = document.getElementById(`check-btn-${idx}`);
    const commentDiv = document.getElementById(`comment-${idx}`);
    const userAns = selectedChoices[idx];

    if (!userAns) {
        msg.textContent = "👆 選択肢を選んでね！";
        msg.style.color = "#e67e22";
        return;
    }

    isPlaying = true;
    checkBtn.disabled = true;

    const unlockUI = () => {
        isPlaying = false;
        checkBtn.disabled = false;
    };
    setTimeout(unlockUI, 2000);

    if (userAns === answer) {
        // ★ 変更：効果音が鳴り終わった後に英文を読み上げる
        correctSound.onended = () => {
            speakText(answer);
            unlockUI();
        };
        correctSound.currentTime = 0;
        let playPromise = correctSound.play();
        if (playPromise !== undefined) playPromise.catch(() => {
            speakText(answer);
            unlockUI();
        });

        msg.innerHTML = `
            <span class="power-text">Correct! ✨</span>
            <button class="play-audio-btn" onclick="speakText('${answer}')" title="聞いてみる">🔊</button>
        `;

        if (quizData[idx].comment) {
            commentDiv.innerHTML = `💡 ${quizData[idx].comment}`;
            commentDiv.style.display = "block";
        }
    } else {
        errorSound.onended = unlockUI;
        errorSound.currentTime = 0;
        let playPromise = errorSound.play();
        if (playPromise !== undefined) playPromise.catch(unlockUI);

        msg.textContent = "❌ Try Again!";
        msg.style.color = "var(--error)";
    }
}

function moveTile(tile, qIdx) {
    const drop = document.getElementById(`drop-${qIdx}`);
    const pool = document.getElementById(`pool-${qIdx}`);
    const msg = document.getElementById(`msg-${qIdx}`);
    const period = document.getElementById(`period-${qIdx}`);

    if (tile.parentElement === pool) drop.appendChild(tile);
    else pool.appendChild(tile);

    msg.textContent = "";
    drop.className = "drop-area";

    if (drop.children.length > 0) {
        const firstWord = drop.children[0].textContent.toLowerCase();
        const questionWords = ["what", "who", "where", "when", "why", "how", "do", "does", "is", "are", "am", "can", "will"];
        const isQuestion = questionWords.some(w => firstWord.startsWith(w));
        period.textContent = isQuestion ? "?" : ".";
    } else {
        period.textContent = ".";
    }
}

function checkOrder(idx) {
    if (isPlaying) return;
    const drop = document.getElementById(`drop-${idx}`);
    const msg = document.getElementById(`msg-${idx}`);
    const checkBtn = document.getElementById(`check-btn-${idx}`);
    const commentDiv = document.getElementById(`comment-${idx}`);
    const userAns = Array.from(drop.children).map(t => t.textContent.toLowerCase()).join(' ');
    const isCorrect = quizData[idx].validAnswers.includes(userAns);

    isPlaying = true;
    checkBtn.disabled = true;

    const unlockUI = () => {
        isPlaying = false;
        checkBtn.disabled = false;
    };
    setTimeout(unlockUI, 2000);

    if (isCorrect) {
        // ★ 変更：効果音が鳴り終わった後に英文を読み上げる
        correctSound.onended = () => {
            speakText(userAns);
            unlockUI();
        };
        correctSound.currentTime = 0;
        let playPromise = correctSound.play();
        if (playPromise !== undefined) playPromise.catch(() => {
            speakText(userAns);
            unlockUI();
        });

        msg.innerHTML = `
            <span class="power-text">Correct! ✨</span>
            <button class="play-audio-btn" onclick="speakText('${userAns}')" title="もう一度聞く">🔊</button>
        `;
        drop.className = "drop-area correct-bg";

        if (quizData[idx].comment) {
            commentDiv.innerHTML = `💡 ${quizData[idx].comment}`;
            commentDiv.style.display = "block";
        }
    } else {
        errorSound.onended = unlockUI;
        errorSound.currentTime = 0;
        let playPromise = errorSound.play();
        if (playPromise !== undefined) playPromise.catch(unlockUI);

        msg.textContent = "❌ Try Again!";
        msg.style.color = "var(--error)";
        drop.className = "drop-area error-bg";
    }
}

function resetOrder(idx) {
    const drop = document.getElementById(`drop-${idx}`);
    const pool = document.getElementById(`pool-${idx}`);
    const msg = document.getElementById(`msg-${idx}`);
    const checkBtn = document.getElementById(`check-btn-${idx}`);
    const period = document.getElementById(`period-${idx}`);
    const commentDiv = document.getElementById(`comment-${idx}`);

    while (drop.firstChild) pool.appendChild(drop.firstChild);

    msg.textContent = "";
    drop.className = "drop-area";
    period.textContent = ".";

    if (commentDiv) commentDiv.style.display = "none";

    isPlaying = false;
    checkBtn.disabled = false;
    correctSound.pause();
    errorSound.pause();
}