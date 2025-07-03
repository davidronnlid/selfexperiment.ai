# Self-Experimentation Web App

## Project Overview

A web app for designing, running, and sharing self-experiments. Users can log variables and outcomes, analyze how their variables affect results, and optionally share data or insights with others.

---

## Current Status

- The project is scaffolded with Next.js (TypeScript) and Supabase for authentication and database.
- The `src` directory contains initial pages, components, API routes, and utility files.
- Some basic authentication, logging, and dashboard functionality may already be present.
- The roadmap below builds on this foundation.

---

## Project Structure

```
src/
  components/      # Reusable React components
  pages/           # Next.js pages (routes)
    api/           # API routes (serverless functions)
  styles/          # Global and component styles
  test/            # Test scripts and utilities
  utils/           # Utility functions (e.g., Supabase client)
```

---

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables for Supabase (see `.env.example` if present).
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Core Features (MVP)

- User authentication (sign up, log in)
- Experiment designer (define variables, outcomes, protocols)
- Data logging (log values for variables/outcomes)
- Insights & analysis (visualize relationships, get automated insights)
- Data sharing (share selected data/experiments with others)
- Privacy controls (fine-grained sharing settings)

---

## User Stories

- Create and manage experiments
- Log data for variables and outcomes
- Visualize and analyze logged data
- Share experiments/data with others or browse shared experiments
- Control privacy and sharing of data

---

## Data Model (Simplified)

- **User**: id, email, profile, privacy settings
- **Experiment**: id, user_id, title, description, variables[], outcomes[], protocol, sharing settings
- **Variable/Outcome**: id, experiment_id, name, type, unit
- **LogEntry**: id, user_id, experiment_id, variable_id/outcome_id, value, timestamp
- **SharedExperiment**: id, experiment_id, shared_with_user_id, permissions

---

## Tech Stack

- **Frontend:** Next.js (React), TypeScript
- **Backend:** Next.js API routes
- **Database/Auth:** Supabase (Postgres, Auth)
- **Visualization:** Chart.js/D3.js

---

## Privacy & Sharing

- Users control what data is shared and with whom
- Data can be shared publicly, privately, or with specific users
- Public data is anonymized

---

## Future Enhancements

- Advanced analytics (ML, causal inference)
- Community features (comments, upvotes)
- Mobile app
- Integration with wearables/APIs

Hey AI chat, if I start the message with "im" you can interpret that as "implement". Which means I want you do code what comes after in the prompt without asking me for permission to continue.

Also. When asking me to Accept changes. Just accept changes per default so I don't have to accept them manually.
