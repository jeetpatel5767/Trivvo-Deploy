# Tr!vvo 🎯

**Tr!vvo** is a Web3 location-based scavenger hunt platform built with React, Node.js, PostgreSQL, and Smart Contracts deployed on the Avalanche blockchain. It empowers vendors to create gamified, location-based experiences to drive foot traffic, while allowing users to complete on-site tasks to earn USDC rewards instantly.

---

## 🌟 Key Features

### For Vendors:
- **Create Geo-Locked Hunts:** Drop a pin on the map, describe the task, set an arrival reward and a main completion reward.
- **On-Chain Escrow:** Stake USDC rewards directly into a secure Smart Contract. Funds are locked securely until participants complete the tasks.
- **Task Verification:** Verify customer completions easily through the Vendor Dashboard and release the final rewards with a single click.
- **Fund Recovery:** Withdraw any leftover, unclaimed staked USDC when a hunt expires.

### For Customers (Hunters):
- **Explore Map:** Find active vendor hunts near your physical location.
- **Location-based "Check-In":** Scan a unique vendor QR code upon arrival to instantly unlock an "Arrival Reward" distributed via the blockchain.
- **Earn Crypto:** Complete assigned tasks (e.g., "Take a photo", "Buy a coffee") and show the vendor to receive the Main USDC reward directly to your wallet.

---

## 🛠️ Technology Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, React Router, Wagmi & Viem (for Web3 wallet integration).
- **Backend:** Node.js, Express, PostgreSQL (via Supabase), Ethers.js.
- **Smart Contracts:** Solidity, Hardhat, OpenZeppelin (ERC20 interact, Reentrancy Guards).
- **Network:** Avalanche C-Chain / Local Hardhat Node.

---

## 📁 Repository Structure

```text
Tr!vvo/
│── backend/       # Express.js API, DB pooling, and Ethers.js blockchain sync
│── contracts/     # Hardhat project, Solidity Smart Contracts, deployment scripts
│── database/      # PostgreSQL Schema definitions
│── frontend/      # Vite React app (Customer & Vendor UI panels)
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have Node.js, PostgreSQL, and a Web3 Wallet (like MetaMask) installed.

### 1. Database Setup
Execute the SQL script located at `database/schema.sql` in your local or hosted PostgreSQL instance (e.g., Supabase) to create the necessary tables.

### 2. Smart Contract Deployment (Local Hardhat)
\`\`\`bash
cd contracts
npm install
npx hardhat node
# (In a new terminal)
npx hardhat run scripts/deploy.js --network localhost
\`\`\`
*Take note of the deployed contract addresses for USDC (Mock) and TrivvoHuntEscrow.*

### 3. Backend Setup
\`\`\`bash
cd backend
npm install
# Create a .env file based on configurations (Database URL, Admin Private Key, RPC URL, Contract Addresses)
npm run dev
\`\`\`

### 4. Frontend Setup
\`\`\`bash
cd frontend
npm install
# Create a .env file (Vite API URL, Contract Addresses)
npm run dev
\`\`\`
*Open \`http://localhost:5173\` in your browser to start using Tr!vvo!*

---

## 📝 License
This project is open-source and available under the MIT License.
