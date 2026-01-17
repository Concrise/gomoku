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
    PIECE_RADIUS: 16,
    // 缓存计算结果防止重复计算
    _cachedWidth: 0,
    _cachedScale: 1
};

// 根据屏幕宽度调整棋盘大小 - 优化版
function adjustBoardSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth <= 480;
    const isSmallMobile = screenWidth <= 360;
    
    // 移动端：棋盘要足够大，防止误触
    // 计算可用空间（考虑页面其他元素）
    let availableWidth, availableHeight;
    
    if (isMobile) {
        // 手机端：留出最小边距，让棋盘尽可能大
        const horizontalPadding = isSmallMobile ? 10 : 16;
        const containerPadding = isSmallMobile ? 16 : 20; // game-container padding
        availableWidth = screenWidth - horizontalPadding * 2 - containerPadding * 2;
        
        // 考虑垂直空间（状态栏、按钮等大约占用200px）
        availableHeight = screenHeight - 280;
    } else {
        // 桌面端
        availableWidth = Math.min(screenWidth - 80, 600);
        availableHeight = screenHeight - 200;
    }
    
    // 取宽高中较小的值，确保棋盘是正方形且不超出屏幕
    const maxBoardSize = Math.min(availableWidth, availableHeight, 600);
    
    // 原始棋盘尺寸
    const idealBoardWidth = (CONFIG.BOARD_SIZE - 1) * 38 + 60;
    
    // 计算缩放比例
    let scale;
    if (maxBoardSize < idealBoardWidth) {
        scale = maxBoardSize / idealBoardWidth;
    } else {
        scale = 1;
    }
    
    // 移动端最小格子尺寸，防止误触（至少24px）
    const minCellSize = isMobile ? 24 : 20;
    const calculatedCellSize = Math.floor(38 * scale);
    
    if (calculatedCellSize < minCellSize && isMobile) {
        // 如果格子太小，强制使用最小尺寸
        scale = minCellSize / 38;
    }
    
    // 应用缩放
    CONFIG.CELL_SIZE = Math.max(Math.floor(38 * scale), minCellSize);
    CONFIG.PADDING = Math.max(Math.floor(30 * scale), 15);
    CONFIG.PIECE_RADIUS = Math.max(Math.floor(16 * scale), 10);
    
    // 缓存计算结果
    CONFIG._cachedWidth = (CONFIG.BOARD_SIZE - 1) * CONFIG.CELL_SIZE + CONFIG.PADDING * 2;
    CONFIG._cachedScale = scale;
}

// 高清适配
const dpr = window.devicePixelRatio || 1;

// ==================== 主题系统 ====================
let currentTheme = 'dark';

function initTheme() {
    const saved = localStorage.getItem('gomoku-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('gomoku-theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            applyTheme(currentTheme);
            if (elements.canvas && elements.gameWrapper?.classList.contains('show')) {
                drawBoard();
            }
        }
    });
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('gomoku-theme', currentTheme);
    applyTheme(currentTheme);
    
    // 重绘棋盘以适应新主题
    if (elements.canvas && elements.gameWrapper?.classList.contains('show')) {
        drawBoard();
    }
}

function applyTheme(theme) {
    // 同时设置html和body的data-theme属性，确保CSS变量正确继承
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    const themeColor = document.getElementById('themeColor');
    if (themeColor) {
        themeColor.content = theme === 'dark' ? '#0a0a0f' : '#f8f6f2';
    }
    
    // 更新currentTheme变量以保持同步
    currentTheme = theme;
}

// 获取当前主题的棋盘颜色
function getBoardColors() {
    const isDark = currentTheme === 'dark';
    return {
        background: isDark ? '#d4a855' : '#e8c170',
        line: isDark ? '#8b6914' : '#5d4e37',
        border: isDark ? '#8b7355' : '#6b5010',
        starPoint: isDark ? '#6b5010' : '#5d4e37',
        woodGrain: isDark ? 35 : 40
    };
}

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
        name: '评分算法 + 偶尔失误',
        desc: '能识别连五和活四威胁，80%选最佳位置，20%从前3个随机选。时间复杂度 O(n²)'
    },
    medium: {
        name: '启发式评估 + 活四检测',
        desc: '识别连五和活四威胁，始终选择得分最高的位置，但不识别冲四和组合威胁。时间复杂度 O(n²)'
    },
    hard: {
        name: 'Minimax + Alpha-Beta + 组合威胁',
        desc: '博弈树搜索4层深度，Alpha-Beta剪枝优化，主动识别双冲四、四三、双活三等组合杀招。时间复杂度 O(b^d)'
    },
    hell: {
        name: 'VCF/VCT + 深度Minimax',
        desc: '专业级算法：VCF连续冲四必杀搜索(深度8)、VCT连续威胁搜索(深度4)、6层博弈树、开局库。理论上先手必胜。'
    }
};

// ==================== 棋型评分（基于锦标赛AI优化） ====================
const SCORES = {
    FIVE: 1000000,       // 连五 - 立即获胜
    OPEN_FOUR: 100000,   // 活四 - 无法防守
    LIVE_FOUR: 100000,   // 活四（兼容旧名称）
    SIMPLE_FOUR: 10000,  // 冲四 - 必须防守
    RUSH_FOUR: 10000,    // 冲四（兼容旧名称）
    BROKEN_THREE: 1000,  // 跳活三 - 潜在威胁
    OPEN_THREE: 800,     // 活三 - 需要关注
    LIVE_THREE: 800,     // 活三（兼容旧名称）
    SIMPLE_THREE: 100,   // 眠三
    SLEEP_THREE: 100,    // 眠三（兼容旧名称）
    OPEN_TWO: 50,        // 活二
    LIVE_TWO: 50,        // 活二（兼容旧名称）
    SIMPLE_TWO: 10,      // 眠二
    SLEEP_TWO: 10,       // 眠二（兼容旧名称）
    OPEN_ONE: 5,         // 活一
    LIVE_ONE: 5          // 活一（兼容旧名称）
};

// 威胁严重程度排序（用于反击判断）
const THREAT_LEVELS = {
    FIVE: 7,
    OPEN_FOUR: 6,
    SIMPLE_FOUR: 5,
    BROKEN_THREE: 4,
    OPEN_THREE: 3,
    SIMPLE_THREE: 2,
    OPEN_TWO: 1,
    SIMPLE_TWO: 0
};

const HARD_AI = {
    SEARCH_DEPTH: 4,     // 适中的搜索深度，保证质量
    CANDIDATE_LIMIT: 15, // 精选候选位置
    SEARCH_LIMIT: 12,    // 合理的分支数量
    WIN_SCORE: SCORES.FIVE * 10
};

// 地狱难度配置
const HELL_AI = {
    SEARCH_DEPTH: 6,      // 更深的搜索
    CANDIDATE_LIMIT: 18,  // 更多候选位置
    SEARCH_LIMIT: 15,     // 更多分支
    VCF_DEPTH: 8,         // VCF搜索深度
    VCT_DEPTH: 4,         // VCT搜索深度
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
    easy: `Score(p) = Attack(p) + Defense(p)
威胁检测: 连五、活四
选择: 80%最佳 / 20%随机top3`,
    medium: `Score(p) = 1.2×Attack(p) + Defense(p)
威胁检测: 连五、活四
选择: argmax(Score)`,
    hard: `minimax(s, d, α, β) =
  eval(s), if d=0
  max/min(minimax(s', d-1, α, β))
威胁检测: 双冲四、四三、双活三
搜索深度: 4`,
    hell: `VCF: 连续冲四搜索(depth=8)
VCT: 连续威胁搜索(depth=4)
Minimax(depth=6) + α-β剪枝
开局库 + 组合杀检测`
};

const PRESSURE_TIPS = {
    easy: '能识别连五和活四，80%选最佳位置，20%偶尔失误',
    medium: '识别连五和活四威胁，始终选择得分最高的位置',
    hard: '深度搜索4层，主动识别并利用双冲四、四三、双活三等组合杀招',
    hell: '专业级AI，VCF/VCT搜索必胜路径，6层博弈树，理论上无法战胜'
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

    // 使用缓存的宽度
    const cssWidth = CONFIG._cachedWidth;

    if (elements.canvas) {
        // 先设置CSS尺寸，再设置canvas尺寸，防止闪烁
        elements.canvas.style.width = cssWidth + 'px';
        elements.canvas.style.height = cssWidth + 'px';
        
        // 高清Canvas设置
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
    const colors = getBoardColors();

    ctx.save();

    // 底色
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, boardWidth, boardWidth);

    // 木纹纹理
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < boardWidth; i += 4) {
        ctx.beginPath();
        ctx.strokeStyle = `hsl(${colors.woodGrain}, 55%, ${42 + Math.random() * 12}%)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.moveTo(0, i + Math.random() * 3);

        for (let x = 0; x < boardWidth; x += 20) {
            ctx.lineTo(x + 20, i + Math.random() * 3 - 1.5);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 棋盘边框
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(PADDING - 10, PADDING - 10,
        (BOARD_SIZE - 1) * CELL_SIZE + 20,
        (BOARD_SIZE - 1) * CELL_SIZE + 20);

    // 网格线
    ctx.strokeStyle = colors.line;
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
    ctx.fillStyle = colors.starPoint;
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
        const isDark = currentTheme === 'dark';
        const glowColor = isDark ? '#c9a962' : '#8b6914';
        ctx.beginPath();
        ctx.arc(centerX, centerY, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 18;
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
    const isDark = currentTheme === 'dark';
    const glowColor = isDark ? 'rgba(201, 169, 98, 0.9)' : 'rgba(139, 105, 20, 0.9)';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(PADDING + first[0] * CELL_SIZE, PADDING + first[1] * CELL_SIZE);
    ctx.lineTo(PADDING + last[0] * CELL_SIZE, PADDING + last[1] * CELL_SIZE);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 25;
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
 * 专业级棋型识别（基于锦标赛AI）
 * 更精确的威胁检测和分类
 */
function analyzeLinePattern(x, y, dx, dy, player) {
    const opponent = player === 1 ? 2 : 1;
    let pattern = '';
    let center = 4; // 中心位置
    
    // 构建9位模式字符串 (中心位置前后各4位)
    for (let i = -4; i <= 4; i++) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        
        if (nx < 0 || nx >= CONFIG.BOARD_SIZE || ny < 0 || ny >= CONFIG.BOARD_SIZE) {
            pattern += 'X'; // 边界
        } else if (gameState.board[nx][ny] === player) {
            pattern += 'O'; // 己方棋子
        } else if (gameState.board[nx][ny] === opponent) {
            pattern += 'X'; // 对方棋子
        } else {
            pattern += '_'; // 空位
        }
    }
    
    return classifyPattern(pattern, center);
}

/**
 * 模式分类器（基于专业五子棋理论）
 */
function classifyPattern(pattern, center) {
    // 确保中心位置是空的
    if (pattern[center] !== '_') return 0;
    
    // 模拟在中心位置放子后的模式
    const newPattern = pattern.substring(0, center) + 'O' + pattern.substring(center + 1);
    
    // 连五检测
    if (newPattern.includes('OOOOO')) {
        return SCORES.FIVE;
    }
    
    // 活四检测 (_OOOO_ 或更复杂的模式)
    if (/_OOOO_/.test(newPattern) || 
        /_OOOOX/.test(newPattern) || 
        /XOOOO_/.test(newPattern)) {
        return SCORES.OPEN_FOUR;
    }
    
    // 冲四检测 (XOOOO_ 或 _OOOOX 或 OOO_O 等)
    if (/XOOOO_|_OOOOX|OOO_O|OO_OO|O_OOO/.test(newPattern)) {
        return SCORES.SIMPLE_FOUR;
    }
    
    // 跳活三检测 (_OO_O_ 或 _O_OO_)
    if (/_OO_O_|_O_OO_/.test(newPattern)) {
        return SCORES.BROKEN_THREE;
    }
    
    // 活三检测 (_OOO_)
    if (/_OOO_/.test(newPattern)) {
        return SCORES.OPEN_THREE;
    }
    
    // 眠三检测 (XOOO_ 或 _OOOX 或 OO_O 等)
    if (/XOOO_|_OOOX|OO_O|O_OO/.test(newPattern)) {
        return SCORES.SIMPLE_THREE;
    }
    
    // 活二检测 (_OO_)
    if (/_OO_/.test(newPattern)) {
        return SCORES.OPEN_TWO;
    }
    
    // 眠二检测
    if (/XOO_|_OOX|O_O/.test(newPattern)) {
        return SCORES.SIMPLE_TWO;
    }
    
    // 活一检测
    if (/_O_/.test(newPattern)) {
        return SCORES.OPEN_ONE;
    }
    
    return 0;
}

/**
 * 增强的位置评估（基于专业理论）
 */
function evaluatePointAdvanced(x, y, player) {
    if (gameState.board[x][y] !== 0) return 0;
    
    let totalScore = 0;
    let maxThreatLevel = 0;
    let threatCount = { [SCORES.OPEN_FOUR]: 0, [SCORES.SIMPLE_FOUR]: 0, [SCORES.OPEN_THREE]: 0 };
    
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    
    for (const [dx, dy] of directions) {
        const score = analyzeLinePattern(x, y, dx, dy, player);
        totalScore += score;
        
        // 统计威胁类型
        if (score >= SCORES.OPEN_FOUR) threatCount[SCORES.OPEN_FOUR]++;
        else if (score >= SCORES.SIMPLE_FOUR) threatCount[SCORES.SIMPLE_FOUR]++;
        else if (score >= SCORES.OPEN_THREE) threatCount[SCORES.OPEN_THREE]++;
        
        // 记录最高威胁等级
        for (const [threatType, level] of Object.entries(THREAT_LEVELS)) {
            if (score >= SCORES[threatType] && level > maxThreatLevel) {
                maxThreatLevel = level;
            }
        }
    }
    
    // 组合威胁加成
    if (threatCount[SCORES.OPEN_FOUR] >= 1) {
        totalScore += SCORES.FIVE * 0.5; // 活四接近必杀
    }
    if (threatCount[SCORES.SIMPLE_FOUR] >= 2) {
        totalScore += SCORES.OPEN_FOUR * 0.8; // 双冲四很强
    }
    if (threatCount[SCORES.SIMPLE_FOUR] >= 1 && threatCount[SCORES.OPEN_THREE] >= 1) {
        totalScore += SCORES.OPEN_FOUR * 0.7; // 四三连攻
    }
    if (threatCount[SCORES.OPEN_THREE] >= 2) {
        totalScore += SCORES.SIMPLE_FOUR * 0.9; // 双活三
    }
    
    return { score: totalScore, threatLevel: maxThreatLevel };
}

/**
 * 向后兼容的评估函数
 */
function evaluatePoint(x, y, player) {
    const result = evaluatePointAdvanced(x, y, player);
    return result.score;
}

/**
 * 评估一条线上的棋型（兼容旧代码）
 */
function evaluateLine(x, y, dx, dy, player) {
    return analyzeLinePattern(x, y, dx, dy, player);
}

/**
 * 查找特定分数的威胁点（兼容旧代码）
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
 * 简单AI：基础评分 + 小概率失误
 * 特点：能正常下棋，但偶尔会选次优位置
 * 难度定位：新手练习，能撑几个回合
 */
function getEasyMove(aiPlayer) {
    const opponent = gameState.playerColor;
    let candidates = [];
    
    // 必杀：自己能赢一定要赢
    const winMove = findImmediateWin(aiPlayer);
    if (winMove) return winMove;
    
    // 必防：对手要赢一定要堵
    const blockMove = findImmediateWin(opponent);
    if (blockMove) return blockMove;
    
    // 活四也要处理（不然太蠢）
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;
    
    const oppLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (oppLiveFour) return oppLiveFour;
    
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                aiStats.nodeCount++;
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                // 简单AI：攻防权重相等
                candidates.push({ x: i, y: j, score: attack + defense });
            }
        }
    }
    
    if (candidates.length === 0) return { x: 7, y: 7 };
    candidates.sort((a, b) => b.score - a.score);
    
    // 简单AI：80%选最佳，20%从前3个随机选（偶尔失误）
    if (Math.random() < 0.8) {
        return candidates[0];
    } else {
        const topN = Math.min(3, candidates.length);
        return candidates[Math.floor(Math.random() * topN)];
    }
}

/**
 * 中等AI：启发式评估 + 基本威胁检测
 * 特点：总是选择最佳位置，能识别连五和活四
 * 难度定位：有一定挑战，但不会使用高级战术
 */
function getMediumMove(aiPlayer) {
    const opponent = gameState.playerColor;
    
    // 1. 必杀检测（连五）
    const winMove = findImmediateWin(aiPlayer);
    if (winMove) return winMove;
    
    // 2. 必防检测（连五）
    const blockMove = findImmediateWin(opponent);
    if (blockMove) return blockMove;
    
    // 3. 活四威胁（中等AI能识别活四）
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;
    
    const oppLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (oppLiveFour) return oppLiveFour;
    
    // 中等AI不检测冲四、双三等高级威胁，这是与困难的区别
    
    // 4. 评分选择最佳位置
    let bestMove = null, bestScore = -Infinity;
    
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                aiStats.nodeCount++;
                
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                
                // 中等AI：攻击权重略高，更激进但不够全面
                const score = attack * 1.2 + defense * 1.0;
                
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
 * 困难AI：威胁检测 + Minimax搜索
 * 特点：能识别冲四、双三、四三等组合威胁，使用博弈树搜索
 * 难度定位：需要认真对待，AI会主动进攻
 */
function getHardMove(aiPlayer) {
    const opponent = gameState.playerColor;
    
    // 1. 必杀检测
    const winMove = findImmediateWin(aiPlayer);
    if (winMove) return winMove;
    
    // 2. 必防检测
    const blockMove = findImmediateWin(opponent);
    if (blockMove) return blockMove;
    
    // 3. 活四威胁
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;
    
    const oppLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (oppLiveFour) return oppLiveFour;
    
    // 4. 冲四威胁（困难AI能识别冲四）
    const myRushFour = findThreat(aiPlayer, SCORES.RUSH_FOUR);
    if (myRushFour) return myRushFour;
    
    // 5. 组合威胁检测（困难AI的特色）
    const myDoubleRushFour = findDoubleRushFour(aiPlayer);
    if (myDoubleRushFour) return myDoubleRushFour;
    
    const myFourThree = findFourThreeCombo(aiPlayer);
    if (myFourThree) return myFourThree;
    
    const myDoubleThree = findDoubleThree(aiPlayer);
    if (myDoubleThree) return myDoubleThree;
    
    // 6. 防守对手的组合威胁
    const oppDoubleRushFour = findDoubleRushFour(opponent);
    if (oppDoubleRushFour) return oppDoubleRushFour;
    
    const oppFourThree = findFourThreeCombo(opponent);
    if (oppFourThree) return oppFourThree;
    
    const oppDoubleThree = findDoubleThree(opponent);
    if (oppDoubleThree) return oppDoubleThree;
    
    // 7. 使用Minimax搜索（深度4）
    return hardMinimax(aiPlayer);
}

/**
 * 寻找双冲四位置
 */
function findDoubleRushFour(player) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let rushFourCount = 0;

            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.RUSH_FOUR) {
                    rushFourCount++;
                }
            }

            if (rushFourCount >= 2) {
                return { x: i, y: j };
            }
        }
    }
    return null;
}

/**
 * 寻找四三连攻位置
 */
function findFourThreeCombo(player) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let rushFourCount = 0;
            let liveThreeCount = 0;

            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.RUSH_FOUR) {
                    rushFourCount++;
                } else if (lineScore >= SCORES.LIVE_THREE) {
                    liveThreeCount++;
                }
            }

            // 四三连攻：至少一个冲四和一个活三
            if (rushFourCount >= 1 && liveThreeCount >= 1) {
                return { x: i, y: j };
            }
        }
    }
    return null;
}

/**
 * 寻找双活三位置
 */
function findDoubleThree(player) {
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            let liveThreeCount = 0;

            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.LIVE_THREE) {
                    liveThreeCount++;
                }
            }

            if (liveThreeCount >= 2) {
                return { x: i, y: j };
            }
        }
    }
    return null;
}

/**
 * 困难模式专用Minimax
 */
function hardMinimax(aiPlayer) {
    let bestMove = null, bestScore = -Infinity;
    const candidates = getCandidatesImproved(aiPlayer, HARD_AI.CANDIDATE_LIMIT);

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
 * 专业级威胁搜索（基于锦标赛AI）
 */
function findCriticalThreats(player, minThreatLevel = THREAT_LEVELS.SIMPLE_FOUR) {
    const threats = [];
    
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;
            
            const evaluation = evaluatePointAdvanced(i, j, player);
            if (evaluation.threatLevel >= minThreatLevel) {
                threats.push({
                    x: i,
                    y: j,
                    score: evaluation.score,
                    threatLevel: evaluation.threatLevel
                });
            }
        }
    }
    
    // 按威胁等级和分数排序
    threats.sort((a, b) => {
        if (a.threatLevel !== b.threatLevel) {
            return b.threatLevel - a.threatLevel;
        }
        return b.score - a.score;
    });
    
    return threats;
}

/**
 * 反击威胁检测（基于专业理论）
 */
function findCounterThreats(player, opponentThreatLevel) {
    const counterThreats = findCriticalThreats(player, opponentThreatLevel + 1);
    return counterThreats.length > 0 ? counterThreats[0] : null;
}

/**
 * 重写困难AI（基于专业算法）
 */
function getHardMoveAdvanced(aiPlayer) {
    const opponent = gameState.playerColor;

    // 1. 检查立即获胜
    const winMove = findCriticalThreats(aiPlayer, THREAT_LEVELS.FIVE);
    if (winMove.length > 0) return winMove[0];

    // 2. 检查必须防守的威胁
    const opponentWinThreats = findCriticalThreats(opponent, THREAT_LEVELS.FIVE);
    if (opponentWinThreats.length > 0) return opponentWinThreats[0];

    // 3. 检查活四威胁
    const myOpenFours = findCriticalThreats(aiPlayer, THREAT_LEVELS.OPEN_FOUR);
    if (myOpenFours.length > 0) return myOpenFours[0];

    const opponentOpenFours = findCriticalThreats(opponent, THREAT_LEVELS.OPEN_FOUR);
    if (opponentOpenFours.length > 0) {
        // 尝试反击
        const counterThreat = findCounterThreats(aiPlayer, THREAT_LEVELS.OPEN_FOUR);
        if (counterThreat) return counterThreat;
        return opponentOpenFours[0];
    }

    // 4. 检查冲四威胁
    const mySimpleFours = findCriticalThreats(aiPlayer, THREAT_LEVELS.SIMPLE_FOUR);
    if (mySimpleFours.length > 0) return mySimpleFours[0];

    const opponentSimpleFours = findCriticalThreats(opponent, THREAT_LEVELS.SIMPLE_FOUR);
    if (opponentSimpleFours.length > 0) {
        // 尝试反击
        const counterThreat = findCounterThreats(aiPlayer, THREAT_LEVELS.SIMPLE_FOUR);
        if (counterThreat) return counterThreat;
        return opponentSimpleFours[0];
    }

    // 5. 检查活三威胁
    const myOpenThrees = findCriticalThreats(aiPlayer, THREAT_LEVELS.OPEN_THREE);
    if (myOpenThrees.length > 0) return myOpenThrees[0];

    const opponentOpenThrees = findCriticalThreats(opponent, THREAT_LEVELS.OPEN_THREE);
    if (opponentOpenThrees.length > 0) {
        // 尝试反击
        const counterThreat = findCounterThreats(aiPlayer, THREAT_LEVELS.OPEN_THREE);
        if (counterThreat) return counterThreat;
        return opponentOpenThrees[0];
    }

    // 6. 使用改进的Minimax搜索
    return hardMinimaxAdvanced(aiPlayer);
}

/**
 * 改进的Minimax搜索
 */
function hardMinimaxAdvanced(aiPlayer) {
    let bestMove = null;
    let bestScore = -Infinity;
    const candidates = getCandidatesAdvanced(aiPlayer, HARD_AI.CANDIDATE_LIMIT);

    for (const candidate of candidates) {
        gameState.board[candidate.x][candidate.y] = aiPlayer;
        const score = minimaxAdvanced(HARD_AI.SEARCH_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
        gameState.board[candidate.x][candidate.y] = 0;
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = candidate;
        }
    }
    
    return bestMove || { x: 7, y: 7 };
}

/**
 * 改进的候选位置生成
 */
function getCandidatesAdvanced(aiPlayer, limit) {
    const candidates = [];
    const opponent = gameState.playerColor;

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                const myEval = evaluatePointAdvanced(i, j, aiPlayer);
                const oppEval = evaluatePointAdvanced(i, j, opponent);
                
                // 综合评分：攻击 + 防守 + 位置价值
                const attackScore = myEval.score;
                const defenseScore = oppEval.score * 1.2; // 防守权重稍高
                const positionValue = (7 - Math.abs(i - 7)) + (7 - Math.abs(j - 7));
                
                const totalScore = attackScore + defenseScore + positionValue * 10;
                
                candidates.push({
                    x: i,
                    y: j,
                    score: totalScore,
                    attackScore,
                    defenseScore,
                    threatLevel: Math.max(myEval.threatLevel, oppEval.threatLevel)
                });
            }
        }
    }

    // 按综合评分排序
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
}

/**
 * 改进的Minimax算法
 */
function minimaxAdvanced(depth, alpha, beta, isMaximizing, aiPlayer) {
    aiStats.nodeCount++;

    const opponent = gameState.playerColor;
    
    // 检查游戏结束状态
    if (hasImmediateWin(aiPlayer)) return HARD_AI.WIN_SCORE + depth;
    if (hasImmediateWin(opponent)) return -HARD_AI.WIN_SCORE - depth;
    
    if (depth === 0) return evaluateBoardAdvanced(aiPlayer);

    const candidates = getCandidatesAdvanced(aiPlayer, HARD_AI.SEARCH_LIMIT);
    if (candidates.length === 0) return evaluateBoardAdvanced(aiPlayer);

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const candidate of candidates) {
            gameState.board[candidate.x][candidate.y] = aiPlayer;
            const score = minimaxAdvanced(depth - 1, alpha, beta, false, aiPlayer);
            gameState.board[candidate.x][candidate.y] = 0;
            
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Beta剪枝
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const candidate of candidates) {
            gameState.board[candidate.x][candidate.y] = opponent;
            const score = minimaxAdvanced(depth - 1, alpha, beta, true, aiPlayer);
            gameState.board[candidate.x][candidate.y] = 0;
            
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha剪枝
        }
        return minScore;
    }
}

/**
 * 改进的棋盘评估函数
 */
function evaluateBoardAdvanced(aiPlayer) {
    let score = 0;
    const opponent = gameState.playerColor;

    // 全局威胁评估
    const myThreats = findCriticalThreats(aiPlayer, 0);
    const oppThreats = findCriticalThreats(opponent, 0);

    // 己方威胁加分
    for (const threat of myThreats) {
        score += threat.score * 0.8;
    }

    // 对手威胁扣分（权重更高）
    for (const threat of oppThreats) {
        score -= threat.score * 1.0;
    }

    // 位置控制评估
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === aiPlayer) {
                score += evaluatePosition(i, j, aiPlayer);
                score += (7 - Math.abs(i - 7)) * 15 + (7 - Math.abs(j - 7)) * 15;
            } else if (gameState.board[i][j] === opponent) {
                score -= evaluatePosition(i, j, opponent) * 1.1;
                score -= (7 - Math.abs(i - 7)) * 15 + (7 - Math.abs(j - 7)) * 15;
            }
        }
    }

    return score;
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
 * 地狱AI：VCF/VCT + 深度Minimax（重新设计）
 * 特点：VCF连续冲四搜索、VCT连续威胁搜索、深度6博弈树、开局库
 * 难度定位：专业级AI，理论上先手必胜
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
        return findBestOpeningMove(aiPlayer);
    }

    // 1. 自己能连五 → 直接赢
    const immediateWin = findImmediateWin(aiPlayer);
    if (immediateWin) return immediateWin;

    // 2. 对手能连五 → 必须堵
    const immediateBlock = findImmediateWin(opponent);
    if (immediateBlock) return immediateBlock;

    // 3. 自己能形成活四 → 必杀
    const myLiveFour = findThreat(aiPlayer, SCORES.LIVE_FOUR);
    if (myLiveFour) return myLiveFour;

    // 4. 对手有活四 → 必须堵
    const opponentLiveFour = findThreat(opponent, SCORES.LIVE_FOUR);
    if (opponentLiveFour) return opponentLiveFour;

    // 5. 自己的组合杀招
    const myDoubleRushFour = findDoubleRushFour(aiPlayer);
    if (myDoubleRushFour) return myDoubleRushFour;

    const myFourThree = findFourThreeCombo(aiPlayer);
    if (myFourThree) return myFourThree;

    const myDoubleThree = findDoubleThree(aiPlayer);
    if (myDoubleThree) return myDoubleThree;

    // 6. 对手的组合威胁
    const opponentDoubleRushFour = findDoubleRushFour(opponent);
    if (opponentDoubleRushFour) return opponentDoubleRushFour;

    const opponentFourThree = findFourThreeCombo(opponent);
    if (opponentFourThree) return opponentFourThree;

    const opponentDoubleThree = findDoubleThree(opponent);
    if (opponentDoubleThree) return opponentDoubleThree;

    // 7. VCF搜索：找己方必胜的连续冲四路径（地狱特有）
    const vcfMove = searchVCFImproved(aiPlayer, HELL_AI.VCF_DEPTH);
    if (vcfMove) return vcfMove;

    // 8. VCT搜索：找连续威胁路径（地狱特有）
    const vctMove = searchVCTImproved(aiPlayer, HELL_AI.VCT_DEPTH);
    if (vctMove) return vctMove;

    // 9. 深度Minimax搜索（深度6，比困难更深）
    return hellMinimaxImproved(aiPlayer);
}

/**
 * 改进的VCF搜索
 */
function searchVCFImproved(player, maxDepth) {
    const opponent = player === 1 ? 2 : 1;

    function vcfSearch(depth, isAttacker) {
        aiStats.nodeCount++;

        if (depth <= 0) return null;

        if (hasImmediateWin(player)) {
            return findImmediateWin(player);
        }

        if (isAttacker) {
            // 寻找所有冲四点，按威胁程度排序
            const rushFours = findAllRushFoursImproved(player);

            for (const move of rushFours) {
                gameState.board[move.x][move.y] = player;

                // 检查是否直接获胜
                if (checkWinWithoutState(move.x, move.y, player)) {
                    gameState.board[move.x][move.y] = 0;
                    return move;
                }

                // 对手的所有防守点
                const defensePoints = findAllDefensePoints(player);
                let allDefenseFail = true;

                for (const defensePoint of defensePoints) {
                    gameState.board[defensePoint.x][defensePoint.y] = opponent;

                    const result = vcfSearch(depth - 1, true);

                    gameState.board[defensePoint.x][defensePoint.y] = 0;

                    if (!result) {
                        allDefenseFail = false;
                        break;
                    }
                }

                gameState.board[move.x][move.y] = 0;

                if (allDefenseFail && defensePoints.length > 0) {
                    return move;
                }
            }
        }

        return null;
    }

    return vcfSearch(maxDepth, true);
}

/**
 * 改进的VCT搜索
 */
function searchVCTImproved(player, maxDepth) {
    // 找到最有威胁的位置
    const threats = findAllThreatsImproved(player).slice(0, 8);

    for (const move of threats) {
        gameState.board[move.x][move.y] = player;

        // 检查是否形成必杀局面
        const hasWinningThreat = (
            findThreat(player, SCORES.LIVE_FOUR) !== null ||
            findDoubleRushFour(player) !== null ||
            findFourThreeCombo(player) !== null ||
            findDoubleThree(player) !== null
        );

        gameState.board[move.x][move.y] = 0;

        if (hasWinningThreat) return move;
    }

    return null;
}

/**
 * 改进的地狱Minimax
 */
function hellMinimaxImproved(aiPlayer) {
    let bestMove = null, bestScore = -Infinity;
    const candidates = getCandidatesImproved(aiPlayer, HELL_AI.CANDIDATE_LIMIT);

    for (const { x, y } of candidates) {
        gameState.board[x][y] = aiPlayer;
        const score = minimaxHellImproved(HELL_AI.SEARCH_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
        gameState.board[x][y] = 0;
        if (score > bestScore) {
            bestScore = score;
            bestMove = { x, y };
        }
    }
    return bestMove || { x: 7, y: 7 };
}

/**
 * 改进的地狱Minimax算法
 */
function minimaxHellImproved(depth, alpha, beta, isMaximizing, aiPlayer) {
    aiStats.nodeCount++;

    const opponent = gameState.playerColor;

    // 检查胜负
    if (hasImmediateWin(aiPlayer)) return HELL_AI.WIN_SCORE + depth;
    if (hasImmediateWin(opponent)) return -HELL_AI.WIN_SCORE - depth;

    // 深度为0时评估
    if (depth === 0) return evaluateBoardHell(aiPlayer);

    const candidates = getCandidatesImproved(aiPlayer, HELL_AI.SEARCH_LIMIT);
    if (candidates.length === 0) return evaluateBoardHell(aiPlayer);

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const { x, y } of candidates) {
            gameState.board[x][y] = aiPlayer;
            const score = minimaxHellImproved(depth - 1, alpha, beta, false, aiPlayer);
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
            const score = minimaxHellImproved(depth - 1, alpha, beta, true, aiPlayer);
            gameState.board[x][y] = 0;
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

/**
 * 地狱模式专用棋盘评估
 */
function evaluateBoardHell(aiPlayer) {
    let score = 0;
    const opponent = gameState.playerColor;

    // 基础位置评估
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === aiPlayer) {
                score += evaluatePosition(i, j, aiPlayer);
                // 中心位置价值
                score += (7 - Math.abs(i - 7)) * 20 + (7 - Math.abs(j - 7)) * 20;
            } else if (gameState.board[i][j] === opponent) {
                score -= evaluatePosition(i, j, opponent) * 1.3;
                score -= (7 - Math.abs(i - 7)) * 20 + (7 - Math.abs(j - 7)) * 20;
            } else if (hasNeighbor(i, j)) {
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                score += attack * 0.6 - defense * 0.8;
            }
        }
    }

    // 威胁统计
    const myThreats = countThreatsDetailed(aiPlayer);
    const oppThreats = countThreatsDetailed(opponent);

    // 己方威胁加分
    score += myThreats.liveFour * SCORES.LIVE_FOUR * 0.8;
    score += myThreats.rushFour * SCORES.RUSH_FOUR * 0.5;
    score += myThreats.liveThree * SCORES.LIVE_THREE * 0.3;
    score += myThreats.sleepThree * SCORES.SLEEP_THREE * 0.1;

    // 对手威胁扣分（权重更高）
    score -= oppThreats.liveFour * SCORES.LIVE_FOUR * 1.0;
    score -= oppThreats.rushFour * SCORES.RUSH_FOUR * 0.7;
    score -= oppThreats.liveThree * SCORES.LIVE_THREE * 0.5;
    score -= oppThreats.sleepThree * SCORES.SLEEP_THREE * 0.2;

    // 组合威胁评估
    if (myThreats.rushFour >= 2) score += SCORES.LIVE_FOUR * 0.6; // 双冲四
    if (myThreats.rushFour >= 1 && myThreats.liveThree >= 1) score += SCORES.LIVE_FOUR * 0.5; // 四三
    if (myThreats.liveThree >= 2) score += SCORES.RUSH_FOUR * 0.8; // 双活三

    if (oppThreats.rushFour >= 2) score -= SCORES.LIVE_FOUR * 0.8;
    if (oppThreats.rushFour >= 1 && oppThreats.liveThree >= 1) score -= SCORES.LIVE_FOUR * 0.7;
    if (oppThreats.liveThree >= 2) score -= SCORES.RUSH_FOUR * 1.0;

    return score;
}

/**
 * 详细威胁统计
 */
function countThreatsDetailed(player) {
    let liveFour = 0, rushFour = 0, liveThree = 0, sleepThree = 0;

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
                else if (lineScore >= SCORES.SLEEP_THREE) sleepThree++;
            }
        }
    }

    return { liveFour, rushFour, liveThree, sleepThree };
}

/**
 * 改进的冲四搜索
 */
function findAllRushFoursImproved(player) {
    const moves = [];

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            let maxScore = 0;
            const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
            for (const [dx, dy] of directions) {
                const lineScore = evaluateLine(i, j, dx, dy, player);
                if (lineScore >= SCORES.RUSH_FOUR) {
                    maxScore = Math.max(maxScore, lineScore);
                }
            }

            if (maxScore >= SCORES.RUSH_FOUR) {
                moves.push({ x: i, y: j, score: maxScore });
            }
        }
    }

    moves.sort((a, b) => b.score - a.score);
    return moves.slice(0, 10); // 限制数量
}

/**
 * 找到所有防守点
 */
function findAllDefensePoints(attackPlayer) {
    const defensePoints = [];

    // 找到所有能阻止对手连五的点
    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] !== 0) continue;
            if (!hasNeighbor(i, j)) continue;

            // 模拟对手在此位置落子
            gameState.board[i][j] = attackPlayer;
            const wouldWin = checkWinWithoutState(i, j, attackPlayer);
            gameState.board[i][j] = 0;

            if (wouldWin) {
                defensePoints.push({ x: i, y: j });
            }
        }
    }

    return defensePoints;
}

/**
 * 改进的威胁搜索
 */
function findAllThreatsImproved(player) {
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
    return moves;
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
 * VCT搜索（轻量版）- Victory by Continuous Threat
 * 只搜索最有希望的几个威胁点
 */
function searchVCTLight(player, maxDepth) {
    // 先检查是否有直接的VCF
    const vcfResult = searchVCF(player, Math.min(maxDepth, 8));
    if (vcfResult) return vcfResult;

    // 找最好的几个威胁点
    const threats = findAllThreats(player).slice(0, 5);

    for (const move of threats) {
        gameState.board[move.x][move.y] = player;

        // 检查落子后是否形成必杀局面
        const hasWinningThreat = findThreat(player, SCORES.LIVE_FOUR) !== null;
        const hasVCF = hasWinningThreat || searchVCF(player, 6) !== null;

        gameState.board[move.x][move.y] = 0;

        if (hasVCF) return move;
    }

    return null;
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
 * 获取候选落子位置（改进版）
 * 更智能的候选位置筛选
 */
function getCandidatesImproved(aiPlayer, limit) {
    const candidates = [];
    const opponent = gameState.playerColor;

    for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
        for (let j = 0; j < CONFIG.BOARD_SIZE; j++) {
            if (gameState.board[i][j] === 0 && hasNeighbor(i, j)) {
                const attack = evaluatePoint(i, j, aiPlayer);
                const defense = evaluatePoint(i, j, opponent);
                
                // 更合理的权重分配
                let score = attack * 1.2 + defense * 1.8; // 提高防守权重
                
                // 位置价值加成（中心区域更有价值）
                const centerBonus = (7 - Math.abs(i - 7)) + (7 - Math.abs(j - 7));
                score += centerBonus * 50;
                
                // 关键威胁加成
                if (attack >= SCORES.LIVE_FOUR || defense >= SCORES.LIVE_FOUR) {
                    score += 1000000; // 活四必须优先考虑
                }
                if (attack >= SCORES.RUSH_FOUR || defense >= SCORES.RUSH_FOUR) {
                    score += 500000; // 冲四也很重要
                }
                if (attack >= SCORES.LIVE_THREE || defense >= SCORES.LIVE_THREE) {
                    score += 100000; // 活三需要重视
                }
                
                candidates.push({ x: i, y: j, score, attack, defense });
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
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
 * 获取候选落子位置（保持兼容性）
 */
function getCandidates(aiPlayer, limit) {
    return getCandidatesImproved(aiPlayer, limit);
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
    // 点击事件（桌面端）
    elements.canvas.addEventListener('click', (e) => {
        if (!canPlayerMove()) return;
        const pos = getPosition(e);
        if (pos) placePiece(pos.x, pos.y, false);
    });

    // 触摸事件支持（移动端）- 优化版
    let touchStartTime = 0;
    let touchStartPos = null;
    
    elements.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartTime = Date.now();
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });
    
    elements.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!canPlayerMove()) return;
        
        const touch = e.changedTouches[0];
        const touchEndPos = { x: touch.clientX, y: touch.clientY };
        
        // 检查是否是有效的点击（不是滑动）
        if (touchStartPos) {
            const dx = Math.abs(touchEndPos.x - touchStartPos.x);
            const dy = Math.abs(touchEndPos.y - touchStartPos.y);
            const touchDuration = Date.now() - touchStartTime;
            
            // 如果移动距离小于15px且时间小于500ms，认为是点击
            if (dx < 15 && dy < 15 && touchDuration < 500) {
                const pos = getPosition(touch);
                if (pos) placePiece(pos.x, pos.y, false);
            }
        }
        
        touchStartPos = null;
    }, { passive: false });
    
    // 阻止触摸移动时的默认行为（防止页面滚动）
    elements.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
}

if (elements.undoBtn) elements.undoBtn.addEventListener('click', undo);
if (elements.restartBtn) elements.restartBtn.addEventListener('click', restartGame);

// 窗口大小变化时重新调整棋盘 - 优化版，使用防抖
let resizeTimeout;
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

window.addEventListener('resize', () => {
    // 只有当尺寸真正变化时才处理（防止移动端地址栏隐藏/显示导致的抖动）
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    // 忽略小幅度的高度变化（通常是移动端地址栏）
    const widthChanged = Math.abs(currentWidth - lastWidth) > 10;
    const heightChanged = Math.abs(currentHeight - lastHeight) > 100;
    
    if (!widthChanged && !heightChanged) return;
    
    lastWidth = currentWidth;
    lastHeight = currentHeight;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (elements.gameWrapper && elements.gameWrapper.classList.contains('show') && elements.canvas) {
            adjustBoardSize();
            const cssWidth = CONFIG._cachedWidth;
            
            // 使用requestAnimationFrame确保平滑更新
            requestAnimationFrame(() => {
                elements.canvas.style.width = cssWidth + 'px';
                elements.canvas.style.height = cssWidth + 'px';
                elements.canvas.width = cssWidth * dpr;
                elements.canvas.height = cssWidth * dpr;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
                drawBoard();
            });
        }
    }, 250);
});

// 页面加载时调整大小
adjustBoardSize();

// 初始化主题
initTheme();
