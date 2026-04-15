# 🏝️ CodeQuest 3D

> **Learn Python by exploring a 3D island, solving coding challenges, and battling friends.**

A browser-based 3D educational game built with **Three.js** and the **Web Audio API** — zero dependencies to install, runs entirely in the browser.

---

## 🎮 How to Play

| Key | Action |
|-----|--------|
| `W A S D` | Move |
| `Mouse` | Look around |
| `Space` | Jump |
| `E` | Interact with NPCs / Enter portals |
| `Esc` | Close terminal / Exit pointer lock |
| `📜` (top right) | Toggle quest & inventory panel |
| `🏆` (top left) | Toggle leaderboard |

---

## 🗺️ What's on the Island

### 6 Python NPC Teachers
Walk up to any NPC and press **E** to open a coding challenge terminal.

| NPC | Teaches |
|-----|---------|
| 🟦 Vera the Variable | Variables & assignment |
| 🟩 Pip the Printer | print() & f-strings |
| 🟠 Lola the Logic | if / elif / else |
| 🔴 Leon the Loop | for & while loops |
| 🟣 Faye the Function | def, parameters, return |
| 🔵 Iris the Input | input() & type conversion |

Solve all challenges to **unlock abilities** and earn **XP**.

### 3 Game Portals

| Portal | Mode | Description |
|--------|------|-------------|
| 🔵 **Code Arena** | PvP vs AI | 5-round Python quiz battle against a bot. Answer faster to outscore your opponent. |
| 🔴 **Code Race** | Racing | Answer Python questions to boost your car. More correct answers = faster car! |
| 🟡 **Mini Quiz** | Solo | 10 timed Python questions. Beat the clock for max XP. |

---

## 🚀 Deploy to GitHub Pages

```bash
# 1. Fork or clone this repo
git clone https://github.com/YOUR_USERNAME/codequest.git
cd codequest

# 2. Push to GitHub
git add .
git commit -m "Initial deploy"
git push origin main

# 3. Enable GitHub Pages
# Go to: Settings → Pages → Source: Deploy from branch → Branch: main → / (root)
# Your game will be live at: https://YOUR_USERNAME.github.io/codequest/
```

No build step. No npm install. It's all vanilla ES modules loaded from CDN.

---

## 🏗️ Project Structure

```
codequest/
├── index.html          # Entry point — all HTML, links to CSS + JS module
├── css/
│   └── style.css       # All game UI styles (HUD, terminal, games, minimap)
└── js/
    ├── main.js         # Game loop, day/night cycle, interaction system
    ├── state.js        # Three.js renderer, scene, camera, shared materials
    ├── player.js       # Player character mesh + WASD/mouse/touch controls
    ├── collision.js    # Island boundary + obstacle colliders
    ├── world.js        # Terrain, lighting, ocean, flowers, lantern posts
    ├── environment.js  # Trees, sun, moon, clouds, birds
    ├── guide.js        # Guide robot NPC at center plaza
    ├── npcs.js         # 6 Python-teaching NPCs with challenges
    ├── portals.js      # 3 animated game portals
    ├── games.js        # Arena / Race / Quiz game implementations
    ├── questions.js    # 30+ Python question bank (all topics)
    ├── terminal.js     # In-game code editor overlay for NPC challenges
    ├── inventory.js    # Ability unlock system + quest tracker
    ├── xp.js           # XP bar, leveling, level-up fanfare
    ├── audio.js        # Web Audio API synth — all sounds, no audio files
    ├── minimap.js      # Canvas-based 2D overhead minimap
    ├── mobile.js       # Virtual joystick + buttons for touch screens
    └── leaderboard.js  # LocalStorage leaderboard panel
```

---

## 🔧 Tech Stack

| Technology | Usage |
|-----------|-------|
| [Three.js r160](https://threejs.org) | 3D rendering, scene, materials, WebXR |
| Web Audio API | All game sounds synthesized in code |
| ES Modules | No bundler required |
| localStorage | Progress saving + leaderboard |
| Canvas 2D | Minimap rendering |
| WebXR | VR headset support |

---

## 🎓 Python Topics Covered

- Variables & assignment
- `print()` and f-strings  
- `input()` and type conversion
- `if` / `elif` / `else` conditionals
- `for` loops with `range()`
- `while` loops
- Functions with `def`, parameters, `return`
- Lists, indexing, `.append()`
- Strings and `.upper()`, indexing
- Dictionaries with key/value access
- Classes and `__init__`

---

## 📱 Mobile Support

On touch devices, a virtual joystick (left thumb) and look zone (right thumb) automatically appear. An **E** button triggers NPC/portal interactions and a **↑** button jumps.

---

## 🥽 VR Support

If your browser supports WebXR and a VR headset is connected, a **Enter VR** button appears in the bottom-right corner. Left thumbstick moves, right thumbstick rotates.

---

## 📝 Adding More Questions

Open `js/questions.js` and add to the `QUESTIONS` array:

```js
{
    topic: 'Loop',          // Groups with NPC teacher
    difficulty: 2,          // 1=easy, 2=medium, 3=hard
    q: 'What does range(3) produce?',
    options: ['[1,2,3]', '[0,1,2]', '[0,1,2,3]', '[1,2]'],
    answer: '[0,1,2]',
    explanation: 'range(3) starts at 0 and stops before 3.'
}
```

---

*Built with ❤️ for students learning Python*
