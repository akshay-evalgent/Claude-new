# The $0 AI Stack, Issue 1

**Subject:** 5 free tools that replace $1,140/mo of business software

Hi, this is The $0 AI Stack from Zero Cost AI. Every week: five free tools, repos or workflows that replace paid business software, with setup steps a non-engineer can follow. Four minutes.

## 1. n8n replaces Zapier Pro and Make
Visual workflow automation, 400+ integrations, native AI agent nodes. Self-host with one Docker command or use the free cloud trial.  
Saves: about $49/mo at Zapier Pro pricing (check current price).  
Start: `docker run -it -p 5678:5678 n8nio/n8n`  
Gotcha: self-hosted means you own uptime. A $6 VPS is enough for most small teams.

## 2. Twenty replaces HubSpot Starter
Open-source CRM with pipelines, contacts, tasks and email sync. Import from HubSpot CSV in minutes.  
Saves: about $90/mo for a 5-seat Starter plan.  
Start: clone the repo and run `make up`, or use their hosted free tier.

## 3. Chatwoot replaces Intercom Essential
Shared inbox for website chat, WhatsApp, Instagram and email. Add an AI agent trained on your help docs.  
Saves: about $390/mo.  
Start: `docker compose up -d` from the chatwoot repo.

## 4. Cal.com replaces Calendly Teams
Booking pages, round-robin, reminders, payments. Brand it as your own.  
Saves: about $96/mo for 4 seats.  
Start: hosted free plan, or self-host via Docker.

## 5. Open WebUI + Ollama replaces ChatGPT Team
A private ChatGPT for the whole team on one machine. Upload documents and chat with them. No per-seat fee.  
Saves: about $515/mo for 5 seats (check current price).  
Start: `ollama run llama3` then run the Open WebUI container.  
Gotcha: needs a machine with 16 GB RAM for good 8B models.

## The number
Total replaced this issue: about $1,140/mo. Real cost: one $6 VPS and an afternoon.

## Next week
The complete $0 stack for a 5-person company, plus the three things free tools still cannot replace.

Forward this to whoever approves your software budget. Reply with the paid tool you most want killed and we will find the free version.

(Prices are vendor list prices at time of writing. Verify before you cancel anything.)
