/**
 * 五子棋游戏 - 游戏逻辑
 *
 * AI算法说明：
 * - 简单: 评分算法 + 随机选择 O(n²)
 * - 中等: 启发式评估函数 O(n²)
 * - 困难: Minimax + Alpha-Beta剪枝 O(b^d)
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    BOARD_SIZE: 15,
    CELL_SIZE: 38,
    PADDING: 30,
    PIECE_RADIUS: 16
};

// 根据屏幕宽度调整棋盘大小
function adjustBoardSize() {
    const maxWidth = Math.min(window.innerWidth - 40, 600); // 留出边距
    const idealBoardWidth = (CONFIG.BOARD_SIZE - 1) * 38 + 60; // 原始尺寸

    if (maxWidth < idealBoardWidth) {
        const scale = maxWidth / idealBoardWidth;
        CONFIG.CELL_SIZE = Math.floor(38 * scale);
        CONFIG.PADDING = Math.floor(30 * scale);
        CONFIG.PIECE_RADIUS = Math.floor(16 * scale);
    } else {
        CONFIG.CELL_SIZE = 38;
        CONFIG.PADDING = 30;
        CONFIG.PIECE_RADIUS = 16;
    }
}

// 高清适配
const dpr = window.devicePixelRatio || 1;

// ==================== DOM 元素 ====================
const elements = {
    canvas: document.getElementById('board'),
    startScreen: document.getElementById('startScreen'),
    gameWrapper: document.getElementById('gameWrapper'),
    difficultyMenu: document.getElementById('difficultyMenu'),
    colorMenu: document.getElementById('colorMenu'),
    mainMenu: document.getElementById('mainMenu'),
    undoBtn: document.getElementById('undoBtn'),
    restartBtn: document.getElementById('restartBtn'),
    blackLabel: document.getElementById('blackLabel'),
    whiteLabel: document.getElementById('whiteLabel'),
    turnText: document.getElementById('turnText'),
    gameResult: document.getElementById('gameResult'),
    resultTitle: document.getElementById('resultTitle'),
    resultDesc: document.getElementById('resultDesc'),
    moveHistory: document.getElementById('moveHistory'),
    totalMoves: document.getElementById('totalMoves'),
    modeLabel: document.getElementById('modeLabel'),
    gameModeStat: document.getElementById('gameModeStat'),
    thinking: document.getElementById('thinking'),
    // 算法说明书
    docsOverlay: document.getElementById('docsOverlay'),
    // AI压迫感面板
    aiPressurePanel: document.getElementById('aiPressurePanel'),
    pressureTitle: document.getElementById('pressureTitle'),
    pressureFormula: document.getElementById('pressureFormula'),
    searchDepth: document.getElementById('searchDepth'),
    candidateCount: document.getElementById('candidateCount'),
    nodeCount: document.getElementById('nodeCount'),
    pressureTip: document.getElementById('pressureTip')
};

const ctx = elements.canvas.getContext('2d');

// ==================== 游戏状态 ====================
let gameState = {
    board: [],
    history: [],
    currentPlayer: 1,
    gameOver: false,
    winningLine: [],
    gameMode: 'pvp',
    difficulty: 'easy',
    playerColor: 1,
    isAiThinking: false
};

let selectedDifficulty = 'easy';

// ==================== 算法信息 ====================
const ALGORITHM_INFO = {
    easy: {
        name: '评分算法 + 随机选择',
        desc: '计算每个位置的进攻和防守分数，从最高分的前3个位置中随机选择。时间复杂度 O(n²)'
    },
    medium: {
        name: '启发式评估函数',
        desc: '识别棋型（活四、冲四、活三等），为每种棋型赋分，选择得分最高的位置。时间复杂度 O(n²)'
    },
    hard: {
        name: 'Minimax + Alpha-Beta + 威胁检测',
        desc: '博弈树搜索6层深度，Alpha-Beta剪枝优化，主动识别活四、双三、四三等必杀棋型。时间复杂度 O(b^d)'
    },
    hell: {
        name: 'VCF/VCT + 深度Minimax',
        desc: '专业级算法：VCF连续冲四必杀搜索、VCT连续威胁搜索、8层博弈树、开局库。理论上先手必胜。'
    }
};

// ==================== 棋型评分 ====================
const SCORES = {
    FIVE: 10000000,      // 连五
    LIVE_FOUR: 1000000,  // 活四
    RUSH_FOUR: 100000,   // 冲四
    LIVE_THREE: 80000,   // 活三 (大幅提升，识别双三等杀招)
    SLEEP_THREE: 2000,   // 眠三
    LIVE_TWO: 1000,      // 活二
    SLEEP_TWO: 200,      // 眠二
    LIVE_ONE: 50         // 活一
};

const HARD_AI = {
    SEARCH_DEPTH: 6,     // 增加搜索深度到6层
    CANDIDATE_LIMIT: 25, // 增加候选节点
    SEARCH_LIMIT: 15,    // 增加分支数量
    WIN_SCORE: SCORES.FIVE * 10
};

// 地狱难度配置
const HELL_AI = {
    SEARCH_DEPTH: 8,      // 更深的搜索
    CANDIDATE_LIMIT: 30,  // 更多候选
    SEARCH_LIMIT: 20,     // 更多分支
    VCF_DEPTH: 20,        // VCF搜索深度（连续冲四）
    VCT_DEPTH: 12,        // VCT搜索深度（连续威胁）
    WIN_SCORE: SCORES.FIVE * 10
};

// ==================== 菜单控制 ====================
function showDifficultyMenu() {
    if (elements.mainMenu) elements.mainMenu.style.display = 'none';
    if (elements.difficultyMenu) elements.difficultyMenu.classList.add('show');
    if (elements.colorMenu) elements.colorMenu.classList.remove('show');
}

function selectDifficulty(diff) {
    selectedDifficulty = diff;
    if (elements.difficultyMenu) elements.difficultyMenu.classList.remove('show');
    if (elements.colorMenu) elements.colorMenu.classList.add('show');
}

function backToMain() {
    if (elements.difficultyMenu) elements.difficultyMenu.classList.remove('show');
    if (elements.colorMenu) elements.colorMenu.classList.remove('show');
    if (elements.mainMenu) elements.mainMenu.style.display = 'block';
}

function backToDifficulty() {
    if (elements.colorMenu) elements.colorMenu.classList.remove('show');
    if (elements.difficultyMenu) elements.difficultyMenu.classList.add('show');
}

// ==================== 算法说明书 ====================
function showAlgorithmDocs() {
    if (elements.docsOverlay) {
        elements.docsOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideAlgorithmDocs() {
    if (elements.docsOverlay) {
        elements.docsOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 点击弹窗外部关闭
if (elements.docsOverlay) {
    elements.docsOverlay.addEventListener('click', (e) => {
        if (e.target === elements.docsOverlay) {
            hideAlgorithmDocs();
        }
    });
}

// ESC键关闭
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.docsOverlay && elements.docsOverlay.classList.contains('show')) {
        hideAlgorithmDocs();
    }
});

// ==================== AI压迫感面板 ====================
const PRESSURE_FORMULAS = {
    easy: `Score(p) = Attack(p) + 1.0×Defense(p)
选择: random(top 3) / best`,
    medium: `Score(p) = 1.1×Attack(p) + Defense(p)
Attack = Σ PatternScore(d)
选择: argmax(Score)`,
    hard: `minimax(s, d, α, β) =
  eval(s), if d=0
  max/min(minimax(s', d-1, α, β))
剪枝: α ≥ β
威胁检测: 活四、双三、四三`,
    hell: `VCF: 连续冲四搜索(depth=20)
VCT: 连续威胁搜索(depth=12)
Minimax(depth=8) + α-β剪枝
开局库 + 必胜路径计算`
};

const PRESSURE_TIPS = {
    easy: '从最高分的3个位置中随机选择，模拟人类"手滑"',
    medium: '识别棋型并评分，始终选择得分最高的位置',
    hard: '深度搜索6层，主动识别并利用组合杀招',
    hell: '专业级AI，搜索必胜路径，理论上无法战胜'
};

let aiStats = {
    nodeCount: 0,
    candidateCount: 0,
    searchDepth: 0
};

function showPressurePanel() {
    if (gameState.gameMode !== 'pve') return;
    if (!elements.aiPressurePanel) return;

    const diff = gameState.difficulty;
    if (elements.pressureFormula) elements.pressureFormula.textContent = PRESSURE_FORMULAS[diff];
    if (elements.pressureTip) elements.pressureTip.textContent = PRESSURE_TIPS[diff];

    // 根据难度设置搜索深度
    if (elements.searchDepth) elements.searchDepth.textContent = diff === 'hard' ? String(HARD_AI.SEARCH_DEPTH) : '1';
    if (elements.candidateCount) elements.candidateCount.textContent = diff === 'hard' ? String(HARD_AI.CANDIDATE_LIMIT) : 'n²';
    if (elements.nodeCount) elements.nodeCount.textContent = '-';

    elements.aiPressurePanel.classList.add('show');
}

function updatePressureStats(stats) {
    if (stats.nodeCount !== undefined && elements.nodeCount) {
        elements.nodeCount.textContent = stats.nodeCount.toLocaleString();
    }
    if (stats.candidateCount !== undefined && elements.candidateCount) {
        elements.candidateCount.textContent = stats.candidateCount;
    }
}

function hidePressurePanel() {
    if (elements.aiPressurePanel) {
        elements.aiPressurePanel.classList.remove('show');
    }
}

function startGame(mode, diff = 'easy', color = 'black') {
    gameState.gameMode = mode;
    gameState.difficulty = diff;
    gameState.playerColor = color === 'black' ? 1 : 2;

    const diffNames = { easy: '简单', medium: '中等', hard: '困难', hell: '地狱' };

    if (mode === 'pvp') {
        if (elements.modeLabel) elements.modeLabel.textContent = '双人对战';
        if (elements.gameModeStat) elements.gameModeStat.textContent = '双人对战';
        hidePressurePanel();
    } else {
        const colorName = gameState.playerColor === 1 ? '执黑' : '执白';
        if (elements.modeLabel) elements.modeLabel.textContent = `人机对战 - ${diffNames[diff]} - ${colorName}`;
        if (elements.gameModeStat) elements.gameModeStat.textContent = `AI ${diffNames[diff]}`;
        showPressurePanel();
    }

    updatePlayerLabels();

    if (elements.startScreen) elements.startScreen.style.display = 'none';
    if (elements.gameWrapper) elements.gameWrapper.classList.add('show');
    backToMain();
    init();
}

function updatePlayerLabels() {
    if (!elements.blackLabel || !elements.whiteLabel) return;

    const blackYouTag = elements.blackLabel.querySelector('.you-tag');
    const whiteYouTag = elements.whiteLabel.querySelector('.you-tag');

    if (blackYouTag) blackYouTag.remove();
    if (whiteYouTag) whiteYouTag.remove();

    if (gameState.gameMode === 'pve') {
        const youTag = document.createElement('span');
        youTag.className = 'you-tag';
        youTag.textContent = '你';

        if (gameState.playerColor === 1) {
            elements.blackLabel.appendChild(youTag);
        } else {
            elements.whiteLabel.appendChild(youTag);
        }
    }
}

function exitGame() {
    if (elements.gameWrapper) elements.gameWrapper.classList.remove('show');
    if (elements.startScreen) elements.startScreen.style.display = 'block';
    backToMain();
}

function restartGame() {
    init();
}

// ==================== 初始化 ====================
function init() {
    // 调整棋盘大小以适应屏幕
    adjustBoardSize();

    // 高清Canvas设置
    const cssWidth = (CONFIG.BOARD_SIZE - 1) * CONFIG.CELL_SIZE + CONFIG.PADDING * 2;

    if (elements.canvas) {
        elements.canvas.style.width = cssWidth + 'px';
        elements.canvas.style.height = cssWidth + 'px';
        elements.canvas.width = cssWidth * dpr;
        elements.canvas.height = cssWidth * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    // 重置游戏状态
    gameState.board = Array(CONFIG.BOARD_SIZE).fill(null).map(() => Array(CONFIG.BOARD_SIZE).fill(0));
    gameState.history = [];
    gameState.currentPlayer = 1;
    gameState.gameOver = false;
    gameState.winningLine = [];
    gameState.isAiThinking = false;

    updateStatus();
    if (elements.undoBtn) elements.undoBtn.disabled = true;
    if (elements.gameResult) elements.gameResult.classList.remove('show', 'black-wins', 'white-wins', 'draw');
    if (elements.thinking) elements.thinking.classList.remove('show');
    if (elements.canvas) elements.canvas.classList.remove('disabled');
    if (elements.moveHistory) elements.moveHistory.innerHTML = '';
    if (elements.totalMoves) elements.totalMoves.textContent = '0';

    drawBoard();

    // 如果玩家执白，AI先下
    if (gameState.gameMode === 'pve' && gameState.playerColor === 2) {
        setTimeout(() => aiMove(), 500);
    }
}

// ==================== 绘制棋盘 ====================
function drawBoard() {
    const { BOARD_SIZE, CELL_SIZE, PADDING } = CONFIG;
    const boardWidth = (BOARD_SIZE - 1) * CELL_SIZE + PADDING * 2;

    ctx.save();

    // 底色
    ctx.fillStyle = '#e8c170';
    ctx.fillRect(0, 0, boardWidth, boardWidth);

    // 木纹纹理
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < boardWidth; i += 4) {
        ctx.beginPath();
        ctx.strokeStyle = `hsl(35, 60%, ${45 + Math.random() * 15}%)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.moveTo(0, i + Math.random() * 3);

        for (let x = 0; x < boardWidth; x += 20) {
            ctx.lineTo(x + 20, i + Math.random() * 3 - 1.5);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 棋盘边框
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(PADDING - 10, PADDING - 10,
        (BOARD_SIZE - 1) * CELL_SIZE + 20,
        (BOARD_SIZE - 1) * CELL_SIZE + 20);

    // 网格线
    ctx.strokeStyle = '#5d4e37';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
        ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, PADDING + i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
        ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
        ctx.stroke();
    }

    // 星位点
    const starPoints = [[3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11]];
    ctx.fillStyle = '#5d4e37';
    starPoints.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(PADDING + x * CELL_SIZE, PADDING + y * CELL_SIZE, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制棋子
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) {
                const isWinning = gameState.winningLine.some(([wx, wy]) => wx === i && wy === j);
                const isLast = gameState.history.length > 0 &&
                    gameState.history[gameState.history.length - 1].x === i &&
                    gameState.history[gameState.history.length - 1].y === j;
                drawPiece(i, j, gameState.board[i][j], isWinning, isLast && !gameState.gameOver);
            }
        }
    }

    // 绘制获胜连线
    if (gameState.winningLine.length >= 5) {
        drawWinningLine();
    }

    ctx.restore();
}

function drawPiece(x, y, player, isWinning = false, isLast = false) {
    const { CELL_SIZE, PADDING, PIECE_RADIUS } = CONFIG;
    const centerX = PADDING + x * CELL_SIZE;
    const centerY = PADDING + y * CELL_SIZE;
    const r = PIECE_RADIUS;

    ctx.save();

    // 阴影
    ctx.beginPath();
    ctx.arc(centerX + 3, centerY + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.filter = 'blur(3px)';
    ctx.fill();
    ctx.filter = 'none';

    if (player === 1) {
        // 黑棋
        const gradient = ctx.createRadialGradient(
            centerX - r * 0.3, centerY - r * 0.3, 0,
            centerX, centerY, r
        );
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(0.4, '#2a2a2a');
        gradient.addColorStop(0.8, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 高光
        const highlight = ctx.createRadialGradient(
            centerX - r * 0.4, centerY - r * 0.4, 0,
            centerX - r * 0.2, centerY - r * 0.2, r * 0.6
        );
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

    } else {
        // 白棋
        const gradient = ctx.createRadialGradient(
            centerX - r * 0.3, centerY - r * 0.3, 0,
            centerX, centerY, r
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#f5f5f5');
        gradient.addColorStop(0.8, '#e8e8e8');
        gradient.addColorStop(1, '#d8d8d8');

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 高光
        const highlight = ctx.createRadialGradient(
            centerX - r * 0.4, centerY - r * 0.4, 0,
            centerX - r * 0.2, centerY - r * 0.2, r * 0.5
        );
        highlight.addColorStop(0, 'rgba(255, 255, 255, 1)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // 最后一步标记
    if (isLast) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = player === 1 ? '#ff6b6b' : '#e63946';
        ctx.fill();
    }

    // 获胜高亮
    if (isWinning) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

function drawWinningLine() {
    if (gameState.winningLine.length < 2) return;

    const { CELL_SIZE, PADDING } = CONFIG;
    const first = gameState.winningLine[0];
    const last = gameState.winningLine[gameState.winningLine.length - 1];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(PADDING + first[0] * CELL_SIZE, PADDING + first[1] * CELL_SIZE);
    ctx.lineTo(PADDING + last[0] * CELL_SIZE, PADDING + last[1] * CELL_SIZE);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
}

// ==================== 状态更新 ====================
function updateStatus() {
    const isPlayerTurn = gameState.gameMode === 'pvp' || gameState.currentPlayer === gameState.playerColor;

    if (gameState.currentPlayer === 1) {
        if (elements.blackLabel) elements.blackLabel.classList.add('active');
        if (elements.whiteLabel) elements.whiteLabel.classList.remove('active');
        if (elements.turnText) {
            if (gameState.gameMode === 'pve') {
                elements.turnText.textContent = gameState.playerColor === 1 ? '你的回合' : 'AI回合';
            } else {
                elements.turnText.textContent = '黑棋回合';
            }
        }
    } else {
        if (elements.blackLabel) elements.blackLabel.classList.remove('active');
        if (elements.whiteLabel) elements.whiteLabel.classList.add('active');
        if (elements.turnText) {
            if (gameState.gameMode === 'pve') {
                elements.turnText.textContent = gameState.playerColor === 2 ? '你的回合' : 'AI回合';
            } else {
                elements.turnText.textContent = '白棋回合';
            }
        }
    }

    if (elements.canvas) {
        if (gameState.gameMode === 'pve' && !isPlayerTurn) {
            elements.canvas.classList.add('disabled');
        } else {
            elements.canvas.classList.remove('disabled');
        }
    }
}

function updateMoveHistory() {
    if (!elements.moveHistory) return;

    elements.moveHistory.innerHTML = '';
    gameState.history.forEach((move, index) => {
        const div = document.createElement('div');
        div.className = 'move-item';
        const colLetter = String.fromCharCode(65 + move.x);
        const rowNum = CONFIG.BOARD_SIZE - move.y;
        let tag = '';
        if (gameState.gameMode === 'pve') {
            tag = move.player === gameState.playerColor ? '' : ' (AI)';
        }
        div.innerHTML = `
            <span class="num">${index + 1}.</span>
            <span class="piece-icon ${move.player === 1 ? 'black' : 'white'}"></span>
            <span class="pos">${colLetter}${rowNum}${tag}</span>
        `;
        elements.moveHistory.appendChild(div);
    });
    elements.moveHistory.scrollTop = elements.moveHistory.scrollHeight;
    if (elements.totalMoves) elements.totalMoves.textContent = gameState.history.length;
}

// ==================== 胜负判断 ====================
function checkWin(x, y, player) {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
        let line = [[x, y]];

        for (let i = 1; i < 5; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx >= 0 && nx < CONFIG.BOARD_SIZE && ny >= 0 && ny < CONFIG.BOARD_SIZE && gameState.board[nx][ny] === player) {
                line.push([nx, ny]);
            } else break;
        }

        for (let i = 1; i < 5; i++) {
            const nx = x - dx * i, ny = y - dy * i;
            if (nx >= 0 && nx < CONFIG.BOARD_SIZE && ny >= 0 && ny < CONFIG.BOARD_SIZE && gameState.board[nx][ny] === player) {
                line.unshift([nx, ny]);
            } else break;
        }

        if (line.length >= 5) {
            gameState.winningLine = line;
            return true;
        }
    }
    return false;
}

// ==================== 下棋逻辑 ====================
function getPosition(e) {
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.round((x - CONFIG.PADDING) / CONFIG.CELL_SIZE);
    const row = Math.round((y - CONFIG.PADDING) / CONFIG.CELL_SIZE);

    if (col >= 0 && col < CONFIG.BOARD_SIZE && row >= 0 && row < CONFIG.BOARD_SIZE) {
        return { x: col, y: row };
    }
    return null;
}

function canPlayerMove() {
    if (gameState.gameOver) return false;
    if (gameState.isAiThinking) return false;
    if (gameState.gameMode === 'pve' && gameState.currentPlayer !== gameState.playerColor) return false;
    return true;
}

function placePiece(x, y, isAI = false) {
    if (gameState.gameOver || gameState.board[x][y] !== 0) return false;
    if (!isAI && !canPlayerMove()) return false;

    gameState.board[x][y] = gameState.currentPlayer;
    gameState.history.push({ x, y, player: gameState.currentPlayer });

    updateMoveHistory();
    drawBoard();

    if (checkWin(x, y, gameState.currentPlayer)) {
        gameState.gameOver = true;
        showResult(gameState.currentPlayer);
        drawBoard();
        if (elements.undoBtn) elements.undoBtn.disabled = true;
        return true;
    }

    if (gameState.history.length === CONFIG.BOARD_SIZE * CONFIG.BOARD_SIZE) {
        gameState.gameOver = true;
        showResult(0);
        if (elements.undoBtn) elements.undoBtn.disabled = true;
        return true;
    }

    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateStatus();
    if (elements.undoBtn) elements.undoBtn.disabled = gameState.history.length === 0 || gameState.isAiThinking;

    // AI回合
    if (gameState.gameMode === 'pve' && gameState.currentPlayer !== gameState.playerColor && !gameState.gameOver) {
        aiMove();
    }

    return true;
}

function aiMove() {
    gameState.isAiThinking = true;
    if (elements.thinking) elements.thinking.classList.add('show');
    if (elements.canvas) elements.canvas.classList.add('disabled');
    if (elements.undoBtn) elements.undoBtn.disabled = true;

    // 压迫感面板显示思考状态
    if (elements.aiPressurePanel) elements.aiPressurePanel.classList.add('thinking');
    if (elements.pressureTitle) elements.pressureTitle.textContent = 'AI 计算中...';
    if (elements.nodeCount) elements.nodeCount.textContent = '计算中';

    const delays = { easy: 350, medium: 350, hard: 800, hell: 1200 };
    const delay = delays[gameState.difficulty] || 350;

    // 重置统计
    aiStats.nodeCount = 0;

    setTimeout(() => {
        const move = getAIMove();
        if (move) {
            placePiece(move.x, move.y, true);
        }

        // 更新压迫感面板
        if (elements.aiPressurePanel) elements.aiPressurePanel.classList.remove('thinking');
        if (elements.pressureTitle) elements.pressureTitle.textContent = 'AI 已落子';
        updatePressureStats({ nodeCount: aiStats.nodeCount });

        gameState.isAiThinking = false;
        if (elements.thinking) elements.thinking.classList.remove('show');
        if (!gameState.gameOver) {
            if (elements.canvas) elements.canvas.classList.remove('disabled');
            if (elements.undoBtn) elements.undoBtn.disabled = gameState.history.length === 0;
        }
    }, delay);
}

function showResult(winner) {
    if (!elements.gameResult) return;

    elements.gameResult.classList.remove('black-wins', 'white-wins', 'draw');

    if (winner === 1) {
        if (elements.resultTitle) elements.resultTitle.textContent = '黑棋获胜！';
        if (elements.resultDesc) {
            if (gameState.gameMode === 'pve') {
                elements.resultDesc.textContent = gameState.playerColor === 1 ? '恭喜你战胜了AI！' : 'AI获胜，再接再厉！';
            } else {
                elements.resultDesc.textContent = '黑方玩家获得胜利';
            }
        }
        elements.gameResult.classList.add('black-wins');
    } else if (winner === 2) {
        if (elements.resultTitle) elements.resultTitle.textContent = '白棋获胜！';
        if (elements.resultDesc) {
            if (gameState.gameMode === 'pve') {
                elements.resultDesc.textContent = gameState.playerColor === 2 ? '恭喜你战胜了AI！' : 'AI获胜，再接再厉！';
            } else {
                elements.resultDesc.textContent = '白方玩家获得胜利';
            }
        }
        elements.gameResult.classList.add('white-wins');
    } else {
        if (elements.resultTitle) elements.resultTitle.textContent = '平局！';
        if (elements.resultDesc) elements.resultDesc.textContent = '棋逢对手，势均力敌';
        elements.gameResult.classList.add('draw');
    }

    elements.gameResult.classList.add('show');
}

function undo() {
    if (gameState.history.length === 0 || gameState.gameOver || gameState.isAiThinking) return;

    const stepsToUndo = (gameState.gameMode === 'pve' && gameState.history.length >= 2) ? 2 : 1;

    for (let i = 0; i < stepsToUndo && gameState.history.length > 0; i++) {
        const last = gameState.history.pop();
        gameState.board[last.x][last.y] = 0;
        gameState.currentPlayer = last.player;
    }

    gameState.winningLine = [];
    if (elements.undoBtn) elements.undoBtn.disabled = gameState.history.length === 0;
    updateStatus();
    updateMoveHistory();
    drawBoard();
}

// ==================== AI 算法 ====================

/**
 * 获取AI执子颜色
 */
function getAIPlayer() {
    return gameState.playerColor === 1 ? 2 : 1;
}

/**
 * 评估单个位置的分数（增强版，识别组合棋型）
 */
function evaluatePoint(x, y, player) {
    if (gameState.board[x][y] !== 0) return 0;
    let score = 0;
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

    let liveThreeCount = 0;
    let rushFourCount = 0;
    let liveFourCount = 0;

    for (const [dx, dy] of directions) {
        const lineScore = evaluateLine(x, y, dx, dy, player);
        score += lineScore;

        // 统计关键棋型数量
        if (lineScore >= SCORES.LIVE_FOUR) liveFourCount++;
        else if (lineScore >= SCORES.RUSH_FOUR) rushFourCount++;
        else if (lineScore >= SCORES.LIVE_THREE) liveThreeCount++;
    }

    // 组合棋型加成（这些是必杀棋型）
    if (liveFourCount >= 1) {
        score += SCORES.LIVE_FOUR; // 活四必杀
    }
    if (rushFourCount >= 2) {
        score += SCORES.LIVE_FOUR * 0.9; // 双冲四接近必杀
    }
    if (rushFourCount >= 1 && liveThreeCount >= 1) {
        score += SCORES.LIVE_FOUR * 0.8; // 四三连攻是必杀
    }
    if (liveThreeCount >= 2) {
        score += SCORES.RUSH_FOUR * 0.9; // 双活三很危险
    }

    return score;
}

/**
 * 评估一条线上的棋型
 */
function evaluateLine(x, y, dx, dy, player) {
    let count = 1, block = 0;

    for (let i = 1; i <= 4; i++) {
        const nx = x + dx * i, ny = y + dy * i;
        if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) { block++; break; }
        if (gameState.board[nx][ny] === player) count++;
        else if (gameState.board[nx][ny] === 0) break;
        else { block++; break; }
    }

    for (let i = 1; i <= 4; i++) {
        const nx = x - dx * i, ny = y - dy * i;
        if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) { block++; break; }
        if (gameState.board[nx][ny] === player) count++;
        else if (gameState.board[nx][ny] === 0) break;
        else { block++; break; }
    }

    if (count >= 5) return SCORES.FIVE;
    if (block === 2) return 0;
    if (count === 4) return block === 0 ? SCORES.LIVE_FOUR : SCORES.RUSH_FOUR;
    if (count === 3) return block === 0 ? SCORES.LIVE_THREE : SCORES.SLEEP_THREE;
    if (count === 2) return block === 0 ? SCORES.LIVE_TWO : SCORES.SLEEP_TWO;
    if (count === 1) return block === 0 ? SCORES.LIVE_ONE : 0;
    return 0;
}

function hasImmediateWin(player) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;
            gameState.board[i][j] = player;
            const isWin = checkWin(i, j, player);
            gameState.board[i][j] = 0;
            gameState.winningLine = [];
            if (isWin) return true;
        }
    }
    return false;
}

function findImmediateWin(player) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;
            gameState.board[i][j] = player;
            const isWin = checkWin(i, j, player);
            gameState.board[i][j] = 0;
            gameState.winningLine = [];
            if (isWin) return { x: i, y: j };
        }
    }
    return null;
}

/**
 * 获取AI落子位置
 */
function getAIMove() {
    const aiPlayer = getAIPlayer();
    switch (gameState.difficulty) {
        case 'easy': return getEasyMove(aiPlayer);
        case 'medium': return getMediumMove(aiPlayer);
        case 'hard': return getHardMove(aiPlayer);
        case 'hell': return getHellMove(aiPlayer);
        default: return getEasyMove(aiPlayer);
    }
}

/**
 * 简单AI：评分算法 + 随机选择
 * 从得分最高的前3个位置中随机选择
 */
function getEasyMove(aiPlayer) {
    let candidates = [];
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                aiStats.nodeCount++;
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, gameState.playerColor);
                // 提高防守权重，避免过于弱智
                candidates.push({ x: i, y: j, score: attack + defense * 1.0 });
            }
        }
    }
    if (candidates.length === 0) return { x: 7, y: 7 };
    candidates.sort((a, b) => b.score - a.score);
    
    // 如果有必杀或必防的棋（分数极高），则减少随机性
    if (candidates[0].score > SCORES.RUSH_FOUR) {
        return candidates[0];
    }

    const topN = Math.min(3, candidates.length);
    return candidates[Math.floor(Math.random() * topN)];
}

/**
 * 中等AI：启发式评估函数
 * 始终选择得分最高的位置
 */
function getMediumMove(aiPlayer) {
    let bestMove = null, bestScore = -Infinity;
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                aiStats.nodeCount++;
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, gameState.playerColor);
                const score = attack * 1.1 + defense;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { x: i, y: j };
                }
            }
        }
    }
    return bestMove || { x: 7, y: 7 };
}

/**
 * 困难AI：Minimax + Alpha-Beta剪枝（增强版）
 * 搜索6层深度，增强威胁检测
 */
function getHardMove(aiPlayer) {
    const opponent = gameState.playerColor;

    // 1. 必杀：自己能连五直接下
    const immediateWin = findImmediateWin(aiPlayer);
    if (immediateWin) return immediateWin;

    // 2. 必防：对手能连五必须堵
    const immediateBlock = findImmediateWin(opponent);
    if (immediateBlock) return immediateBlock;

    // 3. 检测对手的活四威胁
    const opponentLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (opponentLiveFour) return opponentLiveFour;

    // 4. 自己能形成活四就下
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;

    // 5. 检测对手的双三等组合威胁
    const opponentDoubleThree = findComboThreat(opponent);
    if (opponentDoubleThree) return opponentDoubleThree;

    // 6. 自己能形成双三就下
    const myDoubleThree = findComboThreat(aiPlayer);
    if (myDoubleThree) return myDoubleThree;

    // 7. Minimax搜索
    let bestMove = null, bestScore = -Infinity;
    const candidates = getCandidates(aiPlayer, HARD_AI.CANDIDATE_LIMIT);

    for (const { x, y } of candidates) {
        gameState.board[x][y] = aiPlayer;
        const score = minimax(HARD_AI.SEARCH_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
        gameState.board[x][y] = 0;
        if (score > bestScore) {
            bestScore = score;
            bestMove = { x, y };
        }
    }
    return bestMove || { x: 7, y: 7 };
}

/**
 * 查找特定分数的威胁点
 */
function findThreat(player, minScore) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;
            const score = evaluatePoint(i, j, player);
            if (score >= minScore) {
                return { x: i, y: j };
            }
        }
    }
    return null;
}

/**
 * 查找组合威胁（双活三、四三等）
 */
function findComboThreat(player) {
    let bestMove = null;
    let bestScore = 0;

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let liveThreeCount = 0;
            let rushFourCount = 0;

            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.RUSH_FOUR) rushFourCount++;
                else if (lineScore >= SCORES.LIVE_THREE) liveThreeCount++;
            }

            // 双活三或四三连攻
            if (liveThreeCount >= 2 || (rushFourCount >= 1 && liveThreeCount >= 1)) {
                const score = liveThreeCount * 2 + rushFourCount * 3;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { x: i, y: j };
                }
            }
        }
    }
    return bestMove;
}

// ==================== 地狱难度 AI ====================

/**
 * 开局库 - 经典五子棋开局定式
 * 先手走天元，后续按定式走
 */
const OPENING_BOOK = {
    // 先手开局：天元
    first: { x: 7, y: 7 },
    // 应对对手天元的开局
    responses: [
        // 如果对手下天元，走斜向
        { condition: [[7, 7]], move: { x: 8, y: 8 } },
        // 如果对手下天元旁边，走天元
        { condition: [[6, 7]], move: { x: 7, y: 7 } },
        { condition: [[8, 7]], move: { x: 7, y: 7 } },
        { condition: [[7, 6]], move: { x: 7, y: 7 } },
        { condition: [[7, 8]], move: { x: 7, y: 7 } },
    ]
};

/**
 * 地狱AI：VCF/VCT + 深度Minimax
 * 接近无敌的AI
 */
function getHellMove(aiPlayer) {
    const opponent = gameState.playerColor;
    const moveCount = gameState.history.length;

    // 开局库
    if (moveCount === 0) {
        return OPENING_BOOK.first;
    }
    if (moveCount === 1) {
        const firstMove = gameState.history[0];
        for (const resp of OPENING_BOOK.responses) {
            if (resp.condition.some(([x, y]) => firstMove.x === x && firstMove.y === y)) {
                if (gameState.board[resp.move.x][resp.move.y] === 0) {
                    return resp.move;
                }
            }
        }
        // 默认靠近对手
        return findBestOpeningMove(aiPlayer);
    }

    // 1. 自己能连五 → 直接赢
    const immediateWin = findImmediateWin(aiPlayer);
    if (immediateWin) return immediateWin;

    // 2. 对手能连五 → 必须堵
    const immediateBlock = findImmediateWin(opponent);
    if (immediateBlock) return immediateBlock;

    // 3. VCF搜索：找己方必胜的连续冲四路径
    const vcfMove = searchVCF(aiPlayer, HELL_AI.VCF_DEPTH);
    if (vcfMove) return vcfMove;

    // 4. 检测并阻止对手的VCF
    const opponentVCF = searchVCF(opponent, HELL_AI.VCF_DEPTH);
    if (opponentVCF) {
        // 对手有VCF，必须防守
        const blockMove = findBestBlock(opponent, opponentVCF);
        if (blockMove) return blockMove;
    }

    // 5. VCT搜索：找己方的连续威胁路径
    const vctMove = searchVCT(aiPlayer, HELL_AI.VCT_DEPTH);
    if (vctMove) return vctMove;

    // 6. 检测对手活四
    const opponentLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (opponentLiveFour) return opponentLiveFour;

    // 7. 自己形成活四
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;

    // 8. 检测对手组合威胁
    const opponentCombo = findComboThreat(opponent);
    if (opponentCombo) return opponentCombo;

    // 9. 自己形成组合威胁
    const myCombo = findComboThreat(aiPlayer);
    if (myCombo) return myCombo;

    // 10. 深度Minimax搜索
    return hellMinimax(aiPlayer);
}

/**
 * 找到最佳开局位置
 */
function findBestOpeningMove(aiPlayer) {
    const center = 7;
    const candidates = [];

    // 优先考虑中心区域
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            const x = center + dx;
            const y = center + dy;
            if (gameState.board[x][y] === 0 && hasNeighbor(x, y, 1)) {
                const attack = evaluatePoint(x, y, aiPlayer);
                const defense = evaluatePoint(x, y, gameState.playerColor);
                candidates.push({ x, y, score: attack + defense });
            }
        }
    }

    if (candidates.length === 0) return { x: 7, y: 7 };
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}

/**
 * VCF搜索 - Victory by Continuous Four
 * 搜索连续冲四直到获胜的路径
 */
function searchVCF(player, maxDepth) {
    const opponent = player === 1 ? 2 : 1;

    function vcfSearch(depth, isAttacker) {
        aiStats.nodeCount++;

        if (depth <= 0) return null;

        // 检查是否已经获胜
        if (hasImmediateWin(player)) {
            return findImmediateWin(player);
        }

        if (isAttacker) {
            // 进攻方：寻找冲四点
            const rushFours = findAllRushFours(player);

            for (const move of rushFours) {
                gameState.board[move.x][move.y] = player;

                // 检查是否形成连五
                if (checkWinWithoutState(move.x, move.y, player)) {
                    gameState.board[move.x][move.y] = 0;
                    return move;
                }

                // 对手必须防守的点
                const blockPoint = findImmediateWin(player);
                if (blockPoint) {
                    gameState.board[blockPoint.x][blockPoint.y] = opponent;

                    // 递归搜索
                    const result = vcfSearch(depth - 1, true);

                    gameState.board[blockPoint.x][blockPoint.y] = 0;
                    gameState.board[move.x][move.y] = 0;

                    if (result) return move;
                } else {
                    gameState.board[move.x][move.y] = 0;
                }
            }
        }

        return null;
    }

    return vcfSearch(maxDepth, true);
}

/**
 * 找到所有冲四点
 */
function findAllRushFours(player) {
    const moves = [];

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.RUSH_FOUR) {
                    moves.push({ x: i, y: j, score: lineScore });
                    break;
                }
            }
        }
    }

    moves.sort((a, b) => b.score - a.score);
    return moves;
}

/**
 * VCT搜索 - Victory by Continuous Threat
 * 搜索连续威胁（活三、冲四）直到获胜的路径
 */
function searchVCT(player, maxDepth) {
    const opponent = player === 1 ? 2 : 1;

    function vctSearch(depth, isAttacker) {
        aiStats.nodeCount++;

        if (depth <= 0) return null;

        // 先尝试VCF
        const vcfResult = searchVCF(player, Math.min(depth, 10));
        if (vcfResult) return vcfResult;

        if (isAttacker) {
            // 寻找威胁点（活三或冲四）
            const threats = findAllThreats(player);

            for (const move of threats) {
                gameState.board[move.x][move.y] = player;

                // 检查是否形成必杀
                if (hasImmediateWin(player)) {
                    gameState.board[move.x][move.y] = 0;
                    return move;
                }

                // 对手必须防守
                const mustBlock = findMustBlockPoint(player);
                if (mustBlock) {
                    gameState.board[mustBlock.x][mustBlock.y] = opponent;

                    const result = vctSearch(depth - 2, true);

                    gameState.board[mustBlock.x][mustBlock.y] = 0;
                    gameState.board[move.x][move.y] = 0;

                    if (result) return move;
                } else {
                    gameState.board[move.x][move.y] = 0;
                }
            }
        }

        return null;
    }

    return vctSearch(maxDepth, true);
}

/**
 * 找到所有威胁点（活三及以上）
 */
function findAllThreats(player) {
    const moves = [];

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const score = evaluatePoint(i, j, player);
            if (score >= SCORES.LIVE_THREE) {
                moves.push({ x: i, y: j, score });
            }
        }
    }

    moves.sort((a, b) => b.score - a.score);
    return moves.slice(0, 15); // 限制数量以保证性能
}

/**
 * 找到必须防守的点
 */
function findMustBlockPoint(player) {
    // 检查活四
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const score = evaluatePoint(i, j, player);
            if (score >= SCORES.LIVE_FOUR) {
                return { x: i, y: j };
            }
        }
    }

    // 检查冲四
    return findImmediateWin(player);
}

/**
 * 找到最佳防守点
 */
function findBestBlock(attacker, threatMove) {
    const defender = attacker === 1 ? 2 : 1;

    // 找到所有可能的防守点
    const blockCandidates = [];

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            gameState.board[i][j] = defender;

            // 检查这个防守是否能阻止VCF
            const stillHasVCF = searchVCF(attacker, 10);

            gameState.board[i][j] = 0;

            if (!stillHasVCF) {
                const score = evaluatePoint(i, j, defender);
                blockCandidates.push({ x: i, y: j, score });
            }
        }
    }

    if (blockCandidates.length > 0) {
        blockCandidates.sort((a, b) => b.score - a.score);
        return blockCandidates[0];
    }

    // 如果找不到完美防守，至少堵住最紧急的威胁
    return findThreat(attacker, SCORES.RUSH_FOUR) || threatMove;
}

/**
 * 检查是否获胜（不修改gameState.winningLine）
 */
function checkWinWithoutState(x, y, player) {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
        let count = 1;

        for (let i = 1; i < 5; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx >= 0 && nx < CONFIG.BOARD_SIZE && ny >= 0 && ny < CONFIG.BOARD_SIZE && gameState.board[nx][ny] === player) {
                count++;
            } else break;
        }

        for (let i = 1; i < 5; i++) {
            const nx = x - dx * i, ny = y - dy * i;
            if (nx >= 0 && nx < CONFIG.BOARD_SIZE && ny >= 0 && ny < CONFIG.BOARD_SIZE && gameState.board[nx][ny] === player) {
                count++;
            } else break;
        }

        if (count >= 5) return true;
    }
    return false;
}

/**
 * 地狱难度的Minimax（更深搜索）
 */
function hellMinimax(aiPlayer) {
    let bestMove = null, bestScore = -Infinity;
    const candidates = getCandidates(aiPlayer, HELL_AI.CANDIDATE_LIMIT);

    for (const { x, y } of candidates) {
        gameState.board[x][y] = aiPlayer;
        const score = minimaxHell(HELL_AI.SEARCH_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
        gameState.board[x][y] = 0;
        if (score > bestScore) {
            bestScore = score;
            bestMove = { x, y };
        }
    }
    return bestMove || { x: 7, y: 7 };
}

/**
 * 地狱难度专用Minimax
 */
function minimaxHell(depth, alpha, beta, isMaximizing, aiPlayer) {
    aiStats.nodeCount++;

    const opponent = gameState.playerColor;

    // 检查胜负
    if (hasImmediateWin(aiPlayer)) return HELL_AI.WIN_SCORE + depth;
    if (hasImmediateWin(opponent)) return -HELL_AI.WIN_SCORE - depth;

    // 深度为0时评估
    if (depth === 0) return evaluateBoardAdvanced(aiPlayer);

    const candidates = getCandidates(aiPlayer, HELL_AI.SEARCH_LIMIT);
    if (candidates.length === 0) return evaluateBoardAdvanced(aiPlayer);

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const { x, y } of candidates) {
            gameState.board[x][y] = aiPlayer;
            const score = minimaxHell(depth - 1, alpha, beta, false, aiPlayer);
            gameState.board[x][y] = 0;
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const { x, y } of candidates) {
            gameState.board[x][y] = opponent;
            const score = minimaxHell(depth - 1, alpha, beta, true, aiPlayer);
            gameState.board[x][y] = 0;
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

/**
 * 高级棋盘评估（用于地狱难度）
 */
function evaluateBoardAdvanced(aiPlayer) {
    let score = 0;
    const opponent = gameState.playerColor;

    // 基础评估
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === aiPlayer) {
                score += evaluatePosition(i, j, aiPlayer);
                // 位置价值：中心位置更有价值
                score += (7 - Math.abs(i - 7)) * 10 + (7 - Math.abs(j - 7)) * 10;
            } else if (gameState.board[i][j] === opponent) {
                score -= evaluatePosition(i, j, opponent) * 1.1; // 对手棋型略微高估
                score -= (7 - Math.abs(i - 7)) * 10 + (7 - Math.abs(j - 7)) * 10;
            } else if (hasNeighbor(i, j)) {
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                score += attack * 0.5 - defense * 0.6;
            }
        }
    }

    // 威胁评估
    const myThreats = countThreats(aiPlayer);
    const oppThreats = countThreats(opponent);

    score += myThreats.liveFour * SCORES.LIVE_FOUR * 0.5;
    score += myThreats.rushFour * SCORES.RUSH_FOUR * 0.3;
    score += myThreats.liveThree * SCORES.LIVE_THREE * 0.2;

    score -= oppThreats.liveFour * SCORES.LIVE_FOUR * 0.6;
    score -= oppThreats.rushFour * SCORES.RUSH_FOUR * 0.4;
    score -= oppThreats.liveThree * SCORES.LIVE_THREE * 0.3;

    return score;
}

/**
 * 统计威胁数量
 */
function countThreats(player) {
    let liveFour = 0, rushFour = 0, liveThree = 0;

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.LIVE_FOUR) liveFour++;
                else if (lineScore >= SCORES.RUSH_FOUR) rushFour++;
                else if (lineScore >= SCORES.LIVE_THREE) liveThree++;
            }
        }
    }

    return { liveFour, rushFour, liveThree };
}

/**
 * Minimax算法 + Alpha-Beta剪枝
 */
function minimax(depth, alpha, beta, isMaximizing, aiPlayer) {
    aiStats.nodeCount++;

    const opponent = gameState.playerColor;
    if (hasImmediateWin(aiPlayer)) return HARD_AI.WIN_SCORE + depth;
    if (hasImmediateWin(opponent)) return -HARD_AI.WIN_SCORE - depth;
    if (depth === 0) return evaluateBoard(aiPlayer);
    const candidates = getCandidates(aiPlayer, HARD_AI.SEARCH_LIMIT);
    if (candidates.length === 0) return evaluateBoard(aiPlayer);

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const { x, y } of candidates) {
            gameState.board[x][y] = aiPlayer;
            const score = minimax(depth - 1, alpha, beta, false, aiPlayer);
            gameState.board[x][y] = 0;
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Beta剪枝
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const { x, y } of candidates) {
            gameState.board[x][y] = gameState.playerColor;
            const score = minimax(depth - 1, alpha, beta, true, aiPlayer);
            gameState.board[x][y] = 0;
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha剪枝
        }
        return minScore;
    }
}

/**
 * 获取候选落子位置（增强版）
 */
function getCandidates(aiPlayer, limit) {
    const candidates = [];
    const opponent = gameState.playerColor;

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                // 防守权重提高到1.5，更积极堵截对手
                const score = attack * 1.1 + defense * 1.5;
                candidates.push({ x: i, y: j, score, attack, defense });
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    if (typeof limit === 'number') return candidates.slice(0, limit);
    return candidates;
}

/**
 * 评估整个棋盘局面
 */
function evaluateBoard(aiPlayer) {
    let score = 0;
    const opponent = gameState.playerColor;
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === aiPlayer) {
                score += evaluatePosition(i, j, aiPlayer);
            } else if (gameState.board[i][j] === opponent) {
                score -= evaluatePosition(i, j, opponent);
            } else if (hasNeighbor(i, j)) {
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                score += attack * 0.8 - defense;
            }
        }
    }
    return score;
}

/**
 * 评估单个棋子的位置价值
 */
function evaluatePosition(x, y, player) {
    let score = 0;
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of directions) {
        let count = 1, block = 0;
        for (let i = 1; i <= 4; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE || gameState.board[nx][ny] !== player) {
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE || gameState.board[nx][ny] !== 0) block++;
                break;
            }
            count++;
        }
        for (let i = 1; i <= 4; i++) {
            const nx = x - dx * i, ny = y - dy * i;
            if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE || gameState.board[nx][ny] !== player) {
                if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE || gameState.board[nx][ny] !== 0) block++;
                break;
            }
            count++;
        }
        if (block < 2) score += Math.pow(count, 2) * (2 - block);
    }
    return score;
}

/**
 * 检查位置周围是否有棋子
 */
function hasNeighbor(x, y, distance = 2) {
    for (let i = -distance; i <= distance; i++) {
        for (let j = -distance; j <= distance; j++) {
            if (i === 0 && j === 0) continue;
            const nx = x + i, ny = y + j;
            if (nx >= 0 && nx < CONFIG.BOARD_SIZE && ny >= 0 && ny < CONFIG.BOARD_SIZE && gameState.board[nx][ny] !== 0) {
                return true;
            }
        }
    }
    return false;
}

// ==================== 事件监听 ====================
if (elements.canvas) {
    elements.canvas.addEventListener('click', (e) => {
        if (!canPlayerMove()) return;
        const pos = getPosition(e);
        if (pos) placePiece(pos.x, pos.y, false);
    });

    // 触摸事件支持（移动端）
    elements.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!canPlayerMove()) return;
        const touch = e.changedTouches[0];
        const pos = getPosition(touch);
        if (pos) placePiece(pos.x, pos.y, false);
    });
}

if (elements.undoBtn) elements.undoBtn.addEventListener('click', undo);
if (elements.restartBtn) elements.restartBtn.addEventListener('click', restartGame);

// 窗口大小变化时重新调整棋盘
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (elements.gameWrapper && elements.gameWrapper.classList.contains('show') && elements.canvas) {
            adjustBoardSize();
            const cssWidth = (CONFIG.BOARD_SIZE - 1) * CONFIG.CELL_SIZE + CONFIG.PADDING * 2;
            elements.canvas.style.width = cssWidth + 'px';
            elements.canvas.style.height = cssWidth + 'px';
            elements.canvas.width = cssWidth * dpr;
            elements.canvas.height = cssWidth * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            drawBoard();
        }
    }, 200);
});

// 页面加载时调整大小
adjustBoardSize();
