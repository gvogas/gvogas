<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gvogas/gvogas/main/assets/readme-banner-dark.svg" />
  <img alt="Hey, I'm George. CS student at Vanier College in Montréal." src="https://raw.githubusercontent.com/gvogas/gvogas/main/assets/readme-banner-light.svg" width="100%" />
</picture>

**Computer science student at Vanier College in Montréal.**
I build mobile, web, and desktop software, including a commissioned scheduling app that a service company uses every day.

**[Portfolio](https://gvogas.github.io/gvogas/)** · **[LinkedIn](https://www.linkedin.com/in/georgevogas/)** · **[Devpost](https://devpost.com/Terminator320)**

> **Currently building:** Wave invoicing for the scheduling app.<br>
> **Open to:** Internships where I can keep learning by shipping.

[Projects](#things-ive-built) · [Tools](#what-i-work-with) · [Activity](#a-year-of-building) · [Contact](#reaching-me)

## Things I've built

From a client commission to team projects and experiments.

### Scheduling App

<sub>Featured project · Mobile · Commissioned, in daily use</sub>

**From paper schedules to everyday software.**

A commissioned app that replaced a service company’s paper schedule with a shared calendar, client directory, and employee workflows. In daily use since handover.

*Flutter · Firebase · Google Places API · Dart · Android · iOS* — [View repository](https://github.com/gvogas/Scheduling-App)

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

### TicketMaestrix

<sub>Web platform · Team of three · Deployed</sub>

An event ticketing platform built with Fadwa Shalby and Lucas Coveyduck. Customers browse events and buy tickets; admins manage inventory and sales. Deployed to cPanel through GitHub Actions.

*PHP · Twig · Slim MVC · MySQL · GitHub Actions · cPanel* — [View repository](https://github.com/gvogas/Ticketmaestrix)

<details>
<summary>Inside the build</summary>

- User accounts with event browsing, ticket purchase, and order history
- Admin dashboard for event creation, ticket inventory control, and transaction monitoring
- Built on a custom Slim MVC framework with Twig templating, no off-the-shelf CMS
- Internationalization support via a `/translations` directory
- CI/CD pipeline via GitHub Actions, deploying to cPanel on push

</details>

---

### AI Study Assistant

<sub>Hackathon · MariHacks · Team of four</sub>

Built at MariHacks with three collaborators. Turns topics, notes, and slides into study guides, flashcards, and quizzes, with a plant companion that grows as you learn.

*Python · FastAPI · Groq (LLaMA 3.3) · Tavily · SQLite · Vanilla JS* — [View repository](https://github.com/gvogas/AI-Study-Assistant) · [Devpost](https://devpost.com/software/ai-study-assistant-giursf)

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

---

### Point-of-Sales Patterns

<sub>Desktop software · Course final</sub>

A JavaFX register system for my programming patterns course, covering orders, inventory, sales analytics, and payment.

*Java · JavaFX · MySQL · Maven · JDK 24* — [View repository](https://github.com/gvogas/Point-of-Sales_Patterns)

<details>
<summary>Inside the build</summary>

- **Payments:** Factory Method implementations for cash, debit, and credit.
- **Concurrency:** A profit calculator splits sales across two threads, with semaphore synchronization.
- **Interface:** Separate screens for orders, inventory, sales analytics, and payment.
- **Data:** MySQL persistence with a schema and seed data in `pos.sql`.

</details>

---

### The Rogue Market

<sub>Web experiment · Course final</sub>

A twelve-page Star Wars storefront with live search, a persistent cart, and checkout. Built in vanilla JavaScript for my internet programming final.

*JavaScript · HTML · CSS · JSON · XML* — [View repository](https://github.com/gvogas/Star-wars-Interactive-Web-Application)

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

### Last Signal

<sub>Game development · Contributor</sub>

A Unity game I contribute to, focusing on gameplay code and custom shaders in ShaderLab and HLSL.

*Unity · C# · ShaderLab · HLSL* — [View repository](https://github.com/alexder204/LastSignal)


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

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake-dark.svg" />
  <img alt="A snake eating my GitHub contribution graph" src="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake.svg" />
</picture>

## Reaching me

I'm looking for an internship, and I'm happy to talk about a project even if you're not
hiring. [LinkedIn](https://www.linkedin.com/in/georgevogas/) is the fastest way to reach me.
