# 🤖 AutomateAI

### AI-Powered Business Automation Agent

<p align="center">
  <b>One workspace. One AI agent. Smarter business automation.</b>
</p>

<p align="center">
  <a href="https://automateai-web.onrender.com">
    🚀 <b>Live Demo</b>
  </a>
  &nbsp; • &nbsp;
  <a href="https://github.com/dishagaur08/automate-ai">
    📦 <b>GitHub Repository</b>
  </a>
  &nbsp; • &nbsp;
  <a href="https://automateai-api.onrender.com/health">
    ❤️ <b>API Health</b>
  </a>
</p>

---

## 🌟 Overview

**AutomateAI** is an AI-powered business automation platform designed to help teams manage their everyday business operations from a single intelligent workspace.

Instead of switching between multiple tools, users can manage:

- 👥 Leads
- 🏢 Customers
- ✅ Tasks
- 📊 Business analytics
- 🤖 AI-powered commands
- 📋 Approval workflows
- 📚 Knowledge-base documents
- 📧 Email operations

The platform combines a modern React dashboard with a FastAPI backend, database-driven business logic, authentication, and an AI Command Center capable of understanding natural-language requests.

---

## 🚀 Live Application

### 🌐 Frontend

👉 **[Open AutomateAI Live Demo](https://automateai-web.onrender.com)**

### ⚙️ Backend API

👉 **[AutomateAI API](https://automateai-api.onrender.com)**

### ❤️ API Health Check

👉 **[Check API Health](https://automateai-api.onrender.com/health)**


✨ Key Features
🤖 AI Command Center

Interact with AutomateAI using natural-language commands.

Example:

Create a lead for Rahul Sharma from ABC Technologies with phone 9876543210

The AI agent identifies the appropriate business tool, validates the request, and executes the action through the backend.

👥 Lead Management

Manage business leads directly from the dashboard.

➕ Create leads
🔍 Search leads
✏️ Update leads
🗑️ Delete leads
📌 Track lead status
🤖 Create and search leads through AI commands
🏢 Customer Management

Maintain customer information in a centralized CRM workspace.

Add customers
Search customers
Update customer information
Delete customers
Track customer status
✅ Task Management

Create and manage business tasks.

Create tasks
Set priorities
Track task status
Update tasks
Mark tasks as completed
AI-powered task creation

Example:

Create a task for Rahul to follow up tomorrow
🔐 Authentication & Authorization

AutomateAI uses secure authentication with:

JWT-based sessions
bcrypt password hashing
Protected API routes
User-specific data access
Authorization headers
User-scoped CRM data

Each user's Leads, Customers, Tasks, Activities, Approvals and AI history are isolated from other users.

📋 Approval Workflow

AutomateAI follows a Human-in-the-Loop approach for sensitive actions.

User Request
      ↓
AI Command Center
      ↓
Tool Selection
      ↓
Validation
      ↓
Approval Required?
    ↙       ↘
  YES        NO
   ↓          ↓
Approval    Execute
  Queue      Action
   ↓
Approve / Reject

This prevents sensitive AI-generated operations from being executed without user review.

📊 Dashboard & Analytics

The dashboard provides an overview of business activity including:

Total Leads
Active Customers
Task Completion
AI Actions
Recent Activity
Pending Approvals
Lead analytics
📚 Knowledge Base

AutomateAI includes a knowledge-base module for working with business documents.

Supported document formats include:

PDF
TXT
Markdown

The system can process documents and provide knowledge-base based responses.

📧 Email Workspace

The email workspace supports:

Email drafts
Email history
Manual email operations
AI-generated follow-up drafts
Approval-based email actions

AI-generated follow-up emails are placed into the approval queue before sensitive actions are performed.

🧠 Example AI Commands

Once an LLM provider is configured, users can try:

Create a lead for Rahul Sharma from ABC Technologies with phone 987654
Show me all leads that are currently qualified
Create a task for Rahul to follow up tomorrow
Draft a follow-up email for Rahul regarding our CRM productGive me a summary of our current sales activity



🛠️ Technology Stack
🎨 Frontend
⚛️ React.js
⚡ Vite
🎨 Tailwind CSS
🟨 JavaScript
🔗 REST API
🧩 Lucide React
⚙️ Backend
🐍 Python
🚀 FastAPI
🗄️ SQLAlchemy
📦 Pydantic
🔐 JWT Authentication
🔒 bcrypt
🗃️ Database
SQLite — local development
PostgreSQL-compatible architecture for production
🤖 AI & Automation
LLM-based AI Agent
Tool Calling
AI Command Center
Knowledge Base / RAG
Human-in-the-Loop approvals
n8n workflow structure
☁️ Deployment & Development
GitHub
Render
Git
REST APIs
🏗️ System Architecture
                         👤 USER
                           │
                           ▼
                ┌─────────────────────┐
                │   React Frontend    │
                │   Vite + Tailwind   │
                └──────────┬──────────┘
                           │
                      REST API + JWT
                           │
                           ▼
                ┌─────────────────────┐
                │   FastAPI Backend   │
                │       Python        │
                └──────┬───────┬──────┘
                       │       │
              ┌────────┘       └─────────┐
              ▼                          ▼
      ┌───────────────┐         ┌─────────────────┐
      │   Database    │         │ AI Command      │
      │ SQLite / PG   │         │ Center          │
      └───────────────┘         └────────┬────────┘
                                         │
                                         ▼
                                ┌─────────────────┐
                                │   LLM Provider  │
                                └─────────────────┘
📁 Project Structure
automate-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── data/
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── seed.py
│   ├── requirements.txt
│   ├── services/
│   └── routes/
│
├── docs/
│   ├── DEPLOYMENT.md
│   └── ai-architecture.md
│
├── n8n-workflows/
│
├── .env.example
├── .gitignore
├── render.yaml
└── README.md


🚀 Getting Started
1️⃣ Clone the Repository
git clone https://github.com/dishagaur08/automate-ai.git
cd automate-ai
2️⃣ Backend Setup

Navigate to the backend:

cd backend

Create a virtual environment:

python -m venv venv
Windows
.\venv\Scripts\activate
Linux / macOS
source venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Create your environment file:

Windows
copy .env.example .env
Linux / macOS
cp .env.example .env

Start the backend:

uvicorn main:app --reload

Backend will run at:

http://127.0.0.1:8000
3️⃣ Backend API Documentation

FastAPI automatically provides interactive API documentation.

Open:

http://127.0.0.1:8000/docs

Health check:

http://127.0.0.1:8000/health

Expected:

{
  "status": "healthy"
}
4️⃣ Frontend Setup

Open a new terminal and navigate to:

cd frontend

Install dependencies:

npm install

Create the environment file:

Windows
copy .env.example .env
Linux / macOS
cp .env.example .env

Set the backend URL:

VITE_API_URL=http://127.0.0.1:8000

Start the frontend:

npm run dev

Frontend will normally run at:

http://localhost:5173
🔐 Environment Variables
Backend

Create:

backend/.env

Example:

LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1


DATABASE_URL=


JWT_SECRET=
JWT_EXPIRE_MINUTES=1440


SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_USE_TLS=true
Frontend

Create:

frontend/.env

Example:

VITE_API_URL=http://127.0.0.1:8000

⚠️ Never commit real .env files, passwords, JWT secrets, SMTP credentials or API keys to GitHub.

🔌 API Endpoints
🔐 Authentication
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
📊 Dashboard
GET /api/dashboard/stats
GET /api/dashboard/activity
GET /api/dashboard/lead-analytics
👥 Leads
GET    /api/leads
GET    /api/leads/{id}
POST   /api/leads
PATCH  /api/leads/{id}
DELETE /api/leads/{id}
🏢 Customers
GET    /api/customers
GET    /api/customers/{id}
POST   /api/customers
PATCH  /api/customers/{id}
DELETE /api/customers/{id}
✅ Tasks
GET    /api/tasks
GET    /api/tasks/{id}
POST   /api/tasks
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}
🤖 AI
POST /api/ai/command
GET  /api/ai/activity
POST /api/ai/approvals/{id}/approve
POST /api/ai/approvals/{id}/reject
📚 Knowledge Base
GET    /api/documents
POST   /api/documents
DELETE /api/documents/{id}
POST   /api/knowledge-base/query
📧 Email
GET  /api/emails
POST /api/emails/draft
POST /api/emails/send
POST /api/emails/{id}/send
🧰 AI Tools

The AI Command Center can work with business tools such as:

Tool	Purpose
create_lead	Create a new lead
search_leads	Search leads
get_lead	Retrieve a lead
create_task	Create a task
search_tasks	Search tasks
search_customers	Search customers
get_dashboard_summary	Get business metrics
draft_followup_email	Create an email draft for approval
🔒 Security

AutomateAI follows several security practices:

🔐 JWT-based authentication
🔑 bcrypt password hashing
👤 User-scoped data
🛡️ Protected API routes
📋 Human approval for sensitive AI actions
🚫 .env files excluded from Git
🔒 Secrets managed through environment variables
📈 Project Status
✅ Completed
 Modern React dashboard
 FastAPI backend
 Database integration
 Lead management
 Customer management
 Task management
 CRUD operations
 Authentication
 JWT authorization
 User-scoped data
 AI Command Center
 AI tool calling
 Approval workflow
 Knowledge Base module
 Email workspace
 GitHub repository
 Render deployment
 Production API health check
🔮 Future Improvements
📊 Advanced analytics and reporting
🔄 More business automation workflows
🔌 Additional third-party integrations
🤖 More advanced AI agents and tools
👥 Team and organization management
🗃️ Production-scale database optimization
⚙️ Advanced workflow automation
🧪 Production Health Check

The deployed backend can be checked using:

https://automateai-api.onrender.com/health

Current response:

{
  "status": "healthy"
}
📚 Documentation

Detailed project documentation is available inside the repository:

📘 docs/DEPLOYMENT.md
🧠 docs/ai-architecture.md
👩‍💻 Author
Disha Gaur

Computer Science & Engineering

🔗 GitHub:
https://github.com/dishagaur08

🔗 Project Repository:
https://github.com/dishagaur08/automate-ai

⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

<p align="center">
🤖 AutomateAI

<b>One workspace. One AI agent. Smarter business automation.</b>

</p> ```
