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
    question: "下列哪位是我們理事長？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "", img: "https://dailyview.tw/_next/image?url=https%3A%2F%2F2024-dailyview.s3.ap-northeast-1.amazonaws.com%2Ftopic_image%2F2026%2F5%2Feec88b66e97ee4582484302e19faf7b217e7bc318b976b37001b1126e87a4015.webp&w=768&q=75" },
      { text: "", img: "https://dailyview.tw/_next/image?url=https%3A%2F%2F2024-dailyview.s3.ap-northeast-1.amazonaws.com%2Ftopic_image%2F2024%2F12%2F7bd010668df7e7e957765dc1865551fc9e34d264ffb287aadfa3eb281639f26a.webp&w=768&q=75" },
      { text: "", img: "https://dailyview.tw/_next/image?url=https%3A%2F%2F2024-dailyview.s3.ap-northeast-1.amazonaws.com%2Ftopic_image%2F2026%2F2%2F71738d6ea27ad2ee6caa1c8b592ea752454ef4ab2349a14c80c1c31d65ac9657.webp&w=768&q=75" },
      { text: "", img: "https://dailyview.tw/_next/image?url=https%3A%2F%2F2024-dailyview.s3.ap-northeast-1.amazonaws.com%2Ftopic_image%2F2026%2F2%2Fb3a047fd304817c2f59a8697f9c75de96a70301a7f95312d0ff07d951c09408c.webp&w=768&q=75" }
    ],
    answerIndex: 0 // A
  },
  {
    question: "下列哪一項最符合「桃園市就業服務商業同業公會」的主要服務對象？",
    timeLimit: 15,
    options: [
      { text: "餐飲業者", img: "" },
      { text: "私立就業服務機構", img: "" },
      { text: "補習班業者", img: "" },
      { text: "旅行業者", img: "" }
    ],
    answerIndex: 1 // B
  },
  {
    question: "私立就業服務機構評鑑成績分為哪三級？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "優、甲、乙", img: "" },
      { text: "A、B、C", img: "" },
      { text: "金、銀、銅", img: "" },
      { text: "一、二、三", img: "" }
    ],
    answerIndex: 1 // B
  },
  {
    question: "菲律賓主要使用的貨幣是？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "Peso（披索）", img: "" },
      { text: "Baht（泰銖）", img: "" },
      { text: "Dong（盾）", img: "" },
      { text: "Rupiah（盾／盧比）", img: "" }
    ],
    answerIndex: 0 // A
  },
  {
    question: "目前臺灣常見的移工來源國，下列哪一個「不是」？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "印尼", img: "" },
      { text: "越南", img: "" },
      { text: "菲律賓", img: "" },
      { text: "日本", img: "" }
    ],
    answerIndex: 3 // D
  },
  {
    question: "「Selamat pagi」是哪一國移工常使用的早安？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "印尼", img: "" },
      { text: "越南", img: "" },
      { text: "泰國", img: "" },
      { text: "菲律賓", img: "" }
    ],
    answerIndex: 0 // A
  },
  {
    question: "仲介從業人員最怕收到哪一句LINE？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "「有空嗎？」", img: "" },
      { text: "「老闆想問一下……」", img: "" },
      { text: "「移工不見了。」", img: "" },
      { text: "「我朋友也想申請。」", img: "" }
    ],
    answerIndex: 2 // C
  },
  {
    question: "「外國人諮詢保護專線？」",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "1995", img: "" },
      { text: "110", img: "" },
      { text: "1953", img: "" },
      { text: "1955", img: "" }
    ],
    answerIndex: 3 // D
  },
  {
    question: "泰國潑水節通常又稱為？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "宋干節", img: "" },
      { text: "開齋節", img: "" },
      { text: "水燈節", img: "" },
      { text: "春節", img: "" }
    ],
    answerIndex: 0 // A
  },
  {
    question: "越南的首都是哪裡？",
    timeLimit: 15, // 作答時間(秒)
    options: [
      { text: "胡志明市", img: "" },
      { text: "河內", img: "" },
      { text: "峴港", img: "" },
      { text: "芽莊", img: "" }
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