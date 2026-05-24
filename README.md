<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b2e,50:2a2d5e,100:414868&height=200&section=header&text=George%20Vogas&fontSize=60&fontColor=ffffff&fontAlignY=35&desc=CS%20Student%20%40%20Vanier%20College&descAlignY=55&descSize=20&animation=fadeIn" width="100%" />

  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=22&pause=1000&color=58A6FF&center=true&vCenter=true&width=600&lines=Building+production+software%2C+not+demos;Full-stack+%7C+Mobile+%7C+Systems;Open+to+internship+%26+collaboration" alt="Typing SVG" />

  <br/>

  [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/george-vogas-b13944338/)
  [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gvogas)
  [![Devpost](https://img.shields.io/badge/Devpost-003E54?style=for-the-badge&logo=devpost&logoColor=white)](https://devpost.com/Terminator320)
  [![Profile Views](https://komarev.com/ghpvc/?username=gvogas&style=for-the-badge&color=58A6FF&label=PROFILE+VIEWS)](https://github.com/gvogas)
</div>

---

## 👨‍💻 About Me

I'm a CS student who gravitates toward projects that solve real problems for real users. My background covers full-stack web development, mobile apps, desktop software, and database design — with a strong emphasis on clean architecture and practical patterns. I've shipped a **client-commissioned production app** still actively in use, collaborated on a **Unity game** with custom HLSL shaders, and built everything from MVC web platforms to modular JS e-commerce frontends entirely from scratch.

**I care about:** clean code structure, meaningful UX, and building things that actually work outside the classroom.

---

## 📊 GitHub Stats

<div align="center">
  <img height="170" src="https://github-profile-summary-cards.vercel.app/api/cards/stats?username=gvogas&theme=tokyonight" />
  &nbsp;&nbsp;
  <img height="170" src="https://streak-stats.demolab.com?user=gvogas&theme=tokyonight&hide_border=true" />
  <br/><br/>
  <img width="100%" src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=gvogas&theme=tokyonight" />
</div>

---

## 🚀 Projects

### 📅 Scheduling App &nbsp;·&nbsp; [View Repo →](https://github.com/gvogas/Scheduling-App)

> **Flutter · Firebase · Google Places API · Dart** &nbsp;·&nbsp; *Client-commissioned · Production · Android*

<details>
<summary>What it does</summary>

A real business application built for a service company to replace paper-based scheduling and fragmented team communication. Not a demo — actively used.

- Real-time appointment calendar with per-employee color coding and admin/employee role separation
- Full client directory with accent-insensitive search across large record sets
- In-app photo capture, auto-compression, and background upload to Firebase Storage
- Invite-only employee onboarding — admin creates account first, only pre-whitelisted emails can register
- Light/dark mode, text scaling, multi-language support — all persisted across sessions
- Google Places API for address autocomplete on client records

**Architecture:** Feature-first folder structure; all DB access mediated through per-feature service classes — screens never query Firestore directly. Single centralized route handler.

**Up next:** Wave billing integration — completed appointments auto-generate invoices, sync client records, and surface payment status in-app.

</details>

---

### 🎟️ TicketMaestrix &nbsp;·&nbsp; [View Repo →](https://github.com/gvogas/Ticketmaestrix)

> **PHP · Twig · Slim MVC · MySQL · GitHub Actions · cPanel** &nbsp;·&nbsp; *Team Project · Deployed*

<details>
<summary>What it does</summary>

A full-stack event ticketing platform — users browse and purchase tickets for concerts, raffles, and movies; admins manage events, availability, and transactions.

- User accounts with event browsing, ticket purchase, and order history
- Admin dashboard for event creation, ticket inventory control, and transaction monitoring
- Built on a custom Slim MVC framework with Twig templating — no off-the-shelf CMS
- Internationalization support via `/translations` directory
- CI/CD pipeline via GitHub Actions deploying to cPanel on push

**Team:** George Vogas · Fadwa Shalby · Lucas Coveyduck

</details>

---

### 🤖 AI Study Assistant &nbsp;·&nbsp; [View Repo →](https://github.com/gvogas/AI-Study-Assistant) &nbsp;·&nbsp; [Devpost →](https://devpost.com/software/ai-study-assistant-giursf)

> **Python · FastAPI · Groq (LLaMA 3.3) · Tavily · SQLite · Vanilla JS** &nbsp;·&nbsp; *Hackathon · MariHacks · Team*

<details>
<summary>What it does</summary>

A gamified, AI-powered study companion built at MariHacks. Drop in any topic plus optional notes, PDFs, or slides — the app generates study materials and wraps it all in a coin economy, a plant pet, and optional Spotify playback.

- AI research agent (Tavily) + content agent (Groq/LLaMA 3.3) generate structured notes, 1–30 flashcards, and 1–20 multiple-choice quiz questions at beginner / intermediate / advanced difficulty
- Personalized 1–30 day study plan with priority tagging and extra time automatically allocated to weak areas from your latest quiz
- Supports uploaded `.pdf`, `.pptx`, `.txt`, and `.md` files as study sources alongside web research
- Coin economy with four upgrade tracks, a growable plant pet that heals on correct answers and takes damage on wrong ones, and seven unlockable tier skins
- Optional Spotify Connect integration — OAuth, device selection, playlist/track search, and full playback controls
- JWT auth, configurable SlowAPI rate limiting, Fernet-encrypted Spotify tokens, and pytest async coverage across auth, quiz, shop, and Spotify flows

**Architecture:** Feature-first FastAPI routers (`auth`, `study`, `quiz`, `plan`, `shop`, `profile`, `plant`, `spotify`), dedicated agent layer for AI/search, service layer for all business logic — no framework on the frontend, zero build step.

**Team:** George Vogas · 3 collaborators

</details>

---

### 🖥️ Point-of-Sales Patterns &nbsp;·&nbsp; [View Repo →](https://github.com/gvogas/Point-of-Sales_Patterns)

> **Java · JavaFX · MySQL · Maven · JDK 24** &nbsp;·&nbsp; *Final Project — Programming Patterns Course*

<details>
<summary>What it does</summary>

A full desktop POS system that's also a showcase of applied software design patterns — built to prove the concepts, not just describe them.

- Multi-screen JavaFX GUI: main menu, order flow, inventory management, sales analytics, and payment
- **Factory Method** pattern for payment processing — Cash, Debit, and Credit each implemented as concrete factories
- **Multithreaded profit calculator** — splits the sales list across two threads with semaphore synchronization for safe aggregation
- MySQL-backed inventory, menu items, ingredients, and sales orders with a full SQL schema included
- MVC-inspired structure with centralized logging to file

**Stack note:** MySQL JDBC connector bundled; database schema + seed data included as `pos.sql` for instant setup.

</details>

---

### 🌌 The Rogue Market &nbsp;·&nbsp; [View Repo →](https://github.com/gvogas/Star-wars-Interactive-Web-Application)

> **JavaScript · HTML · CSS · JSON · XML** &nbsp;·&nbsp; *Final Project — Internet Programming Course*

<details>
<summary>What it does</summary>

A fully client-side e-commerce simulation with a Star Wars–inspired UI — 12 pages, modular JS architecture, zero backend.

- Live product search with suggestion dropdown and highlighted infinite-scroll results
- Shopping cart with per-item quantity control, subtotal, and localStorage persistence
- Full checkout flow — tax calculation, payment method validation, order confirmation
- Cookie-based user profile system with editable avatar
- Dynamic product rendering from category JSONs; XML-powered navigation via AJAX
- Modular JS: `AuthModel`, `CartManagement`, `ProductModel`, `SearchModel`, `FormValidation`, injected `Header`/`Footer`
- Starfield backgrounds, neon hover effects, `Orbitron` / `Pathway Gothic One` fonts

</details>

---

### 🎮 Last Signal &nbsp;·&nbsp; [View Repo →](https://github.com/alexder204/LastSignal) *(Contributor)*

> **Unity · C# · ShaderLab · HLSL**

<details>
<summary>What it does</summary>

A collaborative Unity game project. Contributed to gameplay systems and rendering — the repo is primarily ShaderLab (50%) and HLSL (10%), meaning significant custom shader and visual effects work alongside core C# game logic.

</details>

---

## 🛠️ Tech Stack

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![JavaFX](https://img.shields.io/badge/JavaFX-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![Unity](https://img.shields.io/badge/Unity-000000?style=for-the-badge&logo=unity&logoColor=white)
![jQuery](https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white)
![Apache](https://img.shields.io/badge/Apache-D22128?style=for-the-badge&logo=apache&logoColor=white)

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)

---

## 📚 Areas of Study

| Domain | Skills |
|---|---|
| **Software Development** | OOP, Design Patterns (Factory, MVC, Observer), multithreading & synchronization |
| **Mobile Development** | Flutter / Dart, Firebase (Auth, Firestore, Storage, App Check), offline-first architecture |
| **Web Development** | Full-stack PHP/MySQL, REST APIs, modular JavaScript, Twig templating, responsive CSS |
| **Database Design** | Schema design, normalization, stored procedures, MySQL / MariaDB / Firestore |
| **Systems** | Linux/Unix scripting, Apache, cPanel deployment, CI/CD with GitHub Actions |
| **Game Development** | Unity, C# game logic, ShaderLab / HLSL custom shaders |

---

*Always building something. Open to collaboration and internship opportunities.*

[![LinkedIn](https://img.shields.io/badge/Let's%20Connect-LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/george-vogas-b13944338/)
[![Devpost](https://img.shields.io/badge/My%20Projects-Devpost-003E54?style=for-the-badge&logo=devpost&logoColor=white)](https://devpost.com/Terminator320)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:414868,50:2a2d5e,100:1a1b2e&height=120&section=footer" width="100%" />
