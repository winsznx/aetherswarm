# 🚂 Final Railway Configuration Steps

Your AetherSwarm application (Contracts, Backend, Agents, Frontend) is deployed! \
However, the services need to "know" about each other. Since they are on dynamic domains, you must link them in the Railway Dashboard.

## 1. Get Service Domains
1. Go to your [Railway Dashboard](https://railway.com/dashboard).
2. Click on the **AetherSwarm** project.
3. For **Quest Engine** and **Swarm Coordinator** and **Frontend**, ensure they have a public domain generated.
   - Click the Service -> Settings -> **Networking**.
   - If no domain exists, click **Generate Domain**.
   - Copy these domains (e.g., `quest-engine.up.railway.app`).

## 2. Configure Environment Variables
You need to add these variables to the respective services.

### **Quest Engine**
- **Go to:** Sentinel -> Variables
- **Add:**
  - `REDIS_URL`: `${{Redis.REDIS_URL}}` (Should be there automagically, if not, reference the Redis service)
  - `DISCOVERY_REGISTRY_ADDRESS`: `0x924FB10829A05023E09AF126Fe97E3cD79690227`
  - `REPUTATION_REGISTRY_ADDRESS`: `0xe720AdC0b72885fBf2EA079D043063Aa63b02a59`
  - `QUEST_LOGGER_ADDRESS`: `0xC4B63ba513882E35073319bb7e91F53FdCf6b3fd`
  - `PRIVATE_KEY`: Your Deployer/Admin Private Key
  - *(Optional)* `THIRDWEB_SECRET_KEY`, `OPENAI_API_KEY`, etc.

### **Swarm Coordinator**
- **Go to:** Swarm Coordinator -> Variables
- **Add:**
  - `REDIS_URL`: `${{Redis.REDIS_URL}}`
  - `PORT`: `8080` (or `8081`)

### **Agents (Scout, Verifier, Synthesizer)**
- **Go to:** Each Agent Service -> Variables
- **Add:**
  - `COORDINATOR_WS_URL`: `wss://<YOUR_COORDINATOR_DOMAIN>` (Note: Use `wss://` instead of `https://`)
  - `AGENT_ID`: `1` (Scout), `2` (Verifier), `3` (Synthesizer)
  - `PRIVATE_KEY`: Separate private key for each agent.

### **Frontend**
- **Go to:** Frontend -> Variables
- **Add:**
  - `NEXT_PUBLIC_QUEST_ENGINE_URL`: `https://<YOUR_QUEST_ENGINE_DOMAIN>`
  - `NEXT_PUBLIC_COORDINATOR_URL`: `https://<YOUR_COORDINATOR_DOMAIN>`
  - `NEXT_PUBLIC_REOWN_PROJECT_ID`: Your Reown ID (if you have one)
- **Redeploy:** After adding variables, click **Redeploy** for the Frontend.

## 3. Verify
1. Open the **Frontend** URL.
2. Connect your wallet.
3. Create a Quest.
4. Check the **Quest Engine** logs to see it receiving the quest.
5. Check **Agent** logs to see them picking it up.

## 🔗 Deployed Contracts (Base Sepolia)
| Contract | Address |
|----------|---------|
| AgentRegistry | `0x924FB10829A05023E09AF126Fe97E3cD79690227` |
| ReputationRegistry | `0xe720AdC0b72885fBf2EA079D043063Aa63b02a59` |
| QuestLogger | `0xC4B63ba513882E35073319bb7e91F53FdCf6b3fd` |
