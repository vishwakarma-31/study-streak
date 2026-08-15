# Full Day-By-Day Curriculum — All 8 Phases

This is the authoritative content source for the roadmap seed data. Every weekday (Mon–Fri) of every week across all 8 phases now has a specific task — no more repeated week-level placeholders.

**How each weekday maps to the 4 blocks (fixed structure, applies every weekday):**

| Block | Time | Content |
|---|---|---|
| Block 1 – Session 1 | 4:15–5:00 am | That day's task below (learn/watch) |
| Block 1 – Session 2 | 5:05–5:50 am | Same task — practice/code along |
| Block 2 – Session 1 | 8:00–8:45 pm | Continue the task — apply it / project work |
| Block 2 – Session 2 | 8:50–9:35 pm | **Mon/Wed/Fri → DSA problem (see phase's dsaFocus)** · **Tue/Thu → revisit anything unclear + 1-line log** |

Saturday and Sunday keep their own distinct block labels and times as already defined (Topic review, DSA review, Bug fixes, Weekly planning) — those are unaffected by this file.

---

## Phase 1 — Web Foundations

### Week 1: HTML — structure, semantic tags, forms
- Mon: HTML document structure & basic tags (html, head, body, headings, paragraphs)
- Tue: Semantic tags (header, nav, main, section, article, footer)
- Wed: Lists, links, images, and tables
- Thu: Forms — input types, labels, basic validation attributes
- Fri: Practice day — rebuild a simple page from scratch using everything this week, no reference

### Week 2: CSS — box model, flexbox, grid, responsive design
- Mon: Box model — margin, border, padding, sizing
- Tue: Flexbox — main/cross axis, justify-content, align-items
- Wed: CSS Grid — grid-template-columns/rows, gap, grid areas
- Thu: Responsive design — media queries, mobile-first approach
- Fri: Practice day — recreate the portfolio layout responsively using flexbox/grid, no reference

### Week 3: Git & GitHub basics
- Mon: Git basics — init, add, commit, status, log
- Tue: Branching — create/switch/merge branches
- Wed: GitHub — remote repos, push, pull, clone
- Thu: .gitignore, resolving basic merge conflicts
- Fri: Practice day — push the portfolio project to GitHub with a proper commit history

### Week 4: Build the portfolio project
- Mon: Plan page structure & content (wireframe on paper/Figma)
- Tue: Build HTML structure for all sections
- Wed: Style with CSS (layout, responsiveness)
- Thu: Polish — cross-browser check, accessibility basics (alt text, semantic tags)
- Fri: Deploy — push final version to GitHub, add README

---

## Phase 2 — JavaScript Fundamentals

### Week 1: Variables, data types, operators
- Mon: var/let/const, primitive data types
- Tue: Arithmetic & assignment operators
- Wed: Comparison & logical operators
- Thu: Type coercion & conversion
- Fri: Practice — small exercises mixing all of the above

### Week 2: Conditionals and loops
- Mon: if/else, else if
- Tue: switch statements
- Wed: for loops
- Thu: while / do-while loops
- Fri: Practice — build FizzBuzz or a simple number-guessing script

### Week 3: Functions, scope
- Mon: Function declarations vs expressions
- Tue: Parameters, default values, return values
- Wed: Local vs global scope
- Thu: Nested functions, intro to recursion
- Fri: Practice — refactor earlier exercises into reusable functions

### Week 4: Arrays and array methods
- Mon: Array basics — indexing, push/pop/shift/unshift
- Tue: map()
- Wed: filter()
- Thu: reduce()
- Fri: Practice — use map/filter/reduce together on a sample dataset

### Week 5: Objects, this keyword
- Mon: Object literals, properties, methods
- Tue: Nested objects, accessing/updating properties
- Wed: `this` keyword in object methods
- Thu: Object.keys/values/entries
- Fri: Practice — model a real-world entity (e.g. a student record) as objects

### Week 6: DOM selection & manipulation
- Mon: querySelector/querySelectorAll, getElementById
- Tue: Changing text/content, innerHTML vs textContent
- Wed: Modifying styles and classes via JS
- Thu: Creating and appending new elements dynamically
- Fri: Practice — build a dynamic list (add/remove items) with plain JS

### Week 7: Events & event listeners
- Mon: addEventListener, click events
- Tue: Form events — submit, input, change
- Wed: Event object, preventDefault()
- Thu: Event delegation basics
- Fri: Practice — wire up interactivity for the to-do list app

### Week 8: Project week — to-do list / calculator
- Mon: Set up HTML/CSS structure for the project
- Tue: Implement core logic (add/complete/delete items or calculator operations)
- Wed: Wire up DOM manipulation + event listeners
- Thu: Edge cases & bug fixing
- Fri: Polish, push to GitHub, write README

---

## Phase 3 — JavaScript Deep Dive

### Week 1: ES6+ syntax
- Mon: let/const review, arrow functions
- Tue: Template literals
- Wed: Default parameters, rest parameters
- Thu: Enhanced object literals
- Fri: Practice — refactor earlier project code to ES6+ style

### Week 2: Destructuring, spread/rest operators
- Mon: Array destructuring
- Tue: Object destructuring
- Wed: Spread operator (arrays, objects)
- Thu: Rest operator in functions
- Fri: Practice — apply destructuring/spread across earlier exercises

### Week 3: Higher-order functions, closures
- Mon: Functions as values, passing functions as arguments
- Tue: Returning functions from functions
- Wed: Closures — concept and simple examples
- Thu: Practical closure use cases (counters, private state)
- Fri: Practice — build a small closure-based counter/module

### Week 4: Promises
- Mon: Callback functions & callback hell (why promises exist)
- Tue: Promise basics — then/catch
- Wed: Chaining promises
- Thu: Promise.all basics
- Fri: Practice — simulate async operations with setTimeout + Promises

### Week 5: Async/await
- Mon: async/await syntax basics
- Tue: Error handling with try/catch in async functions
- Wed: Converting promise chains to async/await
- Thu: Sequential vs parallel async calls
- Fri: Practice — rewrite Week 4's promise exercises using async/await

### Week 6: Fetch API
- Mon: fetch() basics, GET requests
- Tue: Handling JSON responses
- Wed: POST requests with fetch
- Thu: Working with a public API (weather or GitHub API)
- Fri: Practice — fetch and display real data from a public API

### Week 7: Error handling
- Mon: try/catch/finally basics
- Tue: Custom error handling for failed API calls
- Wed: Validating user input before requests
- Thu: Displaying user-friendly error states in UI
- Fri: Practice — add robust error handling to the Week 6 API project

### Week 8: Project week — weather app / GitHub finder
- Mon: Set up project structure, plan API integration
- Tue: Build the search/input UI
- Wed: Wire up fetch + display results
- Thu: Add loading and error states
- Fri: Polish, push to GitHub, write README

---

## Phase 4 — React

### Week 1: JSX, components basics
- Mon: JSX syntax, embedding expressions
- Tue: Functional components basics
- Wed: Component composition (components inside components)
- Thu: Fragments, rendering lists with .map()
- Fri: Practice — build 3–4 small static components

### Week 2: Props
- Mon: Passing props to components
- Tue: Prop types, default props
- Wed: children prop
- Thu: Passing functions as props
- Fri: Practice — build a reusable card/button component with props

### Week 3: State, useState
- Mon: useState basics
- Tue: Updating state correctly (avoiding direct mutation)
- Wed: Multiple state variables vs object state
- Thu: Lifting state up
- Fri: Practice — build a counter/toggle app using state

### Week 4: useEffect
- Mon: useEffect basics, dependency array
- Tue: Effects on mount vs every render
- Wed: Cleanup functions in useEffect
- Thu: Fetching data with useEffect
- Fri: Practice — fetch and display data on component mount

### Week 5: Conditional rendering, lists & keys
- Mon: Conditional rendering patterns (ternary, &&)
- Tue: Rendering lists with map()
- Wed: Keys — why they matter, common mistakes
- Thu: Combining conditional rendering + lists (empty states)
- Fri: Practice — build a filterable list component

### Week 6: Forms & controlled components
- Mon: Controlled inputs — value + onChange
- Tue: Handling multiple form fields
- Wed: Form submission handling
- Thu: Basic form validation
- Fri: Practice — build a small fully-controlled form

### Week 7: React Router
- Mon: Setting up React Router, basic routes
- Tue: Link/NavLink navigation
- Wed: Route params (dynamic routes)
- Thu: Nested routes basics
- Fri: Practice — add 2–3 routed pages to the week's project

### Week 8: Project week — multi-page React app
- Mon: Plan app structure & routes
- Tue: Build main pages/components
- Wed: Wire up state + data flow between components
- Thu: Add routing + polish UI
- Fri: Bug fixing, push to GitHub, write README

---

## Phase 5 — Backend Basics

### Week 1: Node.js basics
- Mon: Node.js runtime basics, running scripts
- Tue: Modules — require/import, built-in modules (fs, path)
- Wed: npm basics — package.json, installing packages
- Thu: Creating a basic HTTP server with Node's http module
- Fri: Practice — build a tiny script using fs + a small CLI tool

### Week 2: Express setup, basic routing
- Mon: Express setup, basic server
- Tue: Basic routes — GET/POST
- Wed: Route parameters, query strings
- Thu: Sending JSON responses, status codes
- Fri: Practice — build 3–4 basic routes for a sample resource

### Week 3: Middleware
- Mon: What middleware is, built-in middleware (express.json())
- Tue: Writing custom middleware
- Wed: Middleware order & next()
- Thu: Third-party middleware (cors, morgan)
- Fri: Practice — add logging + JSON parsing middleware to the server

### Week 4: REST API design — CRUD routes
- Mon: REST principles, resource naming conventions
- Tue: GET (list + single) routes
- Wed: POST (create) routes
- Thu: PUT/PATCH (update) and DELETE routes
- Fri: Practice — build full CRUD routes for one resource (in-memory data)

### Week 5: Testing APIs with Postman
- Mon: Postman basics — sending requests, collections
- Tue: Testing GET/POST requests
- Wed: Testing PUT/PATCH/DELETE
- Thu: Environment variables in Postman, saving requests
- Fri: Practice — build a full Postman collection for Week 4's API

### Week 6: Project structure / MVC pattern basics
- Mon: MVC pattern concept
- Tue: Splitting routes into separate files
- Wed: Controllers — separating logic from routes
- Thu: Organizing a scalable Express project structure
- Fri: Practice — refactor Week 4's API into proper MVC structure

### Week 7: Error handling in Express
- Mon: try/catch in route handlers
- Tue: Centralized error-handling middleware
- Wed: Custom error classes/status codes
- Thu: Validating request bodies (manual validation)
- Fri: Practice — add robust error handling across the API

### Week 8: Project week — backend API
- Mon: Plan the API's resources & routes
- Tue: Build routes + controllers
- Wed: Add middleware + error handling
- Thu: Test thoroughly with Postman, fix bugs
- Fri: Polish, push to GitHub, write README/API docs

---

## Phase 6 — Databases + Auth

### Week 1: MongoDB basics
- Mon: MongoDB concepts — documents, collections
- Tue: Setting up MongoDB Atlas, connecting via Compass
- Wed: Basic CRUD in the Mongo shell/Compass
- Thu: Querying — filters, projections
- Fri: Practice — create a sample collection and practice queries

### Week 2: Mongoose — schemas & models
- Mon: Mongoose setup, connecting to MongoDB from Node
- Tue: Defining schemas, field types
- Wed: Schema validation rules
- Thu: Models — creating documents via Mongoose
- Fri: Practice — define schemas for a sample resource

### Week 3: CRUD operations with Mongoose
- Mon: Create — .save() and .create()
- Tue: Read — find(), findById(), filtering
- Wed: Update — findByIdAndUpdate()
- Thu: Delete — findByIdAndDelete()
- Fri: Practice — full CRUD service functions using Mongoose

### Week 4: Connecting Express to MongoDB
- Mon: Wiring Mongoose connection into an Express app
- Tue: Updating Phase 5's routes to use MongoDB instead of in-memory data
- Wed: Handling async DB errors in routes
- Thu: Environment variables for DB connection strings
- Fri: Practice — fully migrate the backend API to MongoDB

### Week 5: Password hashing with bcrypt
- Mon: Why plaintext passwords are dangerous, hashing concept
- Tue: bcrypt basics — hash(), compare()
- Wed: Building a register route with hashed passwords
- Thu: Building a login route that compares hashes
- Fri: Practice — test register/login flow with Postman

### Week 6: JWT tokens — login/signup flow
- Mon: JWT concept — what's in a token, how it's signed
- Tue: Generating a JWT on login
- Wed: Sending/storing the token (headers vs cookies, tradeoffs)
- Thu: Verifying JWTs on incoming requests
- Fri: Practice — complete login flow returning a working JWT

### Week 7: Protected routes, auth middleware
- Mon: Writing JWT verification middleware
- Tue: Applying middleware to protected routes
- Wed: Attaching user info to the request object
- Thu: Handling expired/invalid tokens gracefully
- Fri: Practice — protect earlier CRUD routes, test with/without token

### Week 8: Project week — connect API to DB with login/signup
- Mon: Plan the combined project scope
- Tue: Wire up models, routes, DB
- Wed: Add auth (register/login/protected routes)
- Thu: Test thoroughly, fix bugs
- Fri: Polish, push to GitHub, write README

---

## Phase 7 — Full Stack Integration

### Week 1: Connecting React frontend to Express backend
- Mon: Setting up axios in a React app, basic GET request
- Tue: Handling POST requests from a form
- Wed: Environment variables for API base URL
- Thu: CORS — what it is, configuring it on the backend
- Fri: Practice — connect one full CRUD flow frontend-to-backend

### Week 2: Handling API data — loading and error states
- Mon: Loading state patterns while fetching
- Tue: Error state patterns, displaying error messages
- Wed: Empty state handling
- Thu: Combining loading/error/data states cleanly
- Fri: Practice — add proper loading/error UI to Week 1's integration

### Week 3: Building full CRUD UI
- Mon: List view — displaying fetched data
- Tue: Create — form connected to POST
- Wed: Update — edit form connected to PUT/PATCH
- Thu: Delete — with confirmation
- Fri: Practice — complete full CRUD UI end-to-end

### Week 4: Auth flow in frontend
- Mon: Login/signup forms connected to backend
- Tue: Storing the JWT (and where — tradeoffs)
- Wed: Attaching the token to authenticated requests
- Thu: Protected routes/pages in the frontend
- Fri: Practice — complete login-to-protected-page flow

### Week 5: UI/UX polish
- Mon: Consistent styling pass across all pages
- Tue: Responsive check on mobile widths
- Wed: Loading skeletons/spinners polish
- Thu: Accessibility pass — labels, contrast, keyboard nav basics
- Fri: Practice — full app walkthrough, fix rough edges

### Week 6: Deployment — backend + database
- Mon: Preparing the backend for deployment (env vars, scripts)
- Tue: Deploying to Render/Railway
- Wed: Connecting deployed backend to MongoDB Atlas (production)
- Thu: Testing the live API with Postman
- Fri: Practice — fix any deployment-specific bugs

### Week 7: Deployment — frontend
- Mon: Preparing the frontend build (env vars for API URL)
- Tue: Deploying to Vercel/Netlify
- Wed: Connecting deployed frontend to deployed backend
- Thu: Testing the fully live app end-to-end
- Fri: Practice — fix any live-environment bugs

### Week 8: Testing, bug fixing, final touches
- Mon: Full manual QA pass across all features
- Tue: Fix bugs found in QA
- Wed: Cross-device/browser check
- Thu: Final polish, README + screenshots for portfolio
- Fri: Ship it — confirm everything works live

---

## Phase 8 — Interview Prep & Polish

### Week 1: DSA revision — arrays/strings/recursion
- Mon: Array problems (easy set)
- Tue: String problems (easy set)
- Wed: Recursion basics revisited
- Thu: Mixed array/string mediums
- Fri: Timed practice set — arrays/strings/recursion

### Week 2: DSA revision — trees/graphs/DP
- Mon: Tree traversal problems
- Tue: Graph basics (BFS/DFS) problems
- Wed: DP basics (1D DP problems)
- Thu: Mixed medium set
- Fri: Timed practice set — trees/graphs/DP

### Week 3: System design basics
- Mon: Client-server model, REST fundamentals recap
- Tue: Basic DB design — normalization basics
- Wed: Caching, load balancing concepts (fresher-level overview)
- Thu: Designing a simple system on paper (e.g. a URL shortener)
- Fri: Practice — explain the full-stack project's architecture out loud

### Week 4: Resume + GitHub + LinkedIn polish
- Mon: Resume review against target roles
- Tue: GitHub — clean up repos, pin best projects, README quality
- Wed: LinkedIn — profile polish, project posts
- Thu: Prepare a 2-minute "walk me through your resume" pitch
- Fri: Get feedback from a peer/mentor, iterate

### Week 5: Mock interviews — technical
- Mon: Mock DSA round
- Tue: Review mistakes from Monday's mock
- Wed: Mock project deep-dive round
- Thu: Review mistakes from Wednesday's mock
- Fri: Full mock technical interview, timed

### Week 6: Mock interviews — behavioral + project deep-dive
- Mon: Common behavioral questions — prepare STAR-format answers
- Tue: Mock behavioral round
- Wed: Project deep-dive — be ready to explain every technical decision
- Thu: Mock project deep-dive round
- Fri: Full mock interview combining both

### Week 7: Applications + company-specific prep
- Mon: Build a target company list, tailor resume per role type
- Tue: Apply — batch 1
- Wed: Research 2–3 target companies' interview patterns
- Thu: Apply — batch 2
- Fri: Follow up on earlier applications, apply — batch 3

### Week 8: Final review — patch weak areas
- Mon: Revisit weakest DSA topic from mocks
- Tue: Revisit weakest project-explanation gaps
- Wed: Light DSA practice, stay sharp
- Thu: Rest / light review — avoid cramming before interviews
- Fri: Final confidence check — one more full mock interview if scheduled