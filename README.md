# PlantCare AI

PlantCare AI is a web-based Biology & AI system for plant disease detection.

## Features

- Upload a photo of a plant or leaf (JPG, PNG, or WebP)
- AI-powered visual diagnosis identifying:
  - Plant species (common and scientific name)
  - Most likely disease, confidence, and severity
  - Observable symptoms and biological/environmental causes
  - Recommended treatment steps and prevention tips
- Strict verification of scientific and agricultural references (PlantVillage, UC IPM, APS, FAO, USDA, RHS)

## Getting Started

1. Install [Node.js (LTS)](https://nodejs.org)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your `OPENAI_API_KEY`.
4. Start the development server:
   ```bash
   npm run dev
   ```

## Tech Stack

- React 19 + TypeScript
- TanStack Start & TanStack Router
- Tailwind CSS v4
- Zod + Vitest
