# George Vogas

CS student at Vanier College, in Montréal. I build mobile, web, and desktop software.

[gvogas.github.io](https://gvogas.github.io/gvogas/) · [LinkedIn](https://www.linkedin.com/in/georgevogas/) · [Devpost](https://devpost.com/Terminator320)

I've learned primarily by building: a scheduling app a client uses every day, a ticketing
site my team deployed, a desktop POS system, and a Unity game I contribute to. Outside of
coursework, my main interests are robotics and hockey analytics.

My portfolio site has an interactive 3D view of these repositories, if you'd rather click
around than read.

Here's a snake eating a year of my commits:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake-dark.svg" />
  <img alt="A snake eating my GitHub contribution graph" src="https://raw.githubusercontent.com/gvogas/gvogas/output/github-snake.svg" />
</picture>

## Things I've built

### Scheduling App

*Flutter · Firebase · Google Places API · Dart · Android · iOS* — [repo](https://github.com/gvogas/Scheduling-App)

A service company was running its whole schedule on paper, so they hired me to replace it.
It has been in daily use since I handed it over.

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

### TicketMaestrix

*PHP · Twig · Slim MVC · MySQL · GitHub Actions · cPanel* — [site](https://ticketmaestrix.shop/) · [repo](https://github.com/gvogas/Ticketmaestrix)

Event ticketing site I built with two classmates, Fadwa Shalby and Lucas Coveyduck. Users
buy tickets for concerts, raffles, and movies; admins manage events, inventory, and sales.
It's deployed and running.

- User accounts with event browsing, ticket purchase, and order history
- Admin dashboard for event creation, ticket inventory control, and transaction monitoring
- Built on a custom Slim MVC framework with Twig templating, no off-the-shelf CMS
- Internationalization support via a `/translations` directory
- CI/CD pipeline via GitHub Actions, deploying to cPanel on push

### AI Study Assistant

*Python · FastAPI · Groq (LLaMA 3.3) · Tavily · SQLite · Vanilla JS* — [repo](https://github.com/gvogas/AI-Study-Assistant) · [Devpost](https://devpost.com/software/ai-study-assistant-giursf)

Built at MariHacks with three collaborators. Give it a topic, plus optionally your notes,
PDFs, or slides, and it generates study material. The coin economy, plant companion, and
Spotify playback are layered on top of that.

- Research agent (Tavily) and content agent (Groq/LLaMA 3.3) generate structured notes, 1-30 flashcards, and 1-20 multiple-choice questions at beginner, intermediate, or advanced difficulty
- Study plans of 1-30 days with priority tagging, allocating extra time to whatever your last quiz showed you were weak on
- Takes uploaded `.pdf`, `.pptx`, `.txt`, and `.md` files as sources alongside live web research
- Coin economy with four upgrade tracks, and a plant pet that heals on correct answers, takes damage on wrong ones, and unlocks seven tier skins
- Optional Spotify Connect: OAuth, device selection, playlist and track search, playback controls
- JWT auth, configurable SlowAPI rate limiting, Fernet-encrypted Spotify tokens, and pytest async coverage across the auth, quiz, shop, and Spotify flows

Feature-first FastAPI routers with a dedicated agent layer for AI and search and a service
layer holding the business logic. No framework on the frontend and no build step.

### Point-of-Sales Patterns

*Java · JavaFX · MySQL · Maven · JDK 24* — [repo](https://github.com/gvogas/Point-of-Sales_Patterns)

Final project for my programming patterns course. A JavaFX register system, built as an
excuse to actually use the patterns we spent the term reading about: Factory Method for
payment processing, with Cash, Debit, and Credit each as concrete factories, and a
multithreaded profit calculator that splits the sales list across two threads with
semaphore synchronization. Multi-screen GUI covering the order flow, inventory, sales
analytics, and payment, over a MySQL schema that ships with seed data in `pos.sql`.

### The Rogue Market

*JavaScript · HTML · CSS · JSON · XML* — [repo](https://github.com/gvogas/Star-wars-Interactive-Web-Application)

Star Wars themed store for my internet programming final. Twelve pages, vanilla JS, no
backend, no framework.

- Live product search with a suggestion dropdown and highlighted infinite-scroll results
- Cart with per-item quantity control, subtotal, and localStorage persistence
- Checkout flow with tax calculation, payment method validation, and order confirmation
- Cookie-based user profiles with an editable avatar
- Products rendered from category JSONs, navigation driven by XML over AJAX
- Modular JS: `AuthModel`, `CartManagement`, `ProductModel`, `SearchModel`, `FormValidation`

### Last Signal

*Unity · C# · ShaderLab · HLSL* — [repo](https://github.com/alexder204/LastSignal)

A Unity game I help out on. I write gameplay code and custom shaders, which is most of why
the repo is half ShaderLab and HLSL.

## What I work with

**Languages** — Python, Java, C#, Dart, JavaScript, PHP, C++, HTML, CSS, shell, a little Wolfram

**Frameworks and platforms** — Flutter, FastAPI, .NET, JavaFX, Unity, Slim, Twig, Stripe, Google Maps, Android, iOS

**Data and infrastructure** — Firebase, MySQL, SQLite, Maven, Linux, Apache, GitHub Actions, cPanel

Coursework has covered OOP and design patterns, multithreading and synchronization,
schema design and normalization, REST APIs, and Linux and CI/CD deployment. On my own
time I work on robotics: embedded C/C++, microcontroller firmware, PID control loops,
and sensor fusion.

## Reaching me

I'm looking for an internship, and I'm happy to talk about a project even if you're not
hiring. [LinkedIn](https://www.linkedin.com/in/george-vogas-b13944338/) is the fastest way
to reach me.
