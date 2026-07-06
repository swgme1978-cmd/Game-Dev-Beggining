# Project-Specific Instructions: Modular Development Strategy

## Core Philosophy
To prevent context degradation and "death spirals" of bugs, this project adheres to a STRICTLY MODULAR, progressive build strategy. 

## Rules for the Coding Agent (Me)
1. **Self-Contained Modules:** Build new features (e.g., Map, Combat, Territory) as isolated modules in separate files/folders. Avoid monolithic files.
2. **Forward-Looking Hooks:** When creating a module, design clear exported interfaces, events, or variables (hooks) that future modules can interact with without needing to gut the internal logic.
3. **Defensive Modifications (Zero-Rewrite Policy):** NEVER rewrite a working module unless explicitly instructed. When integrating new features, touch ONLY the specific lines required to connect to the pre-established hooks.
4. **Step-by-Step Integration:** Do not try to build and integrate a massive feature at once. Build the isolated module, verify it works, and only then connect it to the main system.
5. **Cross-Session Awareness:** Assume you are picking up where a previous session left off. Read the specs in `/docs/` completely before touching code.
6. **GitHub Checkpoints:** After successfully completing and verifying a module, pause and wait for the user to commit the working state to GitHub before moving on to the next task.
7. **Workspace Ringfencing (GDA vs. Game):** The existing React application in `/src` and the Express backend in `server.ts` belong strictly to the "Game Design Assistant" (GDA) tool. If asked to write code for the actual game in this workspace, you MUST place all game code in a completely separate, isolated directory (e.g., `/game`). DO NOT modify the GDA chat app files to build game features.
