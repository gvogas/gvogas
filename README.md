# Hey, I'm George 👋
 
**Computer Science Student @ Vanier College · Montréal, QC**
 
I build real, production-quality software — not just assignments.  
From commissioned mobile apps to game engines, my work spans the full stack and beyond.
 
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/george-vogas-b13944338/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Terminator320)
 

---
 
## 👨‍💻 About Me
 
I'm a CS student who gravitates toward projects that solve real problems for real users. My background covers full-stack web development, mobile apps, desktop software, and database design — with a strong emphasis on clean architecture and practical patterns.
 
What sets my work apart: I've shipped a **client-commissioned production app** still actively in use, collaborated on a **Unity game** with custom HLSL shaders, and built everything from MVC web platforms to modular JavaScript e-commerce frontends entirely from scratch.
 
**I care about:** clean code structure, meaningful UX, and building things that actually work outside the classroom.
 
---
 
## 🚀 Projects
 
---
 
### 📅 Scheduling App &nbsp;·&nbsp; [View Repo →](https://github.com/Terminator320/Scheduling-App)
 
> **Flutter · Firebase · Google Places API · Dart**  
> *Client-commissioned · Production · Android*
 
A real business application built for a service company to replace paper-based scheduling and fragmented team communication. Not a demo — actively used.
 
**What it does:**
- Real-time appointment calendar with per-employee color coding and admin/employee role separation
- Full client directory with accent-insensitive search across large record sets
- In-app photo capture, auto-compression, and background upload to Firebase Storage
- Invite-only employee onboarding — admin creates account first, only pre-whitelisted emails can register
- Light/dark mode, text scaling, multi-language support — all persisted across sessions
- Google Places API for address autocomplete on client records
**Architecture:** Feature-first folder structure; all DB access mediated through per-feature service classes — screens never query Firestore directly. Single centralized route handler.
 
**Up next:** Wave billing integration — completed appointments auto-generate invoices, sync client records, and surface payment status in-app.
 
---
 
### 🖥️ Point-of-Sales Patterns &nbsp;·&nbsp; [View Repo →](https://github.com/Terminator320/Point-of-Sales_Patterns)
 
> **Java · JavaFX · MySQL · Maven · JDK 24**  
> *Final Project — Programming Patterns Course*
 
A full desktop POS system that's also a showcase of applied software design patterns — built to prove the concepts, not just describe them.
 
**What it does:**
- Multi-screen JavaFX GUI: main menu, order flow, inventory management, sales analytics, and payment
- **Factory Method** pattern for payment processing — Cash, Debit, and Credit each implemented as concrete factories
- **Multithreaded profit calculator** — splits the sales list across two threads with semaphore synchronization for safe aggregation
- MySQL-backed inventory, menu items, ingredients, and sales orders with a full SQL schema included
- MVC-inspired structure with centralized logging to file
**Stack note:** MySQL JDBC connector bundled; database schema + seed data included as `pos.sql` for instant setup.
 
---
 
### 🎟️ TicketMaestrix &nbsp;·&nbsp; [View Repo →](https://github.com/Terminator320/Ticketmaestrix)
 
> **PHP · Twig · Slim MVC · MySQL · GitHub Actions · cPanel**  
> *Team Project · Deployed*
 
A full-stack event ticketing platform — users browse and purchase tickets for concerts, raffles, and movies; admins manage events, availability, and transactions.
 
**What it does:**
- User accounts with event browsing, ticket purchase, and order history
- Admin dashboard for event creation, ticket inventory control, and transaction monitoring
- Built on a custom Slim MVC framework with Twig templating — no off-the-shelf CMS
- Internationalization support via `/translations` directory
- CI/CD pipeline via GitHub Actions deploying to cPanel on push
**Team:** George Vogas · Fadwa Shalby · Lucas Coveyduck
 
---
 
### 🌌 The Rogue Market &nbsp;·&nbsp; [View Repo →](https://github.com/Terminator320/Star-wars-Interactive-Web-Application)
 
> **JavaScript · HTML · CSS · JSON · XML**  
> *Final Project — Internet Programming Course*
 
A fully client-side e-commerce simulation with a Star Wars–inspired UI — 12 pages, modular JS architecture, zero backend.
 
**What it does:**
- Live product search with suggestion dropdown and highlighted infinite-scroll results
- Shopping cart with per-item quantity control, subtotal, and localStorage persistence
- Full checkout flow — tax calculation, payment method validation, order confirmation
- Cookie-based user profile system with editable avatar
- Dynamic product rendering from category JSONs; XML-powered navigation via AJAX
- Modular JS: `AuthModel`, `CartManagement`, `ProductModel`, `SearchModel`, `FormValidation`, injected `Header`/`Footer`
- Starfield backgrounds, neon hover effects, `Orbitron` / `Pathway Gothic One` fonts
---
 
### 🎮 Last Signal &nbsp;·&nbsp; [View Repo →](https://github.com/alexder204/LastSignal) *(Contributor)*
 
> **Unity · C# · ShaderLab · HLSL**
 
A collaborative Unity game project. Contributed to gameplay systems and rendering — the repo is primarily ShaderLab (50%) and HLSL (10%), meaning significant custom shader and visual effects work alongside core C# game logic.
 
---
 
## 🛠️ Tech Stack
 
### Languages
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
 
### Frameworks & Platforms
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![JavaFX](https://img.shields.io/badge/JavaFX-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![Unity](https://img.shields.io/badge/Unity-000000?style=for-the-badge&logo=unity&logoColor=white)
![jQuery](https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white)
![Apache](https://img.shields.io/badge/Apache-D22128?style=for-the-badge&logo=apache&logoColor=white)
 
### Data & Infrastructure
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
 
</div>
