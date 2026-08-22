# AI Revenue Recovery Engine

An enterprise-grade, event-driven backend system built to automatically recover failed payment transactions using LLM-generated personalized SMS copy, complete with ACID compliance and fault-tolerant architecture.

## 🚀 Overview

**Elevator Pitch:** I architected an idempotent background engine to automatically recover failed payment transactions. By decoupling the webhook ingestion from the AI generation layer using PostgreSQL and a cron scheduler, the system guarantees zero data loss and handles third-party API rate limits via graceful degradation.

## 🛠 Tech Stack

- **Runtime:** Node.js, TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon Serverless Postgres)
- **AI Integration:** Google Gemini AI SDK (`gemini-flash-latest`)
- **Task Scheduling:** Node-Cron

## 🏗 System Architecture

### Step-by-Step Execution

1. **Ingestion:** An Express webhook validates and safely writes incoming failed payment payloads into a PostgreSQL database with a strict `pending` state, instantly returning a `200 OK` to prevent timeouts.
2. **Scheduling:** An asynchronous Node.js cron worker polls the database every minute to process a fixed batch of pending transactions.
3. **Resilient AI Generation:** An isolated service layer fetches tailored SMS copy from the Gemini Flash LLM, utilizing a strict `try/catch` fallback block to handle network failures without crashing the server.
4. **Atomic State Updates:** Using SQL transactions (`BEGIN` and `COMMIT`), the worker simultaneously logs the LLM prompts to an audit table and updates the transaction state to `processed`, executing a `ROLLBACK` on any database constraint failure.

### Handling Third-Party Failures (Graceful Degradation)

**The Edge Case Scenario:** During testing, the Google Gemini API experienced high global demand and returned a `503 UNAVAILABLE` error.

**The Engineering Solution:** If an external API crashes in a tightly coupled system, the unhandled exception crashes the entire Node.js server, taking the webhook offline and permanently dropping incoming payment data. Because I strictly decoupled the architecture and wrapped the AI Service in a `try/catch` block, the system demonstrated **Graceful Degradation**. It caught the `503` error, swallowed the crash, immediately returned a hardcoded fallback SMS, and updated the database normally, keeping the server alive and the data pipeline secure.

## 📊 Complexity Analysis

- **Time Complexity:**
  - `O(1)` for webhook ingestion, allowing massive scale without bottlenecking.
  - `O(B)` per cron cycle for the background worker, where `B` is the strict batch size, ensuring stable processing time regardless of total database volume.
- **Space Complexity:** `O(1)` since memory utilization remains bounded by the fixed payload and AI response strings without scaling up.

## 💻 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (or Neon DB instance)
- Google Gemini API Key

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment Variables (`.env`):
   ```env
   PORT=3000
   DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Initialize the Database:
   Execute the `init.sql` script in your PostgreSQL instance to create the necessary `failed_transactions` and `audit_logs` tables.

4. Start the Application:
   Run the development server using `ts-node`:
   ```bash
   npx ts-node src/server.ts
   ```

## 🗄️ Database Schema Summary

- `failed_transactions`: Stores webhook data (`customer_name`, `amount`, `failure_reason`) and tracks `recovery_status`.
- `audit_logs`: A compliance table linked via foreign key to track the exact `llm_prompt` sent to the model and the exact `llm_response` received.
