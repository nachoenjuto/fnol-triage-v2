# Short demo script · FNOL triage with governed agents

Pocket version of [guion-demo.md](guion-demo.md): the same steps and timings, with only what is said.

- What is quoted (in Word, in green) is to be said out loud: the key sentence and the bullet points.
- **Clicks**, at the end of each step, reminds you what to open and which Package A messages to show. The detail of each click and the regulations are in the long script.

---

## 1. The problem: FNOL, a critical process, and AI governance (min 0-1)

**Key sentence**

> On this screen we see the size of the problem: millions of first notices that arrive through five channels and that a person processes today. The first notice decides much of what happens to the claim, and the AI that automates it has to be under control.

**What I say**

> - In Spain around 11 million motor claims are reported every year, one every three seconds, according to UNESPA.
> - The notice arrives through five channels: email, web form, chat, phone and WhatsApp.
> - The Insurance Contract Act gives seven days to report it.
> - At FNOL the line of business is decided, whether data is missing, whether there is a sign of fraud and the customer's first impression.
> - Today a person does it. In the United States, claims handling takes around 10 % of the motor premium.
> - Second problem: controlling the AI from many angles, the agents' autonomy, the health of the knowledge bases, regulation and spending.
> - Gartner estimates that more than 40 % of agentic AI projects will be cancelled before 2027: not because the AI fails, but because nobody knows why it decided, who controls it and how much it costs.

**Clicks:** `intro.html` · The problem, from top to bottom.

---

## 2. The solution: an integrated multichannel platform, orchestrated by 4 agents and with good AI governance (min 1-3)

**Key sentence**

> On this screen we present the solution: an integrated platform with four AI agents that automate the first contact and a governance layer that controls them. We automate the first contact, with the AI under control.

**Where it comes from**

> - It is an example of what Logicalis has implemented in AI governance and observability for customers in different industries.
> - The industry changes, but the goal is the same: better results, better service, controlled spending and compliance.

**What it does**

> - Four agents receive the notice, decide the line of business, extract the data and apply the insurer's rules.
> - The claims handler receives the notice classified, with the data and a proposal: approved or to review.
> - In today's batch of 13 notices, 10 are approved on their own and 3 go to a person.
> - On the panel, last 14 days: 16,720 messages, 81 % autonomy, 19 % escalated and 2.1 % overrides; plus cost, alerts, compliance and the health of the knowledge bases.
> - They are four small specialists, each with its model, its prompt, its owner and its limits.

**Traceability, the basis of governance**

> - The foundation is traceability: we join the provider's technical trace with the insurer's business process.
> - Autonomy: each agent has a level from L0 to L3 that is earned and lost with data.
> - Spending: we control it by the second and with actions, not after the 8 hours the provider takes to report.
> - Fraud: AI, history and rules look for the patterns the company already knows; the indicator prioritises and a person decides.
> - Compliance: every decision carries its proof for the GDPR, DORA and EIOPA.

**Clicks:** `intro.html` · The solution, block by block.

---

## 3. The actors: the claims handler and the IT, Finance, Compliance teams, etc. (min 3-4)

**Key sentence**

> On this screen we see who uses the solution. Two actors, two screens: the claims handler and whoever governs the AI.

**What I say**

> - The claims handler works on triage: they see the detail of each message, how and why it was classified, why the AI decided and the signs of fraud.
> - IT, Finance, Compliance, Risk, Audit and the DPO work on the governance panel: whether the agents decide well, with what knowledge, how much they cost and whether they comply.

**Clicks:** `intro.html` · The actors.

---

## 4. The demo: a journey from the moment a message arrives to the governance panel (min 4-5)

**Key sentence**

> On this screen we see the route of the demo. We follow a message from start to finish and see everything the AI leaves behind.

**What I say**

> - The message arrives, the agents analyse it, the claims handler reviews it and the AI leaves its evidence.
> - On the panel we will see which agents took part, what they did and how, what limits they had, what reasoning lies underneath and what knowledge they used.
> - And also how compliant the solution is, when it spends and why, and how we can improve all of it.

**Clicks:** `intro.html` · The demo; at the end, «Start the demo».

---

## 5. Part 1 · Triage

### Step 1 · The six phases and the five channels (min 5-6:30)

**Key sentence**

> On this screen we see the six phases of the process in the top bar and the notices coming in through five channels. This is how the process works from start to finish.

**What it is and what it does**

> - Four AI agents in a chain: multichannel intake, line-of-business classification, data extraction and business rules.
> - Traceability and automation close the loop: they record everything and turn the decision into a workflow.
> - Each phase has its card: what it receives, what it delivers and whether a model or a rule handles it.

**Value**

> - A notice by WhatsApp gets the same criteria as one by email.
> - The claims handler receives the notice classified, with data and a proposal, and each agent has an owner.
> - These cards are the documentation an auditor asks for.

**Clicks:** cards for phases 1 to 6; in the menu, Message package: MSG-A-11 (WhatsApp) and MSG-A-08 (transcribed call).

### Step 2 · Processing Package A (min 6:30-8:30)

**Key sentence**

> On this screen we process the 13 notices live and watch the counters and the log fill up. In seconds we know what is approved and what a person has to review.

**What it is and what it does**

> - Each notice goes through the four agents and comes out with line of business, data and decision.
> - The counters update live and the batch can be paused without losing anything.
> - Each notice leaves its trace: model, tokens, cost in euros and decision.

**Value**

> - The claims handler spends their time on the cases that need judgement: in 14 days, 81 % of decisions went through with no intervention.
> - The log is generated on its own and is the evidence for an audit.

**Clicks:** Process package, pause and continue, «Only to review» filter: MSG-A-04, MSG-A-08 and MSG-A-13.

### Step 3 · The record of an approved notice: MSG-A-01 (min 8:30-10)

**Key sentence**

> On this screen we see the record of an approved notice: the message with its evidence, the extracted data and the rules evaluated. An approved decision also has to be explainable.

**What it is and what it does**

> - At the top, the decision, the line of business and the model's confidence.
> - Each piece of evidence is a literal quote that the system checks against the message: if the model makes it up, it does not appear.
> - This notice comes with the accident statement and two photos: the Attachments tab shows them next to the data read from each one, compared with the email.
> - The tabs show the extracted data, each rule with its result and evidence, and the reasoning.

**Value**

> - Simple, well-documented notices are approved without anyone touching them.
> - If someone asks why, the answer is here, rule by rule and in the customer's own words.
> - If the claims handler does not agree, the Override button sends the approval to review; it counts towards the agent's override rate.

**Clicks:** record of MSG-A-01 (knock on the M-30, €1,350): Override button on the Decision card (point it out without confirming), Message, Attachments (the statement and the two photos), Extracted data, Business rules and Reasoning.

### Step 4 · The record of a «To review» notice: MSG-A-08 (min 10-12)

**Key sentence**

> On this screen we see a notice that has gone to a person: the rule it breaches, the missing piece of data and what the model actually received. Every decision can be explained, also when the machine does not decide.

**What it is and what it does**

> - The record marks the breached rule and highlights the sentences that justify it.
> - If a guardrail is triggered, as with an injured person, the agent does not decide and the case goes to a person.
> - If a piece of data does not appear in the message, the field stays empty: the agent does not make things up.
> - Before calling the model, the platform swaps the personal data for placeholders; what is needed to decide is kept.

**Value**

> - The claims handler understands the reason in seconds and resolves it with Validate: approves it or keeps it in review. It is not an override: the agent had already escalated it.
> - Personal injury is always assessed by a person: the injured-party guardrail explains 20 % of escalations.
> - The model decides without knowing who the policyholder is: the minimisation is real.

**Clicks:** record of MSG-A-08 (motorbike, injured person): Rules (A5), Extracted data (amount empty), Raw response → «Sent to the model» and Validate button (without confirming).

### Step 5 · The raw response for MSG-A-12 (min 12-14)

**Key sentence**

> On this screen we see the model's response and, below it, the governance block that the platform adds. The model does not certify itself: it is the platform that leaves the proof for each decision.

**What it is and what it does**

> - The governance block is not generated by the model: the platform calculates it with fixed rules.
> - It records the personal data and its type, such as health or minors, and whether it was used to decide.
> - It explains why the notice belongs to one line of business and not the other two.
> - It adds a chained SHA-256 seal and the retention period.

**Value**

> - Health data and minors have reinforced protection: for the DPO it is evidence decision by decision.
> - If someone tampers with a record, the chain breaks and it shows straight away.

**Clicks:** record of MSG-A-12 (minor in A&E) → Raw response with «+ Governance»; then Agent Governance with the source «Current session».

---

## 6. Part 2 · Governance

### 6.0 Entering the panel (min 14-15)

**Key sentence**

> On this screen we see the panel's home page: thirteen sections grouped into six questions, each with its figure for the day. Six questions to govern our agents.

**What I say**

> - What is happening, how much the machine decides, whether there is fraud, whether they decide well, whether we comply and how much it costs, and what needs correcting.
> - We are going to go into each section with the messages from the batch we have just processed.

**Clicks:** Home, block by block.

### Step 6 · Summary (min 15-17)

**Key sentence**

> On this screen we see the indicators for the period, the cards of the four agents and the alerts from every source. Full control of the system and the ability to stop it instantly.

**What it is for**

> - It brings together on one screen indicators, agent status, cost against budget and alerts.
> - Management knows in ten seconds whether the system is running well.

**What it is and what it does**

> - The indicators give the effective autonomy, the claims handlers' corrections, spending and the cost, fraud, knowledge and compliance alerts.
> - Each agent has its card with status, model, latency and spending for the day.
> - The kill switch stops an agent with one click.

**Value**

> - Today: 81 % autonomy and 2.1 % of decisions corrected, below the 3 % target.
> - If an agent fails, it is stopped at once; its messages wait in a queue and none are lost.

**Clicks:** alerts KPI (11, including the fraud ones), agent cards, trace for MSG-A-08 and the Extraction kill switch.

### Step 7 · Agents: the Rules agent (min 17-18:30)

**Key sentence**

> On this screen we see the full card for the Rules agent: identity and permissions, configuration, cost, quality and its behaviour with each model. Each agent has its identity, its owner and only the permissions it needs.

**What it is for**

> - It gives the card for each agent: what it does, which model it uses, how many tokens it spends, how long it takes and how much it costs.
> - The agents are our autonomous workers: we need to know what problems they have, what knowledge they work with and whether they are profitable.

**What it is and what it does**

> - Each agent has its own identity, an owner and minimal permissions: what it can and cannot do.
> - It shows its configuration, its guardrails and caps, its cost and its tokens.
> - A table compares its behaviour with each model: accuracy, escalations, cost and latency.

**Value**

> - We decide with numbers which model to use in each agent.
> - Today the Rules agent accounts for 80 % of spending and has two knowledge bases with problems.

**Clicks:** Agents → Business rules: identity and permissions, configuration, behaviour by model and quality.

### Step 8 · Traceability (min 18:30-19:30)

**Key sentence**

> On this screen we see each message step by step, in a cascade with each agent's time, model and cost. Message by message: what happened, who decided it and how much it cost.

**What it is for**

> - It lets us follow each message and reconstruct any decision for a complaint or an audit.

**What it is and what it does**

> - Each message is a trace with each agent's duration, model and tokens.
> - It flags caps exceeded, guardrails and incidents, such as a provider error with its retry.
> - It can be filtered by agent, channel, decision or result.

**Value**

> - The insurer can prove how it decided without asking anyone.
> - The provider's failures do not reach the customer and are recorded.

**Clicks:** trace for MSG-A-08 (the most expensive in the batch) and for MSG-A-10 (429 error with retry); «With human intervention» filter.

### Step 9 · Autonomy (min 19:30-20:30)

**Key sentence**

> On this screen we see what level each agent is at, from L0 to L3, and the record of each level change. Graduated autonomy with clear limits.

**What it is for**

> - Each agent's freedom is in proportion to the risk and its track record; nothing goes up a level without data.

**What it is and what it does**

> - L0 suggests, L1 proposes, L2 decides within the guardrails and L3 decides and acts.
> - Each level change is recorded with its reason and who approved it.
> - If the claims handlers correct more than 3 % of an agent's decisions, it goes down a level.

**Value**

> - As with a new claims handler: more autonomy when they show judgement and less when they get things wrong.
> - The Rules agent went back to L2 in the week the corrections reached 4.1 %.

**Clicks:** levels and the Rules change L3 → L2.

### Step 10 · Guardrails (min 20:30-22)

**Key sentence**

> On this screen we see the twelve conditions that hold the agents back, with how many times each has been triggered. The insurer's rules always take precedence over the model.

**What it is for**

> - It guarantees that the insurer's rules always take precedence over what the model says.

**What it is and what it does**

> - A guardrail is checked before a decision is carried out: confidence, amount, injured people, line of business or fraud.
> - When it is triggered, the decision goes to a person, changes model or the trace is flagged.
> - Each guardrail has its card, its triggers per day and a switch.

**Value**

> - The amount guardrail was triggered 118 times in 14 days and explains 62 % of escalations.
> - Every activation or deactivation is recorded in the History with its author.

**Clicks:** cards for G-04 (injured, MSG-A-08) and G-02 (amount); G-09 switch.

### Step 11 · Human intervention: MSG-A-04 (min 22-24)

**Key sentence**

> On this screen we see the queue of what the agents escalate, who reviews it and how long it takes. A 10-second approval is just a signature: that is why we measure whether the review is real.

**What it is for**

> - It proves that the human review is real and that nobody signs without looking.

**What it is and what it does**

> - Each escalated case enters a queue with its reason, its status and its reviewer.
> - Resolving an escalated case is not an override. An override is changing something the agent decided on its own, and it is recorded with its reason.
> - If overrides go above 3 %, the panel proposes lowering the agent's level and a person approves it.
> - The panel measures how long each claims handler takes and which approvals are signed in under 30 seconds.

**Value**

> - The queue proves that a person decided, with their name and the time.
> - 3.3 % of approvals are signed in under 30 seconds; two claims handlers do not yet have the AI training.

**Clicks:** review queue → trace for MSG-A-04 (review by L. Prieto, who approves it: the son was declared after all); review quality and M-10.

### Step 12 · Fraud: MSG-A-13, MSG-A-09 and MSG-A-02 (min 24-26)

**Key sentence**

> On this screen we see each notice in the batch with its fraud score, the cases that go to the Special Investigations Unit and the payments withheld. The indicator does not accuse: it prioritises, and the decision is taken by a person.

**What it is for**

> - It scores each message against the fraud patterns the company has already identified.
> - It stops the doubtful payment without blocking the customer who has done nothing wrong.

**What it is and what it does**

> - It combines what the AI understands from the account, the history of policies and claims, and deterministic rules.
> - Score from 0 to 100: below 40 it is recorded, between 40 and 69 the payment is withheld and from 70 it goes to the SIU.
> - The history also subtracts: a counter-indicator lowers the score.

**Value**

> - No claim is rejected on its own and the customer never sees the sign.
> - There is €2,080 withheld, with a cap that watches that money.
> - With 76 % false positives, an indicator on its own never decides.

**Clicks:** case MSG-A-13 (score 90, SIU), MSG-A-09 and MSG-A-02 (shared account, relationship map) and MSG-A-04 (counter-indicator).

### Step 13 · Reasoning and replay (min 26-27:30)

**Key sentence**

> On this screen we see how each agent reached its result and repeat a real trace with another model. We audit what happened and test before changing anything.

**What it is for**

> - It lets us test any change with real cases before it reaches the customer.

**What it is and what it does**

> - The reasoning is shown agent by agent: what it received, which sentences it used and what it delivered.
> - It is not the model's chain of thought: it is the structured record with its quotes.
> - Replay repeats a trace in identical mode or changing the model or the prompt, and shows the difference.

**Value**

> - Moving Rules to gpt-5-mini kept the decision at 82 % less cost.
> - gpt-5-nano changed an approval into a to review: the replay detects it before the customer does.

**Clicks:** reasoning for MSG-A-08; what-if replay with gpt-5-mini on MSG-A-04 (RP-0006) and replay history.

### Step 14 · Knowledge Bases (min 27:30-29)

**Key sentence**

> On this screen we see the health of the knowledge the agents consult, with its metrics and its problems. Knowledge also degrades, and we watch it just like the agents.

**What it is for**

> - It measures the health of policy terms, manuals, provider network and garage network: an old document makes a good model decide badly.

**What it is and what it does**

> - Each base is evaluated continuously against a rubric, with thresholds per metric.
> - Its card shows configuration, source, synchronisation, versions and a comparison of configurations.

**Value**

> - With old policy terms, the agent may apply an excess that no longer exists.
> - Motor policy terms lost 6 points of recall; a validity filter raises it from 0.81 to 0.88.
> - The change only goes to production if the rubric does not get worse.

**Clicks:** KB-02 Motor policy terms (affects MSG-A-01 and MSG-A-04): Health, Source, Comparison and «Apply»; KB-06 Garage network.

### Step 15 · Compliance: the thermometer (min 29-30:30)

**Key sentence**

> On this screen we see the regulatory thermometer calculated from all the traces, regulation by regulation. The solution puts the insurer in a position to prove that it complies.

**What it is for**

> - It tells us what level of compliance we are at with respect to the AI Act, the GDPR, DORA, EIOPA and Solvency II, and what we are missing.

**What it is and what it does**

> - Some controls are measured in the traces and others are declared with their evidence.
> - A matrix says, article by article, what the regulation requires and how it is addressed.
> - It includes the personal data inventory and the integrity chain of the record.

**Value**

> - Today we can prove 87 %; the amber controls are the to-do list.
> - A tampered record is detected at once: it is not a certificate, but it is the evidence the DPO needs.

**Clicks:** thermometers and matrix; data inventory for MSG-A-12; «Simulate a tampering» and restore.

### Step 16 · FinOps (min 30:30-32)

**Key sentence**

> On this screen we see spending by agent, by model and by token type, with its caps and alerts as they happen. What we do not want is the cheapest model; we want the cheapest model that gives us the highest quality.

**What it is for**

> - It controls spending by the second and with actions: the provider reports every 8 hours and a lot can happen in that time.

**What it is and what it does**

> - Every decision adds its cost the moment it happens, with each agent's tokens and the price of its model.
> - There are caps per agent, global, per message and for reasoning, and each one has an action.
> - A table crosses the cost and quality of each model.

**Value**

> - The cap acts on the same message that exceeds it: Rules changed model on its own, without stopping the service.
> - The month is at €296 of €500, with a projection of €428.
> - Rules takes 80 % of spending: we know where to act.

**Clicks:** monthly cost KPI, spending by agent, cost alerts (CAP-03 and the trace for MSG-A-08), CAP-03 card and models table.

### Step 17 · Corrective measures (min 32-33:30)

**Key sentence**

> On this screen we see in a single list the problems the panel detects, each with its alternatives and its savings. Cost under control and every problem with its owner.

**What it is for**

> - Every problem has an owner, an alternative and a check.

**What it is and what it does**

> - It covers cost, knowledge, compliance, quality and resilience.
> - Each alternative comes with its impact, its effort, who approves it and how it is validated beforehand.
> - You can simulate, apply, request approval and undo.

**Value**

> - Moving the simple cases to gpt-5-mini saves €237 a month, validated with a replay that did not change any decision.
> - Whatever needs approval waits for the AI Committee, and everything is recorded.

**Clicks:** M-01 (comes from the replay of MSG-A-04): Apply; M-02 (trace for MSG-A-08): Request approval; Undo.

### Step 18 · History (min 33:30-34)

**Key sentence**

> On this screen we see the timeline of everything that has changed in the system, with its author and time. This is the logbook the regulator asks for, and it fills itself in.

**What it is for**

> - It is the logbook for any auditor, without filling it in by hand.

**What it is and what it does**

> - It records paused agents, guardrails, measures, reviews, overrides, changes of model, prompt and level, and incidents.

**Value**

> - An auditor sees every change with its author and date; everything we have touched in the demo is already here.

**Clicks:** timeline and filters; L. Prieto's review on MSG-A-04 and the overrides on 15/09.

---

## 7. Wrap-up (min 34-35)

**Key sentence**

> We go back to the History to finish with what we have seen. What makes AI reach production and stay there is governance.

**What I say**

> - 13 notices from five channels: 10 approved on their own and 3 in the hands of a person, each with its reason.
> - One case with the SIU and three payments withheld without blocking anyone.
> - Agents with autonomy, permissions and an owner; guardrails; a controlled budget and a trace for each decision.
> - It is not an idea on paper: it is what Logicalis implements for customers in different industries.

**Clicks:** History.
