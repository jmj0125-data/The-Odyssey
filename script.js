
/* =========================================================
   ODYSSEY 1.1
   Combat / Skill / Camera / Pause / Audio Update
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
   AUDIO
========================================================= */

const audio = {

    bgm: new Audio("assets/sounds/Hero Immortal.mp3"),
    sword: new Audio("assets/sounds/sword_sfx.wav"),
    shoot: new Audio("assets/sounds/shoot.ogg"),
    enemyDeath: new Audio("assets/sounds/hit01.wav")
};


/*
   배경 음악
*/

audio.bgm.loop = true;
audio.bgm.volume = 0.35;


/*
   효과음 볼륨
*/

audio.sword.volume = 0.65;
audio.shoot.volume = 0.60;
audio.enemyDeath.volume = 0.55;


/*
   효과음은 동시에 여러 번 발생할 수 있으므로
   재생할 때마다 복제해서 사용
*/

function playSound(sound, volume = 1) {

    if (!sound) return;

    const clone = sound.cloneNode();

    clone.volume =
        Math.max(
            0,
            Math.min(
                1,
                sound.volume * volume
            )
        );

    clone.play().catch(() => {});
}


/*
   배경음악 시작
*/

function startBGM() {

    audio.bgm.currentTime = 0;

    audio.bgm.play().catch(() => {

        /*
           브라우저의 자동재생 제한 때문에
           재생이 막히는 경우가 있을 수 있음.
           게임 시작 버튼을 클릭한 뒤 실행되므로
           일반적으로 정상 재생됨.
        */

    });
}


/*
   배경음악 일시정지
*/

function pauseBGM() {

    if (!audio.bgm.paused) {

        audio.bgm.pause();
    }
}


/*
   배경음악 재개
*/

function resumeBGM() {

    if (audio.bgm.paused) {

        audio.bgm.play().catch(() => {});
    }
}


/*
   배경음악 정지
*/

function stopBGM() {

    audio.bgm.pause();

    audio.bgm.currentTime = 0;
}


/* =========================================================
   SAVE
========================================================= */

let coins =
    Number(
        localStorage.getItem("odysseyCoins")
    ) || 0;

function saveCoins() {

    localStorage.setItem(
        "odysseyCoins",
        String(coins)
    );
}


/* =========================================================
   CLASSES
========================================================= */

const classes = {

    archer: {

        id: "archer",
        name: "궁수",
        icon: "🏹",
        weapon: "활과 화살",

        hp: 100,
        damage: 6,

        attackCooldown: .32,

        attackRange: 330,

        projectileSpeed: 700,

        moveSpeed: 270,

        description:
            "빠른 원거리 공격이 가능하지만 이동 중에는 공격할 수 없습니다.",

        stats: [
            "공격력: 6",
            "공격속도: 매우 빠름",
            "공격범위: 원거리",
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

        attackCooldown: .85,

        attackRange: 120,

        projectileSpeed: 0,

        moveSpeed: 250,

        description:
            "공격력, 공격속도, 범위가 균형 잡힌 기본형 직업입니다.",

        stats: [
            "공격력: 10",
            "공격속도: 보통",
            "공격범위: 중간",
            "균형형 직업"
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

        attackRange: 170,

        projectileSpeed: 0,

        moveSpeed: 235,

        description:
            "느리지만 강력하고 넓은 대검 공격을 사용하는 직업입니다.",

        stats: [
            "공격력: 25",
            "공격속도: 느림",
            "공격범위: 매우 넓음",
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

        attackCooldown: .25,

        attackRange: 78,

        projectileSpeed: 0,

        moveSpeed: 290,

        critBonus: .50,

        description:
            "낮은 공격력 대신 매우 빠른 공격속도와 높은 치명타 확률을 지닙니다.",

        stats: [
            "공격력: 4",
            "공격속도: 극도로 빠름",
            "공격범위: 짧음",
            "치명타 확률 +50%"
        ]
    }
};


/* =========================================================
   GAME STATE
========================================================= */

let selectedClass = "knight";

let gameRunning = false;
let gamePaused = false;
let pauseMenuOpen = false;

let player = null;

let enemies = [];
let projectiles = [];
let xpGems = [];

let effects = [];
let damageTexts = [];

let camera = {
    x: 0,
    y: 0
};

let level = 1;

let experience = 0;
let experienceNeeded = 20;

let kills = 0;
let runCoins = 0;

let lastTime = 0;

let enemySpawnTimer = 0;

let shake = 0;

let keys = {};

let skillTimers = {};

let announcementTimer = null;


/* =========================================================
   WORLD
========================================================= */

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;


/* =========================================================
   CARDS
========================================================= */

const commonCards = [

    {
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
        type: "능력 강화",
        name: "힘 강화",
        description: "공격력 +10%",
        rarity: 1,

        apply() {

            player.damageMultiplier *= 1.10;
        }
    },

    {
        type: "능력 강화",
        name: "신속",
        description: "공격속도 +10%",
        rarity: 1,

        apply() {

            player.attackSpeedMultiplier *= 1.10;
        }
    },

    {
        type: "능력 강화",
        name: "질주",
        description: "이동속도 +8%",
        rarity: 1,

        apply() {

            player.moveSpeedMultiplier *= 1.08;
        }
    },

    {
        type: "능력 강화",
        name: "예리한 감각",
        description: "치명타 확률 +5%",
        rarity: 1,

        apply() {

            player.critChance += .05;
        }
    },

    {
        type: "능력 강화",
        name: "치명적인 일격",
        description: "치명타 피해량 +25%",
        rarity: 2,

        apply() {

            player.critMultiplier += .25;
        }
    },

    {
        type: "능력 강화",
        name: "탐욕의 눈",
        description: "경험치 획득 범위 +30%",
        rarity: 1,

        apply() {

            player.xpRange *= 1.30;
        }
    }
];


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
            description: "화살이 적을 추가로 관통합니다.",
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

                player.critChance += .10;
            }
        }
    ]
};


const commonSkills = [

    {
        type: "공용 스킬",
        name: "⚡ 번개",
        description:
            "일정 시간마다 무작위 적에게 강력한 번개를 떨어뜨립니다.",
        rarity: 2,

        icon: "⚡",

        apply() {

            player.skills.lightning =
                (player.skills.lightning || 0) + 1;

            announceSkill("⚡ 번개 습득!");
        }
    },

    {
        type: "공용 스킬",
        name: "🔥 화염구",
        description:
            "주기적으로 가장 가까운 적에게 화염구를 발사합니다.",
        rarity: 2,

        icon: "🔥",

        apply() {

            player.skills.fireball =
                (player.skills.fireball || 0) + 1;

            announceSkill("🔥 화염구 습득!");
        }
    },

    {
        type: "공용 스킬",
        name: "🧲 자석",
        description:
            "경험치 획득 범위가 크게 증가합니다.",
        rarity: 2,

        icon: "🧲",

        apply() {

            player.xpRange *= 1.60;

            player.skills.magnet =
                (player.skills.magnet || 0) + 1;

            announceSkill("🧲 자석 강화!");
        }
    }
];


const classSkills = {

    archer: [

        {
            type: "궁수 전용 스킬",
            name: "💥 폭발 화살",
            description:
                "화살 적중 시 작은 폭발이 발생합니다.",
            rarity: 3,

            icon: "💥",

            apply() {

                player.skills.explosiveArrow =
                    (player.skills.explosiveArrow || 0) + 1;

                announceSkill("💥 폭발 화살!");
            }
        },

        {
            type: "궁수 전용 스킬",
            name: "🎯 집중 사격",
            description:
                "정지 상태에서 공격력이 크게 증가합니다.",
            rarity: 3,

            icon: "🎯",

            apply() {

                player.skills.focusShot =
                    (player.skills.focusShot || 0) + 1;

                announceSkill("🎯 집중 사격!");
            }
        }
    ],

    knight: [

        {
            type: "기사 전용 스킬",
            name: "🛡️ 방패 강타",
            description:
                "검 공격 시 강한 넉백이 발생합니다.",
            rarity: 3,

            icon: "🛡️",

            apply() {

                player.skills.shieldBash =
                    (player.skills.shieldBash || 0) + 1;

                announceSkill("🛡️ 방패 강타!");
            }
        },

        {
            type: "기사 전용 스킬",
            name: "⚔️ 회전 베기",
            description:
                "주기적으로 주변 적에게 강력한 회전 공격을 합니다.",
            rarity: 3,

            icon: "⚔️",

            apply() {

                player.skills.spinSlash =
                    (player.skills.spinSlash || 0) + 1;

                announceSkill("⚔️ 회전 베기!");
            }
        }
    ],

    barbarian: [

        {
            type: "바바리안 전용 스킬",
            name: "💥 대지 분쇄",
            description:
                "대검 공격 시 강력한 충격파를 발생시킵니다.",
            rarity: 3,

            icon: "💥",

            apply() {

                player.skills.groundSmash =
                    (player.skills.groundSmash || 0) + 1;

                announceSkill("💥 대지 분쇄!");
            }
        },

        {
            type: "바바리안 전용 스킬",
            name: "🔥 광전사",
            description:
                "HP가 낮을수록 공격력이 증가합니다.",
            rarity: 3,

            icon: "🔥",

            apply() {

                player.skills.berserker =
                    (player.skills.berserker || 0) + 1;

                announceSkill("🔥 광전사!");
            }
        }
    ],

    assassin: [

        {
            type: "암살자 전용 스킬",
            name: "🗡️ 암살",
            description:
                "체력이 낮은 적에게 추가 피해를 줍니다.",
            rarity: 3,

            icon: "🗡️",

            apply() {

                player.skills.assassination =
                    (player.skills.assassination || 0) + 1;

                announceSkill("🗡️ 암살!");
            }
        },

        {
            type: "암살자 전용 스킬",
            name: "🌑 그림자 춤",
            description:
                "공격 후 잠시 이동속도가 증가합니다.",
            rarity: 3,

            icon: "🌑",

            apply() {

                player.skills.shadowDance =
                    (player.skills.shadowDance || 0) + 1;

                announceSkill("🌑 그림자 춤!");
            }
        }
    ]
};


/* =========================================================
   SCREEN
========================================================= */

function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.remove("active");
        });

    document
        .getElementById(id)
        .classList.add("active");
}


/* =========================================================
   MENU UI
========================================================= */

function updateMenuUI() {

    document.getElementById("menuCoins")
        .textContent = coins;

    document.getElementById("shopCoins")
        .textContent = coins;

    document.getElementById("currentClassName")
        .textContent =
        classes[selectedClass].name;
}


/* =========================================================
   CLASS MENU
========================================================= */

function renderClassMenu() {

    const container =
        document.getElementById("classCards");

    container.innerHTML = "";

    Object.values(classes).forEach(classData => {

        const unlocked =
            classData.id !== "assassin" ||
            localStorage.getItem(
                "odysseyAssassinUnlocked"
            ) === "true";

        const card =
            document.createElement("div");

        card.className =
            "class-card" +
            (
                selectedClass === classData.id
                    ? " selected"
                    : ""
            );

        card.innerHTML = `

            <div class="class-icon">
                ${classData.icon}
            </div>

            <h3>
                ${classData.name}
            </h3>

            <p>
                ${classData.description}
            </p>

            <div class="stat-list">

                ${
                    classData.stats
                        .map(
                            stat =>
                            `<div>• ${stat}</div>`
                        )
                        .join("")
                }

            </div>

            <button
                ${unlocked ? "" : "disabled"}
            >

                ${
                    !unlocked
                        ? "🔒 잠김"
                        :
                        selectedClass === classData.id
                            ? "선택됨"
                            : "선택"
                }

            </button>
        `;

        if (unlocked) {

            card
                .querySelector("button")
                .addEventListener(
                    "click",
                    () => {

                        selectedClass =
                            classData.id;

                        renderClassMenu();

                        updateMenuUI();
                    }
                );
        }

        container.appendChild(card);
    });
}


/* =========================================================
   SHOP
========================================================= */

function renderShop() {

    const container =
        document.getElementById("shopContent");

    container.innerHTML = "";

    const unlocked =
        localStorage.getItem(
            "odysseyAssassinUnlocked"
        ) === "true";

    const price = 500;

    const item =
        document.createElement("div");

    item.className = "shop-item";

    item.innerHTML = `

        <h3>
            🗡️ 암살자
        </h3>

        <p>

            쌍단검을 사용하는 고속 공격형 직업.<br>

            낮은 공격력을 가지고 있지만
            매우 빠른 공격속도와
            치명타 확률 +50% 보정을 가집니다.

        </p>

        <button
            id="buyAssassin"
            ${
                unlocked || coins < price
                    ? "disabled"
                    : ""
            }
        >

            ${
                unlocked
                    ? "구매 완료"
                    : `🪙 ${price} 구매`
            }

        </button>
    `;

    container.appendChild(item);

    document
        .getElementById("buyAssassin")
        .addEventListener(
            "click",
            () => {

                if (coins < price) return;

                coins -= price;

                localStorage.setItem(
                    "odysseyAssassinUnlocked",
                    "true"
                );

                saveCoins();

                renderShop();

                updateMenuUI();
            }
        );


    const comingSoon =
        document.createElement("div");

    comingSoon.className =
        "coming-soon";

    comingSoon.innerHTML = `

        <strong>
            COMING SOON
        </strong>

        새로운 직업과 콘텐츠가
        추후 업데이트를 통해
        추가될 예정입니다.

    `;

    container.appendChild(
        comingSoon
    );
}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

    const classData =
        classes[selectedClass];

    level = 1;

    experience = 0;

    experienceNeeded = 20;

    kills = 0;

    runCoins = 0;

    enemies = [];

    projectiles = [];

    xpGems = [];

    effects = [];

    damageTexts = [];

    shake = 0;

    enemySpawnTimer = 0;

    pauseMenuOpen = false;

    gamePaused = false;

    skillTimers = {
        lightning: 2,
        fireball: 3,
        spinSlash: 4,
        groundSmash: 5
    };


    player = {

        x:
            WORLD_WIDTH / 2,

        y:
            WORLD_HEIGHT / 2,

        radius: 18,

        hp:
            classData.hp,

        maxHp:
            classData.hp,

        damage:
            classData.damage,

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
            classData.critBonus || .05,

        critMultiplier: 2,

        xpRange: 70,

        projectileSpeed:
            classData.projectileSpeed,

        projectilePierce: 0,

        skills: {},

        facingX: 1,

        facingY: 0,

        shadowBoost: 0
    };


    camera.x =
        player.x - width / 2;

    camera.y =
        player.y - height / 2;


    gameRunning = true;

    document
        .getElementById("pauseScreen")
        .classList.remove("active");

    document
        .getElementById("levelUpScreen")
        .classList.remove("active");

    document
        .getElementById("gameOverScreen")
        .classList.remove("active");

    document
        .getElementById("gameClassName")
        .textContent =
        classData.name;

    updateSkillBar();

    updateGameUI();

    showScreen("gameScreen");


    /*
       게임 시작 시 배경음악 재생
    */

    startBGM();


    lastTime =
        performance.now();

    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   KEYBOARD
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        const key =
            event.key.toLowerCase();

        if (key === "escape") {

            event.preventDefault();

            togglePause();

            return;
        }

        keys[key] = true;
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[
            event.key.toLowerCase()
        ] = false;
    }
);


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

    if (!gameRunning) return;

    if (
        document
            .getElementById("levelUpScreen")
            .classList.contains("active")
    ) {
        return;
    }

    pauseMenuOpen =
        !pauseMenuOpen;

    gamePaused =
        pauseMenuOpen;

    document
        .getElementById("pauseScreen")
        .classList.toggle(
            "active",
            pauseMenuOpen
        );


    /*
       음악도 같이 일시정지
    */

    if (pauseMenuOpen) {

        pauseBGM();

    } else {

        resumeBGM();
    }


    lastTime =
        performance.now();
}


/* =========================================================
   PLAYER
========================================================= */

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    const moving =
        dx !== 0 ||
        dy !== 0;

    if (moving) {

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        dx /= length;
        dy /= length;

        let speed =
            player.moveSpeed *
            player.moveSpeedMultiplier;

        if (
            player.skills.shadowDance &&
            player.shadowBoost > 0
        ) {

            speed *= 1.45;
        }

        player.x +=
            dx *
            speed *
            dt;

        player.y +=
            dy *
            speed *
            dt;

        player.facingX = dx;
        player.facingY = dy;
    }

    const margin = 50;

    player.x =
        Math.max(
            margin,
            Math.min(
                WORLD_WIDTH - margin,
                player.x
            )
        );

    player.y =
        Math.max(
            margin,
            Math.min(
                WORLD_HEIGHT - margin,
                player.y
            )
        );

    if (player.shadowBoost > 0) {

        player.shadowBoost -= dt;
    }

    const targetCameraX =
        player.x - width / 2;

    const targetCameraY =
        player.y - height / 2;

    camera.x +=
        (
            targetCameraX -
            camera.x
        ) *
        Math.min(
            1,
            dt * 8
        );

    camera.y +=
        (
            targetCameraY -
            camera.y
        ) *
        Math.min(
            1,
            dt * 8
        );

    camera.x =
        Math.max(
            0,
            Math.min(
                WORLD_WIDTH - width,
                camera.x
            )
        );

    camera.y =
        Math.max(
            0,
            Math.min(
                WORLD_HEIGHT - height,
                camera.y
            )
        );

    return moving;
}


/* =========================================================
   ENEMY SPAWN
========================================================= */

function spawnEnemy() {

    const angle =
        Math.random() *
        Math.PI * 2;

    const distance =
        Math.max(width, height) *
        .65;

    let x =
        player.x +
        Math.cos(angle) *
        distance;

    let y =
        player.y +
        Math.sin(angle) *
        distance;

    x =
        Math.max(
            30,
            Math.min(
                WORLD_WIDTH - 30,
                x
            )
        );

    y =
        Math.max(
            30,
            Math.min(
                WORLD_HEIGHT - 30,
                y
            )
        );

    const roll =
        Math.random();

    if (roll < .10) {

        enemies.push({

            type: "tank",

            x,
            y,

            radius: 27,

            hp: 80,

            maxHp: 80,

            damage: 9,

            speed: 72,

            attackTimer: 0,

            attackCooldown: 1.5,

            xp: 12
        });

    } else if (roll < .24) {

        enemies.push({

            type: "fast",

            x,
            y,

            radius: 13,

            hp: 12,

            maxHp: 12,

            damage: 4,

            speed: 195,

            attackTimer: 0,

            attackCooldown: 1,

            xp: 6
        });

    } else {

        enemies.push({

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
        });
    }
}


/* =========================================================
   ENEMIES
========================================================= */

function updateEnemies(dt) {

    enemies.forEach(enemy => {

        const dx =
            player.x -
            enemy.x;

        const dy =
            player.y -
            enemy.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (
            distance >
            player.radius +
            enemy.radius +
            4
        ) {

            enemy.x +=
                dx /
                Math.max(distance, 1) *
                enemy.speed *
                dt;

            enemy.y +=
                dy /
                Math.max(distance, 1) *
                enemy.speed *
                dt;

        } else {

            enemy.attackTimer -= dt;

            if (
                enemy.attackTimer <= 0
            ) {

                damagePlayer(
                    enemy.damage
                );

                enemy.attackTimer =
                    enemy.attackCooldown;
            }
        }
    });
}


/* =========================================================
   DAMAGE PLAYER
========================================================= */

function damagePlayer(amount) {

    if (
        !player ||
        !gameRunning
    ) {
        return;
    }

    player.hp -= amount;

    shake =
        Math.max(
            shake,
            6
        );

    addDamageText(
        player.x,
        player.y - 25,
        `-${Math.round(amount)}`,
        "#ff6b6b"
    );

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
   ATTACK
========================================================= */

function updatePlayerAttack(
    dt,
    moving
) {

    player.attackTimer -= dt;

    if (
        player.attackTimer > 0
    ) {
        return;
    }

    if (
        selectedClass === "archer" &&
        moving
    ) {
        return;
    }

    let target = null;

    let closest =
        Infinity;

    enemies.forEach(
        enemy => {

            const dx =
                enemy.x -
                player.x;

            const dy =
                enemy.y -
                player.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (
                distance <=
                player.attackRange &&
                distance < closest
            ) {

                closest =
                    distance;

                target =
                    enemy;
            }
        }
    );

    if (!target) return;

    const dx =
        target.x -
        player.x;

    const dy =
        target.y -
        player.y;

    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    const dirX =
        dx /
        Math.max(distance, 1);

    const dirY =
        dy /
        Math.max(distance, 1);

    player.facingX =
        dirX;

    player.facingY =
        dirY;

    let damage =
        player.damage *
        player.damageMultiplier;


    if (
        selectedClass === "archer" &&
        player.skills.focusShot &&
        !moving
    ) {

        damage *=
            1 +
            .30 *
            player.skills.focusShot;
    }


    if (
        selectedClass === "barbarian" &&
        player.skills.berserker
    ) {

        const hpRatio =
            player.hp /
            player.maxHp;

        damage *=
            1 +
            (
                1 -
                hpRatio
            ) *
            .8;
    }


    if (
        selectedClass === "assassin" &&
        player.skills.assassination &&
        target.hp <
        target.maxHp * .35
    ) {

        damage *=
            1 +
            .75 *
            player.skills.assassination;
    }


    const crit =
        Math.random() <
        player.critChance;

    if (crit) {

        damage *=
            player.critMultiplier;
    }


    /* =====================================================
       ARCHER
    ===================================================== */

    if (
        selectedClass === "archer"
    ) {

        projectiles.push({

            x:
                player.x,

            y:
                player.y,

            vx:
                dirX *
                player.projectileSpeed,

            vy:
                dirY *
                player.projectileSpeed,

            radius: 5,

            damage,

            life: 1.5,

            pierce:
                player.projectilePierce,

            crit,

            explosive:
                !!player.skills.explosiveArrow
        });


        /*
           🏹 궁수 공격음
        */

        playSound(
            audio.shoot
        );


        effects.push({

            type: "arrowShot",

            x:
                player.x,

            y:
                player.y,

            angle:
                Math.atan2(
                    dirY,
                    dirX
                ),

            life: .12,

            maxLife: .12
        });

    } else {

        /*
           ⚔️ 기사 검 공격음
        */

        if (
            selectedClass === "knight"
        ) {

            playSound(
                audio.sword
            );
        }


        performMeleeAttack(
            damage,
            crit
        );
    }


    player.attackTimer =
        player.attackCooldown /
        player.attackSpeedMultiplier;
}


/* =========================================================
   MELEE
========================================================= */

function performMeleeAttack(
    damage,
    crit
) {

    const angle =
        Math.atan2(
            player.facingY,
            player.facingX
        );

    let arc =
        selectedClass === "barbarian"
            ? Math.PI * .95
            : selectedClass === "assassin"
                ? Math.PI * .65
                : Math.PI * .75;


    effects.push({

        type: "melee",

        x:
            player.x,

        y:
            player.y,

        angle,

        arc,

        range:
            player.attackRange,

        classId:
            selectedClass,

        life:
            .20,

        maxLife:
            .20,

        crit
    });


    shake =
        Math.max(
            shake,
            selectedClass === "barbarian"
                ? 10
                : selectedClass === "assassin"
                    ? 3
                    : 5
        );


    enemies.forEach(
        enemy => {

            const dx =
                enemy.x -
                player.x;

            const dy =
                enemy.y -
                player.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (
                distance >
                player.attackRange +
                enemy.radius
            ) {
                return;
            }

            const enemyAngle =
                Math.atan2(
                    dy,
                    dx
                );

            let angleDifference =
                normalizeAngle(
                    enemyAngle -
                    angle
                );

            if (
                Math.abs(
                    angleDifference
                ) >
                arc / 2
            ) {
                return;
            }

            enemy.hp -= damage;


            const knockback =
                selectedClass === "barbarian"
                    ? 270
                    : selectedClass === "knight"
                        ? 120
                        : 70;

            enemy.x +=
                Math.cos(angle) *
                knockback *
                .045;

            enemy.y +=
                Math.sin(angle) *
                knockback *
                .045;


            if (
                selectedClass === "knight" &&
                player.skills.shieldBash &&
                Math.random() < .35
            ) {

                enemy.x +=
                    Math.cos(angle) *
                    100;

                enemy.y +=
                    Math.sin(angle) *
                    100;
            }


            if (
                selectedClass === "barbarian" &&
                player.skills.groundSmash
            ) {

                createShockwave(
                    enemy.x,
                    enemy.y,
                    45 +
                    player.skills.groundSmash * 12
                );

                enemy.hp -=
                    10 *
                    player.skills.groundSmash;
            }


            addDamageText(
                enemy.x,
                enemy.y - enemy.radius - 5,
                Math.round(damage),
                crit
                    ? "#ffe66d"
                    : "#ffffff",
                crit
            );


            createHitEffect(
                enemy.x,
                enemy.y,
                crit
                    ? "#ffe66d"
                    : "#ffffff"
            );


            if (
                enemy.hp <= 0
            ) {

                killEnemy(
                    enemy
                );
            }
        }
    );
}


/* =========================================================
   ANGLE
========================================================= */

function normalizeAngle(angle) {

    while (
        angle > Math.PI
    ) {

        angle -=
            Math.PI * 2;
    }

    while (
        angle < -Math.PI
    ) {

        angle +=
            Math.PI * 2;
    }

    return angle;
}


/* =========================================================
   PROJECTILES
========================================================= */

function updateProjectiles(dt) {

    projectiles.forEach(
        projectile => {

            projectile.x +=
                projectile.vx *
                dt;

            projectile.y +=
                projectile.vy *
                dt;

            projectile.life -= dt;


            enemies.forEach(
                enemy => {

                    if (
                        projectile.life <= 0
                    ) {
                        return;
                    }

                    const dx =
                        enemy.x -
                        projectile.x;

                    const dy =
                        enemy.y -
                        projectile.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance <
                        enemy.radius +
                        projectile.radius
                    ) {

                        enemy.hp -=
                            projectile.damage;


                        addDamageText(
                            enemy.x,
                            enemy.y -
                            enemy.radius -
                            5,
                            Math.round(
                                projectile.damage
                            ),
                            projectile.crit
                                ? "#ffe66d"
                                : "#ffffff",
                            projectile.crit
                        );


                        createHitEffect(
                            enemy.x,
                            enemy.y,
                            projectile.crit
                                ? "#ffe66d"
                                : "#ffffff"
                        );


                        if (
                            projectile.explosive
                        ) {

                            createShockwave(
                                enemy.x,
                                enemy.y,
                                50
                            );

                            enemies.forEach(
                                other => {

                                    if (
                                        other ===
                                        enemy
                                    ) {
                                        return;
                                    }

                                    const ex =
                                        other.x -
                                        enemy.x;

                                    const ey =
                                        other.y -
                                        enemy.y;

                                    const ed =
                                        Math.sqrt(
                                            ex * ex +
                                            ey * ey
                                        );

                                    if (
                                        ed < 50
                                    ) {

                                        other.hp -=
                                            projectile.damage *
                                            .4;

                                        addDamageText(
                                            other.x,
                                            other.y,
                                            Math.round(
                                                projectile.damage *
                                                .4
                                            ),
                                            "#ff9b54"
                                        );
                                    }
                                }
                            );
                        }


                        projectile.pierce--;


                        if (
                            enemy.hp <= 0
                        ) {

                            killEnemy(
                                enemy
                            );
                        }


                        if (
                            projectile.pierce < 0
                        ) {

                            projectile.life = 0;
                        }
                    }
                }
            );
        }
    );


    projectiles =
        projectiles.filter(
            projectile =>
                projectile.life > 0
        );
}


/* =========================================================
   KILL
========================================================= */

function killEnemy(enemy) {

    const index =
        enemies.indexOf(
            enemy
        );

    if (
        index === -1
    ) {
        return;
    }

    enemies.splice(
        index,
        1
    );

    kills++;

    runCoins++;


    /*
       💥 적 사망 효과음
    */

    playSound(
        audio.enemyDeath
    );


    xpGems.push({

        x:
            enemy.x,

        y:
            enemy.y,

        radius: 7,

        value:
            enemy.xp,

        magnet: false
    });


    for (
        let i = 0;
        i < 10;
        i++
    ) {

        effects.push({

            type: "particle",

            x:
                enemy.x,

            y:
                enemy.y,

            vx:
                (
                    Math.random() -
                    .5
                ) * 200,

            vy:
                (
                    Math.random() -
                    .5
                ) * 200,

            life:
                .45,

            maxLife:
                .45
        });
    }

    shake =
        Math.max(
            shake,
            3
        );
}


/* =========================================================
   XP
========================================================= */

function updateXpGems(dt) {

    xpGems.forEach(
        gem => {

            const dx =
                player.x -
                gem.x;

            const dy =
                player.y -
                gem.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (
                distance <=
                player.xpRange
            ) {

                gem.magnet =
                    true;
            }


            if (
                gem.magnet
            ) {

                const speed =
                    Math.min(
                        900,
                        300 +
                        distance * 2
                    );

                gem.x +=
                    dx /
                    Math.max(
                        distance,
                        1
                    ) *
                    speed *
                    dt;

                gem.y +=
                    dy /
                    Math.max(
                        distance,
                        1
                    ) *
                    speed *
                    dt;
            }


            const newDx =
                player.x -
                gem.x;

            const newDy =
                player.y -
                gem.y;

            const newDistance =
                Math.sqrt(
                    newDx * newDx +
                    newDy * newDy
                );


            if (
                newDistance <
                player.radius +
                gem.radius
            ) {

                gainExperience(
                    gem.value
                );

                gem.collected =
                    true;
            }
        }
    );


    xpGems =
        xpGems.filter(
            gem =>
                !gem.collected
        );
}


/* =========================================================
   EXPERIENCE
========================================================= */

function gainExperience(amount) {

    experience += amount;

    while (
        experience >=
        experienceNeeded
    ) {

        experience -=
            experienceNeeded;

        level++;

        experienceNeeded =
            Math.floor(
                20 *
                Math.pow(
                    level,
                    1.25
                )
            );

        levelUp();
    }
}


/* =========================================================
   LEVEL UP
========================================================= */

function levelUp() {

    gamePaused = true;

    /*
       레벨업 화면에서도 배경음악 일시정지
    */

    pauseBGM();


    const cards =
        generateCards();

    const container =
        document.getElementById(
            "cardContainer"
        );

    container.innerHTML = "";


    cards.forEach(
        card => {

            const element =
                document.createElement(
                    "button"
                );

            element.className =
                "level-card";

            element.innerHTML = `

                <div class="card-rarity">

                    ${getRarityName(
                        card.rarity
                    )}

                </div>

                <h3>
                    ${card.name}
                </h3>

                <p>
                    ${card.description}
                </p>

                <span class="card-type">
                    ${card.type}
                </span>

            `;


            element.addEventListener(
                "click",
                () => {

                    card.apply();

                    document
                        .getElementById(
                            "levelUpScreen"
                        )
                        .classList.remove(
                            "active"
                        );

                    gamePaused =
                        false;

                    /*
                       레벨업 선택 후 음악 재개
                    */

                    resumeBGM();

                    updateSkillBar();

                    updateGameUI();

                    lastTime =
                        performance.now();
                }
            );


            container.appendChild(
                element
            );
        }
    );


    document
        .getElementById(
            "levelUpScreen"
        )
        .classList.add(
            "active"
        );
}


/* =========================================================
   CARD GENERATION
========================================================= */

function generateCards() {

    let pool = [

        ...commonCards,

        ...(weaponCards[
            selectedClass
        ] || []),

        ...commonSkills,

        ...(classSkills[
            selectedClass
        ] || [])
    ];


    const rarityBonus =
        Math.floor(
            level / 5
        );


    let weightedPool = [];


    pool.forEach(
        card => {

            let weight = 1;

            weight +=
                Math.max(
                    0,
                    (
                        card.rarity -
                        1
                    ) *
                    rarityBonus
                );


            for (
                let i = 0;
                i < weight;
                i++
            ) {

                weightedPool.push(
                    card
                );
            }
        }
    );


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


        if (
            !selected.includes(
                card
            )
        ) {

            selected.push(
                card
            );
        }


        weightedPool =
            weightedPool.filter(
                item =>
                    item !== card
            );
    }


    return selected;
}


/* =========================================================
   RARITY
========================================================= */

function getRarityName(
    rarity
) {

    if (
        rarity >= 4
    ) {

        return "전설";
    }

    if (
        rarity === 3
    ) {

        return "희귀";
    }

    if (
        rarity === 2
    ) {

        return "고급";
    }

    return "일반";
}


/* =========================================================
   DAMAGE TEXT
========================================================= */

function addDamageText(
    x,
    y,
    text,
    color,
    critical = false
) {

    damageTexts.push({

        x,
        y,

        text,

        color,

        critical,

        life:
            .65,

        maxLife:
            .65,

        vy:
            -45
    });
}


function updateDamageTexts(dt) {

    damageTexts.forEach(
        text => {

            text.y +=
                text.vy *
                dt;

            text.life -= dt;
        }
    );


    damageTexts =
        damageTexts.filter(
            text =>
                text.life > 0
        );
}


/* =========================================================
   HIT EFFECT
========================================================= */

function createHitEffect(
    x,
    y,
    color
) {

    effects.push({

        type: "hit",

        x,
        y,

        life: .25,

        maxLife: .25,

        color
    });


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        effects.push({

            type: "spark",

            x,
            y,

            vx:
                (
                    Math.random() -
                    .5
                ) * 180,

            vy:
                (
                    Math.random() -
                    .5
                ) * 180,

            life: .30,

            maxLife: .30,

            color
        });
    }
}


/* =========================================================
   SHOCKWAVE
========================================================= */

function createShockwave(
    x,
    y,
    radius
) {

    effects.push({

        type: "shockwave",

        x,
        y,

        radius,

        life: .30,

        maxLife: .30
    });
}


/* =========================================================
   SKILLS
========================================================= */

function updateSkills(dt) {

    if (
        player.skills.lightning
    ) {

        skillTimers.lightning -= dt;

        if (
            skillTimers.lightning <= 0 &&
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
                25 *
                player.skills.lightning;


            effects.push({

                type: "lightning",

                x:
                    target.x,

                y:
                    target.y,

                life: .45,

                maxLife: .45
            });


            target.hp -= damage;


            addDamageText(
                target.x,
                target.y - 25,
                Math.round(
                    damage
                ),
                "#9ed8ff",
                true
            );


            announceSkill(
                "⚡ 번개 발동!"
            );


            if (
                target.hp <= 0
            ) {

                killEnemy(
                    target
                );
            }


            skillTimers.lightning =
                Math.max(
                    1.4,
                    3 -
                    player.skills.lightning *
                    .25
                );
        }
    }


    if (
        player.skills.fireball
    ) {

        skillTimers.fireball -= dt;

        if (
            skillTimers.fireball <= 0 &&
            enemies.length > 0
        ) {

            let target =
                enemies[0];

            let closest =
                Infinity;


            enemies.forEach(
                enemy => {

                    const dx =
                        enemy.x -
                        player.x;

                    const dy =
                        enemy.y -
                        player.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance <
                        closest
                    ) {

                        closest =
                            distance;

                        target =
                            enemy;
                    }
                }
            );


            const dx =
                target.x -
                player.x;

            const dy =
                target.y -
                player.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            projectiles.push({

                x:
                    player.x,

                y:
                    player.y,

                vx:
                    dx /
                    Math.max(
                        distance,
                        1
                    ) *
                    430,

                vy:
                    dy /
                    Math.max(
                        distance,
                        1
                    ) *
                    430,

                radius: 11,

                damage:
                    35 *
                    player.skills.fireball,

                life: 2,

                pierce: 0,

                crit: false,

                fireball: true
            });


            announceSkill(
                "🔥 화염구 발동!"
            );


            skillTimers.fireball =
                Math.max(
                    2,
                    4 -
                    player.skills.fireball *
                    .35
                );
        }
    }


    if (
        selectedClass === "knight" &&
        player.skills.spinSlash
    ) {

        skillTimers.spinSlash -= dt;

        if (
            skillTimers.spinSlash <= 0
        ) {

            const range =
                150;


            enemies.forEach(
                enemy => {

                    const dx =
                        enemy.x -
                        player.x;

                    const dy =
                        enemy.y -
                        player.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance <=
                        range
                    ) {

                        enemy.hp -=
                            25 *
                            player.skills.spinSlash;

                        addDamageText(
                            enemy.x,
                            enemy.y,
                            Math.round(
                                25 *
                                player.skills.spinSlash
                            ),
                            "#b9e7ff"
                        );


                        if (
                            enemy.hp <= 0
                        ) {

                            killEnemy(
                                enemy
                            );
                        }
                    }
                }
            );


            effects.push({

                type: "spin",

                x:
                    player.x,

                y:
                    player.y,

                life: .35,

                maxLife: .35
            });


            shake =
                Math.max(
                    shake,
                    7
                );


            announceSkill(
                "⚔️ 회전 베기!"
            );


            skillTimers.spinSlash =
                5;
        }
    }


    if (
        selectedClass === "barbarian" &&
        player.skills.groundSmash
    ) {

        skillTimers.groundSmash -= dt;

        if (
            skillTimers.groundSmash <= 0
        ) {

            const range =
                190;


            enemies.forEach(
                enemy => {

                    const dx =
                        enemy.x -
                        player.x;

                    const dy =
                        enemy.y -
                        player.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance <=
                        range
                    ) {

                        enemy.hp -=
                            30 *
                            player.skills.groundSmash;

                        enemy.x +=
                            dx /
                            Math.max(
                                distance,
                                1
                            ) *
                            90;

                        enemy.y +=
                            dy /
                            Math.max(
                                distance,
                                1
                            ) *
                            90;


                        addDamageText(
                            enemy.x,
                            enemy.y,
                            Math.round(
                                30 *
                                player.skills.groundSmash
                            ),
                            "#ffb45c",
                            true
                        );


                        if (
                            enemy.hp <= 0
                        ) {

                            killEnemy(
                                enemy
                            );
                        }
                    }
                }
            );


            createShockwave(
                player.x,
                player.y,
                range
            );


            shake =
                Math.max(
                    shake,
                    12
                );


            announceSkill(
                "💥 대지 분쇄!"
            );


            skillTimers.groundSmash =
                6;
        }
    }


    if (
        selectedClass === "assassin" &&
        player.skills.shadowDance
    ) {

        if (
            player.shadowBoost <= 0
        ) {

            player.shadowBoost =
                .2;
        }
    }
}


/* =========================================================
   SKILL ANNOUNCEMENT
========================================================= */

function announceSkill(
    text
) {

    const element =
        document.getElementById(
            "skillAnnouncement"
        );

    element.textContent =
        text;

    element.classList.add(
        "show"
    );

    clearTimeout(
        announcementTimer
    );

    announcementTimer =
        setTimeout(
            () => {

                element.classList.remove(
                    "show"
                );

            },
            600
        );
}


/* =========================================================
   SKILL BAR
========================================================= */

function updateSkillBar() {

    const bar =
        document.getElementById(
            "skillBar"
        );

    bar.innerHTML = "";

    if (!player) return;


    const skillDefinitions = [

        {
            key: "lightning",
            icon: "⚡"
        },

        {
            key: "fireball",
            icon: "🔥"
        },

        {
            key: "magnet",
            icon: "🧲"
        },

        {
            key: "explosiveArrow",
            icon: "💥"
        },

        {
            key: "focusShot",
            icon: "🎯"
        },

        {
            key: "shieldBash",
            icon: "🛡️"
        },

        {
            key: "spinSlash",
            icon: "⚔️"
        },

        {
            key: "groundSmash",
            icon: "💥"
        },

        {
            key: "berserker",
            icon: "🔥"
        },

        {
            key: "assassination",
            icon: "🗡️"
        },

        {
            key: "shadowDance",
            icon: "🌑"
        }
    ];


    skillDefinitions.forEach(
        skill => {

            const level =
                player.skills[
                    skill.key
                ];

            if (!level) return;


            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "skill-icon";

            element.innerHTML = `

                ${skill.icon}

                <span>
                    ${level}
                </span>
            `;

            bar.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   EFFECT UPDATE
========================================================= */

function updateEffects(dt) {

    effects.forEach(
        effect => {

            effect.life -= dt;


            if (
                effect.type ===
                "particle" ||
                effect.type ===
                "spark"
            ) {

                effect.x +=
                    effect.vx *
                    dt;

                effect.y +=
                    effect.vy *
                    dt;

                effect.vx *=
                    .92;

                effect.vy *=
                    .92;
            }
        }
    );


    effects =
        effects.filter(
            effect =>
                effect.life > 0
        );


    updateDamageTexts(
        dt
    );


    shake *=
        Math.pow(
            .01,
            dt
        );

    if (
        shake < .1
    ) {
        shake = 0;
    }
}


/* =========================================================
   GAME UI
========================================================= */

function updateGameUI() {

    if (!player) return;


    document.getElementById(
        "levelText"
    ).textContent =
        level;


    document.getElementById(
        "hpText"
    ).textContent =

        `${Math.ceil(
            player.hp
        )} / ${player.maxHp}`;


    document.getElementById(
        "hpFill"
    ).style.width =

        `${Math.max(
            0,
            player.hp /
            player.maxHp *
            100
        )}%`;


    document.getElementById(
        "xpFill"
    ).style.width =

        `${Math.min(
            100,
            experience /
            experienceNeeded *
            100
        )}%`;


    document.getElementById(
        "gameCoins"
    ).textContent =
        runCoins;


    document.getElementById(
        "killCount"
    ).textContent =
        kills;
}


/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

    ctx.fillStyle =
        "#171b21";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    const gridSize =
        80;


    const startX =
        Math.floor(
            camera.x /
            gridSize
        ) *
        gridSize;

    const startY =
        Math.floor(
            camera.y /
            gridSize
        ) *
        gridSize;


    ctx.strokeStyle =
        "#202630";

    ctx.lineWidth =
        1;


    for (
        let x =
            startX;
        x <
        camera.x +
        width +
        gridSize;
        x +=
            gridSize
    ) {

        const screenX =
            x -
            camera.x;


        ctx.beginPath();

        ctx.moveTo(
            screenX,
            0
        );

        ctx.lineTo(
            screenX,
            height
        );

        ctx.stroke();
    }


    for (
        let y =
            startY;
        y <
        camera.y +
        height +
        gridSize;
        y +=
            gridSize
    ) {

        const screenY =
            y -
            camera.y;


        ctx.beginPath();

        ctx.moveTo(
            0,
            screenY
        );

        ctx.lineTo(
            width,
            screenY
        );

        ctx.stroke();
    }


    ctx.strokeStyle =
        "#39424f";

    ctx.lineWidth =
        5;

    ctx.strokeRect(
        -camera.x,
        -camera.y,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );
}


/* =========================================================
   WORLD POSITION
========================================================= */

function sx(x) {

    return x -
        camera.x;
}

function sy(y) {

    return y -
        camera.y;
}


/* =========================================================
   PLAYER DRAW
========================================================= */

function drawPlayer() {

    if (!player) return;


    const x =
        sx(player.x);

    const y =
        sy(player.y);


    ctx.save();


    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 10,
        20,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        player.radius,
        0,
        Math.PI * 2
    );


    let playerColor;

    if (
        selectedClass === "archer"
    ) {

        playerColor =
            "#69b7ff";

    } else if (
        selectedClass === "barbarian"
    ) {

        playerColor =
            "#d96c6c";

    } else if (
        selectedClass === "assassin"
    ) {

        playerColor =
            "#9b75dc";

    } else {

        playerColor =
            "#d8dde5";
    }


    ctx.fillStyle =
        playerColor;

    ctx.fill();


    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth =
        2;

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        x +
        player.facingX *
        27,
        y +
        player.facingY *
        27
    );

    ctx.lineTo(
        x +
        player.facingX *
        12 -
        player.facingY *
        5,
        y +
        player.facingY *
        12 +
        player.facingX *
        5
    );

    ctx.lineTo(
        x +
        player.facingX *
        12 +
        player.facingY *
        5,
        y +
        player.facingY *
        12 -
        player.facingX *
        5
    );

    ctx.closePath();

    ctx.fillStyle =
        "#ffffff";

    ctx.fill();


    ctx.restore();
}


/* =========================================================
   ENEMY DRAW
========================================================= */

function drawEnemies() {

    enemies.forEach(
        enemy => {

            const x =
                sx(enemy.x);

            const y =
                sy(enemy.y);


            if (
                x < -100 ||
                x > width + 100 ||
                y < -100 ||
                y > height + 100
            ) {
                return;
            }


            ctx.save();


            ctx.beginPath();

            ctx.ellipse(
                x,
                y + enemy.radius * .6,
                enemy.radius,
                enemy.radius * .35,
                0,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "rgba(0,0,0,.3)";

            ctx.fill();


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                enemy.radius,
                0,
                Math.PI * 2
            );


            if (
                enemy.type === "fast"
            ) {

                ctx.fillStyle =
                    "#d99b5e";

            } else if (
                enemy.type === "tank"
            ) {

                ctx.fillStyle =
                    "#687583";

            } else {

                ctx.fillStyle =
                    "#65aa69";
            }


            ctx.fill();


            ctx.strokeStyle =
                "#151515";

            ctx.lineWidth =
                2;

            ctx.stroke();


            ctx.restore();


            const barWidth =
                enemy.radius *
                2;

            const hp =
                Math.max(
                    0,
                    enemy.hp /
                    enemy.maxHp
                );


            ctx.fillStyle =
                "#20242a";

            ctx.fillRect(
                x -
                barWidth / 2,
                y -
                enemy.radius -
                11,
                barWidth,
                5
            );


            ctx.fillStyle =
                "#e05555";

            ctx.fillRect(
                x -
                barWidth / 2,
                y -
                enemy.radius -
                11,
                barWidth *
                hp,
                5
            );
        }
    );
}


/* =========================================================
   XP DRAW
========================================================= */

function drawXpGems() {

    xpGems.forEach(
        gem => {

            const x =
                sx(gem.x);

            const y =
                sy(gem.y);


            ctx.save();

            ctx.translate(
                x,
                y
            );

            ctx.rotate(
                Math.PI / 4
            );


            ctx.fillStyle =
                "#68d9ff";


            ctx.shadowBlur =
                10;

            ctx.shadowColor =
                "#68d9ff";


            ctx.fillRect(
                -5,
                -5,
                10,
                10
            );


            ctx.restore();
        }
    );
}


/* =========================================================
   PROJECTILE DRAW
========================================================= */

function drawProjectiles() {

    projectiles.forEach(
        projectile => {

            const x =
                sx(projectile.x);

            const y =
                sy(projectile.y);


            ctx.save();


            if (
                projectile.fireball
            ) {

                ctx.shadowBlur =
                    18;

                ctx.shadowColor =
                    "#ff713d";

                ctx.fillStyle =
                    "#ff713d";

            } else {

                ctx.fillStyle =
                    projectile.crit
                        ? "#ffe66d"
                        : "#f2f5f7";
            }


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                projectile.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }
    );
}


/* =========================================================
   EFFECT DRAW
========================================================= */

function drawEffects() {

    effects.forEach(
        effect => {

            const alpha =
                effect.life /
                effect.maxLife;


            if (
                effect.type === "hit"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.beginPath();

                ctx.arc(
                    sx(effect.x),
                    sy(effect.y),
                    12 +
                    (
                        1 -
                        alpha
                    ) *
                    30,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    effect.color;

                ctx.lineWidth =
                    3;

                ctx.stroke();

                ctx.restore();
            }


            if (
                effect.type === "spark"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.fillStyle =
                    effect.color;

                ctx.beginPath();

                ctx.arc(
                    sx(effect.x),
                    sy(effect.y),
                    3,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();
            }


            if (
                effect.type === "particle"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.fillStyle =
                    "#c8d1dc";

                ctx.beginPath();

                ctx.arc(
                    sx(effect.x),
                    sy(effect.y),
                    4,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();
            }


            if (
                effect.type === "melee"
            ) {

                const x =
                    sx(effect.x);

                const y =
                    sy(effect.y);


                ctx.save();

                ctx.globalAlpha =
                    alpha;


                ctx.beginPath();

                ctx.moveTo(
                    x,
                    y
                );

                ctx.arc(
                    x,
                    y,
                    effect.range,
                    effect.angle -
                    effect.arc / 2,
                    effect.angle +
                    effect.arc / 2
                );

                ctx.closePath();


                if (
                    effect.classId ===
                    "barbarian"
                ) {

                    ctx.fillStyle =
                        "rgba(255,90,90,.20)";

                    ctx.strokeStyle =
                        "#ff8a72";

                    ctx.lineWidth =
                        10;

                } else if (
                    effect.classId ===
                    "assassin"
                ) {

                    ctx.fillStyle =
                        "rgba(160,120,255,.18)";

                    ctx.strokeStyle =
                        "#c3a5ff";

                    ctx.lineWidth =
                        5;

                } else {

                    ctx.fillStyle =
                        "rgba(220,235,255,.18)";

                    ctx.strokeStyle =
                        "#dceaff";

                    ctx.lineWidth =
                        7;
                }


                ctx.fill();

                ctx.stroke();


                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    effect.range *
                    .82,
                    effect.angle -
                    effect.arc / 2,
                    effect.angle +
                    effect.arc / 2
                );

                ctx.strokeStyle =
                    "#ffffff";

                ctx.lineWidth =
                    effect.classId ===
                    "barbarian"
                        ? 8
                        : 4;

                ctx.stroke();


                if (
                    effect.classId ===
                    "assassin"
                ) {

                    ctx.beginPath();

                    ctx.arc(
                        x,
                        y,
                        effect.range *
                        .7,
                        effect.angle -
                        effect.arc / 2,
                        effect.angle
                    );

                    ctx.strokeStyle =
                        "#ffffff";

                    ctx.lineWidth =
                        4;

                    ctx.stroke();


                    ctx.beginPath();

                    ctx.arc(
                        x,
                        y,
                        effect.range *
                        .7,
                        effect.angle,
                        effect.angle +
                        effect.arc / 2
                    );

                    ctx.stroke();
                }

                ctx.restore();
            }


            if (
                effect.type ===
                "arrowShot"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.translate(
                    sx(effect.x),
                    sy(effect.y)
                );

                ctx.rotate(
                    effect.angle
                );

                ctx.strokeStyle =
                    "#ffffff";

                ctx.lineWidth =
                    3;

                ctx.beginPath();

                ctx.moveTo(
                    -5,
                    0
                );

                ctx.lineTo(
                    -30,
                    0
                );

                ctx.stroke();

                ctx.restore();
            }


            if (
                effect.type ===
                "shockwave"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.beginPath();

                ctx.arc(
                    sx(effect.x),
                    sy(effect.y),
                    effect.radius *
                    (
                        1 -
                        alpha
                    ),
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    "#ffad60";

                ctx.lineWidth =
                    7;

                ctx.stroke();

                ctx.restore();
            }


            if (
                effect.type ===
                "lightning"
            ) {

                const x =
                    sx(effect.x);

                const y =
                    sy(effect.y);


                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.strokeStyle =
                    "#9bdcff";

                ctx.shadowBlur =
                    20;

                ctx.shadowColor =
                    "#66c7ff";

                ctx.lineWidth =
                    8;


                ctx.beginPath();

                ctx.moveTo(
                    x,
                    y - 180
                );

                ctx.lineTo(
                    x - 20,
                    y - 100
                );

                ctx.lineTo(
                    x + 15,
                    y - 55
                );

                ctx.lineTo(
                    x,
                    y
                );

                ctx.stroke();


                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    30 +
                    (
                        1 -
                        alpha
                    ) *
                    40,
                    0,
                    Math.PI * 2
                );

                ctx.stroke();

                ctx.restore();
            }


            if (
                effect.type ===
                "spin"
            ) {

                ctx.save();

                ctx.globalAlpha =
                    alpha;

                ctx.beginPath();

                ctx.arc(
                    sx(effect.x),
                    sy(effect.y),
                    150,
                    0,
                    Math.PI * 2
                );

                ctx.strokeStyle =
                    "#d7efff";

                ctx.lineWidth =
                    10;

                ctx.stroke();

                ctx.restore();
            }

        }
    );


    damageTexts.forEach(
        text => {

            const alpha =
                text.life /
                text.maxLife;

            ctx.save();

            ctx.globalAlpha =
                alpha;

            ctx.font =
                text.critical
                    ? "bold 22px Arial"
                    : "bold 16px Arial";

            ctx.textAlign =
                "center";

            ctx.fillStyle =
                text.color;

            ctx.strokeStyle =
                "rgba(0,0,0,.8)";

            ctx.lineWidth =
                4;

            ctx.strokeText(
                text.text,
                sx(text.x),
                sy(text.y)
            );

            ctx.fillText(
                text.text,
                sx(text.x),
                sy(text.y)
            );

            ctx.restore();
        }
    );
}


/* =========================================================
   RENDER
========================================================= */

function render() {

    ctx.save();


    if (
        shake > 0
    ) {

        ctx.translate(
            (
                Math.random() -
                .5
            ) *
            shake,

            (
                Math.random() -
                .5
            ) *
            shake
        );
    }


    drawBackground();

    drawXpGems();

    drawEnemies();

    drawProjectiles();

    drawPlayer();

    drawEffects();


    ctx.restore();
}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(
    timestamp
) {

    if (
        !gameRunning
    ) {
        return;
    }


    const dt =
        Math.min(
            (
                timestamp -
                lastTime
            ) /
            1000,
            .05
        );


    lastTime =
        timestamp;


    if (
        !gamePaused
    ) {

        const moving =
            updatePlayer(
                dt
            );


        updatePlayerAttack(
            dt,
            moving
        );

        updateProjectiles(
            dt
        );

        updateEnemies(
            dt
        );

        updateXpGems(
            dt
        );

        updateSkills(
            dt
        );

        updateEffects(
            dt
        );


        enemySpawnTimer -=
            dt;


        if (
            enemySpawnTimer <= 0
        ) {

            let count = 1;

            if (
                level >= 10
            ) {
                count = 2;
            }

            if (
                level >= 20
            ) {
                count = 3;
            }


            for (
                let i = 0;
                i < count;
                i++
            ) {

                spawnEnemy();
            }


            enemySpawnTimer =
                Math.max(
                    .25,
                    .8 -
                    level *
                    .015
                );
        }


        updateGameUI();
    }


    render();


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   GAME OVER
========================================================= */

function gameOver() {

    gameRunning =
        false;

    gamePaused =
        true;

    pauseMenuOpen =
        false;


    /*
       🎵 배경음악 정지
    */

    stopBGM();


    coins +=
        runCoins;

    saveCoins();


    document.getElementById(
        "resultLevel"
    ).textContent =
        level;


    document.getElementById(
        "resultKills"
    ).textContent =
        kills;


    document.getElementById(
        "resultCoins"
    ).textContent =
        runCoins;


    document
        .getElementById(
            "gameOverScreen"
        )
        .classList.add(
            "active"
        );
}


/* =========================================================
   BUTTONS
========================================================= */

document
    .getElementById(
        "startButton"
    )
    .addEventListener(
        "click",
        () => {

            startGame();
        }
    );


document
    .getElementById(
        "classButton"
    )
    .addEventListener(
        "click",
        () => {

            renderClassMenu();

            showScreen(
                "classMenu"
            );
        }
    );


document
    .getElementById(
        "classBackButton"
    )
    .addEventListener(
        "click",
        () => {

            updateMenuUI();

            showScreen(
                "mainMenu"
            );
        }
    );


document
    .getElementById(
        "shopButton"
    )
    .addEventListener(
        "click",
        () => {

            renderShop();

            updateMenuUI();

            showScreen(
                "shopMenu"
            );
        }
    );


document
    .getElementById(
        "shopBackButton"
    )
    .addEventListener(
        "click",
        () => {

            updateMenuUI();

            showScreen(
                "mainMenu"
            );
        }
    );


/*
   계속하기
*/

document
    .getElementById(
        "resumeButton"
    )
    .addEventListener(
        "click",
        () => {

            pauseMenuOpen =
                false;

            gamePaused =
                false;

            document
                .getElementById(
                    "pauseScreen"
                )
                .classList.remove(
                    "active"
                );

            resumeBGM();

            lastTime =
                performance.now();
        }
    );


/*
   다시하기
*/

document
    .getElementById(
        "restartButton"
    )
    .addEventListener(
        "click",
        () => {

            stopBGM();

            startGame();
        }
    );


/*
   메인화면
*/

document
    .getElementById(
        "pauseMenuButton"
    )
    .addEventListener(
        "click",
        () => {

            gameRunning =
                false;

            gamePaused =
                false;

            pauseMenuOpen =
                false;


            stopBGM();


            coins +=
                runCoins;

            saveCoins();


            document
                .getElementById(
                    "pauseScreen"
                )
                .classList.remove(
                    "active"
                );


            updateMenuUI();

            showScreen(
                "mainMenu"
            );
        }
    );


/*
   게임 오버 → 메인
*/

document
    .getElementById(
        "returnMenuButton"
    )
    .addEventListener(
        "click",
        () => {

            stopBGM();


            document
                .getElementById(
                    "gameOverScreen"
                )
                .classList.remove(
                    "active"
                );

            gamePaused =
                false;

            updateMenuUI();

            showScreen(
                "mainMenu"
            );
        }
    );


/* =========================================================
   INITIALIZE
========================================================= */

updateMenuUI();
```
