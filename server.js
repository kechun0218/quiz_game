const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 題庫範例：支援純文字或帶有圖片的選項
const questions = [
  {
    question: "下列哪一個是全球最受歡迎的開源作業系統核心企鵝吉祥物？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "Tux (企鵝)", img: "" },
      { text: "Duke (爪哇公爵)", img: "" },
      { text: "Ferris (螃蟹)", img: "" },
      { text: "Gopher (地鼠)", img: "" }
    ],
    answerIndex: 0 // A
  },
  {
    question: "請辨識下列哪一張圖片代表前端三大框架之一的「Vue.js」？",
    timeLimit: 15,
    options: [
      { text: "標誌 A", img: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" },
      { text: "標誌 B", img: "https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg" },
      { text: "標誌 C", img: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Angular_full_color_logo.svg" },
      { text: "標誌 D", img: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg" }
    ],
    answerIndex: 1 // B
  }
];

// 遊戲狀態
let gameState = {
  status: 'LOBBY', // LOBBY, PRE_COUNTDOWN, QUESTION, REVEAL, FINISHED
  currentQuestionIndex: -1,
  players: {}, // socketId -> { name, score, answered, lastAnswerCorrect }
  questionStartTime: 0
};

function getTop20Leaderboard() {
  return Object.values(gameState.players)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

io.on('connection', (socket) => {
  // 🌟 重要修正：新裝置連線（例如主畫面重整或剛打開），立刻同步現有名單
  socket.emit('player_list_update', Object.values(gameState.players));

  // 玩家加入大廳
  socket.on('join_game', (nickname) => {
    gameState.players[socket.id] = {
      id: socket.id,
      name: nickname || '無名氏',
      score: 0,
      answered: false,
      lastAnswerCorrect: false
    };
    socket.emit('joined_success', { name: nickname });
    
    // 廣播給包含主機在內的所有人更新大廳
    io.emit('player_list_update', Object.values(gameState.players));
    console.log(`[玩家加入] ${nickname} (目前共 ${Object.keys(gameState.players).length} 人)`);
  });

  // 主機發起開始每題前的 54321 倒數
  socket.on('host_trigger_pre_countdown', () => {
    gameState.currentQuestionIndex++;
    if (gameState.currentQuestionIndex >= questions.length) {
      gameState.status = 'FINISHED';
      io.emit('game_finished', getTop20Leaderboard());
      return;
    }

    gameState.status = 'PRE_COUNTDOWN';
    for (let id in gameState.players) {
      gameState.players[id].answered = false;
      gameState.players[id].lastAnswerCorrect = false;
    }

    io.emit('start_pre_countdown');
  });

  // 主機發起開始題目作答
  socket.on('host_start_question', () => {
    gameState.status = 'QUESTION';
    gameState.questionStartTime = Date.now();
    const q = questions[gameState.currentQuestionIndex];

    io.emit('question_start', {
      index: gameState.currentQuestionIndex,
      total: questions.length,
      question: q.question,
      options: q.options,
      timeLimit: q.timeLimit
    });
  });

  // 玩家作答
  socket.on('submit_answer', (selectedIndex) => {
    const player = gameState.players[socket.id];
    if (!player || player.answered || gameState.status !== 'QUESTION') return;

    player.answered = true;
    const q = questions[gameState.currentQuestionIndex];
    const isCorrect = (selectedIndex === q.answerIndex);
    player.lastAnswerCorrect = isCorrect;

    if (isCorrect) {
      const timeSpent = (Date.now() - gameState.questionStartTime) / 1000;
      const timeLeft = Math.max(0, q.timeLimit - timeSpent);
      const points = Math.round(200 + 800 * (timeLeft / q.timeLimit));
      player.score += points;
    }

    socket.emit('answer_received', { isCorrect });
    io.emit('leaderboard_update', getTop20Leaderboard());
  });

  // 主機公布答案
  socket.on('host_reveal_answer', () => {
    gameState.status = 'REVEAL';
    const q = questions[gameState.currentQuestionIndex];
    io.emit('answer_reveal', {
      correctIndex: q.answerIndex,
      leaderboard: getTop20Leaderboard()
    });
  });

  // 斷線處理
  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      console.log(`[玩家離開] ${gameState.players[socket.id].name}`);
      delete gameState.players[socket.id];
      io.emit('player_list_update', Object.values(gameState.players));
      io.emit('leaderboard_update', getTop20Leaderboard());
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});