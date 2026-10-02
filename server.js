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
  socket.on('join_game', (rawNickname) => {
    let baseName = (rawNickname || '無名氏').trim().slice(0, 10);
    if (!baseName) baseName = '無名氏';

    // 檢查現有名單是否有重複
    const existingNames = Object.values(gameState.players).map(p => p.name);
    let finalName = baseName;
    let count = 1;
    while (existingNames.includes(finalName)) {
      finalName = `${baseName} (${count})`;
      count++;
    }

    gameState.players[socket.id] = {
      id: socket.id,
      name: finalName,
      score: 0,
      answered: false,
      lastAnswerCorrect: false
    };

    // 回傳分配好的最終暱稱給手機端（例如手機會收到「你好，小明 (1)！」）
    socket.emit('joined_success', { name: finalName });
    io.emit('player_list_update', Object.values(gameState.players));
    console.log(`[玩家加入] ${finalName} (目前在線 ${Object.keys(gameState.players).length} 人)`);
  });

  // 主機發起開始每題前的 54321 倒數
  socket.on('host_start_game', () => {
    console.log('🚀 開始全新一局遊戲！清空舊紀錄，分數全數歸零...');
    gameState.status = 'PRE_COUNTDOWN';
    gameState.currentQuestionIndex = 0; // 重回第一題

    // 將所有在線玩家分數歸零、作答紀錄清空
    for (let id in gameState.players) {
      gameState.players[id].score = 0;
      gameState.players[id].answered = false;
      gameState.players[id].lastAnswerCorrect = false;
    }

    // 即時把歸零後的排行榜與倒數推播出去
    io.emit('leaderboard_update', getTop20Leaderboard());
    io.emit('start_pre_countdown');
  });


  function finishGame() {
    gameState.status = 'FINISHED';
    const allSorted = Object.values(gameState.players).sort((a, b) => b.score - a.score);

    // 1. 給大螢幕前 20 名（產生頒獎台與右側排行榜）
    io.emit('game_finished', allSorted.slice(0, 20));

    // 2. 🌟 個別通知每支手機專屬的名次與得分憑證
    allSorted.forEach((p, index) => {
      io.to(p.id).emit('player_final_result', {
        rank: index + 1,
        score: p.score,
        name: p.name,
        total: allSorted.length
      });
    });
    console.log('🏁 遊戲結束，已將個人名次憑證發送至所有玩家手機！');
  }



  // 🌟 2. 遊戲進行中點「下一題」：正常累計分數、題號 +1
  socket.on('host_next_question', () => {
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex >= questions.length) {
      finishGame();
      return;
    }

    gameState.status = 'PRE_COUNTDOWN';
    for (let id in gameState.players) {
      gameState.players[id].answered = false;
      gameState.players[id].lastAnswerCorrect = false;
    }

    console.log(`▶️ 進入第 ${gameState.currentQuestionIndex + 1} 題`);
    io.emit('start_pre_countdown');
  });

  // 🌟 3. 回到大廳（供頒獎台結束時點擊）
  socket.on('host_reset_to_lobby', () => {
    gameState.status = 'LOBBY';
    gameState.currentQuestionIndex = -1;
    io.emit('back_to_lobby', Object.values(gameState.players));
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


  socket.on('register_as_host', () => {
    socket.join('host_room');
    console.log('🖥️ 主控大螢幕已加入 host_room');
  });

  // 🌟 最佳化後的作答邏輯（避免 40,000 次廣播風暴）
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
      // 分數計算：答對保底 200 分，越快越高，最高 1000 分
      const points = Math.round(200 + 800 * (timeLeft / q.timeLimit));
      player.score += points;
      console.log(`✅ [${player.name}] 答對！獲得 ${points} 分，目前總分：${player.score}`);
    } else {
      console.log(`❌ [${player.name}] 答錯！目前總分：${player.score}`);
    }

    // 1. 回傳結果給作答的該名玩家
    socket.emit('answer_received', { isCorrect });

    // 2. 🌟 關鍵修正：直接推送給 host_room 房間的大螢幕！
    io.to('host_room').emit('leaderboard_update', getTop20Leaderboard());
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