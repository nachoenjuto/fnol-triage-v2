# Demo script · FNOL triage with governed agents

Step-by-step script for a 30-35 minute session: introduction in the four sections of `intro.html` and demo on Package A (13 messages) in `index.html` and `gobierno.html`. Based on: [guia-demo.md](guia-demo.md) and the demo walkthrough (`data/recorrido.js`).

**How to read this script**

- The quoted paragraphs (with the bar on the left) are the **text to say out loud**. In the Word version they appear in green.
- The rest are directions for the presenter: what to open, where to click and what to look at.
- Each step follows the same order: key sentence, Package A message, **What this section is for** (in the governance part), **What it is and what it does** (technical and functional), **Value** (for the business and for the person who uses it), **Regulation and why it matters** (what it says and what the risk is) and, at the end, the **Clicks**. First you tell it, then you show it.
- The figures come from the demo. The panel data is demonstration data, consistent with Package A.

---

## 0. Before you start

**Preparation (5 minutes before)**

1. Serve the demo (`make run`) and open `intro.html`.
2. In a second tab, open `index.html`. In the side menu, **Settings → Triage engine → Saved results** (does not depend on the network) and **Message package → Package A**. Check that «Pseudonymise before sending to the model» is turned on.
3. Do not process the batch yet: it is done live in step 2.
4. If you are going to take screenshots, add `?fecha=2026-09-17` to the URL. Without that parameter the dates in the messages are shifted to today.
5. Optional: turn on **Presenter mode** on the panel Home (password `password`) to have the walkthrough to hand with its «Go» button.

**Timings**

| Min | Block | Screen |
|---|---|---|
| 0-1 | 1. The problem | `intro.html` · The problem |
| 1-3 | 2. The solution | `intro.html` · The solution |
| 3-4 | 3. The actors | `intro.html` · The actors |
| 4-5 | 4. The demo | `intro.html` · The demo |
| 5-14 | 5. Part 1 · Triage (steps 1-5) | `index.html` |
| 14-15 | 6.0 Entering the governance panel | `gobierno.html` · Home |
| 15-34 | 6. Part 2 · Governance (steps 6-18) | `gobierno.html` |
| 34-35 | 7. Wrap-up | `gobierno.html` · History |

---

## 1. The problem: FNOL, a critical process, and AI governance (≈1 min)

**Screen:** `intro.html` · The problem.

**Key sentence:** «The first notice decides much of what happens to the claim, and the AI that automates it has to be under control.»

> Before we start, I want to set out what we are talking about. In Spain around 11 million motor claims are reported every year, according to UNESPA; that is one every three seconds. And they all start the same way: with a first notice from the customer.
>
> That notice reaches us through five channels at once. It can be a long email with attachments, a web form, a chat, a call that somebody has to transcribe or a WhatsApp written in a hurry and full of emojis. And from that moment the clock starts ticking, because the Insurance Contract Act, in article 16, gives seven days to report the claim.
>
> Much of what happens next is decided at FNOL. If the line of business is assigned wrongly, the file goes round and round between teams. If a piece of information is missing, someone has to call the customer back. If a sign of fraud slips past us here, it is much harder to find later. And it is also the customer's first contact with their insurer, usually on a bad day.
>
> Today all that work is done by a person: they read the message, classify it and type the data into the system. To give you an idea of how much it weighs, in the United States claims handling takes around 10 % of the motor premium. That is where our time and money go.
>
> And there is a second problem. As soon as we put AI into a process like this, we have to control it from many angles: how much autonomy we give the agents, whether the knowledge bases they use are healthy, whether we comply with regulation and how much each decision costs us.
>
> Classifying a message with AI no longer sets anyone apart; with a good prompt you get over 90 % accuracy. The real challenge is going from pilot to production. Gartner estimates that more than 40 % of agentic AI projects will be cancelled before the end of 2027, because of cost, unclear value or uncontrolled risks. In other words, projects do not fail because the AI fails. They fail because nobody can answer three questions: why did it decide that, who controls it and how much does it cost.

**Notes**

- Sources: UNESPA (11 M and «one every 3 s»); LCS art. 16 (7 days); III with NAIC data (~10 % of the motor premium in the US, 2023). There is no equivalent public figure for Spain: say so if asked.
- Do not use the «4 % of agents in production» or McKinsey's 25-30 % saving: they are not verified in the original source.

---

## 2. The solution: an integrated multichannel platform, orchestrated by 4 agents and with good AI governance (≈2 min)

**Screen:** `intro.html` · The solution, block by block from top to bottom.

**Key sentence:** «We automate the first contact, with the AI under control.»

### 2.1 Where this platform comes from

**Screen:** block «What we have learnt implementing AI governance».

> Before going into the detail, one important point. What we are going to show you is an example of Logicalis's experience implementing AI governance and observability solutions for customers in different industries. We have brought together in a single case many things we have done in different projects.
>
> The industry changes, but the goal is always the same: to be in control so as to get better results, give customers a better service, control spending and comply with regulation. Today we are going to see it applied to the first notice of loss.

### 2.2 What it does

> What we are going to show you today is an integrated platform that automates that first contact. We have four AI agents that receive the notice through any channel, decide which line of business it belongs to, extract the data and apply the insurer's business rules. The claims handler receives the notice already classified, with the data extracted and with a proposal: approved or to review.
>
> The batch we are going to process contains 13 notices. 10 are approved on their own and 3 go to a person, each with its reason and with the customer's sentence that justifies it.
>
> And this is what the governance panel looks like over the last 14 days: 16,720 messages processed, 81 % effective autonomy, 19 % escalated to a person and only 2.1 % of decisions corrected by a claims handler. Next to it, the cost for the period, the active alerts, compliance and the health of the knowledge bases.

### 2.3 The four agents

| Agent | What it does | Model | Autonomy |
|---|---|---|---|
| Multichannel | Receives the message through the five channels and normalises it to a single format; transcribes the calls | gpt-5-nano + speech to text | L3 · Autonomous |
| Line-of-business classification | Assigns Motor, Home or Health quoting the signals in the text | gpt-5-nano | L3 · Autonomous |
| Data extraction | Turns the free text into 10 fields; if a piece of data is not there, it stays empty | gpt-5-mini | L2 · Supervised |
| Business rules | Applies the 25 rules for Motor, Home and Health and proposes Approved or To review | gpt-5 | L2 · Supervised |

> The idea is to have four small specialists instead of a single AI that does everything. Each one has its own model, its prompt version, its owner and its own limits. And we only use the most expensive model where reasoning is really needed, which is in the business rules.

### 2.4 Traceability, the basis of governance

Five ideas, one per block of the page:

**Traceability: the foundation of everything**

> The foundation of everything is traceability. Every decision leaves a trace: what came in, what each agent did, with which model, how many tokens it used, how much it cost and what it decided. AI providers already offer technical traces, and they are necessary, but they do not understand what a line of business, an excess or a seven-day deadline is. What this solution does is bring the two worlds together, the technical trace and the insurer's business process, to give an answer tailored to each company. And on top of that trace we build everything else: control of autonomy and spending, auditing and replay.

**Agent autonomy and maturity**

> Each agent has an autonomy level, from L0, where it only suggests, to L3, where it decides and acts. That autonomy is earned with data and lost with data. When the claims handlers started correcting more than 3 % of the Rules agent's decisions, the agent dropped from L3 to L2, with its reason and the name of whoever approved it. Today 81 % of decisions go through with no human intervention, and keeping that percentage under control is what it really means for the automation to work.

**Spending under control**

> We control spending by the second and through actions. Enterprise AI service providers tell you how much you have spent every 8 hours, and a lot can happen in 8 hours: an agent stuck in a loop or a spike in messages can leave us waking up in the morning to spending we did not want. Here every decision adds its cost the moment it happens, and every agent has its caps. If one is exceeded, the system acts on its own: for example, it switches to a cheaper model and records it in every trace, without stopping the service.

**Fraud**

> For fraud, the platform combines what the AI understands from the customer's account with the history of policies and claims and with deterministic rules. With all that it identifies the fraud patterns the company already knows: a newly taken-out policy, a payment account that repeats across different policyholders or a theft with no police report. And something important: the indicator does not accuse, it prioritises. The decision is always taken by a person.

**Demonstrable compliance**

> The GDPR, DORA and EIOPA's opinion on AI are already in force. The AI Act comes later, and triage is not considered high risk, but we apply its articles as good practice. Every decision carries its proof of compliance: what personal data there was, why it was decided that way and whether a person reviewed it.

---

## 3. The actors: the claims handler and the IT, Finance, Compliance teams, etc. (≈1 min)

**Screen:** `intro.html` · The actors.

**Key sentence:** «Two actors, two screens: the claims handler and whoever governs the AI.»

> In the demo we are going to see two types of user. On one side there is the FNOL claims handler, who works on the triage screen. It is a very quick interface: they see the detail of each message, how and why it was classified, why the AI took each decision and the signs of fraud, with the customer's sentence that justifies them. That way they spend their time on the cases that need judgement.
>
> On the other side are the teams that govern the AI: IT, Finance, Compliance, Risk, Audit or the DPO, who work on the governance panel. From there they see whether the agents decide well, with what knowledge, how much they cost and whether the insurer can prove it complies.

---

## 4. The demo: a journey from the moment a message arrives to the governance panel (≈1 min)

**Screen:** `intro.html` · The demo.

**Key sentence:** «We follow a message from start to finish and see everything the AI leaves behind.»

> The demo is a journey. It starts when a message arrives, continues with its analysis by the agents and the claims handler's review, and goes through the evidence the AI leaves for each decision.
>
> And it ends on the governance panel, where we are going to understand which agents took part, what they did and how, what limits they had, what reasoning lies underneath, what knowledge they used, how compliant the solution is, when it spends and why, and how we can improve all of it.

**Bridge to the demo**

> Let's see it. First I'll show you what the claims handler sees and then what whoever governs the AI sees: the owner of the agents, the auditor and the CFO.

**Click:** «Start the demo» button → `index.html`.

---

## 5. Part 1 · Triage

### Step 1 · The six phases and the five channels (min 5-6:30)

**Screen:** `index.html`, bar of numbered phases under the header.

**Key sentence:** «This is how the process works from start to finish.»

**Featured messages:** MSG-A-11 (WhatsApp) and MSG-A-08 (transcribed call).

| MSG-A-11 · WhatsApp · «Scratch on the door in a car park» |
|---|
| «Hi!! writing here cos I can't figure out the app 😅 Yesterday afternoon, in the Carrefour car park in Alcobendas, someone scratched the whole driver's door with a key or something and drove off without leaving a note 😩 The security guard says the cameras don't cover that area. I've got photos and this morning I reported it at the Alcobendas police station, they gave me the report number 18734/26. It's the white Peugeot 2008 2290 LKV, policy AU-742210. The garage next to my house says about €600 to paint the whole door. Something similar happened to me a few months ago in this same car park 🙄 What do I do?? I can send you the photos here if you want 📸 My ID number is 53442872-A 🙏» |
| **Result:** Motor · Approved · €600 · fraud watch (step 12) |

| MSG-A-08 · Phone (transcript) · «Motorbike accident with hospital admission» |
|---|
| «I'm calling on behalf of my husband, Carlos Ortega Ruiz, who has his motorbike insured with you (Honda CB500, number plate 6620 KXS, policy AU-662371) and also the health insurance (SA-662371). This afternoon at 19h a car cut across him at a roundabout in Alcorcón, the one where avenida de Leganés meets calle Porto Cristo, and he came off. He's in hospital at the Hospital Fundación Alcorcón with a broken collarbone and two broken ribs; they say they have to operate on the collarbone tomorrow. The Guardia Civil has made a police report, the number is 2026-001873-AL, and the car belongs to another driver who did stay and gave his details: it's an Opel Astra 9012 JHN. The motorbike is in the council pound, pretty wrecked. My husband is 47 and diabetic, in case that matters for the operation. I don't know if this goes under the motorbike or the health insurance, I need you to call me on this number, 655 201 877.» |
| **Result:** Motor · To review · injured person in hospital and third party involved (steps 4, 8 and 10) |

**What it is and what it does**

> Here you can see the six phases of the process. The first four are the AI agents working in a chain: multichannel intake, which receives the notice through any channel and normalises it to a single format; line-of-business classification; data extraction; and applying the business rules for Motor, Home and Health. The last two, traceability and automation, close the loop: they record everything that happens and turn the decision into a workflow.
>
> Each phase has its card, which explains what it receives, what it delivers and whether it is handled by an AI model or a business rule.

**Value**

> For the insurer, this means that a notice arriving by WhatsApp gets exactly the same criteria as one arriving by email. The customer chooses the channel that suits them best and the company does not lose traceability. For the claims handler, the notice arrives already classified, with the data extracted and a proposed decision, and they know that behind each agent there is a named owner.
>
> Also, these cards are exactly the documentation an auditor asks for before signing off an AI system.

**Regulation and why it matters**

- **EIOPA opinion on AI governance and risk management in insurance (2025).** It asks insurers to give each AI system owners, documentation, traceability and human oversight, in proportion to its risk. **Risk:** in an inspection, a system without documentation or an owner falls outside the entity's governance system, and the supervisor can ask for it to be corrected or stopped.

**Clicks**

1. Click **1 · Multichannel**: the pop-up card with the five channels and their unification into a single format.
2. Click **2 · Line-of-business classification**, **3 · Data extraction** and **4 · Business rules**: on each card, the «Generative AI» or «Business logic» label at the bottom.
3. Click **5 · Traceability** and **6 · Automation**.
4. Side menu → **Message package**: the list of the 13 with the icon of their channel. Point out MSG-A-11 (WhatsApp) and MSG-A-08 (phone).

**If asked:** what about attachments or audio? The call is transcribed with a speech-to-text model. Attachments are recorded with their fingerprint and their data is checked against the text: we will see it in the record of MSG-A-01, which comes with the accident statement and two photos. Guardrail G-09 can escalate low-confidence transcripts to a person.

---

### Step 2 · Processing Package A (min 6:30-8:30)

**Screen:** `index.html`, main panel.

**Key sentence:** «In seconds we know what is approved and what a person has to review.»

**Featured messages:** the 13 in Package A (see annex A).

**What it is and what it does**

> When the package is processed, each notice goes through the four agents and comes out with its line of business, its data and its decision. The counters for approved, cases to review and average time update live, and the batch can be paused at any moment without losing anything.
>
> At the same time, each notice leaves its trace there and then: the model each agent used, the tokens, the cost in euros and the decision.

**Value**

> This lets the claims handler spend their time on the cases that really need judgement, and not on typing in the ones that do not. Over the last 14 days, 81 % of decisions went through with no human intervention.
>
> And the log is generated on its own, with no manual work. It is the evidence the insurer presents in an audit.

**Regulation and why it matters**

- **AI Act art. 12 · Automatic logging.** The system must log its events automatically throughout its lifetime. It is mandatory for high-risk systems and is applied here as good practice. **Risk:** without a log, a decision cannot be reconstructed for a complaint or an inspection, and the insurer has nothing to defend it with.

**Clicks**

1. **Process package**. While it runs, point out the counters (Approved, To review, Average cycle time) and the log filling up.
2. Halfway through the batch, **Pause**. Explain that nothing is lost. **Continue**.
3. When it finishes: 10 approved and 3 to review. Point out the chips by line of business.
4. **Line of business** column: the ✔ against the expected result. **Origin** and **Conf.** columns.
5. **Only to review** filter: MSG-A-04, MSG-A-08 and MSG-A-13 remain. Remove the filter.
6. Point out the fraud labels in the log (MSG-A-13 with the SIU; MSG-A-09, MSG-A-11 and MSG-A-02 with payment withheld).
7. Optional: **Export JSON**.

**If asked:** how long does it really take? With the real model, between 5 and 8 seconds per notice in the demo; the longest trace, MSG-A-08, 12.4 seconds. A person takes minutes to read and type in the same notice.

---

### Step 3 · The record of an approved notice: MSG-A-01 (min 8:30-10)

**Screen:** `index.html` → record of MSG-A-01.

**Key sentence:** «An approved decision also has to be explainable.»

| MSG-A-01 · Email · «Minor knock on the M-30 - policy AU-483920» |
|---|
| «Good morning. My name is Marta Gil Sanz, ID number 50123456-Q, and I am the policyholder of policy AU-483920. On Saturday 12 September, at about 18:30, I was driving on the M-30 towards the A-5, near the Puente de Segovia, in a tailback, and the car in front braked suddenly; I gave it a little knock from behind. Nobody was hurt and both cars could carry on driving. We both filled in the accident statement on the spot (I attach it scanned); the other driver is Raúl Méndez, with a Citroën C4 insured with another company. My car is the Seat León 4521 KLM. The garage Autos Carabanchel has given me an estimate of €1,350 for the bumper and the right headlight; I also attach photos of the damage.» |
| **Result:** Motor · Approved · confidence 0.95 · «Minor collision with an accident statement, nobody injured and an estimate of €1,350: meets all the Motor rules.» |

**What it is and what it does**

> This is the record of a decision. At the top we see the decision, the line of business and the model's confidence. Below, the customer's message with the evidence highlighted. Each piece of evidence is a literal quote from the message, and the system checks that it exists in the original text: if the model makes it up, it does not appear.
>
> This notice also comes with three attachments: the scanned accident statement and two photos of the damage. In the Attachments tab we see them next to the data the agent has read from each one, compared with what the email says. The statement confirms the date, the time and that nobody was hurt, and adds the other driver's number plate and insurer, which were not in the text. The photos show minor damage to the front right bumper and headlight, which is exactly what the garage has quoted for.
>
> In the next tabs we see the data the agent extracted from the free text, each of the line-of-business rules the Rules agent evaluated, with its result and its evidence, and the reasoning that led it to the decision.

**Value**

> Simple, well-documented notices are approved without anyone having to touch them. And if tomorrow someone asks why one was approved, the answer is here, rule by rule and in the customer's own words. The claims handler does not have to trust a black box: they can check each rule in seconds. And they no longer have to open the statement and the photos to compare them by eye with the email: the cross-check is done, and they only have to look at what does not match.
>
> If they do not agree with an approval, the Override button on the Decision card sends it to review, with an optional comment. That change counts towards the agent's override rate, and that rate decides its autonomy level.

**Regulation and why it matters**

- **AI Act art. 13 · Transparency.** Whoever uses the system has to be able to interpret its results. Mandatory for high risk; here, good practice. **Risk:** a claims handler who does not understand the proposal signs it or discards it blindly, and in both cases the error reaches the customer.
- **GDPR art. 15 · Right of access.** The customer can ask for meaningful information about the logic of an automated decision that affects them. **Risk:** if it cannot be explained, a complaint to the AEPD; GDPR fines reach €20 M or 4 % of worldwide turnover.

**Clicks**

1. Top of the record: the three figures (Decision, Line of business, Confidence 95 %) and the **Override** button on the Decision card. Point it out without confirming it: an override changes the figures on the governance panel.
2. **Message** tab: the evidence highlighted and numbered in the text. Hover over one: the «Evidence» title changes to its type (for example «Date of loss»). Open **Legend**.
3. **Attachments** tab (3): the accident statement in the PDF viewer and, on the right, its data checked against the email (everything matches; the other vehicle's details only appear in the statement). Move to the two photos: click the image to enlarge it.
4. **Extracted data** tab: the 10 fields (customer, policy, type, date, €1,350, place, third parties yes, injured no, documentation: accident statement, estimate and photos).
5. **Business rules** tab: A1 to A8, all «met» or «not applicable», each with its evidence.
6. **Reasoning** tab: line of business, decision, recommended next step and timeline.

**If asked:** who writes the rules? The business. They are in the side menu, **Prompt** section, and can be edited without programming («Edit full size» button). The call to the model always uses the current text.

**If asked:** does the model really read the attachments? In this demo, the attachment data comes from the saved results, also when a live model is connected; the next step is to send it the photos and the PDF in the extraction call. And note: pseudonymisation only applies to the text, so the attachments reach the model with whatever personal data they contain. The trace records it that way in `_gobernanza.adjuntos`.

---

### Step 4 · The record of a «To review» notice: MSG-A-08 (min 10-12)

**Screen:** `index.html` → record of MSG-A-08. Full text of the message in step 1.

**Key sentence:** «Every decision can be explained, also when the machine does not decide.»

**Result:** Motor · To review · confidence 0.90 · «Motorbike accident with an injured person in hospital and a third party involved: specialised handling of personal injury and coordination with health policy SA-662371.»

**What it is and what it does**

> When a notice goes to review, the record tells us which rule it breached and highlights the sentences in the message that justify it. If a guardrail is also triggered, for example because someone is injured, the agent cannot decide and the case goes straight to a person.
>
> If a piece of data does not appear in the message, the field stays empty. The agent is instructed not to make anything up.
>
> And in the raw response we can see exactly what the model received. Before sending it the message, the platform replaces the names, policies, number plates, phone numbers and the rest of the personal data with placeholders. What is needed to decide, such as the injuries or the diagnosis, is kept. When the response comes back, the platform puts the real data back into the record, and the mapping table only exists in memory for the duration of the call.

**Value**

> The claims handler understands the reason in seconds. When they finish reviewing it, they resolve it with the Validate button on the Decision card: they choose whether to approve it or keep it in review, and can leave a comment. As the agent had already escalated the case, that is not an override and does not affect its autonomy. If the customer asks for an explanation, the answer is already prepared in the record. And personal injury is always assessed by a person: over the last 14 days, the injured-party guardrail explains 20 % of escalations.
>
> Also, the model decides without knowing who the policyholder is. Data minimisation stops being a policy written in a document and becomes what the model actually receives.

**Regulation and why it matters**

- **GDPR art. 22 · Automated decisions.** Nobody can be subject to a decision based solely on automated processing that significantly affects them without being able to obtain human intervention. **Risk:** an unfavourable decision taken by the machine alone can be challenged and penalised.
- **GDPR art. 5.1.c · Minimisation.** Only the data needed for the purpose is processed. **Risk:** sending names, ID numbers or phone numbers to an external provider without need multiplies the impact of a breach.
- **GDPR art. 9 · Health data.** It is a special category and needs a specific legal basis. **Risk:** it is the infringement that weighs most in a penalty and the one that does most damage to reputation.

**Clicks**

1. **Message** tab: evidence highlighted («in hospital», «broken collarbone and two broken ribs», «police report», the third party's Opel Astra).
2. **Business rules** tab: **A5 · Third parties documented and nobody injured** as «breached», with its evidence.
3. **Extracted data** tab: `importe_estimado_eur` empty. Point it out.
4. **Reasoning** tab: why it is Motor and not Health (the cause of the loss is the road accident).
5. **Raw response** tab → **Sent to the model** view: the placeholders [PERSONA_1], [POLIZA_AU_1], [MATRICULA_1], [TELEFONO_1] instead of the real data. The fracture and the diabetes are still there.
6. Decision card: the **Validate** button. Clicking it lets you choose the result (Approve or Keep as «To review») and leave a comment. Cancel without confirming.

**If asked:** is pseudonymising the same as anonymising? No. The trace keeps the link to the person, and that is why it is still personal data (GDPR art. 4.5). The compliance thermometer explains it (step 15).

---

### Step 5 · The raw response for MSG-A-12 (min 12-14)

**Screen:** `index.html` → record of MSG-A-12 → **Raw response** tab.

**Key sentence:** «The model does not certify itself: it is the platform that leaves the proof for each decision.»

| MSG-A-12 · WhatsApp · «Son in A&E after a scooter fall» |
|---|
| «Hi, I'm in paediatric A&E right now at Hospital Universitario HM Sanchinarro with my son Mateo Ruiz Ibarra (8), he fell off his scooter in the Valdebebas park and hurt his left arm, he can't move it and he's crying a lot 😢 They're going to X-ray his arm 🙏 The paediatrician says it could be a broken wrist. He's on the family policy SA-518877, I'm the policyholder. I showed his health card. Nobody else was involved, he fell on his own. I'm reporting it in case I need to do anything else. Thanks!» |
| **Result:** Health · Approved · confidence 0.94 · direct service at a hospital in the provider network |

**What it is and what it does**

> In the raw response we see what the model returned and, below it, a governance block that the platform adds. This block is not generated by the model: the platform calculates it with fixed rules, and it can be recalculated at any time.
>
> The block records what personal data there is in the message, what type it is, for example health data or data about minors, and whether it was used to decide. It explains why the notice belongs to one line of business and why it does not belong to the other two. And it adds a SHA-256 seal chained to the previous decision, together with how long the trace has to be kept.

**Value**

> Health data and data about minors have reinforced protection. With this block, each response says what sensitive data there was, how it was handled and whether it was used to decide. For the DPO it is evidence decision by decision, not a generic statement.
>
> And if someone tampers with a record, the hash chain breaks and it shows straight away. We are going to check it on the panel.

**Regulation and why it matters**

- **GDPR art. 9 and protection of minors (art. 8 and recital 38).** Health data is a special category and data about minors deserves specific protection. **Risk:** processing it without knowing it is there makes it impossible to apply the safeguards the law requires; it is the typical case of an aggravated penalty.
- **AI Act art. 19 and LCS art. 23 · Retention.** Logs are kept for at least six months, and the file for as long as claims can be brought: two years for property damage and five for personal injury. **Risk:** deleting earlier leaves the insurer without evidence in a lawsuit; keeping too long breaches the storage limitation principle.

**Clicks**

1. **Raw response** with **+ Governance** turned on: the `_gobernanza` block, marked as «added by the platform, not generated by the model».
2. Terracotta `datos_personales` block: the minor (aged 8) and the health data in red, each with its category and whether it was used to decide.
3. Green `explicabilidad` block: why Health and **why neither Motor nor Home** («the scooter does not trigger Motor: it is not an insured vehicle and there is no third party»; «Home ruled out: the fall was in a park»).
4. Blue `trazabilidad` block: trace, model, prompt version and chained SHA-256 hash.
5. Ochre `retencion` block: 6 months for the trace; 5 years for the personal injury file.
6. Violet `supervision_humana` block. Hover over a regulation to see what it requires.
7. **Transition:** header → **Agent Governance**. On the panel, **Source → Current session**, so that the traces are those of the batch we have just processed.

---

## 6. Part 2 · Governance

### 6.0 Entering the panel (min 14-15)

**Screen:** `gobierno.html` → **Home**. Go through the six blocks from top to bottom, without going into any of them.

**Key sentence:** «Six questions to govern our agents.»

> Now we move to the panel of whoever governs the agents. It is organised into thirteen sections that answer six questions: what is happening, how much the machine decides and how much a person, whether there are signs of fraud, whether the agents decide well and with good knowledge, whether we comply and how much it costs us, and what we have to correct. Each card on this home page gives us the figure for the day and its status. We are going to go into each section with the messages from the batch we have just processed.

| Block | Question | Sections | Steps |
|---|---|---|---|
| Operations | What is happening? | Summary · Agents · Traceability | 6-8 |
| Control | How much does the machine decide and how much a person? | Autonomy · Guardrails · Human intervention | 9-11 |
| Risk | Are there signs of fraud? | Fraud | 12 |
| Quality | Do they decide well and with good knowledge? | Reasoning and replay · Knowledge Bases | 13-14 |
| Compliance and cost | Do we comply and how much does it cost? | Compliance · FinOps | 15-16 |
| Improvement and audit | What needs correcting and what has changed? | Corrective measures · History | 17-18 |

---

### Step 6 · Summary (min 15-17)

**Screen:** Home → **View the Summary**. **Operations** block.

**Key sentence:** «Full control of the system and the ability to stop it instantly.»

**Featured:** the whole batch and the trace for MSG-A-08.

**What this section is for**

> The Summary gives us on a single screen the indicators for the period, the status of each agent, the cost against budget and the alerts from every source. What we want is for management to know in ten seconds whether the system is running well, without having to ask anyone for a report.

**What it is and what it does**

> The indicators at the top give us the effective autonomy, that is, how many decisions go through with no human intervention; how many the claims handlers correct; how much we have spent against the cap; and which alerts are open, whether on cost, fraud, knowledge or compliance. When we open the alerts indicator we see them ordered by origin, each with a link to its section.
>
> Below, each agent has its card with its status, its model, its latency and what it has spent today against its budget. And each card has a stop switch, the kill switch, which stops the agent with a single click.

**Value**

> Right now we have 81 % autonomy and 2.1 % of decisions corrected, below the 3 % target.
>
> And if an agent starts behaving badly, we stop it at once. Its messages stay queued until we resume it, none are lost, and the stop is recorded with the name of whoever did it.

**Regulation and why it matters**

- **AI Act art. 14 · Human oversight.** The system must allow a person to monitor it, understand its results and stop it with a stop button. **Risk:** without a stop, a model failure repeats itself in hundreds of decisions before anyone sees it.
- **EIOPA.** It asks for regular information on the AI systems to be given to the board and management. **Risk:** management that cannot see the system cannot answer for it to the supervisor.

**Clicks**

1. The 8 KPIs: 16,720 messages in 14 days, effective autonomy 81 %, escalated 19 %, overrides 2.1 %, cost for the period, 11 alerts, compliance 87 % and 5 of 9 knowledge bases healthy.
2. Click the **Active alerts** KPI: the window with the 11 alerts by severity and by origin (cost 3, fraud 3, knowledge bases 3, compliance 2) and the list grouped by origin. In the **Fraud** group: MSG-A-13 escalated to the SIU (click: opens the case card), the 3 payments withheld for €2,080 and CAP-09 at warning. Close.
3. The cards of the four agents: Rules **Degraded (gpt-5-mini)** and €13.70 against a daily cap of €12.
4. **Daily cost against the cap** chart: **Enlarge** button (window with the detail by day).
5. The card's **Active alerts**, ordered by severity: the one for CAP-03, the one for MSG-A-13 with the SIU and the one for KB-06 (garage network).
6. **Latest traces** → click the one for MSG-A-08: the explained card (what came in, what each agent did, decision, cost). **Compliance** button inside the card. Close.
7. **Kill switch** for Data extraction: the card goes dark. Turn it back on.

---

### Step 7 · Agents: the Rules agent (min 17-18:30)

**Screen:** menu → **Agents** → **Business rules** tab. **Operations** block.

**Key sentence:** «Each agent has its identity, its owner and only the permissions it needs.»

**Featured:** the Rules agent, the one that decides on MSG-A-01, MSG-A-04 and MSG-A-08.

**What this section is for**

> The Agents section gives us the full card for each agent: what it does, which model it uses, how many tokens it spends, how long it takes, how much it costs, how it performs depending on its model and what knowledge it consults.
>
> Keeping the agents under control is essential, because they are our autonomous workers. We need to know what problems they have so we can help them, what knowledge they are working with so we can keep it up to date, and whether they are profitable, so we can take decisions with data and not lose money.

**What it is and what it does**

> Each agent has its own identity, just like an employee, with an owner and minimal permissions: what it can and cannot do is defined. On the card we see its configuration and thresholds, the guardrails and caps that limit it, its cost and tokens over the last few days, and a table with its behaviour depending on the model it has used: accuracy, escalations, corrections, cost per message and latency.
>
> We also see a quality index, the knowledge bases it uses and, for the more technical profiles, its input and output contract.

**Value**

> With this card we decide with numbers which model to use in each agent. Today, for example, the Rules agent accounts for 80 % of the spending and has two knowledge bases with problems. That is where we have to focus.

**Regulation and why it matters**

- **DORA art. 9 · Protection and prevention.** It requires access to be managed with the minimum privilege needed. DORA has applied to insurers since January 2025. **Risk:** an agent with more permissions than it needs can order a payment or delete a file if it fails or is attacked.
- **GDPR art. 25 · Data protection by design.** Each component only accesses the data it needs. **Risk:** an agent that sees more data than necessary is a breach of the rules even if there is no data breach.

**Clicks**

1. The chain at the top: Multichannel → Classification → Extraction → Rules, with what they pass on (normalised text → line of business and signals → 10 fields).
2. Rules header: Degraded, L2, owner «Claims Management · AI Committee», gpt-5, prompt v2.3, p50/p95 latency, €13.70 / €12.
3. **Identity and permissions**: it can look up the policy read-only and make proposals; it cannot order payments, reject a claim or modify the file.
4. **Configuration and variables**: minimum confidence 0.85, maximum amounts, reasoning effort «medium», override target 3 %.
5. **Performance and cost**: €172.65 in 14 days; the **Behaviour by model** table (gpt-5 at 98.9 % accuracy for €0.011 per message; degraded gpt-5-mini at 97.6 % for €0.002).
6. **Quality**: the 98 % circle, accuracy 13/13, average confidence 0.93, 9.77 verified pieces of evidence per decision.
7. **Knowledge Bases it uses**: KB-02 degraded and KB-06 critical (we will see them in step 14).
8. Optional for technical profiles: **Input and output contract** with the real example.

---

### Step 8 · Traceability (min 18:30-19:30)

**Screen:** menu → **Traceability**. **Operations** block.

**Key sentence:** «Message by message: what happened, who decided it and how much it cost.»

**Featured:** MSG-A-08 (TRZ-4F31) and MSG-A-10 (TRZ-4F33).

| MSG-A-10 · Email · «A&E for an asthma attack» |
|---|
| «Last night, at around 23:00, I had quite a bad asthma attack (I've been asthmatic since I was a child and I'm on treatment with an inhaler) and I went to A&E at Hospital Universitario Quirónsalud Madrid, in Pozuelo, which is in the provider network. […] They gave me nebulisers and corticosteroids […] and discharged me in the early hours […]. I didn't have to pay anything. Policy SA-337700 […].» |
| **Result:** Health · Approved · incident: 429 error from the AI provider, resolved with a retry after 2 s |

**What this section is for**

> The Traceability section lets us follow each message step by step: which agent did what, how long it took, with which model and how much it cost. It lets us reconstruct any decision from the log, whether for a complaint or for an audit.

**What it is and what it does**

> Each message generates a trace. The cascade shows us each step of each agent with its duration, its model and its input, output and reasoning tokens. If the trace has exceeded a cost cap, triggered a guardrail or had an incident, such as a provider error with its retry, it is flagged right here. And the list can be filtered by agent, channel, decision or result.

**Value**

> When there is a complaint, the decision is reconstructed without having to ask anyone what happened, and the insurer can prove how it decided.
>
> Also, the AI provider's failures do not reach the customer: the system retries and records them, so we can talk to the provider with data on the table.

**Regulation and why it matters**

- **GDPR art. 5.2 · Accountability.** Complying is not enough: the insurer has to be able to prove it. **Risk:** the burden of proof is on the insurer; without a log, before the AEPD or a judge it has no way of proving that it decided well.
- **DORA art. 11 · Response and recovery.** Critical services must keep working when third parties fail. **Risk:** depending on a single AI provider with no retries or alternative turns its outage into an outage of the claims service.

**Clicks**

1. Click the trace for MSG-A-08: the fixed panel at the top shows the cascade of steps by agent with duration, model and tokens. 12.4 s, 28,038 tokens and €0.062, against about 4,300 tokens and €0.010 for the rest. Incidents CAP-04 and CAP-05.
2. Click the trace for MSG-A-10: the incident «429 · retry 1 (2 s)».
3. Filters: **Result → With human intervention** (MSG-A-04, MSG-A-08 and MSG-A-13 remain). Remove the filter.
4. **View reasoning** button on MSG-A-08 (takes you to step 13; come back with the menu).

---

### Step 9 · Autonomy (min 19:30-20:30)

**Screen:** menu → **Autonomy**. **Control** block.

**Key sentence:** «Graduated autonomy with clear limits.»

**Featured:** the Rules agent.

**What this section is for**

> The Autonomy section shows us what level each agent is at, from L0 to L3, and keeps the audit of every level change. What we want is for each agent's freedom to be in proportion to the risk of what it decides and to its track record, and for nothing to go up a level without data to back it.

**What it is and what it does**

> At L0 the agent only suggests. At L1 it proposes and a person confirms each case. At L2 it decides within the guardrails and escalates everything else to a person. And at L3 it decides and acts, and is audited afterwards.
>
> Every move up or down a level is recorded with its reason, the data that justifies it and the name of whoever approved it. One of the criteria is the correction rate: if the claims handlers correct more than 3 % of an agent's decisions, that agent goes down a level.

**Value**

> It is the same as we would do with a new claims handler: we give them more autonomy when they show judgement and take it away when they get things wrong. In the demo, the Rules agent reached L3 and went back to L2 in the week the corrections reached 4.1 %. And every change has someone behind it who signs it off.

**Regulation and why it matters**

- **AI Act art. 14 · Human oversight in proportion to risk.** The degree of human control must match the risk and autonomy of the system. **Risk:** giving full autonomy to an agent with no track record turns its errors into final decisions.
- **GDPR art. 22.** More autonomy means more automated decisions. **Risk:** moving up an agent that takes unfavourable decisions without human review falls squarely under the article's prohibition.

**Clicks**

1. KPIs: 81 % autonomous decisions (target ≥ 80 %), override rate 2.1 %, accuracy 99.1 % against the expected result.
2. **Levels** L0 to L3, from red to green: Multichannel and Classification at L3; Extraction and Rules at L2.
3. **Level changes (audit)** → click the row «Business rules · L3 → L2»: the full record (4.1 % override in the week, approved by M. Ortega). Navigate with ‹ › to «Classification · L2 → L3» (99.2 % accuracy over 4,800 messages).

---

### Step 10 · Guardrails (min 20:30-22)

**Screen:** menu → **Guardrails**. **Control** block.

**Key sentence:** «The insurer's rules always take precedence over the model.»

**Featured:** G-04 with MSG-A-08 and G-02.

**What this section is for**

> The Guardrails section brings together the conditions that stop an agent deciding on its own, and tells us how many times each one has been triggered. It lets us guarantee that the insurer's rules always take precedence over what the model says.

**What it is and what it does**

> A guardrail is a condition that is checked before a decision is carried out: a confidence below the threshold, an amount above the line-of-business limit, an injured person, a line of business that cannot be determined or a sign of fraud. When it is triggered, the decision is not carried out: it goes to a person, switches to a cheaper model or the trace is flagged, depending on the case.
>
> Each guardrail has its card, its triggers per day and a switch to turn it on or off.

**Value**

> The amount guardrail, for example, has been triggered 118 times in 14 days and explains 62 % of escalations. If tomorrow the business wants to raise the motor limit, it knows exactly how many cases are affected.
>
> And any guardrail that is turned on or off is recorded in the History with the name of whoever did it.

**Regulation and why it matters**

- **AI Act art. 9 · Risk management.** The system's risks have to be identified and measures put in place to reduce them throughout its lifetime. **Risk:** a model without limits can approve a €20,000 claim or a personal injury as easily as a €280 windscreen.

**Clicks**

1. KPIs: 11 of 12 active, 454 triggers in 14 days, the most triggered (G-02).
2. Table G-01 to G-12. Hover over the mini bars of triggers per day.
3. Click **G-04 · Injured = yes**: the card with its description and the latest triggers. In the list of triggers, the one for MSG-A-08 linked to its trace.
4. Click **G-02 · Amount**: 118 triggers, 62 % of escalations.
5. **G-09** switch (inactive): explain why it is off (average transcription confidence 0.91).
6. Optional: **New guardrail** (window with the form). Close without saving.

---

### Step 11 · Human intervention: MSG-A-04 (min 22-24)

**Screen:** menu → **Human intervention**. **Control** block.

**Key sentence:** «A 10-second approval is just a signature: that is why we measure whether the review is real.»

| MSG-A-04 · Email · «Damage to the car in a car park» |
|---|
| «Hello, on Thursday the 10th, at about 14:00, my son Pablo (he is 22) took my car, the Peugeot 308 3318 LMB on policy AU-119045, to go to university and as he was leaving the underground car park of the Faculty of Economics at the Complutense he scraped a pillar. The right rear door and the wing are quite dented and the rear light is broken. No other vehicle was involved, so we didn't fill in a statement, and he is fine. Pablo has had his licence for 3 years; I don't know if we added him to the policy when we renewed it, my wife dealt with it. Our trusted garage, Talleres Ruiz in Alcorcón, says it will be about €2,200 and they can have it ready in a week. I'd like you to tell me which garage to take it to or if I can go to my own garage. My phone is 677 019 334. Regards, Antonio Navarro Blanco.» |
| **Agent result:** Motor · To review · rule A3 (driver not declared). **Human review:** L. Prieto checks that Pablo is in fact declared and approves it in 38 minutes. It is not an override: the agent had already escalated it |

**What this section is for**

> The Human intervention section shows us the queue of everything the agents escalate, who reviews it, how long it takes and how many decisions end up being changed. It lets us prove that the human review is real and that nobody just signs without looking.

**What it is and what it does**

> Each escalated trace enters a queue with its reason, its status and the person reviewing it. Resolving an escalated case is not an override. An override is when a claims handler changes a decision the agent took on its own, for example an automatic approval that goes to review, and it is recorded with its reason.
>
> The panel also measures how the review is done: how long each claims handler takes, what percentage of approvals is signed in under 30 seconds and which claims handlers have the AI training.

**Value**

> The queue proves that a person took the decision, with their name and the time. In the demo, 3.3 % of approvals are signed in under 30 seconds and three claims handlers exceed the 5 % maximum. Two of them do not yet have the AI training, and that is already an open measure.
>
> Also, every override feeds into autonomy: if the claims handlers correct more than 3 % of what the agent decides on its own, the panel proposes lowering its level and a person approves it.

**Regulation and why it matters**

- **GDPR art. 22 and the CJEU SCHUFA judgment (C-634/21, 2023).** An unfavourable decision needs real human intervention, and the Court said that a person who merely validates what the machine proposes does not count. **Risk:** a 10-second review turns the case, for legal purposes, into an automated decision.
- **AI Act art. 4 · AI literacy.** Whoever works with AI systems must have sufficient training. In force since February 2025 for all organisations, whatever the risk of the system. **Risk:** an untrained reviewer cannot detect the agent's error.

**Clicks**

1. KPIs: 3,180 escalated (19 %), override 2.1 %, 2 pending review, express reviews 3.3 %, effective human oversight «Covered».
2. **Oversight mechanisms**: escalation, override and level, kill switch, regulatory control.
3. **Review queue**: the three traces from the batch. Click MSG-A-04: the trace card with L. Prieto's review, who approves it, and the reason. Navigate with › to MSG-A-08 and MSG-A-13 (pending).
4. **Escalations**: the ring of causes (G-02 62 %, G-04 20 %, G-05 11 %).
5. **Review quality**: times by band, 3.3 % of approvals in under 30 seconds and the table by claims handler with their AI training.
6. **Measures**: click M-10 (training for claims handlers).

---

### Step 12 · Fraud: MSG-A-13, MSG-A-09 and MSG-A-02 (min 24-26)

**Screen:** menu → **Fraud**. **Risk** block.

**Key sentence:** «The indicator does not accuse: it prioritises, and the decision is taken by a person.»

| MSG-A-13 · WhatsApp · «Someone got into our house» |
|---|
| «Hi, someone got into our house while we were away these last few days 😡 We got back this morning and everything's turned upside down, the drawers on the floor. They've taken things, no idea how much yet, we're still looking; I think my wife's jewellery and a laptop are missing, but I'm not sure. The jewellery must be worth about €5,000, it was inherited and we don't have invoices. I don't know how they got in, the door looks fine, it hasn't been forced. We took out the insurance only three weeks ago, when we moved. We haven't been to the police yet, I don't know if we need to. I'll send you a list later. Policy HO-604118. I need someone to come today, please, my wife is very upset. Call me on 655 330 219.» |
| **Result:** Home · To review (H4 and H7 breached) · anti-fraud score 90 · scenario EF-01 · SIU queue (G-10) |

| MSG-A-09 · Web form · «Broken window pane» (excerpt) |
|---|
| «The children of the neighbour in 2.º C broke the living room window pane with a ball […]. The glazier, Cristalería Vallecas, has quoted me €400 including fitting […]. For the payment, the account is ES91 2100 0418 4502 0005 1332.» |
| **Result:** Home · Approved · score 50 · under watch · EF-02: the same account appears in MSG-A-02 and in an earlier claim by another account holder · €400 payment withheld (G-11) |

MSG-A-02 (burst pipe, €1,080) asks for payment to that same account: score 35, no signs, but G-11 withholds the payment. MSG-A-11 (scratch in the car park, step 1): score 50, under watch, earlier scratch in the same car park.

**What this section is for**

> The Fraud section scores each message against the fraud patterns the company has already identified and sends the highest-risk cases to the Special Investigations Unit. What we want is to stop the doubtful payment without blocking the customer who has done nothing wrong.

**What it is and what it does**

> To detect those patterns, the platform combines three sources: what the AI understands from the customer's account, with literal quotes from the message; the history of policies, claims and providers; and deterministic rules. With all that, each message gets a score from 0 to 100. Below 40 it is only recorded. Between 40 and 69 it is processed, but the payment is withheld until it is verified. And from 70 upwards the case goes to the SIU.
>
> The history can also subtract: if a piece of data contradicts the sign, that counter-indicator lowers the score. Each case has its card with the breakdown by indicator, the map of relationships with other claims and the follow-up.

**Value**

> No claim is rejected automatically and the customer never sees the sign; if a text addressed to them mentions it, a guardrail blocks it. Risky cases reach the SIU with the card already prepared.
>
> In the demo there is €2,080 withheld and a cap that watches that money so as not to harm legitimate customers. And the 76 % of false positives reminds us why an indicator on its own never decides.

**Regulation and why it matters**

- **GDPR recital 47 · Fraud prevention.** It recognises fraud prevention as a legitimate interest for processing data, as long as it is necessary and proportionate. **Risk:** without a documented legal basis (the panel has it pending with the DPO, measure M-19), the processing of the history can be challenged.
- **GDPR art. 22.** A score cannot reject a claim on its own. **Risk:** a false positive that blocks a payment without human review is an unlawful automated decision and a lost customer. And if one channel gets more alerts than another, like WhatsApp, there is a risk of discriminatory treatment (measure M-18).

**Clicks**

1. The three levels: no signs (0-39), under watch (40-69), SIU (≥ 70).
2. KPIs: 13 analysed, 3 with signs, €2,080 withheld in 3 payments, 80 escalated to the SIU in 14 days, 21 % confirmed, 76 % false positives.
3. **Cases from the batch** → click MSG-A-13: the case card. Score breakdown by indicator (21-day-old policy, vague account, no police report or forced entry, rush, €5,000 of jewellery without an invoice), the message with the quotes highlighted and the follow-up.
4. Navigate with › to MSG-A-09: the shared account. And to MSG-A-04: the **counter-indicator** (Pablo is declared) that lowers its score to 30.
5. **Fraud scenarios** EF-01 to EF-08: open EF-02.
6. **Relationship map**: MSG-A-09 and MSG-A-02 linked by the same account with an August file from another account holder.
7. **Indicator catalogue** → **New indicator**: the preview shows which messages in the batch would trigger it. Close without saving.
8. **Fairness by channel**: WhatsApp gets 1.8 times more alerts because of its tone (measure M-18).

**If asked:** how is a new pattern added? From the catalogue, with «New indicator»: name, weight and the phrases that trigger it, with a preview on the batch before saving it.

---

### Step 13 · Reasoning and replay (min 26-27:30)

**Screen:** menu → **Reasoning and replay**. **Quality** block.

**Key sentence:** «We audit what happened and test before changing anything.»

**Featured:** MSG-A-08 (reasoning) and MSG-A-04 (replay RP-0006).

**What this section is for**

> The Reasoning and replay section shows us how each agent reached its result, and lets us repeat a real trace with another model or another version of the prompt. It lets us test any change with real cases before it reaches the customer.

**What it is and what it does**

> The reasoning is shown agent by agent: what it received, which sentences from the message it used as evidence and what it delivered. Note that this is not the model's internal chain of thought: it is the structured record that each agent returns, with its quotes.
>
> Replay repeats a real trace in two ways. In identical mode it checks that the result can be reproduced. In what-if mode it changes the model or the prompt version and shows us the difference in the decision, the cost and the latency.

**Value**

> Any change of model is tested with real cases before it goes to production. In the demo, moving the Rules agent to gpt-5-mini kept the decision at 82 % less cost; gpt-5-nano, on the other hand, turned an approval into a to review. The replay detects it before the customer does.
>
> And when the auditor arrives and asks why a decision was taken, the answer is here.

**Regulation and why it matters**

- **AI Act art. 15 · Accuracy and robustness.** The system must keep an appropriate level of accuracy throughout its lifetime, also after changes. Good practice in this case. **Risk:** a change of model to save money that silently makes the decisions worse, with nobody noticing until the complaints arrive.
- **GDPR art. 15.** The customer can ask for the logic of the decision. **Risk:** without recorded reasoning, the explanation is improvised and does not match what happened.

**Clicks**

1. In the list, click MSG-A-08. On the right, the chain of agents and the message with the quotes each agent used, in each one's colour.
2. By agent: confidence by line of business (Motor against Health), origin of each extracted field (literal, normalised, inferred or null), rule matrix with the path to the decision and the tokens against CAP-05.
3. Drag the central divider to widen the reasoning.
4. **Replay** → **Identical** mode → run: same decision.
5. **What-if** mode → **Rules model: gpt-5-mini** → run: the diff in line of business, decision, cost and latency.
6. **Replay history**: RP-0006 (MSG-A-04 with gpt-5-mini: same decision, −82 % cost) and RP-0005 (gpt-5-nano changed an Approved to To review).

---

### Step 14 · Knowledge Bases (min 27:30-29)

**Screen:** menu → **Knowledge Bases**. **Quality** block.

**Key sentence:** «Knowledge also degrades, and we watch it just like the agents.»

**Featured:** KB-02 Motor policy terms 2026, which the Rules agent consults for notices such as MSG-A-01 and MSG-A-04, and KB-06 Garage network.

**What this section is for**

> The Knowledge Bases section lets us measure the health of the knowledge the agents consult: the policy terms, the claims handling manual, the provider network or the garage network. It matters because, however good the model is, if it consults an out-of-date document it will decide badly.

**What it is and what it does**

> Each knowledge base is evaluated continuously against a rubric, with metrics such as recall or the queries left unanswered, and each metric has its threshold. The card shows us its configuration, where it is fed from and how often it is synchronised, its versions and a comparison that evaluates different configurations of the same content to choose the best one before applying it.

**Value**

> With old policy terms, the agent may apply an excess or an exclusion that no longer exists. In the demo, the Motor policy terms base has lost 6 points of recall because 340 documents from 2024 slipped in, and adding a validity filter raises it from 0.81 to 0.88.
>
> Also, the change is measured before it is published: the reindexing only goes to production if the rubric does not get worse.

**Regulation and why it matters**

- **AI Act art. 10 · Data and data governance.** The data the system works with must be relevant, up to date and controlled. Good practice in this case. **Risk:** decisions made with repealed policy terms, which the insurer would have to rectify and compensate.
- **GDPR art. 17 · Right to erasure.** If a customer asks for their data to be deleted, it must also be deleted from the search indexes. **Risk:** the claims handling manual has three fragments with real customer data; if they are not removed from the index, the erasure is incomplete.

**Clicks**

1. KPIs: 9 bases (1 real, 8 simulated), 5 healthy, average recall 0.86, 3.27 % of queries with no answer, 6 rubrics with judge-human agreement of 0.93.
2. Click **KB-02 · Motor policy terms 2026** (degraded): **Health** tab, each metric against its threshold; recall drops 6 points.
3. **Source and synchronisation** tab: the 340 documents from the 2024 policy terms that came in through a badly filtered folder.
4. **Comparison** tab: four configurations evaluated with rubric R-02; with a validity filter recall rises from 0.81 to 0.88. **Apply**.
5. **Versions** tab: «Go back to this version».
6. Navigate with › to **KB-06 · Garage network** (critical): the API responds 401 and 14 garages that have left are still listed as approved.
7. **Rubrics** → edit one: the weights must add up to 100 and a new version is saved. Close without saving.

---

### Step 15 · Compliance: the thermometer (min 29-30:30)

**Screen:** menu → **Compliance**. **Compliance and cost** block.

**Key sentence:** «The solution puts the insurer in a position to prove that it complies.»

**Featured:** MSG-A-12 in the personal data inventory.

**What this section is for**

> The Compliance section gives us a regulatory thermometer that lets us understand what level of compliance we are at with respect to the AI Act, the GDPR, DORA, EIOPA and Solvency II, and it is calculated from all the traces the system produces. It tells us how much we can prove today and what we are missing.

**What it is and what it does**

> The controls are grouped by regulation. Some are measured directly in the traces, such as every decision having its complete record. Others are declared with their documentary evidence, such as a provider's exit plan. A matrix tells us, article by article, what the regulation requires, how the solution addresses it and which traces back it up.
>
> We also have the inventory of personal data in each message and the integrity chain of the record: if someone modifies a trace that has already been sealed, the chain breaks from that point and the thermometer turns red.

**Value**

> Coverage tells us how much we can prove today; in the demo, 87 %. The amber controls are the to-do list, and they are real, such as the pending impact assessment or the AI notice missing on WhatsApp. The panel does not dress anything up.
>
> A tampered record is detected at once, and that is why an auditor can trust the history. It is not a certificate, but it is the evidence the DPO needs, recalculated with every trace.

**Regulation and why it matters**

- **GDPR art. 35 · Data protection impact assessment (DPIA).** Mandatory when health data is processed on a large scale with new technology. **Risk:** processing without an up-to-date DPIA is an infringement in itself, even if there is no incident.
- **AI Act art. 50 · Transparency towards the customer.** Whoever talks to an AI must know it. **Risk:** on WhatsApp the notice is pending; a customer who did not know an AI was serving them can complain.
- **Record integrity (AI Act art. 12, GDPR art. 32).** **Risk:** a record that can be altered without leaving a trace is worthless as evidence.

**Clicks**

1. Header: 87 % coverage, 26 controls covered and 9 partial, 14 measured in the traces and 21 declared.
2. The four thermometers: AI Act 86 %, GDPR 87 %, DORA 100 %, EIOPA and Solvency II 80 %. Click one to filter the matrix.
3. **Regulation → control matrix**: **Only partial** filter. Point out the DPIA (GDPR art. 35) and the AI notice on WhatsApp (AI Act art. 50).
4. **Life cycle of a trace**: the eight steps with their regulation and their time limit.
5. **Personal data inventory** → click MSG-A-12: the text with the data highlighted and its `_gobernanza` block.
6. **Record integrity** → **Simulate a tampering**: the chain breaks and the thermometer turns red. Undo.
7. **Export compliance evidence** (optional).

**If asked:** is triage high risk under the AI Act? No. Annex III only includes pricing and risk assessment in Life and Health. We apply articles 9 to 15 as good practice.

---

### Step 16 · FinOps (min 30:30-32)

**Screen:** menu → **FinOps**. **Compliance and cost** block.

**Key sentence:** «What we do not want is the cheapest model; we want the cheapest model that gives us the highest quality.»

**Featured:** the Rules agent and the trace for MSG-A-08.

**What this section is for**

> The FinOps section lets us control spending by the second and through actions. Enterprise AI service providers tell us how much we have spent every 8 hours, and a lot can happen in that time: we can wake up in the morning to spending we did not want. Here we see how much we spend by agent, by model and by token type as it happens, and the caps act on their own as soon as they are exceeded.

**What it is and what it does**

> Every decision adds its cost the moment it happens, because the trace records each agent's tokens and the platform multiplies them by the price of its model. The caps work on that cost: per agent, global, per message and for reasoning tokens. Each cap has an action attached. When one is exceeded, the alert explains what happened, what the system did automatically, for example switching to a cheaper model until midnight without stopping the service, and what action it suggests.
>
> Spending is broken down by token type to understand where it comes from. And a table crosses the cost and quality of each model: how much it costs and how often it returns a valid response, without retries and stable on replay.

**Value**

> We do not wait 8 hours for the provider to tell us what happened: the cap acts on the same message that exceeds it. In the demo, the Rules agent went over its cap and the system changed model on its own, without stopping the service. Spending for the month is at €296 of €500, with a projection of €428, and there are no surprises on the bill.
>
> And we know exactly where to act: the Rules agent takes 80 % of the spending and, within it, what weighs most is the text gpt-5 generates. The recommendations tell us how much each lever saves.

**Regulation and why it matters**

- **Solvency II art. 41 · System of governance.** The insurer must have sound and prudent management of its business, with control of its operational risks. **Risk:** AI spending that grows without control is an unmanaged operational risk, and the supervisor can point it out in its review of the system of governance.

**Clicks**

1. KPIs: today's cost €17.33 (87 % of the €20 daily cap), monthly cost €296.40 of €500 with a projection of €428, 3 caps exceeded, €0.0128 per message. Click **Monthly cost**: the window with the detail.
2. **How each agent's spending is going**: the Rules row in red (€13.70 / €12, 80 % of the total).
3. **Where the money goes and why**: in Rules, the gpt-5 output is 63 % of its cost. **€ / %** button.
4. **Cost alerts**: CAP-03 (what it did on its own: downgrade to gpt-5-mini until 00:00) and CAP-04/CAP-05 on MSG-A-08.
5. **Configured caps** → click **CAP-03**: the card with the agents involved and the history of breaches. **New cap** (optional, close without saving).
6. **Models**: price, calls, tokens, cost, p95 and quality (valid JSON, no retry, stable on replay, accuracy). Click a chart legend to hide a series.
7. **Recommendations**: R-01 to R-04.

---

### Step 17 · Corrective measures (min 32-33:30)

**Screen:** menu → **Corrective measures**. **Improvement and audit** block.

**Key sentence:** «Cost under control and every problem with its owner.»

**Featured:** M-01 (comes from the replay of MSG-A-04), M-02 (comes from the trace for MSG-A-08) and M-10.

**What this section is for**

> The Corrective measures section brings together in a single list the problems the rest of the panel detects, each with its alternatives, its savings and who has to approve them. What we want is for every problem to have an owner, an alternative and a check.

**What it is and what it does**

> The list covers cost, knowledge, compliance, quality and resilience. Each problem comes from another section of the panel and brings several alternatives, with the recommended one marked: its impact, its side effect, the effort, who approves it and how it is validated before being applied.
>
> From here we can simulate an alternative, apply it or request approval, and undo it if necessary. When a measure is verified, the compliance thermometer updates on its own.

**Value**

> Every saving is backed by evidence. In the demo, the measure that moves the simple cases to gpt-5-mini is validated with a replay that did not change any decision, and when it is applied the savings achieved rise by €237 a month.
>
> Whatever needs approval waits for the AI Committee, and everything is recorded.

**Regulation and why it matters**

- **AI Act art. 9 · Continuous risk management.** The risks detected must have measures and follow-up. **Risk:** a problem that has been detected and has no owner weighs more in an inspection than an unknown one, because it shows it was known.
- **GDPR art. 5.2.** **Risk:** without a record of what was corrected and who approved it, diligence cannot be proved.

**Clicks**

1. KPIs: 19 open measures (2 critical), **savings achieved €0/month out of a possible €278**, 9 regulatory risks, 4 knowledge bases to clean up. The thermometer circle at the top right.
2. Filters: **Cost** and **Quick wins**. Remove.
3. Card **M-01 · Rules exceeds its daily cap**: three alternatives, the recommended one «Use gpt-5-mini for straightforward approvals» (−€237/month, validated with replay RP-0006). Click the card: the card with the alternatives side by side.
4. **Simulate** → **Apply**: the savings achieved rise to €237/month.
5. **M-02 · Cost and reasoning on MSG-A-08** → **Request approval**: it is left «Pending with the AI Committee» (€41 pending).
6. **Undo** on M-01: the savings go back to zero. Apply it again.
7. Click the thermometer circle (takes you to Compliance) or M-10 (training for claims handlers).

---

### Step 18 · History (min 33:30-34)

**Screen:** menu → **History**. **Improvement and audit** block.

**Key sentence:** «This is the logbook the regulator asks for, and it fills itself in.»

**What this section is for**

> The History is the timeline of everything that has changed in the system, with its author and time. It works as a logbook for any auditor, and nobody has to fill it in by hand.

**What it is and what it does**

> It records every action with its user and time: paused agents, guardrails turned on or off, measures applied or undone, reviews, overrides, changes of model, prompt and level, and incidents. It can be filtered by event type.

**Value**

> An auditor can see every change with its author and date, and nobody has to reconstruct what happened from emails. Everything we have touched during this demo is already here.

**Regulation and why it matters**

- **GDPR art. 5.2 and AI Act art. 12.** It must be possible to prove who changed what and when. **Risk:** without traceability of changes, an error cannot be attributed or corrected at the root, and the insurer cannot prove it acted with diligence.

**Clicks**

1. The timeline: at the top, what has been done in the demo with the user «Operator (this session)»: the Extraction kill switch, M-01 applied and undone, M-02 pending, the configuration applied to KB-02.
2. Type chips: **Operations**, **Policies**, **Overrides** (those by J. Herrera and S. Gil on 15/09, the day Rules went down a level), **Reviews** (L. Prieto's on MSG-A-04), **Deployments** (changes of model and prompt), **Incidents** (the burst of 429 errors).

---

## 7. Wrap-up (min 34-35)

**Screen:** `gobierno.html` → **History**.

**Key sentence:** «What makes AI reach production and stay there is governance.»

> We have seen 13 notices come in through five different channels. 10 were approved on their own and 3 went to a person, each with its reason and the customer's sentence that justifies it. We have also seen a case that goes to the SIU and three payments withheld without blocking anyone.
>
> And around all that, governance: agents with their autonomy level, their permissions and their owner; guardrails that make the insurer's rules take precedence over the model; a budget that is controlled every day; and a trace for each decision that lets us prove how it was decided.
>
> AI to classify messages is already within your reach. What makes it reach production and stay there is this.
>
> And it is not an idea on paper: it is what Logicalis is implementing for customers in different industries, adapted to each one's processes, rules and regulations.

---

## Annex A · The 13 messages in Package A

| Message | Channel | Subject | Line of business | Decision | Reason | Fraud | Step |
|---|---|---|---|---|---|---|---|
| MSG-A-01 | Email | Minor knock on the M-30 | Motor | Approved | Minor collision with an accident statement, nobody injured, €1,350 | — | 3, 14 |
| MSG-A-02 | Web | Burst pipe under the sink | Home | Approved | Sudden water damage, €1,080 | 35 · payment withheld (G-11) | 12 |
| MSG-A-03 | Chat | A&E for a sprain | Health | Approved | A&E at a hospital in the network | — | — |
| MSG-A-04 | Email | Damage to the car in a car park | Motor | To review → Approved (review by L. Prieto) | A3: driver not declared; L. Prieto checks that he is | 30 · counter-indicator | 11, 12, 13 |
| MSG-A-05 | Web | Power surge | Home | Approved | Acknowledged electrical damage, €640 | — | — |
| MSG-A-06 | Email | X-ray and blood test prescribed | Health | Approved | Basic tests without prior authorisation | — | — |
| MSG-A-07 | Chat | Windscreen broken by gravel | Motor | Approved | Windscreen at an approved garage, €280 | — | — |
| MSG-A-08 | Phone | Motorbike accident with hospital admission | Motor | To review | A5 and G-04: injured person in hospital and a third party | — | 1, 4, 6, 8, 10, 13, 16, 17 |
| MSG-A-09 | Web | Broken window pane | Home | Approved | €400 window pane with photo and estimate | 50 · under watch · shared account | 12 |
| MSG-A-10 | Email | A&E for an asthma attack | Health | Approved | A&E at a hospital in the network; 429 error with retry | — | 8 |
| MSG-A-11 | WhatsApp | Scratch on the door in a car park | Motor | Approved | Vandalism with a police report, €600 | 50 · under watch · earlier scratch | 1, 12 |
| MSG-A-12 | WhatsApp | Son in A&E after a scooter fall | Health | Approved | Paediatric A&E; data about a minor and health data | — | 5, 15 |
| MSG-A-13 | WhatsApp | Someone got into our house | Home | To review | H4 and H7: no police report or forced entry, jewellery without an invoice, 3-week-old policy | 90 · SIU (G-10) | 2, 11, 12 |

## Annex B · Cheat sheet of figures

| Topic | Figure | Where it shows |
|---|---|---|
| Batch | 13 notices · 10 approved · 3 to review | Triage |
| Effective autonomy (14 days) | 81 % · 13,540 of 16,720 | Summary, Autonomy |
| Escalated to a person | 19 % · 3,180 · G-02 62 %, G-04 20 %, G-05 11 % | Human intervention |
| Override | 2.1 % · target ≤ 3 % · Rules dropped to L2 at 4.1 % | Autonomy |
| Express reviews | 3.3 % in under 30 s · maximum 5 % | Human intervention |
| Guardrails | 11 of 12 active · 454 triggers · G-02 with 118 | Guardrails |
| Monthly cost | €296.40 of €500 · projection €428 | FinOps |
| Active alerts | 11 · 3 critical · cost 3, fraud 3, knowledge bases 3, compliance 2 | Summary |
| Rules agent | €13.70 of €12 today · 80 % of spending · €0.011/msg with gpt-5 | FinOps, Agents |
| Most expensive trace | MSG-A-08 · €0.062 · 2,610 reasoning tokens | Traceability |
| Replay RP-0006 | gpt-5-mini in Rules · same decision · −82 % cost | Reasoning and replay |
| M-01 saving | €237/month (€278/month with M-02) | Corrective measures |
| Fraud | 3 with signs · 1 with the SIU · €2,080 withheld · 76 % false positives | Fraud |
| Knowledge Bases | 5 of 9 healthy · KB-02 −6 points of recall · comparison 0.81 → 0.88 | Knowledge Bases |
| Compliance | 87 % · 26 covered · 9 partial · DORA 100 % | Compliance |

## Annex C · Nuances to stay out of trouble

- **Triage is not high risk under the AI Act.** Annex III 5(c) covers pricing and risk assessment in Life and Health. The high-risk obligations were postponed to 2 December 2027. Today's argument is GDPR, DORA and EIOPA; the AI Act is applied as good practice.
- **Do not say «there is nothing like it on the market».** There are model observability tools and GRC platforms. What does not exist is governance tied to each insurer's process, rules and costs: that is implementation.
- **Market figures.** Verified: 11 M and one every 3 s (UNESPA), over 90 % of insurers trying out AI (Conning), over 40 % of agentic projects cancelled (Gartner). The 10 % of the premium is a US figure. Unverified and left out of the script: the 4 % of agents in production and McKinsey's 25-30 % saving.
- **Demo data.** Made up and consistent with Package A. The changes made on the panel are simulated and are lost when the tab is closed.
- **Fraud.** Always talk about «signs» and a «compatible pattern». Never about «fraud» or «rejection» when referring to a specific case.

## Annex D · 20-minute version

| Remove or shorten | Saving |
|---|---|
| Intro: in The solution, keep 2.1, 2.2, 2.3 and one sentence per idea from 2.4 | 2 min |
| Step 3 (record of MSG-A-01): show only the Attachments tab and leave the evidence for step 4 | 1 min |
| Entering the panel (6.0) and «What this section is for»: read only the first sentence | 1.5 min |
| Merge Autonomy and Guardrails (steps 9 and 10) into 1.5 min | 1 min |
| Step 14 (Knowledge Bases): only the KB-02 comparison | 1 min |
| Step 15 (Compliance): only «Simulate a tampering» | 1 min |
| Step 18 (History) within the wrap-up | 0.5 min |
