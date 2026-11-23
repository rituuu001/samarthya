# Samarthya

### Prove first → Connect later.

Samarthya is a skill-verification and opportunity platform designed to help people prove what they can do through **real, task-based work** rather than relying solely on CVs, degrees, or existing professional networks.

Candidates complete short, practical **sprints** created by employers. Their work is evaluated using a structured rubric, allowing employers to discover capable candidates based on demonstrated skills.

---

## The Problem

Traditional hiring often places significant weight on:

- Educational qualifications
- Previous job titles
- College or company reputation
- Existing professional networks
- Self-reported skills

This can make it difficult for capable candidates—especially **students, career starters, and people returning after career breaks**—to get opportunities when they lack conventional credentials or connections.

At the same time, employers struggle to identify candidates who can actually perform the work required.

**Samarthya bridges this gap through proof of work.**

---

## Our Solution

Samarthya introduces **skill-based micro-sprints**.

Instead of asking candidates only what they can do, employers can create practical tasks that allow candidates to demonstrate their abilities.

### How it works

```text
Employer creates a Sprint
          ↓
Candidates discover and apply
          ↓
Candidate completes the task
          ↓
Candidate submits their work
          ↓
Employer reviews the submission
          ↓
Candidate receives feedback / evaluation
          ↓
Verified proof of skill is added to their profile
```

The goal is simple:

> **Let the work speak before the identity does.**

---

## Key Features

### For Candidates

- Browse available skill-based sprints
- Apply to relevant opportunities
- Complete practical tasks
- Submit work for evaluation
- Track application and submission status
- Build a history of demonstrated skills
- Earn proof/badges through completed work

### For Employers

- Create practical skill-based sprints
- Define requirements and applicant limits
- Review candidate applications
- Evaluate submitted work
- Track sprint and payment progress
- Identify candidates based on demonstrated ability

### Identity-Aware Evaluation

Samarthya is designed around the principle of reducing unnecessary bias during initial evaluation.

Candidates can participate using a **Contributor ID**, allowing their submitted work to be evaluated based primarily on the quality of the work rather than factors such as:

- Name
- College
- Location
- Profile photo

Identity can be revealed later when appropriate for the hiring/connection stage.

---

## Sprint Examples

Samarthya supports different roles through practical, role-specific tasks.

### Junior Accountant

Examples include:

- **Reconcile a Month of Bank Transactions**
- **Organize and Record Business Expenses**
- **Prepare a Monthly Income & Expense Report**
- **Clean Up Outstanding Customer Payments**
- **Clean Up a Messy Ledger**

These tasks allow candidates to demonstrate practical accounting ability instead of simply answering theoretical questions.

---

## Core Workflow

### 1. Employer creates a Sprint

An employer defines:

- Sprint title
- Description
- Required skills
- Difficulty
- Deadline
- Applicant limit
- Payment/reward information

### 2. Candidate applies

Candidates browse the marketplace and apply to sprints relevant to their skills.

### 3. Candidate completes the work

The candidate receives the task and submits the completed work before the deadline.

### 4. Employer reviews

Employers can review applications and submitted work through their dashboard.

### 5. Proof is created

Successful completion contributes to the candidate's demonstrated skill history and provides evidence that can be used for future opportunities.

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- PostgreSQL

### Authentication & Infrastructure

- JWT-based authentication
- REST APIs
- PostgreSQL database
- File/storage integration

### Development Tools

- Git & GitHub
- Figma
- VS Code
- Postman / API testing tools

---

## Project Structure

```text
samarthya/
│
├── backend/
│   └── app/
│       ├── routers/
│       ├── services/
│       ├── repositories/
│       └── ...
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── screens/
│       ├── api/
│       └── ...
│
└── README.md
```

The backend follows a separation between **routers, services, and repositories** to keep API handling, business logic, and data access organized.

---

## Running the Project Locally

### Prerequisites

Make sure you have:

- Python 3.12+
- Node.js
- PostgreSQL
- Git

### Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd samarthya
```

---

### Backend Setup

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment.

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables and PostgreSQL database.

Start the backend:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

### Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will provide the local frontend URL in the terminal.

---

## MVP Scope

The current MVP focuses on demonstrating the core **proof-of-work hiring flow**:

- Candidate and employer authentication
- Candidate onboarding
- Employer onboarding
- Sprint creation
- Sprint discovery
- Sprint applications
- Application management
- Submission workflow
- Employer applicant review
- Candidate/employer dashboards
- Payment workflow/progress representation

The architecture is designed to support additional verification, payment, and matching capabilities as the platform evolves.

---

## Future Roadmap

### Verified Payments

Integrate real payment providers such as:

- eSewa
- Khalti

to enable secure task-based payouts.

### Skill & Proof Graph

Build a persistent history of:

- Completed sprints
- Verified skills
- Employer evaluations
- Badges
- Work samples

### Restart Sprints

Introduce specialized opportunities for people returning to work after career breaks, helping them rebuild recent and verifiable proof of skills.

### Low-Bandwidth Accessibility

Optimize the platform for users with:

- Limited internet connectivity
- Shared devices
- Lower-end hardware

and expand accessibility through Nepali language support.

### Employer Verification

Introduce stronger employer verification and trust mechanisms to improve safety and reliability within the marketplace.

---

## Why Samarthya?

A CV tells an employer **what someone claims they can do**.

A sprint can show **what they can actually do**.

Samarthya aims to make opportunities more accessible by shifting the focus from:

```text
Who you are
      ↓
What you studied
      ↓
Who you know
```

toward:

```text
What you can do
      ↓
What you have proven
      ↓
What opportunities you can earn
```

---

## Team

**Samarthya** was developed as part of the hackathon by a student team working across:

- Frontend Development
- Backend Development
- Database Engineering
- Product & UX
- Business Logic & Integrations

---

## Hackathon

Built for the **Samarthya / Proof Sprints** hackathon challenge.

### Our principle

> **Prove first → Connect later.**
