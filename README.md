# Floof

A tiny study companion for when your brain has 17 things to do and absolutely no intention of doing any of them.

Floof is a personal study and productivity space built around the idea that getting things done does not have to feel like opening another boring productivity dashboard. It combines planning, tasks, notes, exams, assignments, focus sessions, progress tracking, and an AI companion into one little space that actually feels like it belongs to the person using it.

I built Floof for a friend who needed something that could help them stay on top of studying without making them feel like they were being managed by a spreadsheet.

And somewhere along the way, Floof became a tiny character with opinions about my productivity too.

## What Floof actually does

Floof keeps the things that usually end up scattered across calendars, notes apps, reminders, and random pieces of paper in one place.

You can create projects, assignments, exams, goals, and notes, keep track of upcoming work, and see what needs your attention today without having to dig through five different screens.

The Focus Timer gives you a place to actually sit down and work, while the weekly overview keeps track of how your week is going without turning your study habits into a corporate performance report.

There is also Ask Floof, an AI-powered companion that can help turn messy plans into something that actually makes sense. Instead of treating the AI like a separate chatbot, I wanted it to feel like part of Floof itself — something you can talk to when you have no idea where to start.

## The part I cared about way too much

The UI.

There are already a ridiculous number of productivity and study applications out there, so I did not want to make another one that looked like a dashboard template with a pastel background slapped on top.

Floof is deliberately soft, playful, slightly chaotic, and very cute.

The pastel palette, handwritten typography, rounded cards, tiny illustrations, mascot, micro-interactions, and the completely unnecessary amount of personality in the copy are all intentional.

I wanted the application to feel less like:

> "Here is your productivity data."

and more like:

> "Okay. We have 4 things to do. Let's not panic."

That distinction is basically the entire personality of Floof.

## Features

### Daily planning

Floof gives you a simple view of what actually needs to happen today, instead of throwing every possible task at you at once.

### Projects, assignments and exams

You can keep track of larger projects, upcoming assignments, exams, and personal goals without having to maintain separate lists for each one.

### Notes

Quick notes have their own space because sometimes you do not need another task. You just need somewhere to put the thought before your brain forgets it.

### Focus sessions

The Focus Timer provides dedicated study sessions and gives Floof another way to interact with you while you work.

### Weekly overview

Floof keeps a lightweight record of your activity so you can see how your week is going without making productivity feel like a competition.

### Ask Floof

Ask Floof is the AI side of the application.

It can help break down tasks, organize study plans, and turn vague "I have way too much to do" situations into smaller steps.

The AI is powered by Gemma, while the application handles the surrounding experience so it feels like you are talking to Floof rather than opening a generic AI chatbot.

### Floof itself

Floof is not supposed to just sit there looking cute.

The mascot has different states and interactions depending on what you are doing, which gives the application a small sense of life instead of making it feel like a collection of static screens.

## Built with

Floof is built with React and Vite on the frontend, with a Node.js and Express backend handling the application logic and API layer.

The application uses SQLite for local data storage and JWT-based authentication for user sessions.

Gemma powers the AI functionality through the backend, keeping the API key away from the frontend.

The interface is built primarily with custom React components and CSS so that the visual language stays consistent instead of looking like a collection of pre-built UI components.

## A little bit about the architecture

The frontend communicates with the backend rather than talking directly to the AI service.

This means the Gemini API key stays on the server instead of being exposed in the browser.

The backend handles authentication, application data, AI requests, and the database, while the React client focuses on the actual Floof experience.

That separation also gives the project room to grow without having to rebuild the entire application when more features are added.

## Running Floof locally

Clone the repository and install the dependencies for both the client and server.

```bash
git clone https://github.com/mehroofsaba/Floof.git
cd Floof
```

Then install the frontend dependencies:

```bash
cd client
npm install
```

and the backend dependencies:

```bash
cd ../server
npm install
```

Create a `.env` file inside `server` using `.env.example` as a reference.

Add the required environment variables, including your Gemini API key and JWT secret.

Then start the backend and frontend using the provided scripts or the package scripts in their respective directories.

The exact setup may change as Floof continues to grow, so the repository is the source of truth for the latest setup instructions.

## Why I built it

I could have made another productivity dashboard.

I could have made another chatbot.

I could have made another Pomodoro timer.

There are already enough of all three.

The interesting part, at least to me, was putting them together into something that actually feels like a little companion instead of a collection of productivity features.

Floof started with a very simple question:

**What if studying felt a little less lonely and a little more fun?**

So I built the answer.

It has tasks because we need to know what we're doing.

It has a timer because apparently we need someone to tell us to focus.

It has an AI because sometimes we genuinely have no idea where to start.

And it has a tiny fluffy creature because honestly, why not?

## What's next

Floof is still growing.

The plan is to keep improving the interaction between the AI, the planner, the focus system, and Floof itself so that the application becomes more than a static productivity dashboard.

I also want to expand the mascot's reactions, make the study planning smarter, improve the mobile experience, add more useful personalization, and deploy Floof so it can actually be used outside my laptop.

Because apparently making a tiny study companion was not enough work already.

## Built for a friend. Kept because I liked it too much.

Floof started as a challenge to build something genuinely useful for someone else.

It turned into one of those projects where I kept thinking:

_"okay but what if we also add this..."_

And that is probably how Floof ended up becoming Floof.
