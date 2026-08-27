# AI Revenue Recovery Engine 🚀

An enterprise-grade, event-driven backend system and real-time dashboard built to automatically recover failed payment transactions. It utilizes a distributed message broker and a multi-model AI routing strategy to generate personalized SMS copy, complete with strict ACID compliance and zero-downtime fault tolerance.

## 💡 The Business Case

When a payment fails (e.g., incorrect OTP, bank timeout), standard industry practice is to wait 24 hours and send a generic email. By that time, the user has closed the tab, and the sale is lost. **This system acts as an automated, instant sales agent.** It catches failure webhooks in milliseconds and dispatches a personalized AI-generated SMS to rescue the revenue before the user puts their phone down.

## 🛠 Tech Stack

*   **Frontend:** Next.js, React, Tailwind CSS (Polling-based optimistic UI)
*   **Backend Runtime:** Node.js, TypeScript, Express.js
*   **Database:** PostgreSQL (Neon Serverless)
*   **Message Broker:** BullMQ, Redis (Upstash)
*   **Primary AI:** Groq LPU (`llama-3.3-70b-versatile` via OpenAI SDK)
*   **Secondary AI:** Google Gemini (`gemini-3.6-flash`)

## 🏗 System Architecture

### 1. Instant Ingestion (Decoupling)
An Express webhook validates incoming failed payment payloads, safely writes them to PostgreSQL with a `pending` state, instantly pushes a job payload to a Redis queue, and returns a `200 OK`. This guarantees the webhook never times out waiting for AI inference.

### 2. Asynchronous Consumption (BullMQ)
An isolated BullMQ worker pulls jobs one at a time from Redis. This prevents API rate-limit threshold breaches while maintaining steady throughput, keeping the main Node.js event loop completely unblocked for incoming traffic.

### 3. Multi-Model LLM Routing (Graceful Degradation)
To guarantee sub-second SMS generation and zero downtime, the system employs a Primary/Secondary LLM strategy:
*   **Primary:** Routes to Groq's LPUs for hyper-fast inference.
*   **Failover:** If Groq experiences a rate limit (`429`) or server outage (`503`), a strict `try/catch` block intercepts the crash and seamlessly routes the identical prompt to the Gemini API fallback. 
*   **Backoff:** If both providers fail, BullMQ automatically re-queues the job using an exponential backoff algorithm (2s → 4s → 8s).

### 4. Atomic Audit & Completion
Upon successful generation, the worker opens a PostgreSQL micro-transaction to simultaneously insert the AI prompt/response into a Foreign Key-linked `audit_logs` table and update the core transaction state to `processed`, fulfilling strict ACID compliance.

## 📊 Complexity Analysis

*   **Time Complexity:** 
    *   `O(1)` for webhook ingestion and queue pushing.
    *   Asynchronous processing throughput is strictly bound by `O(I)` where `I` is the inference latency of the active AI model.
*   **Space Complexity:** `O(N)` for Redis memory allocation, where `N` represents the queue depth of pending recovery jobs.

## 🏛 High-Level Design (HLD) & Data Flow

### The Architecture
```mermaid
graph TD
    Client[Webhook / Checkout] -->|POST /api/webhooks| Express[Express API]
    Express -->|1. Insert Pending| DB[(PostgreSQL)]
    Express -->|2. Enqueue Job| Redis[(Redis / BullMQ)]
    Redis -->|3. Consume Job| Worker[Node.js Worker]
    Worker -->|4. Primary LLM| Groq[Groq LPU]
    Groq -- Rate Limit / 503 --> Gemini[Gemini Fallback]
    Worker -->|5. Secondary LLM| Gemini
    Worker -->|6. Save Output & Mark Processed| DB
    Worker -->|7. Dispatch| Twilio[Twilio WhatsApp]
    Vercel[Next.js Frontend] -->|Polls via /api/transactions| Express
```

## 💻 Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL (e.g., Neon DB)
*   Redis (e.g., Upstash)
*   Groq API Key & Google Gemini API Key

### Installation

1. **Clone & Install:**
   ```bash
   npm install
   cd frontend && npm install
   ```
2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your PostgreSQL, Upstash Redis, Groq, and Gemini API keys.
3. **Run Services:**
   ```bash
   # Terminal 1: Backend API & Worker
   npm run dev
   
   # Terminal 2: Next.js Frontend
   cd frontend && npm run dev
   ```

---
