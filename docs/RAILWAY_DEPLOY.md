# 🚂 AetherSwarm Deployment Guide

## 1. Frontend (Vercel) - Recommended
The easiest way to deploy the Next.js frontend.

1.  Push your code to GitHub.
2.  Go to [Vercel Dashboard](https://vercel.com/new).
3.  Import the `aetherswarm` repository.
4.  **Important:** In "Root Directory", click Edit and select `frontend/marketplace`.
5.  Click **Deploy**.
6.  Once deployed, go to **Settings > Environment Variables** and add:
    *   `NEXT_PUBLIC_QUEST_ENGINE_URL`: `https://<YOUR_QUEST_ENGINE_RAILWAY_DOMAIN>` (See below)
    *   `NEXT_PUBLIC_COORDINATOR_URL`: `https://<YOUR_COORDINATOR_RAILWAY_DOMAIN>` (See below)
    *   `NEXT_PUBLIC_REOWN_PROJECT_ID`: Your Reown (WalletConnect) Project ID.
7.  **Redeploy** to apply variables.

---

## 2. Backend & Agents (Railway)
Since this is a monorepo with multiple languages, using the **Railway Dashboard** with GitHub integration is the best method.

### **Step 1: Cleanup / New Project**
1.  Go to [Railway Dashboard](https://railway.com/dashboard).
2.  Create a **New Project** -> **Empty Project** (or use existing).
3.  If using existing, delete failed services to start fresh.

### **Step 2: Create Redis**
1.  Click **New > Database > Redis**.
2.  This behaves as the shared message bus.

### **Step 3: Deploy Services**
For each service below, click **New > GitHub Repo > AetherSwarm**.
**IMMEDIATELY** click on the service card, go to **Settings**, and configure the **Root Directory**.

| Service Name | Root Directory | Build Command | Start Command |
|--------------|---------------|---------------|---------------|
| **Quest Engine** | `backend/quest-engine` | `npm install` | `npm start` |
| **Swarm Coordinator** | `backend/swarm-coordinator` | `npm install` | `npm start` |
| **Scout Agent** | `agents/scout` | (Auto) | `python src/main.py` |
| **Verifier Agent** | `agents/verifier` | (Auto) | `./target/release/verifier-agent` |
| **Synthesizer Agent** | `agents/synthesizer` | (Auto) | `python src/main.py` |

> **Note:** We have added `Procfile`s to these directories, so Railway *should* respect them if the Root Directory is correct.

### **Step 4: Configure Networking (Domains)**
1.  **Quest Engine:** Click Settings -> Networking -> **Generate Domain**.
2.  **Swarm Coordinator:** Click Settings -> Networking -> **Generate Domain**.

### **Step 5: Configure Environment Variables (The Critical Part)**
You must configure these variables in the **Railway Dashboard** for each service to make them work.

#### **1. Quest Engine Service**
*   `PLATFORM_PRIVATE_KEY`: Your Admin Wallet Private Key (The one that deployed contracts).
*   `REDIS_URL`: `${{Redis.REDIS_URL}}`
*   `QUEST_LOGGER_ADDRESS_BASE`: `0xC4B63ba513882E35073319bb7e91F53FdCf6b3fd`
*   `DISCOVERY_REGISTRY_ADDRESS_BASE`: `0x924FB10829A05023E09AF126Fe97E3cD79690227`
*   `REPUTATION_REGISTRY_ADDRESS_BASE`: `0xe720AdC0b72885fBf2EA079D043063Aa63b02a59`
*   `CHAIN_ID`: `84532` (Base Sepolia)

#### **2. Swarm Coordinator Service**
*   `REDIS_URL`: `${{Redis.REDIS_URL}}`
*   `REDIS_URL`: `${{Redis.REDIS_URL}}`

#### **3. Agents (Scout, Verifier, Synthesizer)**
Go to each Agent service and add:
*   `AGENT_PRIVATE_KEY`: A unique wallet private key for this agent.
*   `COORDINATOR_WS_URL`: `ws://swarm-coordinator.railway.internal:8080` (Recommended for internal communication) OR `wss://<YOUR_COORDINATOR_DOMAIN>` (External). Use internal URL for better stability.
*   `AGENT_ID`:
    *   Scout: `scout-001`
    *   Verifier: `verifier-001`
    *   Synthesizer: `synthesizer-001`
*   `REDIS_URL`: `${{Redis.REDIS_URL}}`
*   (Optional) `OPENMID_FACILITATOR_URL` etc. if using advanced features.

#### **4. Frontend (Vercel)**
*   `NEXT_PUBLIC_QUEST_ENGINE_URL`: `https://<YOUR_QUEST_ENGINE_DOMAIN>`
*   `NEXT_PUBLIC_COORDINATOR_URL`: `https://<YOUR_COORDINATOR_DOMAIN>`


---

## 3. Final Wire-up
1.  Take the **Quest Engine Domain** (e.g., `https://quest-engine.up.railway.app`) and put it in your **Frontend Vercel Env Vars** as `NEXT_PUBLIC_QUEST_ENGINE_URL`.
2.  Take the **Coordinator Domain** and put it in Frontend as `NEXT_PUBLIC_COORDINATOR_URL`.
3.  Redeploy Frontend on Vercel.

🚀 **Done!**
