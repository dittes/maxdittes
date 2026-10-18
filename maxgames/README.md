# MAX GAMES – Retro Athletics

A pixel-art athletics game for the browser with its own sunny arcade look.
Plain HTML5 Canvas + vanilla JavaScript – no build step, no backend, no external assets (every sprite, sound and
font is generated in code). **Full-screen, mobile first:** the pixel canvas always fills the whole window (portrait phones, landscape, desktop – no letterboxing). On touch devices big pixel-art **LEFT / RIGHT / JUMP** buttons are drawn on the canvas under the track; on desktop you use the keyboard.

**Play:** open `index.html` through any static web server (`python3 -m http.server`, then <http://localhost:8000/maxgames/>).

## Events
| Event | How it plays |
|---|---|
| **100m Sprint** | Alternate LEFT / RIGHT as fast *and* as steadily as you can. READY – SET – GO with a starting pistol, false-start rule (two false starts = disqualified), 4 opponents, exact photo-finish timing. |
| **Long Jump** | Sprint along the runway, press **JUMP** about 3 m before the board. Take-off happens 0.30 s after the press; **hold JUMP** for a steeper angle (best ≈ 27°). Crossing the board is a foul. Three attempts, best counts. |
| **Discus Throw** | Tap LEFT / RIGHT to spin up – tapping speed is your power, and the release dial turns faster with it. Press **THROW** when the needle is in the green sector. Too far off = foul in the cage. Three attempts. |
| **110m Hurdles** | Sprint and press **JUMP** ≈ 3 m before each of the ten hurdles. A hit knocks the hurdle over and costs speed. |
| **50m Swimming / 200m Cycling / 200m Rowing** | Same tap-to-race engine with their own physics, pool / wooden track / rowing course and sprites. Even, rhythmic taps win. |
| **Javelin** | Run up with alternating taps, press **THROW** shortly before the line, hold it for a higher angle (best ≈ 36°). Crossing the line is a foul. Three attempts. |

## Modes
* **Quick Play** – pick any event and race immediately. **Practice** – only you on the track.
* **Championship** – all eight events, points 10/8/6/4/2, standings after each event, medal ceremony. Win gold to advance from *Regional* to *World* and *Olympic* (stronger opponents).
* **Share & challenge** – every result screen has a SHARE button leading to a challenge screen: a pixel-art result card (image) plus a link `?c=event~result~country`. Whoever opens the link gets a "friend challenge" with your mark to beat (Web Share API, clipboard fallback).
* **Stadiums** – six venues (City, Sunset, Beach, Alpine, Night, Neon Dome) with their own sky, horizon, roof, crowd, track and ground. Unlock them by winning events and championships. The crowd warms up before the finish, then does the wave and cheers.
* **Records** and **Settings** (sound effects, music, level, stadium – the only place for the sound toggles).

## Physics (`js/physics.js`)
Everything runs on elapsed simulation time (120 Hz sub-steps), not frames. Every valid alternating press feeds a *cadence* estimate
(taps/s, measured from the real key-down timestamps). Acceleration = `A · drive · (1 − v/Vmax) − drag`, where
`drive` = cadence relative to an optimum (7.5 taps/s) × a *rhythm regularity* factor, and fatigue slowly lowers `A` and `Vmax`.
Perfectly even 8 taps/s ≈ 10.6 s over 100 m, 6 taps/s ≈ 12.3 s, 4 taps/s ≈ 16 s. The animation stride follows your tapping cadence.
Long-jump range comes from `v₀ = (0.97·v + 1.2)·f(angle)`, a projectile with g = 10.5 and a take-off angle you control by holding the key.

## Architecture
```
index.html            layout, canvas, touch pad
css/style.css         mobile-first layout, retro buttons
js/data.js            countries, flags (pixel art), looks, difficulty, stadium tiers
js/font.js            5×7 bitmap font (cached)
js/storage.js         StorageManager – localStorage (records, progress, settings)
js/audio.js           AudioManager – Web Audio: pistol, steps, crowd, fanfare, chiptune music
js/input.js           InputManager – keyboard / multi-touch pointers / toolbar → actions, ignores key repeat
js/controls.js        on-canvas touch buttons (LEFT / RIGHT / JUMP or THROW)
js/sprites.js         SpriteRenderer – procedural pixel-art athletes (skeleton → outlined sprites, cached)
js/stadium.js         six parallax stadiums, live crowd (idle / cheer / wave), ad boards, track, ground
js/physics.js         PhysicsEngine – SprintModel, jump / projectile helpers
js/athlete.js         Athlete, AICompetitor, opponent field generator
js/hud.js             stopwatch, segmented speed meter, rhythm meter, progress tracker
js/events.js          EventBase + RaceEvent (100m / hurdles), replay recording
js/fieldevents.js     FieldBase, LongJumpEvent, JavelinEvent
js/discus.js          DiscusEvent (spin-up + release dial)
js/share.js           result card, challenge link, Web Share / clipboard
js/championship.js    ChampionshipManager
js/ui.js, screens_*.js   menu widgets and all screens
js/game.js            GameManager – loop, screens, pause, replay, flows
js/main.js            bootstrap
```

## Deploying to GitHub Pages
The game is a static folder, so any Pages setup works:
1. Push the repository, open **Settings → Pages**, choose *Deploy from a branch* → `main` / `(root)`.
2. The game is then served at `https://<user>.github.io/<repo>/maxgames/` (or `https://<your-domain>/maxgames/` with a custom domain).
3. No build is needed. Make sure the `maxgames/` folder (with `css/` and `js/`) is committed.

## Notes
* All graphics and sounds are original and generated in code – no proprietary assets.
* Not included yet: High Jump and Triple Jump, local multiplayer was removed.
