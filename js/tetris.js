const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// 상수 설정
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#0ea5e9', // I - cyan
    '#2563eb', // J - blue
    '#f59e0b', // L - orange
    '#eab308', // O - yellow
    '#22c55e', // S - green
    '#a855f7', // T - purple
    '#ef4444'  // Z - red
];

// 테트로미노 형태
const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

let board = [];
let piece = null;
let score = 0;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameActive = false;
let animationId = null;

// 보드 초기화
function initBoard() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

// 새 조각 생성
function createPiece() {
    const typeId = Math.floor(Math.random() * 7) + 1;
    const matrix = SHAPES[typeId];
    return {
        matrix: matrix,
        pos: {x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2), y: 0}
    };
}

// 충돌 검사
function collide(board, piece) {
    const m = piece.matrix;
    const o = piece.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 조각을 보드에 병합
function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

// 완성된 줄 삭제
function sweep() {
    let rowCount = 1;
    outer: for (let y = ROWS - 1; y >= 0; --y) {
        for (let x = 0; x < COLS; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        score += rowCount * 100;
        rowCount *= 2;
        scoreElement.textContent = score;
        
        // 속도 증가
        dropInterval = Math.max(100, 1000 - (score / 10));
    }
}

// 그리기 함수
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // 블록 광원 효과
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 0.1);
                ctx.fillRect(x + offset.x, y + offset.y, 0.1, 1);
                
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(x + offset.x, y + offset.y + 0.9, 1, 0.1);
                ctx.fillRect(x + offset.x + 0.9, y + offset.y, 0.1, 1);
            }
        });
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(board, {x: 0, y: 0});
    if (piece) {
        drawMatrix(piece.matrix, piece.pos);
    }
}

// 업데이트 루프
function update(time = 0) {
    if (!gameActive) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        pieceDrop();
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// 블록 하강
function pieceDrop() {
    piece.pos.y++;
    if (collide(board, piece)) {
        piece.pos.y--;
        merge(board, piece);
        sweep();
        piece = createPiece();
        
        // 게임 오버 체크
        if (collide(board, piece)) {
            gameOver();
            return;
        }
    }
    dropCounter = 0;
}

// 블록 이동
function pieceMove(dir) {
    piece.pos.x += dir;
    if (collide(board, piece)) {
        piece.pos.x -= dir;
    }
}

// 블록 회전
function pieceRotate() {
    const pos = piece.pos.x;
    let offset = 1;
    rotate(piece.matrix);
    
    // 벽 충돌 보정 (Wall kick)
    while (collide(board, piece)) {
        piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.matrix[0].length) {
            rotate(piece.matrix, -1);
            piece.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir = 1) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// 입력 처리
document.addEventListener('keydown', event => {
    if (!gameActive) return;
    
    switch(event.keyCode) {
        case 37: // Left
            pieceMove(-1);
            break;
        case 39: // Right
            pieceMove(1);
            break;
        case 40: // Down
            pieceDrop();
            break;
        case 38: // Up
        case 32: // Space
            pieceRotate();
            break;
    }
});

// 게임 시작 / 종료 제어
function startGame() {
    initBoard();
    piece = createPiece();
    score = 0;
    dropInterval = 1000;
    scoreElement.textContent = score;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    lastTime = performance.now();
    update();
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// 스케일 설정
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

// 이벤트 리스너
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 초기 화면 렌더링
initBoard();
draw();
