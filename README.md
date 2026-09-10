<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gvogas/gvogas/main/assets/readme-banner-dark.svg" />
  <img alt="George Vogas. One project at a time. A custom circuit-board illustration." src="https://raw.githubusercontent.com/gvogas/gvogas/main/assets/readme-banner-light.svg" width="100%" />
</picture>

<p align="center">
  <a href="https://gvogas.github.io/gvogas/"><strong>Explore my portfolio</strong></a> &nbsp; / &nbsp;
  <a href="https://www.linkedin.com/in/georgevogas/">LinkedIn</a> &nbsp; / &nbsp;
  <a href="https://devpost.com/Terminator320">Devpost</a>
</p>

<p align="center">CS student at Vanier College · Building software people use · Open to internships</p>

I learn by making things: a scheduling app a company uses every day, a ticketing platform built with classmates, and experiments in games and robotics.

---

## Things I've built

From a client commission to team projects and experiments.

### [Scheduling App](https://github.com/gvogas/Scheduling-App)

<sub>Featured project · Mobile · Commissioned, in daily use</sub>

A commissioned app that replaced a service company’s paper schedule with a shared calendar, client directory, and employee workflows. In daily use since handover.

<code>Flutter</code> <code>Firebase</code> <code>Google Places API</code> <code>Dart</code> <code>Android</code> <code>iOS</code>

<details>
<summary>Inside the build</summary>

- Real-time appointment calendar with per-employee color coding and admin/employee role separation
- Full client directory with accent-insensitive search across large record sets
- In-app photo capture, auto-compression, and background upload to Firebase Storage
- Invite-only employee onboarding: admin creates the account first, and only pre-whitelisted emails can register
- Light/dark mode, text scaling, and multi-language support, all persisted across sessions
- Google Places API for address autocomplete on client records

Feature-first folder structure, with all database access going through per-feature service
classes so that screens never query Firestore directly, behind a single centralized route
handler. I'm currently adding Wave billing: completed appointments auto-generate invoices,
sync client records, and surface payment status in the app.

</details>

---

### [TicketMaestrix](https://github.com/gvogas/Ticketmaestrix)

<sub>Web platform · Team of three · Deployed</sub>

An event ticketing platform built with Fadwa Shalby and Lucas Coveyduck. Customers browse events and buy tickets; admins manage inventory and sales. Deployed to cPanel through GitHub Actions.

<code>PHP</code> <code>Twig</code> <code>Slim MVC</code> <code>MySQL</code> <code>GitHub Actions</code> <code>cPanel</code>

<details>
<summary>Inside the build</summary>

- User accounts with event browsing, ticket purchase, and order history
- Admin dashboard for event creation, ticket inventory control, and transaction monitoring
- Built on a custom Slim MVC framework with Twig templating, no off-the-shelf CMS
- Internationalization support via a `/translations` directory
- CI/CD pipeline via GitHub Actions, deploying to cPanel on push

</details>

---

### [AI Study Assistant](https://github.com/gvogas/AI-Study-Assistant)

<sub>Hackathon · MariHacks · Team of four</sub>

Built at MariHacks with three collaborators. Turns topics, notes, and slides into study guides, flashcards, and quizzes, with a plant companion that grows as you learn.

<code>Python</code> <code>FastAPI</code> <code>Groq (LLaMA 3.3)</code> <code>Tavily</code> <code>SQLite</code> <code>Vanilla JS</code> · [Devpost](https://devpost.com/software/ai-study-assistant-giursf)

<details>
<summary>Inside the build</summary>

- Research agent (Tavily) and content agent (Groq/LLaMA 3.3) generate structured notes, 1-30 flashcards, and 1-20 multiple-choice questions at beginner, intermediate, or advanced difficulty
- Study plans of 1-30 days with priority tagging, allocating extra time to whatever your last quiz showed you were weak on
- Takes uploaded `.pdf`, `.pptx`, `.txt`, and `.md` files as sources alongside live web research
- Coin economy with four upgrade tracks, and a plant pet that heals on correct answers, takes damage on wrong ones, and unlocks seven tier skins
- Optional Spotify Connect: OAuth, device selection, playlist and track search, playback controls
- JWT auth, configurable SlowAPI rate limiting, Fernet-encrypted Spotify tokens, and pytest async coverage across the auth, quiz, shop, and Spotify flows

Feature-first FastAPI routers with a dedicated agent layer for AI and search and a service
layer holding the business logic. No framework on the frontend and no build step.

</details>

## More things I've made

### [Point-of-Sales Patterns](https://github.com/gvogas/Point-of-Sales_Patterns)

<sub>Desktop software · Course final</sub>

A JavaFX register system for my programming patterns course, covering orders, inventory, sales analytics, and payment.

<code>Java</code> <code>JavaFX</code> <code>MySQL</code> <code>Maven</code> <code>JDK 24</code>

<details>
<summary>Inside the build</summary>

- **Payments:** Factory Method implementations for cash, debit, and credit.
- **Concurrency:** A profit calculator splits sales across two threads, with semaphore synchronization.
- **Interface:** Separate screens for orders, inventory, sales analytics, and payment.
- **Data:** MySQL persistence with a schema and seed data in `pos.sql`.

</details>

---

### [The Rogue Market](https://github.com/gvogas/Star-wars-Interactive-Web-Application)

<sub>Web experiment · Course final</sub>

A twelve-page Star Wars storefront with live search, a persistent cart, and checkout. Built in vanilla JavaScript for my internet programming final.

<code>JavaScript</code> <code>HTML</code> <code>CSS</code> <code>JSON</code> <code>XML</code>

<details>
<summary>Inside the build</summary>

- Live product search with a suggestion dropdown and highlighted infinite-scroll results
- Cart with per-item quantity control, subtotal, and localStorage persistence
- Checkout flow with tax calculation, payment method validation, and order confirmation
- Cookie-based user profiles with an editable avatar
- Products rendered from category JSONs, navigation driven by XML over AJAX
- Modular JS: `AuthModel`, `CartManagement`, `ProductModel`, `SearchModel`, `FormValidation`

</details>

---

### [Last Signal](https://github.com/alexder204/LastSignal)

<sub>Game development · Contributor</sub>

A Unity game I contribute to, focusing on gameplay code and custom shaders in ShaderLab and HLSL.

<code>Unity</code> <code>C#</code> <code>ShaderLab</code> <code>HLSL</code>

## What I work with

| Focus | Tools I use |
| --- | --- |
| **Mobile** | Flutter · Dart · Firebase · Android · iOS |
| **Web & APIs** | Python · FastAPI · PHP · Slim · Twig · JavaScript |
| **Desktop & games** | Java · JavaFX · C# · .NET · Unity |
| **Data & deployment** | MySQL · SQLite · Linux · Apache · GitHub Actions · cPanel |

<details>
<summary>More tools and foundations</summary>

HTML, CSS, C++, shell, a little Wolfram, Maven, Stripe, and Google Maps.

Coursework has covered OOP and design patterns, multithreading and synchronization,
schema design and normalization, REST APIs, and Linux and CI/CD deployment.

</details>

Outside coursework, I work on robotics: embedded C/C++, microcontroller firmware, PID control loops, and sensor fusion. Away from the keyboard, I play hockey and follow hockey analytics.

## A year of building

Public contributions, one commit at a time.

[Explore my repository skyline](https://gvogas.github.io/gvogas/#city) — the interactive 3D view on my portfolio.

<details>
<summary>View the contribution animation</summary>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake-dark.svg" />
  <img alt="A snake eating my GitHub contribution graph" src="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake.svg" />
</picture>

</details>

## Reaching me

I'm looking for an internship, and I'm happy to talk about a project even if you're not
hiring. [LinkedIn](https://www.linkedin.com/in/georgevogas/) is the fastest way to reach me.
