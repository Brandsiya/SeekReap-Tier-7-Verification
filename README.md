# SeekReap Tier-7: Verification & Audit Layer

## Overview
This tier handles the final verification of content submissions using data from Neon DB. 
It operates as a secondary auditor to the Tier-5 Worker Pool.

## Setup
1. Ensure `.env` contains `NEON_DATABASE_URL`.
2. Run `npm install`.

## Operations
- `npm start`: Launches the parallel scan workers.
- `npm run db-test`: Verifies connection to Neon.

## Concurrency Strategy
Uses `processing` boolean flags in Neon to prevent duplicate worker hits. 
Auto-resets flags on worker initialization.
