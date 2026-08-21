/* =========================================================
   ODYSSEY
   1차 프로토타입
========================================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


/* =========================================================
   저장 데이터
========================================================= */

let coins = Number(localStorage.getItem("odysseyCoins")) || 0;

function saveCoins() {
    localStorage.setItem("odysseyCoins", String(coins));
}


/* =========================================================
   직업
========================================================= */

const classes = {
    archer: {
        id: "archer",
        name: "궁수",
        icon: "🏹",
        weapon: "활과 화살",

        hp: 100,
        damage: 6,
        attackCooldown: 0.32,
        attackRange: 330,
        projectileSpeed: 650,

        moveSpeed: 270,

        description:
            "빠른 원거리 공격이 가능하지만 움직이는 동안에는 공격할 수 없습니다.",

        stats: [
            "공격력: 6",
            "공격속도: 매우 빠름",
            "공격범위: 좁음",
            "정지 상태에서만 공격"
        ]
    },

    knight: {
        id: "knight",
        name: "기사",
        icon: "⚔️",
        weapon: "검",

        hp: 100,
        damage: 10,
        attackCooldown: 0.85,
        attackRange: 115,
        projectileSpeed: 0,

        moveSpeed: 250,

        description:
            "공격력, 공격속도, 범위가 균형 잡힌 기본형 직업입니다.",

        stats: [
            "공격력: 10",
            "공격속도: 보통",
            "공격범위: 보통",
            "균형 잡힌 능력치"
        ]
    },

    barbarian: {
        id: "barbarian",
        name: "바바리안",
        icon: "🪓",
        weapon: "대검",

        hp: 100,
        damage: 25,
        attackCooldown: 1.55,
        attackRange: 165,
        projectileSpeed: 0,

        moveSpeed: 235,

        description:
            "느리지만 강력하고 넓은 대검 공격을 사용하는 직업입니다.",

        stats: [
            "공격력: 25",
            "공격속도: 느림",
            "공격범위: 넓음",
            "강력한 넉백"
        ]
    },

    assassin: {
        id: "assassin",
        name: "암살자",
        icon: "🗡️",
        weapon: "쌍단검",

        hp: 100,
        damage: 4,
        attackCooldown: 0.25,
        attackRange: 75,
        projectileSpeed: 0,

        moveSpeed: 290,

        critBonus: 0.50,

        description:
            "낮은 공격력을 지녔지만 매우 빠른 공격속도와 높은 치명타 확률을 가집니다.",

        stats: [
            "공격력: 4",
            "공격속도: 매우 빠름",
            "공격범위: 매우 좁음",
            "치명타 확률 +50%"
        ]
    }
};


/* =========================================================
   게임 상태
========================================================= */

let selectedClass = "knight";

let gameRunning = false;
let gamePaused = false;

let player = null;

let enemies = [];
let projectiles = [];
let xpGems = [];
let effects = [];

let level = 1;
let experience = 0;
let experienceNeeded = 20;

let kills = 0;
let runCoins = 0;

let lastTime = 0;
let enemySpawnTimer = 0;

let keys = {};


/* =========================================================
   카드 / 성장
========================================================= */

const commonCards = [

    {
        id: "maxHp",
        type: "능력 강화",
        name: "강인한 육체",
        description: "최대 HP +20",
        rarity: 1,

        apply() {
            player.maxHp += 20;
            player.hp += 20;
        }
    },

    {
        id: "damage",
        type: "능력 강화",
        name: "힘 강화",
        description: "공격력 +10%",
        rarity: 1,

        apply() {
            player.damageMultiplier *= 1.10;
        }
    },

    {
        id: "attackSpeed",
        type: "능력 강화",
        name: "신속",
        description: "공격속도 +10%",
        rarity: 1,

        apply() {
            player.attackSpeedMultiplier *= 1.10;
        }
    },

    {
        id: "moveSpeed",
        type: "능력 강화",
        name: "질주",
        description: "이동속도 +8%",
        rarity: 1,

        apply() {
            player.moveSpeedMultiplier *= 1.08;
        }
    },

    {
        id: "crit",
        type: "능력 강화",
        name: "예리한 감각",
        description: "치명타 확률 +5%",
        rarity: 1,

        apply() {
            player.critChance += 0.05;
        }
    },

    {
        id: "critDamage",
        type: "능력 강화",
        name: "치명적인 일격",
        description: "치명타 피해량 +25%",
        rarity: 2,

        apply() {
            player.critMultiplier += 0.25;
        }
    },

    {
        id: "xpRange",
        type: "능력 강화",
        name: "탐욕의 눈",
        description: "경험치 획득 범위 +30%",
        rarity: 1,

        apply() {
            player.xpRange *= 1.30;
        }
    }
];


/* =========================================================
   직업별 무기 강화
========================================================= */

const weaponCards = {

    archer: [
        {
            type: "무기 강화",
            name: "강화 화살",
            description: "활 공격력 +20%",
            rarity: 1,

            apply() {
                player.damageMultiplier *= 1.20;
            }
        },

        {
            type: "무기 강화",
            name: "빠른 시위",
            description: "활 공격속도 +15%",
            rarity: 1,

            apply() {
                player.attackSpeedMultiplier *= 1.15;
            }
        },

        {
            type: "무기 강화",
            name: "관통 화살",
            description: "화살이 적 1명을 추가로 관통합니다.",
            rarity: 2,

            apply() {
                player.projectilePierce += 1;
            }
        },

        {
            type: "무기 강화",
            name: "긴 사거리",
            description: "활의 공격범위 +25%",
            rarity: 2,

            apply() {
                player.attackRange *= 1.25;
            }
        }
    ],

    knight: [
        {
            type: "무기 강화",
            name: "강철 검",
            description: "검 공격력 +20%",
            rarity: 1,

            apply() {
                player.damageMultiplier *= 1.20;
            }
        },

        {
            type: "무기 강화",
            name: "빠른 검격",
            description: "검 공격속도 +15%",
            rarity: 1,

            apply() {
                player.attackSpeedMultiplier *= 1.15;
            }
        },

        {
            type: "무기 강화",
            name: "검의 확장",
            description: "검 공격범위 +25%",
            rarity: 2,

            apply() {
                player.attackRange *= 1.25;
            }
        }
    ],

    barbarian: [
        {
            type: "무기 강화",
            name: "거대한 대검",
            description: "대검 공격력 +25%",
            rarity: 1,

            apply() {
                player.damageMultiplier *= 1.25;
            }
        },

        {
            type: "무기 강화",
            name: "대검 휘두르기",
            description: "대검 공격속도 +12%",
            rarity: 1,

            apply() {
                player.attackSpeedMultiplier *= 1.12;
            }
        },

        {
            type: "무기 강화",
            name: "파괴적인 범위",
            description: "대검 공격범위 +30%",
            rarity: 2,

            apply() {
                player.attackRange *= 1.30;
            }
        }
    ],

    assassin: [
        {
            type: "무기 강화",
            name: "날카로운 단검",
            description: "쌍단검 공격력 +20%",
            rarity: 1,

            apply() {
                player.damageMultiplier *= 1.20;
            }
        },

        {
            type: "무기 강화",
            name: "연속 암살",
            description: "쌍단검 공격속도 +18%",
            rarity: 1,

            apply() {
                player.attackSpeedMultiplier *= 1.18;
            }
        },

        {
            type: "무기 강화",
            name: "치명적인 칼날",
            description: "치명타 확률 +10%",
            rarity: 2,

            apply() {
                player.critChance += 0.10;
            }
        }
    ]
};


/* =========================================================
   공용 스킬
========================================================= */

const commonSkills = [

    {
        id: "lightning",
        type: "공용 스킬",
        name: "⚡ 번개",
        description: "일정 시간마다 무작위 적에게 번개 공격.",
        rarity: 2,

        apply() {
            player.skills.lightning =
                (player.skills.lightning || 0) + 1;
        }
    },

    {
        id: "fireball",
        type: "공용 스킬",
        name: "🔥 화염구",
        description: "주기적으로 가장 가까운 적에게 화염구를 발사.",
        rarity: 2,

        apply() {
            player.skills.fireball =
                (player.skills.fireball || 0) + 1;
        }
    },

    {
        id: "magnet",
        type: "공용 스킬",
        name: "🧲 자석",
        description: "경험치 획득 범위 +60%.",
        rarity: 2,

        apply() {
            player.xpRange *= 1.60;
        }
    }
];


/* =========================================================
   직업 전용 스킬
========================================================= */

const classSkills = {

    archer: [

        {
            type: "궁수 전용 스킬",
            name: "🏹 폭발 화살",
            description: "화살 적중 시 작은 폭발을 일으킵니다.",
            rarity: 3,

            apply() {
                player.skills.explosiveArrow =
                    (player.skills.explosiveArrow || 0) + 1;
            }
        },

        {
            type: "궁수 전용 스킬",
            name: "🎯 집중 사격",
            description: "정지 상태에서 공격력이 증가합니다.",
            rarity: 3,

            apply() {
                player.skills.focusShot =
                    (player.skills.focusShot || 0) + 1;
            }
        }
    ],

    knight: [

        {
            type: "기사 전용 스킬",
            name: "🛡️ 방패 강타",
            description: "공격 시 일정 확률로 강력한 넉백을 발생시킵니다.",
            rarity: 3,

            apply() {
                player.skills.shieldBash =
                    (player.skills.shieldBash || 0) + 1;
            }
        },

        {
            type: "기사 전용 스킬",
            name: "⚔️ 회전 베기",
            description: "주기적으로 주변의 적을 베어냅니다.",
            rarity: 3,

            apply() {
                player.skills.spinSlash =
                    (player.skills.spinSlash || 0) + 1;
            }
        }
    ],

    barbarian: [

        {
            type: "바바리안 전용 스킬",
            name: "💥 대지 분쇄",
            description: "대검 공격 시 강력한 충격파를 발생시킵니다.",
            rarity: 3,

            apply() {
                player.skills.groundSmash =
                    (player.skills.groundSmash || 0) + 1;
            }
        },

        {
            type: "바바리안 전용 스킬",
            name: "🔥 광전사",
            description: "HP가 낮을수록 공격력이 증가합니다.",
            rarity: 3,

            apply() {
                player.skills.berserker =
                    (player.skills.berserker || 0) + 1;
            }
        }
    ],

    assassin: [

        {
            type: "암살자 전용 스킬",
            name: "🗡️ 암살",
            description: "체력이 낮은 적에게 추가 피해를 줍니다.",
            rarity: 3,

            apply() {
                player.skills.assassination =
                    (player.skills.assassination || 0) + 1;
            }
        },

        {
            type: "암살자 전용 스킬",
            name: "🌑 그림자 춤",
            description: "공격 후 짧은 시간 동안 이동속도가 증가합니다.",
            rarity: 3,

            apply() {
                player.skills.shadowDance =
                    (player.skills.shadowDance || 0) + 1;
            }
        }
    ]
};


/* =========================================================
   화면 전환
========================================================= */

function showScreen(id) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");
}


/* =========================================================
   UI
========================================================= */

function updateMenuUI() {

    document.getElementById("menuCoins").textContent = coins;
    document.getElementById("shopCoins").textContent = coins;

    document.getElementById("currentClassName").textContent =
        classes[selectedClass].name;
}


/* =========================================================
   직업 선택 UI
========================================================= */

function renderClassMenu() {

    const container = document.getElementById("classCards");

    container.innerHTML = "";

    Object.values(classes).forEach(classData => {

        const unlocked =
            classData.id !== "assassin" ||
            localStorage.getItem("odysseyAssassinUnlocked") === "true";

        const card = document.createElement("div");

        card.className =
            "class-card" +
            (selectedClass === classData.id ? " selected" : "");

        card.innerHTML = `
            <div class="class-icon">${classData.icon}</div>

            <h3>${classData.name}</h3>

            <p>${classData.description}</p>

            <div class="stat-list">
                ${classData.stats.map(stat => `<div>• ${stat}</div>`).join("")}
            </div>

            <button ${unlocked ? "" : "disabled"}>
                ${
                    !unlocked
                        ? "🔒 잠김"
                        : selectedClass === classData.id
                            ? "선택됨"
                            : "선택"
                }
            </button>
        `;

        if (unlocked) {

            card.querySelector("button").addEventListener("click", () => {

                selectedClass = classData.id;

                renderClassMenu();
                updateMenuUI();
            });
        }

        container.appendChild(card);
    });
}


/* =========================================================
   상점
========================================================= */

function renderShop() {

    const container = document.getElementById("shopContent");

    container.innerHTML = "";

    const assassinUnlocked =
        localStorage.getItem("odysseyAssassinUnlocked") === "true";

    const assassinPrice = 500;

    const assassinItem = document.createElement("div");

    assassinItem.className = "shop-item";

    assassinItem.innerHTML = `
        <h3>🗡️ 암살자</h3>

        <p>
            쌍단검을 사용하는 고속 공격형 직업.<br>
            공격력은 낮지만 매우 빠른 공격속도와
            크리티컬 확률 +50% 보정을 가집니다.
        </p>

        <button
            id="buyAssassin"
            ${assassinUnlocked || coins < assassinPrice ? "disabled" : ""}
        >
            ${
                assassinUnlocked
                    ? "구매 완료"
                    : `🪙 ${assassinPrice} 구매`
            }
        </button>
    `;

    container.appendChild(assassinItem);

    document
        .getElementById("buyAssassin")
        .addEventListener("click", () => {

            if (coins < assassinPrice) return;

            coins -= assassinPrice;

            localStorage.setItem(
                "odysseyAssassinUnlocked",
                "true"
            );

            saveCoins();

            renderShop();
            updateMenuUI();
        });


    const comingSoon = document.createElement("div");

    comingSoon.className = "coming-soon";

    comingSoon.innerHTML = `
        <strong>COMING SOON</strong>
        새로운 직업과 콘텐츠가<br>
        추후 업데이트를 통해 추가될 예정입니다.
    `;

    container.appendChild(comingSoon);
}


/* =========================================================
   게임 시작
========================================================= */

function startGame() {

    const classData = classes[selectedClass];

    level = 1;
    experience = 0;
    experienceNeeded = 20;

    kills = 0;
    runCoins = 0;

    enemies = [];
    projectiles = [];
    xpGems = [];
    effects = [];

    player = {

        x: width / 2,
        y: height / 2,

        radius: 18,

        hp: classData.hp,
        maxHp: classData.hp,

        damage: classData.damage,

        attackCooldown:
            classData.attackCooldown,

        attackTimer: 0,

        attackRange:
            classData.attackRange,

        moveSpeed:
            classData.moveSpeed,

        moveSpeedMultiplier: 1,

        damageMultiplier: 1,

        attackSpeedMultiplier: 1,

        critChance:
            classData.critBonus || 0.05,

        critMultiplier: 2,

        xpRange: 55,

        projectileSpeed:
            classData.projectileSpeed,

        projectilePierce: 0,

        skills: {},

        facingX: 1,
        facingY: 0
    };

    gameRunning = true;
    gamePaused = false;

    document.getElementById("levelUpScreen")
        .classList.remove("active");

    document.getElementById("gameOverScreen")
        .classList.remove("active");

    document.getElementById("gameClassName")
        .textContent = classData.name;

    updateGameUI();

    showScreen("gameScreen");

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   키보드
========================================================= */

window.addEventListener("keydown", event => {

    keys[event.key.toLowerCase()] = true;

});

window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;

});


/* =========================================================
   플레이어 이동
========================================================= */

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    const moving = dx !== 0 || dy !== 0;

    if (moving) {

        const length = Math.sqrt(dx * dx + dy * dy);

        dx /= length;
        dy /= length;

        player.x +=
            dx *
            player.moveSpeed *
            player.moveSpeedMultiplier *
            dt;

        player.y +=
            dy *
            player.moveSpeed *
            player.moveSpeedMultiplier *
            dt;

        player.facingX = dx;
        player.facingY = dy;
    }

    const margin = 30;

    player.x =
        Math.max(margin, Math.min(width - margin, player.x));

    player.y =
        Math.max(margin, Math.min(height - margin, player.y));

    return moving;
}


/* =========================================================
   적 생성
========================================================= */

function spawnEnemy() {

    const side = Math.floor(Math.random() * 4);

    let x;
    let y;

    const distance = 80;

    if (side === 0) {
        x = Math.random() * width;
        y = -distance;
    }

    if (side === 1) {
        x = width + distance;
        y = Math.random() * height;
    }

    if (side === 2) {
        x = Math.random() * width;
        y = height + distance;
    }

    if (side === 3) {
        x = -distance;
        y = Math.random() * height;
    }

    const random = Math.random();

    let enemy;

    if (random < 0.10) {

        enemy = {
            type: "tank",
            x,
            y,
            radius: 25,
            hp: 60,
            maxHp: 60,
            damage: 8,
            speed: 75,
            attackTimer: 0,
            attackCooldown: 1.5,
            xp: 10
        };

    } else if (random < 0.25) {

        enemy = {
            type: "fast",
            x,
            y,
            radius: 13,
            hp: 10,
            maxHp: 10,
            damage: 4,
            speed: 190,
            attackTimer: 0,
            attackCooldown: 1.0,
            xp: 5
        };

    } else {

        enemy = {
            type: "normal",
            x,
            y,
            radius: 17,
            hp: 20,
            maxHp: 20,
            damage: 5,
            speed: 135,
            attackTimer: 0,
            attackCooldown: 1.25,
            xp: 5
        };
    }

    enemies.push(enemy);
}


/* =========================================================
   적 업데이트
========================================================= */

function updateEnemies(dt) {

    enemies.forEach(enemy => {

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance > player.radius + enemy.radius + 3) {

            enemy.x +=
                (dx / distance) *
                enemy.speed *
                dt;

            enemy.y +=
                (dy / distance) *
                enemy.speed *
                dt;

        } else {

            enemy.attackTimer -= dt;

            if (enemy.attackTimer <= 0) {

                damagePlayer(enemy.damage);

                enemy.attackTimer =
                    enemy.attackCooldown;
            }
        }
    });
}


/* =========================================================
   플레이어 피해
========================================================= */

function damagePlayer(amount) {

    if (!player || !gameRunning) return;

    player.hp -= amount;

    createHitEffect(
        player.x,
        player.y,
        "#ff5555"
    );

    if (player.hp <= 0) {

        player.hp = 0;

        gameOver();
    }
}


/* =========================================================
   공격
========================================================= */

function updatePlayerAttack(dt, moving) {

    player.attackTimer -= dt;

    if (player.attackTimer > 0) return;

    const classData = classes[selectedClass];

    /*
       궁수는 정지 상태에서만 공격
    */

    if (selectedClass === "archer" && moving) {
        return;
    }

    let target = null;
    let closestDistance = Infinity;

    enemies.forEach(enemy => {

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (
            distance <= player.attackRange &&
            distance < closestDistance
        ) {
            target = enemy;
            closestDistance = distance;
        }
    });

    if (!target) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    const dirX = dx / distance;
    const dirY = dy / distance;

    player.facingX = dirX;
    player.facingY = dirY;

    const damage =
        player.damage *
        player.damageMultiplier;

    const crit =
        Math.random() < player.critChance;

    const finalDamage =
        crit
            ? damage * player.critMultiplier
            : damage;

    if (selectedClass === "archer") {

        projectiles.push({
            x: player.x,
            y: player.y,
            vx: dirX * player.projectileSpeed,
            vy: dirY * player.projectileSpeed,
            radius: 5,
            damage: finalDamage,
            life: 1.2,
            pierce: player.projectilePierce,
            crit
        });

    } else {

        /*
            근접 공격
        */

        enemies.forEach(enemy => {

            const ex = enemy.x - player.x;
            const ey = enemy.y - player.y;

            const enemyDistance =
                Math.sqrt(ex * ex + ey * ey);

            if (enemyDistance <= player.attackRange) {

                enemy.hp -= finalDamage;

                const push =
                    selectedClass === "barbarian"
                        ? 190
                        : selectedClass === "knight"
                            ? 80
                            : 40;

                enemy.x +=
                    (ex / Math.max(enemyDistance, 1)) *
                    push *
                    0.04;

                enemy.y +=
                    (ey / Math.max(enemyDistance, 1)) *
                    push *
                    0.04;

                createHitEffect(
                    enemy.x,
                    enemy.y,
                    crit ? "#ffe66d" : "#ffffff"
                );

                if (enemy.hp <= 0) {

                    killEnemy(enemy);
                }
            }
        });

        createSlashEffect();
    }

    player.attackTimer =
        player.attackCooldown /
        player.attackSpeedMultiplier;
}


/* =========================================================
   투사체
========================================================= */

function updateProjectiles(dt) {

    projectiles.forEach(projectile => {

        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;

        projectile.life -= dt;

        enemies.forEach(enemy => {

            if (projectile.life <= 0) return;

            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            if (
                distance <
                enemy.radius + projectile.radius
            ) {

                enemy.hp -= projectile.damage;

                createHitEffect(
                    enemy.x,
                    enemy.y,
                    projectile.crit
                        ? "#ffe66d"
                        : "#ffffff"
                );

                projectile.pierce--;

                if (enemy.hp <= 0) {
                    killEnemy(enemy);
                }

                if (projectile.pierce < 0) {
                    projectile.life = 0;
                }
            }
        });
    });

    projectiles =
        projectiles.filter(projectile =>
            projectile.life > 0
        );
}


/* =========================================================
   적 처치
========================================================= */

function killEnemy(enemy) {

    const index = enemies.indexOf(enemy);

    if (index === -1) return;

    enemies.splice(index, 1);

    kills++;

    runCoins += 1;

    xpGems.push({
        x: enemy.x,
        y: enemy.y,
        radius: 6,
        value: enemy.xp,
        magnet: false
    });

    createHitEffect(
        enemy.x,
        enemy.y,
        "#8cff8c"
    );
}


/* =========================================================
   경험치
========================================================= */

function updateXpGems(dt) {

    xpGems.forEach(gem => {

        const dx = player.x - gem.x;
        const dy = player.y - gem.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance <= player.xpRange) {

            gem.magnet = true;
        }

        if (gem.magnet) {

            const speed =
                Math.min(850, 250 + distance * 2);

            gem.x +=
                (dx / Math.max(distance, 1)) *
                speed *
                dt;

            gem.y +=
                (dy / Math.max(distance, 1)) *
                speed *
                dt;
        }

        const newDx = player.x - gem.x;
        const newDy = player.y - gem.y;

        const newDistance =
            Math.sqrt(
                newDx * newDx +
                newDy * newDy
            );

        if (newDistance < player.radius + gem.radius) {

            gainExperience(gem.value);

            gem.collected = true;
        }
    });

    xpGems =
        xpGems.filter(gem => !gem.collected);
}


/* =========================================================
   경험치 획득
========================================================= */

function gainExperience(amount) {

    experience += amount;

    while (experience >= experienceNeeded) {

        experience -= experienceNeeded;

        level++;

        experienceNeeded =
            Math.floor(
                20 *
                Math.pow(level, 1.25)
            );

        levelUp();
    }
}


/* =========================================================
   레벨업
========================================================= */

function levelUp() {

    gamePaused = true;

    const cards = generateCards();

    const container =
        document.getElementById("cardContainer");

    container.innerHTML = "";

    cards.forEach(card => {

        const element =
            document.createElement("button");

        element.className = "level-card";

        element.innerHTML = `
            <div class="card-rarity">
                ${getRarityName(card.rarity)}
            </div>

            <h3>${card.name}</h3>

            <p>${card.description}</p>

            <span class="card-type">
                ${card.type}
            </span>
        `;

        element.addEventListener("click", () => {

            card.apply();

            document
                .getElementById("levelUpScreen")
                .classList.remove("active");

            gamePaused = false;

            updateGameUI();
        });

        container.appendChild(element);
    });

    document
        .getElementById("levelUpScreen")
        .classList.add("active");
}


/* =========================================================
   카드 생성
========================================================= */

function generateCards() {

    let pool = [
        ...commonCards,
        ...(weaponCards[selectedClass] || []),
        ...commonSkills,
        ...(classSkills[selectedClass] || [])
    ];

    /*
       5레벨마다 희귀 카드 확률 상승
    */

    const rarityBonus =
        Math.floor(level / 5);

    let weightedPool = [];

    pool.forEach(card => {

        let weight = 1;

        weight +=
            Math.max(
                0,
                (card.rarity - 1) * rarityBonus
            );

        for (let i = 0; i < weight; i++) {
            weightedPool.push(card);
        }
    });

    const selected = [];

    while (
        selected.length < 3 &&
        weightedPool.length > 0
    ) {

        const index =
            Math.floor(
                Math.random() *
                weightedPool.length
            );

        const card =
            weightedPool[index];

        if (!selected.includes(card)) {
            selected.push(card);
        }

        weightedPool =
            weightedPool.filter(
                item => item !== card
            );
    }

    return selected;
}


/* =========================================================
   희귀도
========================================================= */

function getRarityName(rarity) {

    if (rarity >= 4) return "전설";
    if (rarity === 3) return "희귀";
    if (rarity === 2) return "고급";

    return "일반";
}


/* =========================================================
   이펙트
========================================================= */

function createHitEffect(x, y, color) {

    effects.push({
        type: "hit",
        x,
        y,
        life: 0.25,
        maxLife: 0.25,
        color
    });
}

function createSlashEffect() {

    effects.push({
        type: "slash",
        x: player.x,
        y: player.y,
        life: 0.16,
        maxLife: 0.16,
        angle:
            Math.atan2(
                player.facingY,
                player.facingX
            )
    });
}

function updateEffects(dt) {

    effects.forEach(effect => {
        effect.life -= dt;
    });

    effects =
        effects.filter(effect =>
            effect.life > 0
        );
}


/* =========================================================
   스킬
========================================================= */

let lightningTimer = 3;
let fireballTimer = 4;

function updateSkills(dt) {

    /*
       번개
    */

    if (player.skills.lightning) {

        lightningTimer -= dt;

        if (
            lightningTimer <= 0 &&
            enemies.length > 0
        ) {

            const target =
                enemies[
                    Math.floor(
                        Math.random() *
                        enemies.length
                    )
                ];

            const damage =
                20 *
                player.skills.lightning;

            target.hp -= damage;

            createHitEffect(
                target.x,
                target.y,
                "#8ed6ff"
            );

            if (target.hp <= 0) {
                killEnemy(target);
            }

            lightningTimer = 2.5;
        }
    }


    /*
       화염구
    */

    if (player.skills.fireball) {

        fireballTimer -= dt;

        if (
            fireballTimer <= 0 &&
            enemies.length > 0
        ) {

            let target = enemies[0];

            let closest = Infinity;

            enemies.forEach(enemy => {

                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;

                const distance =
                    Math.sqrt(dx * dx + dy * dy);

                if (distance < closest) {
                    closest = distance;
                    target = enemy;
                }
            });

            projectiles.push({
                x: player.x,
                y: player.y,
                vx:
                    ((target.x - player.x) /
                    Math.max(closest, 1)) *
                    420,

                vy:
                    ((target.y - player.y) /
                    Math.max(closest, 1)) *
                    420,

                radius: 10,

                damage:
                    30 *
                    player.skills.fireball,

                life: 2,

                pierce: 0,

                crit: false
            });

            fireballTimer = 4;
        }
    }
}


/* =========================================================
   UI 업데이트
========================================================= */

function updateGameUI() {

    if (!player) return;

    document.getElementById("levelText")
        .textContent = level;

    document.getElementById("hpText")
        .textContent =
        `${Math.ceil(player.hp)} / ${player.maxHp}`;

    document.getElementById("hpFill")
        .style.width =
        `${Math.max(
            0,
            (player.hp / player.maxHp) * 100
        )}%`;

    document.getElementById("xpFill")
        .style.width =
        `${Math.min(
            100,
            (experience / experienceNeeded) * 100
        )}%`;

    document.getElementById("gameCoins")
        .textContent = runCoins;

    document.getElementById("killCount")
        .textContent = kills;
}


/* =========================================================
   렌더링
========================================================= */

function drawBackground() {

    ctx.fillStyle = "#171b21";
    ctx.fillRect(0, 0, width, height);

    const gridSize = 50;

    ctx.strokeStyle = "#202630";
    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < width;
        x += gridSize
    ) {

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (
        let y = 0;
        y < height;
        y += gridSize
    ) {

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}


function drawPlayer() {

    if (!player) return;

    const classData =
        classes[selectedClass];

    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    /*
       캐릭터
    */

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        selectedClass === "archer"
            ? "#6bb6ff"
            : selectedClass === "barbarian"
                ? "#d86b6b"
                : selectedClass === "assassin"
                    ? "#9f7aea"
                    : "#d7dce2";

    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.stroke();


    /*
       방향 표시
    */

    ctx.beginPath();

    ctx.moveTo(
        player.facingX * 26,
        player.facingY * 26
    );

    ctx.lineTo(
        player.facingX * 12 -
        player.facingY * 5,
        player.facingY * 12 +
        player.facingX * 5
    );

    ctx.lineTo(
        player.facingX * 12 +
        player.facingY * 5,
        player.facingY * 12 -
        player.facingX * 5
    );

    ctx.closePath();

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();


    /*
       공격 범위는 실제 게임에서는 보이지 않게 함
    */
}


function drawEnemies() {

    enemies.forEach(enemy => {

        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            enemy.radius,
            0,
            Math.PI * 2
        );

        if (enemy.type === "fast") {
            ctx.fillStyle = "#d99b5e";
        } else if (enemy.type === "tank") {
            ctx.fillStyle = "#65727f";
        } else {
            ctx.fillStyle = "#6ab06a";
        }

        ctx.fill();

        ctx.strokeStyle = "#151515";
        ctx.lineWidth = 2;

        ctx.stroke();

        ctx.restore();


        /*
           HP bar
        */

        const barWidth =
            enemy.radius * 2;

        const hpPercent =
            enemy.hp / enemy.maxHp;

        ctx.fillStyle = "#20242a";

        ctx.fillRect(
            enemy.x - barWidth / 2,
            enemy.y - enemy.radius - 10,
            barWidth,
            4
        );

        ctx.fillStyle = "#e05555";

        ctx.fillRect(
            enemy.x - barWidth / 2,
            enemy.y - enemy.radius - 10,
            barWidth * hpPercent,
            4
        );
    });
}


function drawProjectiles() {

    projectiles.forEach(projectile => {

        ctx.beginPath();

        ctx.arc(
            projectile.x,
            projectile.y,
            projectile.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            projectile.radius > 7
                ? "#ff934f"
                : "#f2f5f7";

        ctx.fill();
    });
}


function drawXpGems() {

    xpGems.forEach(gem => {

        ctx.save();

        ctx.translate(
            gem.x,
            gem.y
        );

        ctx.rotate(
            Math.PI / 4
        );

        ctx.fillStyle = "#67d9ff";

        ctx.fillRect(
            -5,
            -5,
            10,
            10
        );

        ctx.restore();
    });
}


function drawEffects() {

    effects.forEach(effect => {

        const alpha =
            effect.life / effect.maxLife;

        if (effect.type === "hit") {

            ctx.save();

            ctx.globalAlpha = alpha;

            ctx.beginPath();

            ctx.arc(
                effect.x,
                effect.y,
                15 +
                (1 - alpha) * 25,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle =
                effect.color;

            ctx.lineWidth = 3;

            ctx.stroke();

            ctx.restore();
        }

        if (effect.type === "slash") {

            ctx.save();

            ctx.translate(
                effect.x,
                effect.y
            );

            ctx.rotate(effect.angle);

            ctx.globalAlpha = alpha;

            ctx.strokeStyle = "#ffffff";

            ctx.lineWidth = 8;

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                selectedClass === "barbarian"
                    ? 100
                    : 70,
                -0.8,
                0.8
            );

            ctx.stroke();

            ctx.restore();
        }
    });
}


/* =========================================================
   게임 렌더
========================================================= */

function render() {

    drawBackground();

    drawXpGems();

    drawEnemies();

    drawProjectiles();

    drawPlayer();

    drawEffects();
}


/* =========================================================
   게임 루프
========================================================= */

function gameLoop(timestamp) {

    if (!gameRunning) return;

    const dt =
        Math.min(
            (timestamp - lastTime) / 1000,
            0.05
        );

    lastTime = timestamp;

    if (!gamePaused) {

        const moving =
            updatePlayer(dt);

        updatePlayerAttack(
            dt,
            moving
        );

        updateProjectiles(dt);

        updateEnemies(dt);

        updateXpGems(dt);

        updateSkills(dt);

        updateEffects(dt);


        /*
           적 생성
        */

        enemySpawnTimer -= dt;

        if (enemySpawnTimer <= 0) {

            /*
               시간이 지날수록 적 생성량 증가
            */

            const spawnCount =
                level >= 15
                    ? 3
                    : level >= 8
                        ? 2
                        : 1;

            for (
                let i = 0;
                i < spawnCount;
                i++
            ) {
                spawnEnemy();
            }

            enemySpawnTimer =
                Math.max(
                    0.25,
                    0.8 -
                    level * 0.015
                );
        }

        updateGameUI();
    }

    render();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   게임 오버
========================================================= */

function gameOver() {

    gameRunning = false;
    gamePaused = true;

    coins += runCoins;

    saveCoins();

    document.getElementById("resultLevel")
        .textContent = level;

    document.getElementById("resultKills")
        .textContent = kills;

    document.getElementById("resultCoins")
        .textContent = runCoins;

    document.getElementById("gameOverScreen")
        .classList.add("active");
}


/* =========================================================
   이벤트
========================================================= */

document
    .getElementById("startButton")
    .addEventListener("click", () => {

        startGame();
    });


document
    .getElementById("classButton")
    .addEventListener("click", () => {

        renderClassMenu();

        showScreen("classMenu");
    });


document
    .getElementById("classBackButton")
    .addEventListener("click", () => {

        updateMenuUI();

        showScreen("mainMenu");
    });


document
    .getElementById("shopButton")
    .addEventListener("click", () => {

        renderShop();

        updateMenuUI();

        showScreen("shopMenu");
    });


document
    .getElementById("shopBackButton")
    .addEventListener("click", () => {

        updateMenuUI();

        showScreen("mainMenu");
    });


document
    .getElementById("returnMenuButton")
    .addEventListener("click", () => {

        document
            .getElementById("gameOverScreen")
            .classList.remove("active");

        gamePaused = false;

        updateMenuUI();

        showScreen("mainMenu");
    });


/* =========================================================
   초기화
========================================================= */

updateMenuUI();
