# Home Protocol — a Bryan Johnson–inspired home workout tracker

A local web app that plans and tracks a six-day home workout built from **Bryan Johnson's public exercise protocol** (his October 2026 weekly template), rebuilt for bodyweight, adjustable dumbbells, a pull-up bar and resistance bands.

- **What to do each day**, block by block, with workouts set by your training level (New to training, Returning, Active, Well trained). Feel ready for more, or need it easier? Switch level any time.
- **A 3D animation for every exercise** (62 of them), plus Bryan's own video at the right minute and demo videos you can switch between.
- **Fifteen animation styles**: choose how the exercise demonstrations look, from a realistic athlete to a doodle or a friendly monster.
- **Tracking**: sets × reps × weight, holds, cardio minutes and heart rate, interval rounds, notes per exercise and per day, effort and energy, extra activity (desk treadmill, walks…), body weight.
- **Auto-save**: there is no Save button. Everything is written to your own computer as you type.
- **Skipped days are fine**: skip with a reason and a note, swap sessions around; nothing moves on without you.
- **Guided workout mode**, interval timer for the 20-second bursts and the Norwegian 4×4, hold and rest timers with beeps.
- **Personalised**: heart-rate zones from your age (or measured max), starting weights scaled to your weight, sex, age and level, metric or imperial.
- **Optional add-ons** chosen on first run. The first one is a daily **posture correction** block for tech neck and forward shoulders, tracked like the main session.
- **Seven themes** to pick from during setup or any time in Settings, each with its own layout, type and colours (not just a palette), in light or dark.
- Week view, history calendar with skip reasons, progress charts, an exercise library and the full plan with sources.

![The Today screen: the day's blocks on the left, the selected exercise with its 3D animation and set logger on the right](docs/screenshots/today.png)

<p>
<img src="docs/screenshots/exercise.png" width="32%" alt="An exercise page with its animation, steps and videos">
<img src="docs/screenshots/progress.png" width="32%" alt="Progress charts: sessions, Zone 2 and hard-cardio minutes per week">
<img src="docs/screenshots/history.png" width="32%" alt="History calendar with skip reasons">
</p>
<p>
<img src="docs/screenshots/setup.png" width="49%" alt="First-run setup: choosing a theme">
<img src="docs/screenshots/setup-accessories.png" width="49%" alt="First-run setup: the accessories you need, each shown in a 3D example exercise">
</p>
<p>
<img src="docs/screenshots/mobile-today.png" width="24%" alt="Today on a phone">
<img src="docs/screenshots/mobile-exercise.png" width="24%" alt="An exercise on a phone">
</p>

> Unofficial and not affiliated with or endorsed by Bryan Johnson or Blueprint. It's a training plan, not medical advice. If you have been inactive for a while, are over 50 or have a heart condition, check with a doctor before hard intervals.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

With [Git](https://git-scm.com) installed, open a terminal (PowerShell on Windows) and run:

```bash
git clone https://github.com/liviux/Bryan-Johnson-workout-website.git
cd Bryan-Johnson-workout-website
npm install
npm start
```

Open **http://localhost:3030**. The first visit opens a short setup where you enter your details, pick your training level, see which accessories you need (each one shown in a 3D example exercise) and pick add-ons.

Keep the terminal window open while you use the app. To stop it, press **Ctrl+C** in that window. Next time, open a terminal in the project folder and run `npm start` again.

<details>
<summary><b>Advanced settings: port, phone access, data location and automatic startup</b></summary>

- Different port: `PORT=8080 npm start`
- Use it from your phone on the same Wi-Fi: `HOST=0.0.0.0 npm start`, then open `http://<your-computer's-IP>:3030`. There is no login, so only do this on a network you trust.
- Keep your data somewhere else (e.g. a synced folder): `DATA_DIR=/path/to/folder npm start`
- On Windows (PowerShell) set the variables first: `$env:PORT=8080; npm start`

### Run automatically on Linux

The included systemd unit starts the app after each boot. It expects the repository at `~/Bryan-Johnson-workout-website` and Node at `/usr/bin/node`; edit those paths in the unit if yours are different.

```sh
sudo cp deploy/bryan-workout@.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now "bryan-workout@$(id -un)"
```

To open it over Tailscale with HTTPS, keep the app bound to localhost and run:

```sh
sudo tailscale serve --bg --https=10000 http://127.0.0.1:3030
```

Then open `https://<device>.<tailnet>.ts.net:10000` on a Tailscale device. This stays within your tailnet. The app has no login, so do not expose it with Tailscale Funnel or a public port forward.

`npm install` only downloads three.js and three web fonts; the server itself uses nothing but Node.

</details>

To update later: stop the app, run `git pull`, then `npm install` in the project folder, and start it again with `npm start`. Your saved workouts stay in place.

## Your data

Your details and workouts save automatically on your computer. They are not uploaded to GitHub.

- **Back up** in **Settings → Export backup**. Keep the downloaded file somewhere safe.
- **Restore a backup** in **Settings → Import backup**. Choose merge to combine it with your existing logs, or replace to overwrite your current logs.

<details>
<summary><b>Advanced: data files and browser storage</b></summary>

By default, files are stored in the `data/` folder. This folder is excluded from Git, so normal commits do not include your personal data:

```
data/
  profile.json          your details, settings and chosen add-ons
  days/2026-10-14.json  one file per day: sets, reps, notes, skip reason…
```

- You can also back up by copying the entire `data/` folder. See **Advanced settings** under **Run it locally** to change its location.
- If the app is opened without its server (for example through some other web server), it can't write files, so it keeps your data in the browser instead and says so in the sidebar and in Settings. Use `npm start` to get files, 3D and fonts.

</details>

## Your details (what adjusts the plan)

Enter your details during setup and change them any time in **Settings**. If you are new to exercise, choose **New to training**. You can switch levels whenever you need an easier or harder workout.

| Setting | What it changes |
|---|---|
| Age, or a measured max heart rate | Your suggested heart-rate ranges during cardio |
| Weight, sex, age, training level | Suggested starting dumbbell weights |
| Heaviest dumbbell | Suggested weights are capped at it |
| Units | kg/cm or lb/in throughout |
| Training level | Which exercises you do, how many sets and reps, and how long the cardio lasts. Your level only changes when you choose it; past logs keep their original level. |
| Start date | Day one of your program |
| Add-ons | Which optional blocks appear after the main session |
| Theme, light or dark | How the app looks (see [Themes](#themes)); changes nothing in the plan |
| Animation style | How the exercise animations are drawn (see [Animation styles](#animation-styles)); changes nothing in the plan |

Suggested weights are starting points. Use a weight that lets you finish with good form and still have the number of good reps left that your level recommends.

<details>
<summary><b>Advanced: how the suggestions are calculated</b></summary>

- Maximum heart rate is estimated as `208 − 0.7 × age`, unless you enter a measured maximum.
- Starting weights are scaled from the plan's reference: a 75 kg man, age 38, returning to training.
- To edit your profile file directly, stop the app first, then edit `data/profile.json`.

</details>

## The week

| Day | Session |
|---|---|
| Mon | Strength A: squat, push, pull + knees |
| Tue | Intervals 1: 20-second bursts + Zone 2 + back & core |
| Wed | Strength B: pull, knees & mobility |
| Thu | Intervals 2: Norwegian 4×4 + stability |
| Fri | Strength C: power, lunge, press + tendons |
| Sat | Zone 2 + long stretch (swap for a walk, hike or ride outside any time) |
| Sun | Rest |

About 34–45 minutes a session at New to training, 41–50 at Returning, 53–60 at Active and 54–66 at Well trained, plus 8–10 minutes for the posture add-on. *The plan* page in the app explains the levels, rules, heart-rate zones, how the week compares with Bryan's targets, what Bryan does now, equipment swaps and all sources. A readable snapshot of the whole plan is in [docs/PLAN.md](docs/PLAN.md).

## Themes

Choose one of seven themes during setup or in **Settings → Appearance**. Use **Try themes live** to compare them while using the app. Changing the theme keeps your workouts and data the same.

<p>
<img src="docs/screenshots/theme-chapters.png" width="32%" alt="Chapters theme with Anime animation: top navigation, a black hero with huge type, blocks as colour fields">
<img src="docs/screenshots/theme-darkroom.png" width="32%" alt="Dark room theme with Stardust animation: the figure on the left, the session in the middle, navigation on the right">
<img src="docs/screenshots/theme-pulse.png" width="32%" alt="Pulse theme with Synthwave animation: icon rail, bento tiles and a big progress ring on black">
</p>
<p>
<img src="docs/screenshots/theme-lab.png" width="32%" alt="Lab theme with Blueprint animation: a ruled Swiss layout in three columns">
<img src="docs/screenshots/theme-olympia.png" width="32%" alt="Olympia theme with Pictogram animation: an orange header and hero on an intervals day, the list on the left">
<img src="docs/screenshots/theme-course.png" width="32%" alt="Course theme with Doodle animation: exercises as controls on a purple course line, one opened in place">
</p>

Each screenshot uses a different animation style: Chapters with **Anime**, Dark room with **Stardust**, Pulse with **Synthwave**, Lab with **Blueprint**, Olympia with **Pictogram**, and Course with **Doodle**. Themes and animation styles can be mixed freely.

<details>
<summary><b>Theme descriptions and design details</b></summary>

Pick a theme in the first-run setup (it changes as you click) or later in **Settings → Appearance**. To compare them on your own pages, use **Try themes live** there: a small switcher floats at the top of the screen with one letter per theme (hover for the name) while you move around the app; close it with ×. Each one moves things around as well as recolouring them: where the navigation sits, how Today is laid out, the type, the shapes, even the colours of the 3D scene. Your data and settings stay the same whichever you use. Every theme except Dark room also follows your light/dark choice.

The six new ones follow public design guides, two each: [taste-skill](https://github.com/Leonxlnx/taste-skill), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) and [impeccable](https://github.com/pbakaus/impeccable).

| Theme | Guide | What's different |
|---|---|---|
| **Original** | — | The first look: sidebar on the left, rounded cards, teal accent. |
| **Chapters** | taste-skill | Navigation across the top, a full-width hero in huge type, and every block of the day as its own flat colour field (sage warm-up, acid power, orange strength, black Zone 2). Square corners, one typeface, no lines or shadows. |
| **Dark room** | taste-skill | Always dark. The 3D figure is the lit exhibit on the left, the session in the middle, navigation as a short list on the right. Light condensed type, round buttons. |
| **Pulse** | ui-ux-pro-max | Its fitness-app recipe: black (or light) with orange and green, a slim icon rail, bento tiles and a big animated progress ring. Finished exercises turn green. |
| **Lab** | ui-ux-pro-max | Its longevity-app recipe: a Swiss grid with ruled lines and no rounded corners, figures in mono, a tabbed masthead, and three columns on wide screens (session, list, exercise). |
| **Olympia** | impeccable | A colour for each kind of session, after the 1972 Munich Games signage: blue strength, orange intervals, green Zone 2, silver rest. The header, the hero and the 3D floor take the colour of the day you're looking at. The list leads on the left. |
| **Course** | impeccable | The session drawn as an orienteering course: a start triangle, a purple control circle per exercise, a finish double circle. One column; an exercise opens in place under its row instead of in a side panel. |

How the themes are built, and how to add your own: [docs/THEMES.md](docs/THEMES.md).

</details>

## Animation styles

Choose one of fifteen looks in **Settings → Animation style**. **Athlete** is the default. Each style shows the same exercise movement, and you can preview it before choosing. Use **Try styles live** to compare them during a session.

The speed button goes up to **2×**. For demonstrations with several movements, use the arrows to pick one and choose **Fixed** to keep showing it.

![The fifteen animation styles previewed on one exercise](docs/screenshots/anim-styles.png)

![Today with the animation style switcher, a fixed warm-up movement, and the zoom controls](docs/screenshots/anim-live.png)

<details>
<summary><b>Animation style descriptions and technical details</b></summary>

Other ways to draw the exercise animations, on all 62 exercises, props, dumbbells and bands included. **Athlete** is the default. Pick another in **Settings → Animation style**, which has a live preview (pick any exercise for it under the preview) and a card with a still of each style on that exercise, or use **Try styles live** there: it opens today's session (on a phone or a rest day, the exercise in the preview) with a numbered switcher at the top of the screen (hover for the name; on a phone it turns into ‹ name ›), like the theme switcher. Both switchers can be open at once.

Every style plays the same movement: the stage works out the skeleton and the camera once, and each style draws them its own way. The first six are three.js scenes. The other nine don't use three.js to draw: they get the joints projected to the screen (or, for Liquid chrome, the camera itself) and draw with SVG, a 2D canvas, text or a shader of their own, so the camera buttons, zoom controls and dragging still work in all of them. The animation speed button goes up to 2×; for multi-movement animations, use the arrows to select a movement and choose **Fixed** to keep it on screen.

| # | Style | Drawn with | Looks like |
|---|---|---|---|
| 1 | **Athlete** (default) | three.js | Semi-realistic, like Mixamo characters: skin, muscle-shaped limbs, T-shirt, shorts, trainers, hair and a face, under warm studio light; the worked muscles glow. |
| 2 | **Mannequin** | three.js | The original smooth grey figure the app started with. |
| 3 | **Anime** | three.js | Cel shading after VRM avatars and their MToon shader: soft bands with violet shadows, a rim light, thin outlines, a big head with painted eyes and spiky pink hair. |
| 4 | **Low poly** | three.js | Faceted, flat-coloured shapes like Quaternius' free game characters. |
| 5 | **Cartoon** | three.js | Classic cel shading with two hard tones and thick black ink outlines; the worked muscles get a yellow outline. |
| 6 | **Voxel** | three.js | Minecraft-style blocks with pixel-art textures, on grass; the props get a pixel texture in their own colour. |
| 7 | **Pictogram** | SVG | A white sign figure on a blue tile after Otl Aicher's 1972 Munich Olympics pictograms; the worked muscles in orange, a heart on the chest for cardio. |
| 8 | **Ink brush** | 2D canvas | Sumi-e brush strokes on rice paper that leave fading ink trails, an ensō circle for the head, vermilion washes on the worked muscles. |
| 9 | **ASCII** | Text | The figure typed out in characters on a green CRT, with a floor grid; the worked muscles in amber. |
| 10 | **Synthwave** | 2D canvas | Neon tubes on a magenta grid that scrolls toward you in true perspective, a striped sun behind wireframe mountains, a reflection on the wet floor; the worked muscles in hot pink. |
| 11 | **Blueprint** | SVG | An engineering drawing that measures you as you move: live knee and hip angle dimensions, readouts of both knees, hips and elbows, hatched muscles, dash-dot centre lines, hidden lines dashed, the height of a step or box dimensioned, and a title block naming the exercise. |
| 12 | **Stardust** | 2D canvas | About 1,800 particles in deep space, each chasing its own spot on the body with its own lag, so the moving parts smear into light trails; the joints shine as a constellation. |
| 13 | **Doodle** (funny) | SVG | A biro stick figure in a school notebook, its lines wobbling like hand-drawn animation: highlighter on the worked muscles, a face that strains on the way up, flying sweat, motion lines and a speech bubble with opinions about each kind of exercise. |
| 14 | **Googly** (funny) | 2D canvas | A fuzzy purple monster in enormous trainers whose googly eyes run on real physics (every jolt of the head throws the pupils about), with a wobbly antenna and buck teeth; the worked muscles turn sparkling pink, and cardio beats a heart on its belly. |
| 15 | **Liquid chrome** | WebGL shader | A mirror-finish body that flows like poured metal, ray-marched per pixel in one fragment shader on plain WebGL: capsules melted together, reflections of the studio, the floor and itself, soft shadows, gold where the muscles work. It lowers its resolution by itself on slow devices. |

How the styles are built, and how to add one: [docs/ANIMATIONS.md](docs/ANIMATIONS.md#animation-styles).

</details>

## Add-ons

Add-ons are optional blocks shown after the main session, picked on first run (and in Settings). They are tracked exactly like the main session: tick-offs, sets, notes, plus their own daily metrics.

**Posture correction** (included): 8–10 minutes a day from Bryan's posture guide (string cue, wall slides, band pull-aparts, face pulls, external rotation, gentle neck work) with his two physical-therapist exercises to fatigue on Wednesday and Saturday, plus chin tucks and a doorway stretch marked as "classic, not Bryan's". It also tracks neck stiffness (0–10) and reminds you every two weeks to take a side photo and do a wall check.

<details>
<summary><b>Advanced: make your own add-on</b></summary>

**Make your own**: copy `public/js/data/addons/posture.js`, change the items (any exercise id from `public/js/data/exercises.js`), the schedule and the metrics, then add it to `ADDONS` in `public/js/data/addons/index.js`. Logging, auto-save, history and the setup screen pick it up automatically.

</details>

<details>
<summary><b>For developers: changing the plan and project layout</b></summary>

## Changing the plan

- `public/js/data/program.js` — the days, blocks and doses per training level, what each level means, rules, sources.
- `public/js/data/exercises.js` — every exercise: how-to steps, Bryan's notes, videos (with timestamps into his videos), equipment, what it's logged as.
- `public/js/data/addons/` — optional blocks.
- `public/js/anim/clips/` — the 3D animations. See [docs/ANIMATIONS.md](docs/ANIMATIONS.md) for how to write or tweak one, and open `/dev/animations.html?ids=pushup` to see every keyframe side by side.

Text in the data can use tokens that adapt to each user: `{hr:60-70}` becomes the user's heart-rate range, `{kg:10-14}` a weight scaled to them in their units, `{cm:30}` a length in their units.

## Project layout

```
server.js                 tiny Node server: serves the app, reads/writes data/ (no dependencies)
public/
  index.html, css/app.css  the app and the Original look
  css/themes.css          the other six themes
  js/themes.js            the theme list, switching, and the theme picker
  js/anim-styles.js       the animation style list, which exercises take them, and the style picker
  js/main.js              routing and app shell
  js/store.js             state + auto-save (server, with a browser-storage fallback)
  js/plan.js              program logic: sessions, levels and doses, status, stats
  js/personalize.js       heart-rate zones, weight scaling, units, training levels
  js/views/               today, guided workout, week, history, progress, exercises, plan, settings, setup
  js/components/          exercise panel, logger, timers, videos, charts, 3D viewer, dialogs, live theme and style switchers
  js/anim/                three.js mannequin, inverse kinematics, props, exercise clips
  js/anim/styles/         the animation styles (three.js, SVG, 2D canvas, text and a WebGL shader)
  js/data/                the plan, exercises, videos, add-ons
docs/ANIMATIONS.md        guide to the animation system
docs/THEMES.md            how the themes work and how to add one
data/                     your data (created on first run, git-ignored)
```

</details>

## Credits

<details>
<summary><b>Sources, libraries and fonts</b></summary>

- Exercise selection and doses follow Bryan Johnson's public material (his protocol pages, posture guide, bone-density protocol, videos and posts on X); every source is listed on *The plan* page. Videos belong to their creators and are embedded from YouTube.
- 3D rendering with [three.js](https://threejs.org). Fonts: Inter, Barlow Condensed, JetBrains Mono (SIL Open Font License), via Fontsource.

</details>

## License

MIT — see [LICENSE](LICENSE).

---

<details>
<summary><b>How this was made: the prompts and the other models compared</b></summary>

The plan and this app were built with Claude Code from the prompts below, quoted as written (attachment paths removed). A couple of short status messages in between ("you should have access to the repo", "how much work is left?") are left out.

**1. The plan**

> check online all resources from Bryan Johnson or from someone who studied his workouts. (especially everything he posted on social media and his official websites). i want you to know everything, BUT i want you to help me using his latest suggestions, as i know he often changes things to better results. (so rememebr i'm interested only in what Bryan Johnson suggest/is doing, not anybody else).
>
> now i want to make a personalised workout plan for me 6 days out of 7, only sunday i rest. it should last max 60-70 minutes and be with my bodyweight and small equipment (even adjustable dumbells, pull up bar, etc), workout accesories, i dont want to buy big things that i dont have space to place them - so replace his gym equipment with similar routines with bodyweight or small workout accesories. also i will have a simple treradmill below my desk to walk/run from time to time, but thats extra, just for your information, i will use it from time to time when im working from my computer, separate from your workout.
>
> also each day i want to correct my posture, so add another EXTRA 5-10 minutes so i can coorect my posture as i often stay in a bad position at the computer (tech neck, shoulders too in front, upper body in principle) - until i consider im ok.
>
> you shuold both explain me what to do each day, each exercies and if you can give me a link to where he is doing or another video to see how to correctlly do it. (in my first weeks i will do a lighter version of course, until i can get fit again and comfortable)
>
> as you can see this is a important thing for me so i want you DO TO A LOT OF RESEARCH UNTIL YOU GIVE ME THE REUSLT!
>
> some details about me, not sure if needed, but might help ( male, 38 years old, 1.88, 75kg, i did a lot of fitness in the past, but for last 4 years almost nothing so i want to start over again +  no joint pain or past injuries in body) - answer me in metric system (kg, cm) as i live in Romania.
>
> you do not need to give me anythig else beside what i requested (like meds, rest, sleep, nutrition). i have a heart rate device already, so no interested in sucha device.

**2. Comparing other AI results**

> [attached: an archive with 13 plans made by other AI models] i got the follwoing different results, can you check them and adjust your version if you missed anything or if its better explained/better path somewhere else, basically read them to optimise/adjust/correct your version. if you are not sure which is better or if you need any other guidance ask me so i pick what i like better. then give me a final version

Claude asked three questions; the answers:

- *Weekly layout* (newest template / newest, all at home / keep the first layout) → "all are indoor sesions, i dont live in california, but in romania. i can do some extra activities from time tot ime though. so pick newest all at home"
- *How Bryan-specific should the strength days be* (hybrid / his signature routine / official basics only) → "Hybrid"
- *Posture block* (Bryan only / Bryan + 2 classics) → "Bryan + 2 classics"

**3. The web app**

> after you defined your guide create a beautifull website where i can see what to do each day, track them, repetitions and other observations per day, links to where i can find them, even embedings of videeo workouts (multiple, easy to change between them). it should have some sort of persistence, it will be hosted locally. there might be days when i skip for different reasons so take that in mind also (and i could write why i skipped). i want auto-save so user doesnt need to click on a save button. i would even prefer code animations and/or graphics with each exercise what is needed to be done (use javascript, three.js or whateer you want to do the best animations around and graphics and such)
> i will open source it on github so other can use it too, so make a small readme with instructions how to install it locally and run it (and local data to be gitignored of course). and where users should write their data so the exercises are adjusted per their weight, age, fit level.
> and the extra thing that i wanted, correcting the posture should be an optional eleemnt at the end, but same tracking mechanism (or slightlly different if tis the case) maybe i will add other extra/option/additional elements in the future (user should pick at configurating time (fist time opening the webapp) if they are interested in this addiiotnal elemtn or not.
> while i did start this project in this repo, which is irelevant to what i want, i want you to move everything inside https://github.com/liviux/Bryan-Johnson-workout-website which you should have access inside or if dont give me a zip and i will move there. i even want you to add in the readme at the end, collapsed by default, the prompts used to make this webapp and the other models that were used for you to adjust your final result (just the name that you get from the file names)

**Other models whose plans were compared** (names from the file names):
copilot, deepseek, ernie, gemini, glm, grok, longact, luna-max, minimax, mistral, muse, perpl, sol-max

</details>
