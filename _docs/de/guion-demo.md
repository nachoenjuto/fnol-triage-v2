# Demo-Leitfaden · FNOL-Triage mit gesteuerten Agenten

Leitfaden Schritt für Schritt für eine Sitzung von 30-35 Minuten: Einführung in den vier Abschnitten von `intro.html` und Demo mit Paket A (13 Meldungen) in `index.html` und `gobierno.html`. Grundlage: [guia-demo.md](guia-demo.md) und der Demo-Rundgang (`data/recorrido.js`).

**So liest man diesen Leitfaden**

- Die zitierten Absätze (mit dem Balken links) sind der **Text zum Vorlesen**. In der Word-Version erscheinen sie in Grün.
- Der Rest sind Hinweise für den Präsentierenden: was zu öffnen ist, wo zu klicken ist und worauf zu achten ist.
- Jeder Schritt folgt derselben Reihenfolge: Kernsatz, Meldung aus Paket A, **Wozu dieser Bereich dient** (im Governance-Teil), **Was es ist und was es tut** (technisch und funktional), **Nutzen** (für das Geschäft und für die Person, die es nutzt), **Vorschriften und warum sie wichtig sind** (was sie sagen und welches Risiko besteht) und am Ende die **Klicks**. Erst erzählen, dann zeigen.
- Die Zahlen stammen aus der Demo. Die Daten des Panels sind Demonstrationsdaten, stimmig mit Paket A.

---

## 0. Vor dem Start

**Vorbereitung (5 Minuten vorher)**

1. Die Demo bereitstellen (`make run`) und `intro.html` öffnen.
2. In einem zweiten Tab `index.html` öffnen. Im Seitenmenü **Einstellungen → Triage-Engine → Gespeicherte Ergebnisse** (hängt nicht vom Netz ab) und **Meldungspaket → Paket A**. Prüfen, dass «Vor dem Senden an das Modell pseudonymisieren» eingeschaltet ist.
3. Den Stapel noch nicht verarbeiten: Das geschieht live in Schritt 2.
4. Wer Screenshots machen will, hängt `?fecha=2026-09-17` an die URL an. Ohne diesen Parameter werden die Daten in den Meldungen auf heute verschoben.
5. Optional: Auf der Startseite des Panels den **Präsentationsmodus** einschalten (Passwort `password`), um den Rundgang mit seiner Schaltfläche «Aufrufen» griffbereit zu haben.

**Zeiten**

| Min. | Block | Bildschirm |
|---|---|---|
| 0-1 | 1. Das Problem | `intro.html` · Das Problem |
| 1-3 | 2. Die Lösung | `intro.html` · Die Lösung |
| 3-4 | 3. Die Akteure | `intro.html` · Die Akteure |
| 4-5 | 4. Die Demo | `intro.html` · Die Demo |
| 5-14 | 5. Teil 1 · Triage (Schritte 1-5) | `index.html` |
| 14-15 | 6.0 Eintritt in das Governance-Panel | `gobierno.html` · Start |
| 15-34 | 6. Teil 2 · Governance (Schritte 6-18) | `gobierno.html` |
| 34-35 | 7. Abschluss | `gobierno.html` · Historie |

---

## 1. Das Problem: FNOL, ein kritischer Prozess, und KI-Governance (≈1 Min.)

**Bildschirm:** `intro.html` · Das Problem.

**Kernsatz:** «Die erste Meldung entscheidet viel über den weiteren Verlauf des Schadens, und die KI, die sie automatisiert, muss unter Kontrolle sein.»

> Bevor wir anfangen, möchte ich klären, worüber wir sprechen. In Spanien werden laut UNESPA jedes Jahr rund 11 Millionen Kfz-Schäden gemeldet; das ist einer alle drei Sekunden. Und alle beginnen gleich: mit einer ersten Meldung des Kunden.
>
> Diese Meldung erreicht uns über fünf Kanäle gleichzeitig. Es kann eine lange E-Mail mit Anhängen sein, ein Webformular, ein Chat, ein Anruf, den jemand transkribieren muss, oder eine WhatsApp, in Eile geschrieben und voller Emojis. Und ab diesem Moment läuft die Uhr, denn das spanische Versicherungsvertragsgesetz gibt in Artikel 16 sieben Tage für die Schadenmeldung.
>
> Bei FNOL entscheidet sich viel von dem, was danach passiert. Wird die Sparte falsch zugeordnet, wandert die Akte zwischen den Teams hin und her. Fehlt eine Angabe, muss jemand den Kunden zurückrufen. Rutscht uns hier ein Betrugshinweis durch, ist er später viel schwerer zu finden. Und es ist auch der erste Kontakt des Kunden mit seinem Versicherer, meist an einem schlechten Tag.
>
> Heute erledigt diese ganze Arbeit ein Mensch: Er liest die Meldung, ordnet sie zu und tippt die Daten ins System. Damit Sie eine Vorstellung vom Gewicht bekommen: In den Vereinigten Staaten macht die Schadenbearbeitung rund 10 % der Kfz-Prämie aus. Dorthin gehen unsere Zeit und unser Geld.
>
> Und es gibt ein zweites Problem. Sobald wir KI in einen solchen Prozess bringen, müssen wir sie aus vielen Blickwinkeln kontrollieren: wie viel Autonomie wir den Agenten geben, ob die Wissensdatenbanken, die sie nutzen, gesund sind, ob wir die Vorschriften einhalten und was uns jede Entscheidung kostet.
>
> Eine Meldung mit KI zuzuordnen, hebt niemanden mehr ab; mit einem guten Prompt erreicht man über 90 % Genauigkeit. Die eigentliche Herausforderung ist der Schritt vom Piloten in die Produktion. Gartner schätzt, dass mehr als 40 % der Projekte mit agentischer KI vor Ende 2027 eingestellt werden, wegen der Kosten, eines unklaren Nutzens oder unkontrollierter Risiken. Das heißt: Projekte scheitern nicht, weil die KI versagt. Sie scheitern, weil niemand drei Fragen beantworten kann: warum sie so entschieden hat, wer sie kontrolliert und was sie kostet.

**Hinweise**

- Quellen: UNESPA (11 Mio. und «einer alle 3 s»); LCS art. 16 (7 Tage); III mit Daten der NAIC (~10 % der Kfz-Prämie in den USA, 2023). Für Spanien gibt es keine vergleichbare öffentliche Zahl: Das sagen, falls gefragt wird.
- Nicht die «4 % der Agenten in Produktion» oder die Ersparnis von 25-30 % von McKinsey verwenden: Sie sind in der Originalquelle nicht belegt.

---

## 2. Die Lösung: eine integrierte Mehrkanal-Plattform, orchestriert von 4 Agenten und mit guter KI-Governance (≈2 Min.)

**Bildschirm:** `intro.html` · Die Lösung, Block für Block von oben nach unten.

**Kernsatz:** «Wir automatisieren den ersten Kontakt, mit der KI unter Kontrolle.»

### 2.1 Woher diese Plattform kommt

**Bildschirm:** Block «Was wir bei der Einführung von KI-Governance gelernt haben».

> Bevor wir ins Detail gehen, ein wichtiger Punkt. Was wir Ihnen zeigen, ist ein Beispiel für die Erfahrung von Logicalis bei der Einführung von Lösungen für KI-Governance und -Observability bei Kunden aus verschiedenen Branchen. Wir haben in einem einzigen Fall vieles zusammengeführt, was wir in verschiedenen Projekten umgesetzt haben.
>
> Die Branche ändert sich, das Ziel bleibt immer dasselbe: Kontrolle haben, um bessere Ergebnisse zu erzielen, den Kunden besser zu bedienen, die Ausgaben zu steuern und die Vorschriften einzuhalten. Heute sehen wir es angewandt auf die erste Schadenmeldung.

### 2.2 Was sie tut

> Was wir Ihnen heute zeigen, ist eine integrierte Plattform, die diesen ersten Kontakt automatisiert. Wir haben vier KI-Agenten, die die Meldung über jeden Kanal empfangen, entscheiden, zu welcher Sparte sie gehört, die Daten extrahieren und die Geschäftsregeln des Versicherers anwenden. Der Sachbearbeiter erhält die Meldung bereits zugeordnet, mit extrahierten Daten und einem Vorschlag: freigegeben oder zu prüfen.
>
> Der Stapel, den wir verarbeiten, enthält 13 Meldungen. 10 werden selbstständig freigegeben und 3 gehen an einen Menschen, jede mit ihrem Grund und mit dem Satz des Kunden, der ihn belegt.
>
> Und so sieht das Governance-Panel in den letzten 14 Tagen aus: 16.720 verarbeitete Meldungen, 81 % effektive Autonomie, 19 % an einen Menschen eskaliert und nur 2,1 % der Entscheidungen von einem Sachbearbeiter korrigiert. Daneben die Kosten des Zeitraums, die aktiven Warnungen, die Compliance und der Zustand der Wissensdatenbanken.

### 2.3 Die vier Agenten

| Agent | Was sie tut | Modell | Autonomie |
|---|---|---|---|
| Mehrkanal | Empfängt die Meldung über die fünf Kanäle und bringt sie in ein einziges Format; transkribiert die Anrufe | gpt-5-nano + Sprache zu Text | L3 · Autonom |
| Spartenzuordnung | Ordnet Kfz, Hausrat oder Gesundheit zu und zitiert die Signale im Text | gpt-5-nano | L3 · Autonom |
| Datenextraktion | Macht aus dem Freitext 10 Felder; fehlt eine Angabe, bleibt sie leer | gpt-5-mini | L2 · Überwacht |
| Geschäftsregeln | Wendet die 25 Regeln für Kfz, Hausrat und Gesundheit an und schlägt Freigegeben oder Zu prüfen vor | gpt-5 | L2 · Überwacht |

> Die Idee ist, vier kleine Spezialisten zu haben statt einer einzigen KI, die alles macht. Jeder hat sein eigenes Modell, seine Prompt-Version, seinen Verantwortlichen und seine eigenen Caps. Und das teuerste Modell setzen wir nur dort ein, wo wirklich Reasoning nötig ist, also bei den Geschäftsregeln.

### 2.4 Nachvollziehbarkeit, die Grundlage der Governance

Fünf Ideen, eine pro Block der Seite:

**Nachvollziehbarkeit: die Grundlage von allem**

> Die Grundlage von allem ist die Nachvollziehbarkeit. Jede Entscheidung hinterlässt eine Spur: was hereinkam, was jeder Agent getan hat, mit welchem Modell, wie viele Tokens er verbraucht hat, was es gekostet hat und was er entschieden hat. Die KI-Anbieter bieten bereits technische Spuren an, und sie sind nötig, aber sie verstehen nicht, was eine Sparte, ein Selbstbehalt oder eine Frist von sieben Tagen ist. Diese Lösung verbindet beide Welten, die technische Spur und den Geschäftsprozess des Versicherers, um jeder Gesellschaft eine passende Antwort zu geben. Und auf dieser Spur bauen wir alles andere auf: Kontrolle von Autonomie und Ausgaben, Audit und Replay.

**Autonomie und Reife der Agenten**

> Jeder Agent hat eine Autonomiestufe, von L0, wo er nur vorschlägt, bis L3, wo er entscheidet und handelt. Diese Autonomie wird mit Daten verdient und mit Daten verloren. Als die Sachbearbeiter begannen, mehr als 3 % der Entscheidungen des Agenten Regeln zu korrigieren, fiel der Agent von L3 auf L2, mit Begründung und dem Namen dessen, der es genehmigt hat. Heute laufen 81 % der Entscheidungen ohne menschliches Eingreifen durch, und diesen Anteil unter Kontrolle zu halten, ist das, was es wirklich heißt, dass die Automatisierung funktioniert.

**Ausgaben unter Kontrolle**

> Wir steuern die Ausgaben sekundengenau und über Aktionen. Die Anbieter von KI-Diensten für Unternehmen sagen Ihnen alle 8 Stunden, wie viel Sie ausgegeben haben, und in 8 Stunden kann viel passieren: Ein Agent in einer Schleife oder eine Spitze an Meldungen kann dazu führen, dass wir morgens mit Ausgaben aufwachen, die wir nicht wollten. Hier addiert jede Entscheidung ihre Kosten in dem Moment, in dem sie entsteht, und jeder Agent hat seine Caps. Wird eines überschritten, handelt das System selbst: Es wechselt zum Beispiel auf ein günstigeres Modell und vermerkt das in jeder Spur, ohne den Dienst anzuhalten.

**Betrug**

> Beim Betrug kombiniert die Plattform, was die KI aus der Schilderung des Kunden versteht, mit der Historie von Policen und Schäden und mit deterministischen Regeln. Damit erkennt sie die Betrugsmuster, die die Gesellschaft schon kennt: eine gerade abgeschlossene Police, ein Zahlungskonto, das sich bei verschiedenen Versicherungsnehmern wiederholt, oder ein Diebstahl ohne Anzeige. Und etwas Wichtiges: Der Indikator beschuldigt nicht, er priorisiert. Die Entscheidung trifft immer ein Mensch.

**Nachweisbare Compliance**

> Die DSGVO, DORA und die Stellungnahme der EIOPA zur KI gelten bereits. Der AI Act kommt später, und die Triage gilt nicht als Hochrisiko, aber wir wenden seine Artikel als gute Praxis an. Jede Entscheidung trägt ihren Compliance-Nachweis: welche personenbezogenen Daten es gab, warum so entschieden wurde und ob ein Mensch sie geprüft hat.

---

## 3. Die Akteure: der Sachbearbeiter und die Teams von IT, Finanzen, Compliance usw. (≈1 Min.)

**Bildschirm:** `intro.html` · Die Akteure.

**Kernsatz:** «Zwei Akteure, zwei Bildschirme: der Sachbearbeiter und wer die KI steuert.»

> In der Demo sehen wir zwei Arten von Nutzern. Auf der einen Seite der FNOL-Sachbearbeiter, der auf dem Triage-Bildschirm arbeitet. Es ist eine sehr schnelle Oberfläche: Er sieht das Detail jeder Meldung, wie und warum sie zugeordnet wurde, warum die KI jede Entscheidung getroffen hat und die Betrugshinweise, mit dem Satz des Kunden, der sie belegt. So verwendet er seine Zeit auf die Fälle, die Urteilsvermögen brauchen.
>
> Auf der anderen Seite die Teams, die die KI steuern: IT, Finanzen, Compliance, Risiko, Audit oder der DSB, die im Governance-Panel arbeiten. Von dort sehen sie, ob die Agenten gut entscheiden, mit welchem Wissen, was sie kosten und ob der Versicherer nachweisen kann, dass er die Vorschriften einhält.

---

## 4. Die Demo: ein Weg vom Eingang einer Meldung bis zum Governance-Panel (≈1 Min.)

**Bildschirm:** `intro.html` · Die Demo.

**Kernsatz:** «Wir begleiten eine Meldung von Anfang bis Ende und sehen alles, was die KI hinterlässt.»

> Die Demo ist ein Weg. Er beginnt mit dem Eingang einer Meldung, geht weiter mit ihrer Analyse durch die Agenten und der Prüfung durch den Sachbearbeiter und führt über die Belege, die die KI zu jeder Entscheidung hinterlässt.
>
> Und er endet im Governance-Panel, wo wir verstehen werden, welche Agenten beteiligt waren, was sie wie getan haben, welche Caps sie hatten, welches Reasoning dahintersteht, welches Wissen sie genutzt haben, wie konform die Lösung ist, wann sie Geld ausgibt und warum, und wie wir all das verbessern können.

**Übergang zur Demo**

> Schauen wir es uns an. Zuerst zeige ich Ihnen, was der Sachbearbeiter sieht, und dann, was diejenigen sehen, die die KI steuern: der Verantwortliche der Agenten, der Auditor und der CFO.

**Klick:** Schaltfläche «Demo starten» → `index.html`.

---

## 5. Teil 1 · Triage

### Schritt 1 · Die sechs Phasen und die fünf Kanäle (Min. 5-6:30)

**Bildschirm:** `index.html`, Leiste der nummerierten Phasen unter dem Kopfbereich.

**Kernsatz:** «So funktioniert der Prozess von Anfang bis Ende.»

**Hervorgehobene Meldungen:** MSG-A-11 (WhatsApp) und MSG-A-08 (transkribierter Anruf).

| MSG-A-11 · WhatsApp · «Kratzer an der Tür auf einem Parkplatz» |
|---|
| «Hallo!! ich schreib euch hier, weil ich mit der App nicht klarkomme 😅 Gestern nachmittags hat mir auf dem Parkplatz vom Carrefour in Alcobendas jemand mit einem Schlüssel oder so die ganze Fahrertür zerkratzt und ist ohne Zettel abgehauen 😩 Der Wachmann sagt, die Kameras erfassen diesen Bereich nicht. Ich habe Fotos und heute Morgen Anzeige bei der Polizeiwache Alcobendas erstattet, sie haben mir die Aktennummer 18734/26 gegeben. Es ist der weiße Peugeot 2008 2290 LKV, Police AU-742210. Die Werkstatt neben meinem Haus sagt etwa 600 € für die ganze Tür lackieren. So was Ähnliches ist mir vor ein paar Monaten auf genau diesem Parkplatz schon mal passiert 🙄 Was mach ich jetzt?? Ich kann euch die Fotos hier schicken, wenn ihr wollt 📸 Meine Ausweisnummer ist 53442872-A 🙏» |
| **Ergebnis:** Kfz · Freigegeben · 600 € · Beobachtung durch die Betrugsbekämpfung (Schritt 12) |

| MSG-A-08 · Telefon (Transkript) · «Motorradunfall mit Krankenhausaufenthalt» |
|---|
| «Ich rufe im Namen meines Mannes Carlos Ortega Ruiz an, der sein Motorrad bei Ihnen versichert hat (Honda CB500, Kennzeichen 6620 KXS, Police AU-662371) und auch die Krankenversicherung (SA-662371). Heute Nachmittag um 19 Uhr hat ihm ein Auto in einem Kreisverkehr in Alcorcón die Vorfahrt genommen, dem an der Avenida de Leganés Ecke Calle Porto Cristo, und er ist gestürzt. Er liegt im Hospital Fundación Alcorcón mit gebrochenem Schlüsselbein und zwei gebrochenen Rippen; sie sagen, dass sie das Schlüsselbein morgen operieren müssen. Die Guardia Civil hat ein Protokoll aufgenommen, die Nummer ist 2026-001873-AL, und das Auto gehört einem anderen Fahrer, der geblieben ist und seine Daten angegeben hat: Es ist ein Opel Astra 9012 JHN. Das Motorrad steht auf dem städtischen Abstellplatz, ziemlich kaputt. Mein Mann ist 47 und Diabetiker, falls das für die Operation wichtig ist. Ich weiß nicht, ob das über das Motorrad oder über die Krankenversicherung läuft, bitte rufen Sie mich unter dieser Nummer an, 655 201 877.» |
| **Ergebnis:** Kfz · Zu prüfen · Verletzter im Krankenhaus und beteiligter Dritter (Schritte 4, 8 und 10) |

**Was es ist und was es tut**

> Hier sehen Sie die sechs Phasen des Prozesses. Die ersten vier sind die KI-Agenten, die in einer Kette arbeiten: Mehrkanal-Eingang, der die Meldung über jeden Kanal empfängt und in ein einziges Format bringt; Spartenzuordnung; Datenextraktion; und die Anwendung der Geschäftsregeln für Kfz, Hausrat und Gesundheit. Die letzten beiden, Nachvollziehbarkeit und Automatisierung, schließen den Kreis: Sie protokollieren alles, was passiert, und machen aus der Entscheidung einen Arbeitsablauf.
>
> Jede Phase hat ihre Karte, die erklärt, was sie empfängt, was sie liefert und ob ein KI-Modell oder eine Geschäftsregel sie übernimmt.

**Nutzen**

> Für den Versicherer bedeutet das, dass eine Meldung per WhatsApp genau nach denselben Kriterien behandelt wird wie eine per E-Mail. Der Kunde wählt den Kanal, der ihm am besten passt, und die Gesellschaft verliert keine Nachvollziehbarkeit. Beim Sachbearbeiter kommt die Meldung bereits zugeordnet an, mit extrahierten Daten und einem Entscheidungsvorschlag, und er weiß, dass hinter jedem Agenten ein benannter Verantwortlicher steht.
>
> Außerdem sind diese Karten genau die Dokumentation, die ein Auditor verlangt, bevor er ein KI-System abnimmt.

**Vorschriften und warum sie wichtig sind**

- **Stellungnahme der EIOPA zu Governance und Risikomanagement von KI in der Versicherung (2025).** Sie verlangt von den Versicherern, jedem KI-System Verantwortliche, Dokumentation, Nachvollziehbarkeit und menschliche Aufsicht zu geben, im Verhältnis zu seinem Risiko. **Risiko:** Bei einer Prüfung fällt ein System ohne Dokumentation oder Verantwortlichen aus dem Governance-System des Unternehmens heraus, und die Aufsicht kann verlangen, dass es korrigiert oder angehalten wird.

**Klicks**

1. Auf **1 · Mehrkanal** klicken: die aufklappende Karte mit den fünf Kanälen und ihrer Vereinheitlichung in ein einziges Format.
2. Auf **2 · Spartenzuordnung**, **3 · Datenextraktion** und **4 · Geschäftsregeln** klicken: auf jeder Karte unten das Etikett «Generative KI» oder «Geschäftslogik».
3. Auf **5 · Nachvollziehbarkeit** und **6 · Automatisierung** klicken.
4. Seitenmenü → **Meldungspaket**: die Liste der 13 mit dem Symbol ihres Kanals. Auf MSG-A-11 (WhatsApp) und MSG-A-08 (Telefon) hinweisen.

**Falls gefragt wird:** Und Anhänge oder Audio? Der Anruf wird mit einem Sprache-zu-Text-Modell transkribiert. Anhänge werden mit ihrem Fingerabdruck protokolliert, und ihre Daten werden mit dem Text abgeglichen: Wir sehen es in der Akte von MSG-A-01, die mit dem Unfallbericht und zwei Fotos kommt. Der Guardrail G-09 kann Transkripte mit geringer Konfidenz an einen Menschen eskalieren.

---

### Schritt 2 · Verarbeitung von Paket A (Min. 6:30-8:30)

**Bildschirm:** `index.html`, Hauptbereich.

**Kernsatz:** «In Sekunden wissen wir, was freigegeben ist und was ein Mensch prüfen muss.»

**Hervorgehobene Meldungen:** die 13 aus Paket A (siehe Anhang A).

**Was es ist und was es tut**

> Bei der Verarbeitung des Pakets durchläuft jede Meldung die vier Agenten und kommt mit ihrer Sparte, ihren Daten und ihrer Entscheidung heraus. Die Zähler für Freigegebene, zu prüfende Fälle und durchschnittliche Zeit aktualisieren sich live, und der Stapel lässt sich jederzeit anhalten, ohne dass etwas verloren geht.
>
> Gleichzeitig hinterlässt jede Meldung sofort ihre Spur: das Modell, das jeder Agent genutzt hat, die Tokens, die Kosten in Euro und die Entscheidung.

**Nutzen**

> So kann der Sachbearbeiter seine Zeit auf die Fälle verwenden, die wirklich Urteilsvermögen brauchen, statt die anderen abzutippen. In den letzten 14 Tagen liefen 81 % der Entscheidungen ohne menschliches Eingreifen durch.
>
> Und das Protokoll entsteht von selbst, ohne Handarbeit. Es ist der Nachweis, den der Versicherer in einem Audit vorlegt.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 12 · Automatische Protokollierung.** Das System muss seine Ereignisse während seiner gesamten Lebensdauer automatisch protokollieren. Für Hochrisiko-Systeme ist das Pflicht, hier wird es als gute Praxis angewandt. **Risiko:** Ohne Protokoll lässt sich eine Entscheidung für eine Beschwerde oder eine Prüfung nicht rekonstruieren, und der Versicherer hat nichts, womit er sie verteidigen kann.

**Klicks**

1. **Paket verarbeiten**. Während es läuft, auf die Zähler (Freigegeben, Zu prüfen, Durchschnittliche Zykluszeit) und das sich füllende Protokoll hinweisen.
2. In der Mitte des Stapels **Pausieren**. Erklären, dass nichts verloren geht. **Fortsetzen**.
3. Am Ende: 10 freigegeben und 3 zu prüfen. Auf die Chips nach Sparte hinweisen.
4. Spalte **Sparte**: das ✔ gegenüber dem erwarteten Ergebnis. Spalten **Herkunft** und **Konf.**
5. Filter **Nur zu prüfen**: Es bleiben MSG-A-04, MSG-A-08 und MSG-A-13. Den Filter entfernen.
6. Auf die Betrugsetiketten im Protokoll hinweisen (MSG-A-13 mit der SIU; MSG-A-09, MSG-A-11 und MSG-A-02 mit zurückgehaltener Zahlung).
7. Optional: **JSON exportieren**.

**Falls gefragt wird:** Wie lange dauert es wirklich? Mit dem echten Modell zwischen 5 und 8 Sekunden pro Meldung in der Demo; die längste Spur, MSG-A-08, 12,4 Sekunden. Ein Mensch braucht Minuten, um dieselbe Meldung zu lesen und abzutippen.

---

### Schritt 3 · Die Akte einer freigegebenen Meldung: MSG-A-01 (Min. 8:30-10)

**Bildschirm:** `index.html` → Akte von MSG-A-01.

**Kernsatz:** «Auch eine Freigabe muss erklärbar sein.»

| MSG-A-01 · E-Mail · «Leichter Auffahrunfall auf der M-30 - Police AU-483920» |
|---|
| «Guten Tag. Mein Name ist Marta Gil Sanz, Ausweisnummer 50123456-Q, und ich bin Versicherungsnehmerin der Police AU-483920. Am Samstag, 12. September, gegen 18:30 fuhr ich auf der M-30 Richtung A-5, auf Höhe der Puente de Segovia, im Stau, und das Auto vor mir hat plötzlich gebremst; ich bin leicht hinten aufgefahren. Niemand wurde verletzt, und beide Autos konnten weiterfahren. Wir haben den Unfallbericht zusammen vor Ort ausgefüllt (ich hänge ihn eingescannt an); der andere Fahrer ist Raúl Méndez, mit einem Citroën C4, versichert bei einer anderen Gesellschaft. Mein Auto ist der Seat León 4521 KLM. Die Werkstatt Autos Carabanchel hat mir einen Kostenvoranschlag über 1.350 € für die Stoßstange und den rechten Scheinwerfer gemacht; ich hänge auch Fotos der Schäden an.» |
| **Ergebnis:** Kfz · Freigegeben · Konfidenz 0,95 · «Leichter Zusammenstoß mit Unfallbericht, keine Verletzten und Kostenvoranschlag über 1.350 €: erfüllt alle Kfz-Regeln.» |

**Was es ist und was es tut**

> Das ist die Akte einer Entscheidung. Oben sehen wir die Entscheidung, die Sparte und die Konfidenz des Modells. Darunter die Meldung des Kunden mit den markierten Belegen. Jeder Beleg ist ein wörtliches Zitat aus der Meldung, und das System prüft, dass es im Originaltext steht: Erfindet das Modell ihn, erscheint er nicht.
>
> Diese Meldung kommt außerdem mit drei Anhängen: dem eingescannten Unfallbericht und zwei Fotos des Schadens. Im Reiter Anhänge sehen wir sie neben den Daten, die der Agent aus jedem gelesen hat, verglichen mit dem, was in der E-Mail steht. Der Bericht bestätigt Datum, Uhrzeit und dass niemand verletzt wurde, und ergänzt Kennzeichen und Versicherer des anderen Fahrers, die nicht im Text standen. Die Fotos zeigen leichte Schäden an Stoßstange und Scheinwerfer vorne rechts, genau das, was die Werkstatt veranschlagt hat.
>
> In den nächsten Reitern sehen wir die Daten, die der Agent aus dem Freitext extrahiert hat, jede Regel der Sparte, die der Agent Regeln bewertet hat, mit Ergebnis und Beleg, und die Begründung, die ihn zur Entscheidung geführt hat.

**Nutzen**

> Einfache, gut dokumentierte Meldungen werden freigegeben, ohne dass jemand sie anfassen muss. Und wenn morgen jemand fragt, warum eine freigegeben wurde, steht die Antwort hier, Regel für Regel und mit den Worten des Kunden. Der Sachbearbeiter muss keiner Blackbox vertrauen: Er kann jede Regel in Sekunden prüfen. Und er muss Bericht und Fotos nicht mehr öffnen, um sie von Hand mit der E-Mail zu vergleichen: Der Abgleich ist gemacht, und er muss nur auf das achten, was nicht übereinstimmt.
>
> Ist er mit einer Freigabe nicht einverstanden, schickt die Schaltfläche Override auf der Karte Entscheidung sie zur Prüfung, mit optionalem Kommentar. Diese Änderung zählt zur Override-Quote des Agenten, und diese Quote entscheidet über seine Autonomiestufe.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 13 · Transparenz.** Wer das System nutzt, muss seine Ergebnisse interpretieren können. Pflicht bei Hochrisiko; hier gute Praxis. **Risiko:** Ein Sachbearbeiter, der den Vorschlag nicht versteht, unterschreibt ihn oder verwirft ihn blind, und in beiden Fällen erreicht der Fehler den Kunden.
- **DSGVO Art. 15 · Auskunftsrecht.** Der Kunde kann aussagekräftige Informationen über die Logik einer automatisierten Entscheidung verlangen, die ihn betrifft. **Risiko:** Lässt sie sich nicht erklären, droht eine Beschwerde bei der AEPD; Bußgelder nach DSGVO erreichen 20 Mio. € oder 4 % des weltweiten Umsatzes.

**Klicks**

1. Oberer Teil der Akte: die drei Zahlen (Entscheidung, Sparte, Konfidenz 95 %) und die Schaltfläche **Override** auf der Karte Entscheidung. Darauf hinweisen, ohne zu bestätigen: Ein Override ändert die Zahlen im Governance-Panel.
2. Reiter **Meldung**: die Belege im Text markiert und nummeriert. Mit der Maus über einen fahren: Der Titel «Beleg» wechselt zu seinem Typ (zum Beispiel «Schadendatum»). **Legende** öffnen.
3. Reiter **Anhänge** (3): der Unfallbericht im PDF-Viewer und rechts seine mit der E-Mail abgeglichenen Daten (alles stimmt; die Angaben zum anderen Fahrzeug stehen nur im Bericht). Zu den beiden Fotos wechseln: Auf das Bild klicken, um es zu vergrößern.
4. Reiter **Extrahierte Daten**: die 10 Felder (Kunde, Police, Art, Datum, 1.350 €, Ort, Dritte ja, Verletzte nein, Unterlagen: Unfallbericht, Kostenvoranschlag und Fotos).
5. Reiter **Geschäftsregeln**: A1 bis A8, alle «erfüllt» oder «nicht anwendbar», jede mit ihrem Beleg.
6. Reiter **Begründung**: Sparte, Entscheidung, empfohlener nächster Schritt und zeitlicher Ablauf.

**Falls gefragt wird:** Wer schreibt die Regeln? Das Geschäft. Sie stehen im Seitenmenü, Bereich **Prompt**, und lassen sich ohne Programmierung bearbeiten (Schaltfläche «Groß bearbeiten»). Der Aufruf an das Modell nutzt immer den aktuellen Text.

**Falls gefragt wird:** Liest das Modell die Anhänge wirklich? In dieser Demo kommen die Daten der Anhänge aus den gespeicherten Ergebnissen, auch wenn ein Live-Modell verbunden ist; der nächste Schritt ist, ihm Fotos und PDF im Extraktionsaufruf zu schicken. Und Achtung: Die Pseudonymisierung gilt nur für den Text, die Anhänge erreichen das Modell also mit allen personenbezogenen Daten, die sie enthalten. Die Spur vermerkt es so in `_gobernanza.adjuntos`.

---

### Schritt 4 · Die Akte einer Meldung «Zu prüfen»: MSG-A-08 (Min. 10-12)

**Bildschirm:** `index.html` → Akte von MSG-A-08. Volltext der Meldung in Schritt 1.

**Kernsatz:** «Jede Entscheidung ist erklärbar, auch wenn die Maschine nicht entscheidet.»

**Ergebnis:** Kfz · Zu prüfen · Konfidenz 0,90 · «Motorradunfall mit einem Verletzten im Krankenhaus und einem beteiligten Dritten: spezialisierte Bearbeitung des Personenschadens und Abstimmung mit der Krankenpolice SA-662371.»

**Was es ist und was es tut**

> Geht eine Meldung zur Prüfung, sagt uns die Akte, welche Regel sie verletzt hat, und markiert die Sätze der Meldung, die das belegen. Löst außerdem ein Guardrail aus, zum Beispiel weil jemand verletzt ist, kann der Agent nicht entscheiden, und der Fall geht direkt an einen Menschen.
>
> Steht eine Angabe nicht in der Meldung, bleibt das Feld leer. Der Agent hat die Anweisung, nichts zu erfinden.
>
> Und in der Rohantwort sehen wir genau, was das Modell erhalten hat. Bevor die Plattform ihm die Meldung schickt, ersetzt sie Namen, Policen, Kennzeichen, Telefonnummern und die übrigen personenbezogenen Daten durch Platzhalter. Was für die Entscheidung nötig ist, etwa die Verletzungen oder die Diagnose, bleibt erhalten. Wenn die Antwort zurückkommt, setzt die Plattform die echten Daten wieder in die Akte ein, und die Zuordnungstabelle existiert nur für die Dauer des Aufrufs im Speicher.

**Nutzen**

> Der Sachbearbeiter versteht den Grund in Sekunden. Wenn er mit der Prüfung fertig ist, schließt er sie mit der Schaltfläche Bestätigen auf der Karte Entscheidung ab: Er wählt, ob er freigibt oder in der Prüfung belässt, und kann einen Kommentar hinterlassen. Da der Agent den Fall bereits eskaliert hatte, ist das kein Override und beeinflusst seine Autonomie nicht. Fragt der Kunde nach einer Erklärung, steht die Antwort schon in der Akte. Und Personenschäden bewertet immer ein Mensch: In den letzten 14 Tagen erklärt der Guardrail für Verletzte 20 % der Eskalationen.
>
> Außerdem entscheidet das Modell, ohne zu wissen, wer der Versicherungsnehmer ist. Datenminimierung ist dann keine Richtlinie mehr, die in einem Dokument steht, sondern das, was das Modell tatsächlich erhält.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 22 · Automatisierte Entscheidungen.** Niemand darf einer ausschließlich auf automatisierter Verarbeitung beruhenden Entscheidung unterworfen werden, die ihn erheblich beeinträchtigt, ohne menschliches Eingreifen erwirken zu können. **Risiko:** Eine ungünstige Entscheidung, die die Maschine allein trifft, kann angefochten und sanktioniert werden.
- **DSGVO Art. 5.1.c · Datenminimierung.** Es werden nur die für den Zweck nötigen Daten verarbeitet. **Risiko:** Namen, Ausweisnummern oder Telefonnummern ohne Notwendigkeit an einen externen Anbieter zu senden, vervielfacht die Folgen einer Datenpanne.
- **DSGVO Art. 9 · Gesundheitsdaten.** Sie sind eine besondere Kategorie und brauchen eine spezifische Rechtsgrundlage. **Risiko:** Es ist der Verstoß, der bei einer Sanktion am schwersten wiegt und dem Ruf am meisten schadet.

**Klicks**

1. Reiter **Meldung**: markierte Belege («liegt im», «gebrochenem Schlüsselbein und zwei gebrochenen Rippen», «Protokoll», der Opel Astra des Dritten).
2. Reiter **Geschäftsregeln**: **A5 · Dritte dokumentiert und keine Verletzten** als «verletzt», mit seinem Beleg.
3. Reiter **Extrahierte Daten**: `importe_estimado_eur` leer. Darauf hinweisen.
4. Reiter **Begründung**: warum es Kfz ist und nicht Gesundheit (die Ursache des Schadens ist der Verkehrsunfall).
5. Reiter **Rohantwort** → Ansicht **An das Modell gesendet**: die Platzhalter [PERSONA_1], [POLIZA_AU_1], [MATRICULA_1], [TELEFONO_1] statt der echten Daten. Der Bruch und der Diabetes stehen weiter da.
6. Karte Entscheidung: die Schaltfläche **Bestätigen**. Ein Klick lässt das Ergebnis wählen (Freigeben oder Auf «Zu prüfen» belassen) und einen Kommentar hinterlassen. Abbrechen, ohne zu bestätigen.

**Falls gefragt wird:** Ist Pseudonymisieren dasselbe wie Anonymisieren? Nein. Die Spur bewahrt die Verbindung zur Person, deshalb bleiben es personenbezogene Daten (DSGVO Art. 4.5). Das Compliance-Thermometer erklärt es (Schritt 15).

---

### Schritt 5 · Die Rohantwort von MSG-A-12 (Min. 12-14)

**Bildschirm:** `index.html` → Akte von MSG-A-12 → Reiter **Rohantwort**.

**Kernsatz:** «Das Modell zertifiziert sich nicht selbst: Die Plattform hinterlässt den Nachweis jeder Entscheidung.»

| MSG-A-12 · WhatsApp · «Sohn in der Notaufnahme nach Sturz mit dem Roller» |
|---|
| «Hallo, ich bin gerade in der Kindernotaufnahme des Hospital Universitario HM Sanchinarro mit meinem Sohn Mateo Ruiz Ibarra (8), er ist im Park Valdebebas mit dem Roller gestürzt und hat sich am linken Arm wehgetan, er kann ihn nicht bewegen und weint sehr 😢 Sie werden seinen Arm röntgen 🙏 Der Kinderarzt sagt, es könnte ein Handgelenkbruch sein. Er ist in der Familienpolice SA-518877, Versicherungsnehmerin bin ich. Ich habe seine Krankenversicherungskarte gezeigt. Sonst war niemand beteiligt, er ist allein gestürzt. Ich melde es, falls ich noch etwas tun muss. Danke!» |
| **Ergebnis:** Gesundheit · Freigegeben · Konfidenz 0,94 · Direktleistung in einem Krankenhaus des Vertragsnetzwerks |

**Was es ist und was es tut**

> In der Rohantwort sehen wir, was das Modell zurückgegeben hat, und darunter einen Governance-Block, den die Plattform hinzufügt. Diesen Block erzeugt nicht das Modell: Die Plattform berechnet ihn mit festen Regeln, und er lässt sich jederzeit neu berechnen.
>
> Der Block hält fest, welche personenbezogenen Daten in der Meldung stehen, welcher Art sie sind, zum Beispiel Gesundheitsdaten oder Daten von Minderjährigen, und ob sie für die Entscheidung genutzt wurden. Er erklärt, warum die Meldung zu einer Sparte gehört und warum nicht zu den anderen beiden. Und er fügt ein SHA-256-Siegel hinzu, das mit der vorherigen Entscheidung verkettet ist, zusammen mit der Dauer, für die die Spur aufbewahrt werden muss.

**Nutzen**

> Gesundheitsdaten und Daten von Minderjährigen genießen verstärkten Schutz. Mit diesem Block sagt jede Antwort, welche sensiblen Daten es gab, wie sie behandelt wurden und ob sie für die Entscheidung genutzt wurden. Für den DSB ist das ein Nachweis Entscheidung für Entscheidung, keine allgemeine Erklärung.
>
> Und manipuliert jemand einen Datensatz, bricht die Hash-Kette und das fällt sofort auf. Wir prüfen es gleich im Panel.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 9 und Schutz von Minderjährigen (Art. 8 und ErwG 38).** Gesundheitsdaten sind eine besondere Kategorie, und Daten von Minderjährigen verdienen besonderen Schutz. **Risiko:** Sie zu verarbeiten, ohne zu wissen, dass sie da sind, macht es unmöglich, die gesetzlich verlangten Schutzmaßnahmen anzuwenden; der typische Fall einer verschärften Sanktion.
- **AI Act art. 19 und LCS art. 23 · Aufbewahrung.** Protokolle werden mindestens sechs Monate aufbewahrt, die Akte so lange, wie Ansprüche geltend gemacht werden können: zwei Jahre bei Sachschäden und fünf bei Personenschäden. **Risiko:** Früher zu löschen, lässt den Versicherer in einem Rechtsstreit ohne Beweise; zu lange aufzubewahren, verstößt gegen den Grundsatz der Speicherbegrenzung.

**Klicks**

1. **Rohantwort** mit eingeschaltetem **+ Governance**: der Block `_gobernanza`, gekennzeichnet als «von der Plattform hinzugefügt, nicht vom Modell erzeugt».
2. Terrakottafarbener Block `datos_personales`: der Minderjährige (8 Jahre) und die Gesundheitsdaten in Rot, jeweils mit Kategorie und ob sie für die Entscheidung genutzt wurden.
3. Grüner Block `explicabilidad`: warum Gesundheit und **warum weder Kfz noch Hausrat** («"Roller" löst kein Kfz aus: Er ist kein versichertes Fahrzeug, und es gibt keinen Dritten»; «Hausrat verworfen: Der Sturz war im Park Valdebebas, nicht zu Hause»).
4. Blauer Block `trazabilidad`: Spur, Modell, Prompt-Version und verketteter SHA-256-Hash.
5. Ockerfarbener Block `retencion`: 6 Monate für die Spur; 5 Jahre für die Akte des Personenschadens.
6. Violetter Block `supervision_humana`. Mit der Maus über eine Vorschrift fahren, um zu sehen, was sie verlangt.
7. **Übergang:** Kopfbereich → **Agenten-Governance**. Im Panel **Quelle → Aktuelle Sitzung**, damit die Spuren die des gerade verarbeiteten Stapels sind.

---

## 6. Teil 2 · Governance

### 6.0 Eintritt in das Panel (Min. 14-15)

**Bildschirm:** `gobierno.html` → **Start**. Die sechs Blöcke von oben nach unten durchgehen, ohne einen davon zu öffnen.

**Kernsatz:** «Sechs Fragen, um unsere Agenten zu steuern.»

> Jetzt wechseln wir zum Panel derjenigen, die die Agenten steuern. Es ist in dreizehn Bereiche gegliedert, die sechs Fragen beantworten: was passiert, wie viel die Maschine entscheidet und wie viel ein Mensch, ob es Betrugshinweise gibt, ob die Agenten gut und mit gutem Wissen entscheiden, ob wir die Vorschriften einhalten und was es uns kostet, und was wir korrigieren müssen. Jede Karte dieser Startseite gibt uns die Zahl des Tages und ihren Status. Wir gehen in jeden Bereich mit den Meldungen des gerade verarbeiteten Stapels.

| Block | Frage | Bereiche | Schritte |
|---|---|---|---|
| Betrieb | Was passiert gerade? | Übersicht · Agenten · Nachvollziehbarkeit | 6-8 |
| Kontrolle | Wie viel entscheidet die Maschine und wie viel ein Mensch? | Autonomie · Guardrails · Menschliches Eingreifen | 9-11 |
| Risiko | Gibt es Betrugshinweise? | Betrug | 12 |
| Qualität | Entscheiden sie gut und mit gutem Wissen? | Reasoning und Replay · Knowledge Bases | 13-14 |
| Compliance und Kosten | Halten wir die Vorschriften ein und was kostet es? | Compliance · FinOps | 15-16 |
| Verbesserung und Audit | Was ist zu korrigieren und was hat sich geändert? | Korrekturmaßnahmen · Historie | 17-18 |

---

### Schritt 6 · Übersicht (Min. 15-17)

**Bildschirm:** Start → **Übersicht ansehen**. Block **Betrieb**.

**Kernsatz:** «Volle Kontrolle über das System und die Möglichkeit, es sofort anzuhalten.»

**Hervorgehoben:** der ganze Stapel und die Spur von MSG-A-08.

**Wozu dieser Bereich dient**

> Die Übersicht zeigt uns auf einem einzigen Bildschirm die Kennzahlen des Zeitraums, den Status jedes Agenten, die Kosten gegenüber dem Budget und die Warnungen aus allen Quellen. Wir wollen, dass die Geschäftsleitung in zehn Sekunden weiß, ob das System gut läuft, ohne jemanden um einen Bericht bitten zu müssen.

**Was es ist und was es tut**

> Die Kennzahlen oben geben uns die effektive Autonomie, also wie viele Entscheidungen ohne menschliches Eingreifen durchlaufen; wie viele die Sachbearbeiter korrigieren; wie viel wir gegenüber dem Cap ausgegeben haben; und welche Warnungen offen sind, ob zu Kosten, Betrug, Wissen oder Compliance. Öffnen wir die Kennzahl der Warnungen, sehen wir sie nach Herkunft sortiert, jede mit einem Link zu ihrem Bereich.
>
> Darunter hat jeder Agent seine Karte mit Status, Modell, Latenz und dem, was er heute gegenüber seinem Budget ausgegeben hat. Und jede Karte hat einen Stoppschalter, den Kill Switch, der den Agenten mit einem Klick anhält.

**Nutzen**

> Im Moment haben wir 81 % Autonomie und 2,1 % korrigierte Entscheidungen, unter dem Ziel von 3 %.
>
> Und wenn sich ein Agent schlecht verhält, halten wir ihn sofort an. Seine Meldungen bleiben in der Warteschlange, bis wir ihn wieder starten, keine geht verloren, und der Stopp wird mit dem Namen dessen protokolliert, der ihn ausgelöst hat.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 14 · Menschliche Aufsicht.** Das System muss einem Menschen erlauben, es zu überwachen, seine Ergebnisse zu verstehen und es mit einer Stopptaste anzuhalten. **Risiko:** Ohne Stopp wiederholt sich ein Modellfehler in Hunderten von Entscheidungen, bevor ihn jemand sieht.
- **EIOPA.** Sie verlangt, dass Vorstand und Geschäftsleitung regelmäßig über die KI-Systeme informiert werden. **Risiko:** Eine Geschäftsleitung, die das System nicht sieht, kann gegenüber der Aufsicht nicht dafür einstehen.

**Klicks**

1. Die 8 KPIs: 16.720 Meldungen in 14 Tagen, effektive Autonomie 81 %, eskaliert 19 %, Overrides 2,1 %, Kosten des Zeitraums, 11 Warnungen, Compliance 87 % und 5 von 9 gesunden Wissensdatenbanken.
2. Auf den KPI **Aktive Warnungen** klicken: das Fenster mit den 11 Warnungen nach Schweregrad und nach Herkunft (Kosten 3, Betrug 3, Wissensdatenbanken 3, Compliance 2) und die nach Herkunft gruppierte Liste. In der Gruppe **Betrug**: MSG-A-13 an die SIU eskaliert (Klick: öffnet die Fallkarte), die 3 zurückgehaltenen Zahlungen über 2.080 € und CAP-09 in Warnung. Schließen.
3. Die Karten der vier Agenten: Regeln **Herabgestuft (gpt-5-mini)** und 13,70 € gegenüber einem Tages-Cap von 12 €.
4. Diagramm **Tageskosten gegenüber dem Cap**: Schaltfläche **Vergrößern** (Fenster mit dem Detail pro Tag).
5. Die **Aktiven Warnungen** der Karte, nach Schweregrad sortiert: die von CAP-03, die von MSG-A-13 mit der SIU und die von KB-06 (Werkstattnetzwerk).
6. **Letzte Spuren** → auf die von MSG-A-08 klicken: die erklärte Karte (was hereinkam, was jeder Agent getan hat, Entscheidung, Kosten). Schaltfläche **Compliance** in der Karte. Schließen.
7. **Kill Switch** von Datenextraktion: Die Karte wird dunkel. Wieder einschalten.

---

### Schritt 7 · Agenten: der Agent Regeln (Min. 17-18:30)

**Bildschirm:** Menü → **Agenten** → Reiter **Geschäftsregeln**. Block **Betrieb**.

**Kernsatz:** «Jeder Agent hat seine Identität, seinen Verantwortlichen und nur die Berechtigungen, die er braucht.»

**Hervorgehoben:** der Agent Regeln, der über MSG-A-01, MSG-A-04 und MSG-A-08 entscheidet.

**Wozu dieser Bereich dient**

> Der Bereich Agenten gibt uns den vollständigen Steckbrief jedes Agenten: was er tut, welches Modell er nutzt, wie viele Tokens er verbraucht, wie lange er braucht, was er kostet, wie er je nach Modell abschneidet und welches Wissen er abfragt.
>
> Die Agenten unter Kontrolle zu halten, ist entscheidend, denn sie sind unsere autonomen Mitarbeiter. Wir müssen wissen, welche Probleme sie haben, um ihnen zu helfen, mit welchem Wissen sie arbeiten, um es aktuell zu halten, und ob sie rentabel sind, um mit Daten zu entscheiden und kein Geld zu verlieren.

**Was es ist und was es tut**

> Jeder Agent hat eine eigene Identität, wie ein Mitarbeiter, mit einem Verantwortlichen und minimalen Berechtigungen: Es ist festgelegt, was er darf und was nicht. Im Steckbrief sehen wir seine Konfiguration und Schwellen, die Guardrails und Caps, die ihn begrenzen, seine Kosten und Tokens der letzten Tage und eine Tabelle mit seinem Verhalten je nach genutztem Modell: Genauigkeit, Eskalationen, Korrekturen, Kosten pro Meldung und Latenz.
>
> Wir sehen auch einen Qualitätsindex, die Wissensdatenbanken, die er nutzt, und für die technischeren Profile seinen Ein- und Ausgabevertrag.

**Nutzen**

> Mit diesem Steckbrief entscheiden wir mit Zahlen, welches Modell in jedem Agenten zum Einsatz kommt. Heute verursacht zum Beispiel der Agent Regeln 80 % der Ausgaben und hat zwei Wissensdatenbanken mit Problemen. Dort müssen wir ansetzen.

**Vorschriften und warum sie wichtig sind**

- **DORA art. 9 · Schutz und Prävention.** Verlangt, Zugriffe mit den minimal nötigen Berechtigungen zu verwalten. DORA gilt für Versicherer seit Januar 2025. **Risiko:** Ein Agent mit mehr Berechtigungen als nötig kann eine Zahlung anordnen oder eine Akte löschen, wenn er versagt oder angegriffen wird.
- **DSGVO Art. 25 · Datenschutz durch Technikgestaltung.** Jede Komponente greift nur auf die Daten zu, die sie braucht. **Risiko:** Ein Agent, der mehr Daten sieht als nötig, ist ein Regelverstoß, auch ohne Datenpanne.

**Klicks**

1. Die Kette oben: Mehrkanal → Klassifizierung → Extraktion → Regeln, mit dem, was sie weitergeben (normalisierter Text → Sparte und Signale → 10 Felder).
2. Kopf von Regeln: Herabgestuft, L2, Verantwortlicher «Schadenmanagement · KI-Ausschuss», gpt-5, Prompt v2.3, Latenz p50/p95, 13,70 € / 12 €.
3. **Identität und Berechtigungen**: Er darf die Police lesend abfragen und Vorschläge machen; er darf keine Zahlungen anordnen, keinen Schaden ablehnen und die Akte nicht ändern.
4. **Konfiguration und Variablen**: Mindestkonfidenz 0,85, Höchstbeträge, Reasoning-Aufwand «medium», Override-Ziel 3 %.
5. **Leistung und Kosten**: 172,65 € in 14 Tagen; die Tabelle **Verhalten je nach Modell** (gpt-5 mit 98,9 % Genauigkeit für 0,011 € pro Meldung; herabgestuftes gpt-5-mini mit 97,6 % für 0,002 €).
6. **Qualität**: der Kreis mit 98 %, Genauigkeit 13/13, durchschnittliche Konfidenz 0,93, 9,77 verifizierte Belege pro Entscheidung.
7. **Genutzte Knowledge Bases**: KB-02 beeinträchtigt und KB-06 kritisch (wir sehen sie in Schritt 14).
8. Optional für technische Profile: **Ein- und Ausgabevertrag** mit dem echten Beispiel.

---

### Schritt 8 · Nachvollziehbarkeit (Min. 18:30-19:30)

**Bildschirm:** Menü → **Nachvollziehbarkeit**. Block **Betrieb**.

**Kernsatz:** «Meldung für Meldung: was passiert ist, wer es entschieden hat und was es gekostet hat.»

**Hervorgehoben:** MSG-A-08 (TRZ-4F31) und MSG-A-10 (TRZ-4F33).

| MSG-A-10 · E-Mail · «Notaufnahme wegen eines Asthmaanfalls» |
|---|
| «Gestern Abend, gegen 23:00, hatte ich einen ziemlich schweren Asthmaanfall (ich bin seit meiner Kindheit Asthmatikerin und nehme ein Inhalationsspray) und bin in die Notaufnahme des Hospital Universitario Quirónsalud Madrid in Pozuelo gegangen, das im Vertragsnetzwerk ist. […] Sie haben mir Inhalationen und Kortikoide gegeben […] und mich in den frühen Morgenstunden entlassen […]. Ich musste nichts bezahlen. Police SA-337700 […].» |
| **Ergebnis:** Gesundheit · Freigegeben · Vorfall: Fehler 429 beim KI-Anbieter, gelöst mit einer Wiederholung nach 2 s |

**Wozu dieser Bereich dient**

> Im Bereich Nachvollziehbarkeit können wir jede Meldung Schritt für Schritt verfolgen: welcher Agent was getan hat, wie lange es gedauert hat, mit welchem Modell und was es gekostet hat. So lässt sich jede Entscheidung aus dem Protokoll rekonstruieren, ob für eine Beschwerde oder für ein Audit.

**Was es ist und was es tut**

> Jede Meldung erzeugt eine Spur. Die Kaskade zeigt uns jeden Schritt jedes Agenten mit Dauer, Modell und Eingabe-, Ausgabe- und Reasoning-Tokens. Hat die Spur ein Kosten-Cap überschritten, ein Guardrail ausgelöst oder einen Vorfall gehabt, etwa einen Fehler des Anbieters mit Wiederholung, wird das genau hier gekennzeichnet. Und die Liste lässt sich nach Agent, Kanal, Entscheidung oder Ergebnis filtern.

**Nutzen**

> Bei einer Beschwerde wird die Entscheidung rekonstruiert, ohne jemanden fragen zu müssen, was passiert ist, und der Versicherer kann nachweisen, wie er entschieden hat.
>
> Außerdem erreichen die Ausfälle des KI-Anbieters den Kunden nicht: Das System wiederholt und protokolliert sie, sodass wir mit Daten auf dem Tisch mit dem Anbieter sprechen können.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 5.2 · Rechenschaftspflicht.** Einhalten reicht nicht: Der Versicherer muss es nachweisen können. **Risiko:** Die Beweislast liegt beim Versicherer; ohne Protokoll hat er vor der AEPD oder einem Richter keine Möglichkeit zu belegen, dass er richtig entschieden hat.
- **DORA art. 11 · Reaktion und Wiederherstellung.** Kritische Dienste müssen weiterlaufen, wenn Dritte ausfallen. **Risiko:** Hängt man von einem einzigen KI-Anbieter ohne Wiederholungen oder Alternative ab, wird sein Ausfall zum Ausfall des Schadendienstes.

**Klicks**

1. Auf die Spur von MSG-A-08 klicken: Das feste Panel oben zeigt die Kaskade der Schritte pro Agent mit Dauer, Modell und Tokens. 12,4 s, 28.038 Tokens und 0,062 €, gegenüber rund 4.300 Tokens und 0,010 € bei den übrigen. Vorfälle CAP-04 und CAP-05.
2. Auf die Spur von MSG-A-10 klicken: der Vorfall «429 · Wiederholung 1 (2 s)».
3. Filter: **Ergebnis → Mit menschlichem Eingreifen** (es bleiben MSG-A-04, MSG-A-08 und MSG-A-13). Den Filter entfernen.
4. Schaltfläche **Reasoning anzeigen** bei MSG-A-08 (führt zu Schritt 13; mit dem Menü zurückkehren).

---

### Schritt 9 · Autonomie (Min. 19:30-20:30)

**Bildschirm:** Menü → **Autonomie**. Block **Kontrolle**.

**Kernsatz:** «Abgestufte Autonomie mit klaren Grenzen.»

**Hervorgehoben:** der Agent Regeln.

**Wozu dieser Bereich dient**

> Der Bereich Autonomie zeigt uns, auf welcher Stufe jeder Agent steht, von L0 bis L3, und bewahrt das Audit jeder Stufenänderung. Wir wollen, dass die Freiheit jedes Agenten im Verhältnis zum Risiko dessen steht, was er entscheidet, und zu seiner Erfolgsbilanz, und dass nichts ohne Daten, die es stützen, eine Stufe aufsteigt.

**Was es ist und was es tut**

> Auf L0 schlägt der Agent nur vor. Auf L1 schlägt er vor und ein Mensch bestätigt jeden Fall. Auf L2 entscheidet er innerhalb der Guardrails und eskaliert alles andere an einen Menschen. Und auf L3 entscheidet und handelt er und wird danach auditiert.
>
> Jeder Auf- oder Abstieg wird mit Grund, den belegenden Daten und dem Namen dessen protokolliert, der ihn genehmigt hat. Eines der Kriterien ist die Korrekturquote: Korrigieren die Sachbearbeiter mehr als 3 % der Entscheidungen eines Agenten, steigt dieser Agent eine Stufe ab.

**Nutzen**

> Wir machen es wie bei einem neuen Sachbearbeiter: Wir geben ihm mehr Autonomie, wenn er Urteilsvermögen zeigt, und nehmen sie ihm, wenn er sich irrt. In der Demo erreichte der Agent Regeln L3 und fiel auf L2 zurück in der Woche, in der die Korrekturen 4,1 % erreichten. Und hinter jeder Änderung steht jemand, der sie abzeichnet.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 14 · Menschliche Aufsicht im Verhältnis zum Risiko.** Der Grad der menschlichen Kontrolle muss zu Risiko und Autonomie des Systems passen. **Risiko:** Einem Agenten ohne Erfolgsbilanz volle Autonomie zu geben, macht seine Fehler zu endgültigen Entscheidungen.
- **DSGVO Art. 22.** Mehr Autonomie heißt mehr automatisierte Entscheidungen. **Risiko:** Einen Agenten hochzustufen, der ungünstige Entscheidungen ohne menschliche Prüfung trifft, fällt voll unter das Verbot des Artikels.

**Klicks**

1. KPIs: 81 % autonome Entscheidungen (Ziel ≥ 80 %), Override-Quote 2,1 %, Genauigkeit 99,1 % gegenüber dem erwarteten Ergebnis.
2. **Stufen** L0 bis L3, von Rot bis Grün: Mehrkanal und Klassifizierung auf L3; Extraktion und Regeln auf L2.
3. **Stufenänderungen (Audit)** → auf die Zeile «Geschäftsregeln · L3 → L2» klicken: der vollständige Datensatz (4,1 % Override in der Woche, genehmigt von M. Ortega). Mit ‹ › zu «Klassifizierung · L2 → L3» navigieren (99,2 % Genauigkeit bei 4.800 Meldungen).

---

### Schritt 10 · Guardrails (Min. 20:30-22)

**Bildschirm:** Menü → **Guardrails**. Block **Kontrolle**.

**Kernsatz:** «Die Regeln des Versicherers haben immer Vorrang vor dem Modell.»

**Hervorgehoben:** G-04 mit MSG-A-08 und G-02.

**Wozu dieser Bereich dient**

> Der Bereich Guardrails versammelt die Bedingungen, die einen Agenten daran hindern, selbst zu entscheiden, und sagt uns, wie oft jede ausgelöst wurde. So können wir garantieren, dass die Regeln des Versicherers immer Vorrang vor dem haben, was das Modell sagt.

**Was es ist und was es tut**

> Ein Guardrail ist eine Bedingung, die geprüft wird, bevor eine Entscheidung ausgeführt wird: eine Konfidenz unter der Schwelle, ein Betrag über der Grenze der Sparte, ein Verletzter, eine nicht bestimmbare Sparte oder ein Betrugshinweis. Löst er aus, wird die Entscheidung nicht ausgeführt: Je nach Fall geht sie an einen Menschen, wechselt auf ein günstigeres Modell oder die Spur wird gekennzeichnet.
>
> Jeder Guardrail hat seine Karte, seine Auslösungen pro Tag und einen Schalter zum Ein- und Ausschalten.

**Nutzen**

> Der Guardrail für den Betrag zum Beispiel wurde 118-mal in 14 Tagen ausgelöst und erklärt 62 % der Eskalationen. Will das Geschäft morgen die Grenze für Kfz anheben, weiß es genau, wie viele Fälle betroffen sind.
>
> Und jeder Guardrail, der ein- oder ausgeschaltet wird, wird in der Historie mit dem Namen dessen protokolliert, der es getan hat.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 9 · Risikomanagement.** Die Risiken des Systems müssen erkannt und während seiner gesamten Lebensdauer mit Maßnahmen verringert werden. **Risiko:** Ein Modell ohne Grenzen kann einen Schaden über 20.000 € oder einen Personenschaden so leicht freigeben wie eine Windschutzscheibe über 280 €.

**Klicks**

1. KPIs: 11 von 12 aktiv, 454 Auslösungen in 14 Tagen, die am häufigsten ausgelöste (G-02).
2. Tabelle G-01 bis G-12. Mit der Maus über die Mini-Balken der Auslösungen pro Tag fahren.
3. Auf **G-04 · Verletzte = ja** klicken: die Karte mit Beschreibung und letzten Auslösungen. In der Liste der Auslösungen die von MSG-A-08, mit ihrer Spur verknüpft.
4. Auf **G-02 · Betrag** klicken: 118 Auslösungen, 62 % der Eskalationen.
5. Schalter **G-09** (inaktiv): erklären, warum er aus ist (durchschnittliche Transkriptionskonfidenz 0,91).
6. Optional: **Neuer Guardrail** (Fenster mit dem Formular). Ohne Speichern schließen.

---

### Schritt 11 · Menschliches Eingreifen: MSG-A-04 (Min. 22-24)

**Bildschirm:** Menü → **Menschliches Eingreifen**. Block **Kontrolle**.

**Kernsatz:** «Eine Freigabe in 10 Sekunden ist nur eine Unterschrift: Deshalb messen wir, ob die Prüfung echt ist.»

| MSG-A-04 · E-Mail · «Schaden am Auto in einem Parkhaus» |
|---|
| «Hallo, am Donnerstag, dem 10., gegen 14:00 hat mein Sohn Pablo (er ist 22) mein Auto genommen, den Peugeot 308 3318 LMB der Police AU-119045, um zur Uni zu fahren, und beim Verlassen der Tiefgarage der Wirtschaftsfakultät der Complutense ist er an einer Säule entlanggeschrammt. Die rechte hintere Tür und der Kotflügel sind ziemlich eingedrückt, und das Rücklicht ist kaputt. Kein anderes Fahrzeug war beteiligt, deshalb haben wir keinen Bericht ausgefüllt, und ihm geht es gut. Pablo hat seit 3 Jahren den Führerschein; ich weiß nicht, ob wir ihn bei der Verlängerung in die Police aufgenommen haben, das hat meine Frau gemacht. Unsere Werkstatt des Vertrauens, Talleres Ruiz in Alcorcón, sagt, es sind etwa 2.200 € und sie können es in einer Woche fertig haben. Bitte sagen Sie mir, in welche Werkstatt ich es bringen soll oder ob ich zu meiner eigenen Werkstatt gehen kann. Meine Telefonnummer ist 677 019 334. Viele Grüße, Antonio Navarro Blanco.» |
| **Ergebnis des Agenten:** Kfz · Zu prüfen · Regel A3 (Fahrer nicht angegeben). **Menschliche Prüfung:** L. Prieto prüft, dass Pablo tatsächlich angegeben ist, und gibt in 38 Minuten frei. Es ist kein Override: Der Agent hatte bereits eskaliert |

**Wozu dieser Bereich dient**

> Der Bereich Menschliches Eingreifen zeigt uns die Warteschlange mit allem, was die Agenten eskalieren, wer es prüft, wie lange es dauert und wie viele Entscheidungen am Ende geändert werden. So können wir nachweisen, dass die menschliche Prüfung echt ist und niemand unterschreibt, ohne hinzusehen.

**Was es ist und was es tut**

> Jede eskalierte Spur kommt in eine Warteschlange mit Grund, Status und der prüfenden Person. Einen eskalierten Fall abzuschließen, ist kein Override. Ein Override liegt vor, wenn ein Sachbearbeiter eine Entscheidung ändert, die der Agent selbst getroffen hat, zum Beispiel eine automatische Freigabe, die zur Prüfung geht, und er wird mit seinem Grund protokolliert.
>
> Das Panel misst auch, wie geprüft wird: wie lange jeder Sachbearbeiter braucht, welcher Anteil der Freigaben in unter 30 Sekunden unterschrieben wird und welche Sachbearbeiter die KI-Schulung haben.

**Nutzen**

> Die Warteschlange belegt, dass ein Mensch die Entscheidung getroffen hat, mit Name und Uhrzeit. In der Demo werden 3,3 % der Freigaben in unter 30 Sekunden unterschrieben, und drei Sachbearbeiter überschreiten das Maximum von 5 %. Zwei von ihnen haben die KI-Schulung noch nicht, und das ist bereits eine offene Maßnahme.
>
> Außerdem fließt jeder Override in die Autonomie ein: Korrigieren die Sachbearbeiter mehr als 3 % dessen, was der Agent selbst entscheidet, schlägt das Panel vor, seine Stufe zu senken, und ein Mensch genehmigt es.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 22 und das SCHUFA-Urteil des EuGH (C-634/21, 2023).** Eine ungünstige Entscheidung braucht echtes menschliches Eingreifen, und der Gerichtshof hat gesagt, dass eine Person, die nur bestätigt, was die Maschine vorschlägt, nicht zählt. **Risiko:** Eine Prüfung von 10 Sekunden macht den Fall rechtlich zu einer automatisierten Entscheidung.
- **AI Act art. 4 · KI-Kompetenz.** Wer mit KI-Systemen arbeitet, muss ausreichend geschult sein. Gilt seit Februar 2025 für alle Organisationen, unabhängig vom Risiko des Systems. **Risiko:** Ein ungeschulter Prüfer kann den Fehler des Agenten nicht erkennen.

**Klicks**

1. KPIs: 3.180 eskaliert (19 %), Override 2,1 %, 2 zur Prüfung ausstehend, Expressprüfungen 3,3 %, wirksame menschliche Aufsicht «Abgedeckt».
2. **Aufsichtsmechanismen**: Eskalation, Override und Stufe, Kill Switch, regulatorische Kontrolle.
3. **Prüfwarteschlange**: die drei Spuren des Stapels. Auf MSG-A-04 klicken: die Karte der Spur mit der Prüfung von L. Prieto, der freigibt, und dem Grund. Mit › zu MSG-A-08 und MSG-A-13 navigieren (ausstehend).
4. **Eskalationen**: der Ring der Ursachen (G-02 62 %, G-04 20 %, G-05 11 %).
5. **Qualität der Prüfung**: Zeiten nach Intervall, 3,3 % der Freigaben in unter 30 Sekunden und die Tabelle pro Sachbearbeiter mit seiner KI-Schulung.
6. **Maßnahmen**: auf M-10 klicken (Schulung der Sachbearbeiter).

---

### Schritt 12 · Betrug: MSG-A-13, MSG-A-09 und MSG-A-02 (Min. 24-26)

**Bildschirm:** Menü → **Betrug**. Block **Risiko**.

**Kernsatz:** «Der Indikator beschuldigt nicht: Er priorisiert, und die Entscheidung trifft ein Mensch.»

| MSG-A-13 · WhatsApp · «Bei uns wurde eingebrochen» |
|---|
| «Hallo, bei uns wurde eingebrochen, während wir die letzten Tage weg waren 😡 Wir sind heute Morgen zurückgekommen, und alles ist durchwühlt, die Schubladen auf dem Boden. Sie haben Sachen mitgenommen, ich weiß noch nicht wie viel, wir schauen noch; ich glaube, der Schmuck meiner Frau und ein Laptop fehlen, aber ich bin mir nicht sicher. Der Schmuck ist wohl etwa 5.000 € wert, er war geerbt und wir haben keine Rechnungen. Ich weiß nicht, wie sie reingekommen sind, die Tür sieht gut aus, sie ist nicht aufgebrochen. Wir haben die Versicherung erst vor drei Wochen abgeschlossen, als wir umgezogen sind. Bei der Polizei waren wir noch nicht, ich weiß nicht, ob das nötig ist. Ich schicke Ihnen später eine Liste. Police HO-604118. Bitte schicken Sie heute jemanden vorbei, meine Frau ist sehr aufgeregt. Rufen Sie mich unter 655 330 219 an.» |
| **Ergebnis:** Hausrat · Zu prüfen (H4 und H7 verletzt) · Betrugsscore 90 · Szenario EF-01 · Warteschlange der SIU (G-10) |

| MSG-A-09 · Webformular · «Kaputte Fensterscheibe» (Auszug) |
|---|
| «Die Kinder des Nachbarn aus 2.º C haben […] mit einem Ball die Fensterscheibe im Wohnzimmer kaputt gemacht. Der Glaser, Cristalería Vallecas, hat mir 400 € inklusive Einbau genannt […]. Für die Zahlung lautet das Konto ES91 2100 0418 4502 0005 1332.» |
| **Ergebnis:** Hausrat · Freigegeben · Score 50 · in Beobachtung · EF-02: Dasselbe Konto taucht in MSG-A-02 und in einem früheren Schaden eines anderen Kontoinhabers auf · Zahlung von 400 € zurückgehalten (G-11) |

MSG-A-02 (geplatzter Schlauch, 1.080 €) verlangt die Zahlung auf dasselbe Konto: Score 35, ohne Hinweise, aber G-11 hält die Zahlung zurück. MSG-A-11 (Kratzer auf dem Parkplatz, Schritt 1): Score 50, in Beobachtung, früherer Kratzer auf demselben Parkplatz.

**Wozu dieser Bereich dient**

> Der Bereich Betrug bewertet jede Meldung anhand der Betrugsmuster, die die Gesellschaft bereits erkannt hat, und schickt die riskantesten Fälle an die Sonderermittlungseinheit. Wir wollen die zweifelhafte Zahlung stoppen, ohne den Kunden zu blockieren, der nichts falsch gemacht hat.

**Was es ist und was es tut**

> Um diese Muster zu erkennen, kombiniert die Plattform drei Quellen: was die KI aus der Schilderung des Kunden versteht, mit wörtlichen Zitaten aus der Meldung; die Historie von Policen, Schäden und Dienstleistern; und deterministische Regeln. Damit erhält jede Meldung einen Score von 0 bis 100. Unter 40 wird er nur protokolliert. Zwischen 40 und 69 wird bearbeitet, aber die Zahlung bis zur Prüfung zurückgehalten. Und ab 70 geht der Fall an die SIU.
>
> Die Historie kann auch abziehen: Widerspricht eine Angabe dem Hinweis, senkt dieses Gegenindiz den Score. Jeder Fall hat seine Karte mit der Aufschlüsselung nach Indikator, der Karte der Beziehungen zu anderen Schäden und der Nachverfolgung.

**Nutzen**

> Kein Schaden wird automatisch abgelehnt, und der Kunde sieht den Hinweis nie; erwähnt ihn ein an ihn gerichteter Text, blockiert ihn ein Guardrail. Riskante Fälle erreichen die SIU mit bereits vorbereiteter Karte.
>
> In der Demo sind 2.080 € zurückgehalten, und ein Cap überwacht dieses Geld, um rechtmäßigen Kunden nicht zu schaden. Und die 76 % Falsch-Positive erinnern uns daran, warum ein Indikator allein nie entscheidet.

**Vorschriften und warum sie wichtig sind**

- **DSGVO ErwG 47 · Betrugsprävention.** Er erkennt die Betrugsprävention als berechtigtes Interesse für die Datenverarbeitung an, sofern sie nötig und verhältnismäßig ist. **Risiko:** Ohne dokumentierte Rechtsgrundlage (das Panel hat sie beim DSB ausstehend, Maßnahme M-19) kann die Verarbeitung der Historie angefochten werden.
- **DSGVO Art. 22.** Ein Score kann einen Schaden nicht allein ablehnen. **Risiko:** Ein Falsch-Positiv, das eine Zahlung ohne menschliche Prüfung blockiert, ist eine unzulässige automatisierte Entscheidung und ein verlorener Kunde. Und erhält ein Kanal mehr Warnungen als ein anderer, wie WhatsApp, droht eine diskriminierende Behandlung (Maßnahme M-18).

**Klicks**

1. Die drei Stufen: ohne Hinweise (0-39), in Beobachtung (40-69), SIU (≥ 70).
2. KPIs: 13 analysiert, 3 mit Hinweisen, 2.080 € zurückgehalten in 3 Zahlungen, 80 an die SIU eskaliert in 14 Tagen, 21 % bestätigt, 76 % Falsch-Positive.
3. **Fälle des Stapels** → auf MSG-A-13 klicken: die Fallkarte. Aufschlüsselung des Scores nach Indikator (Police von 21 Tagen, vage Schilderung, keine Anzeige und keine Einbruchsspuren, Eile, 5.000 € Schmuck ohne Rechnung), die Meldung mit den markierten Zitaten und die Nachverfolgung.
4. Mit › zu MSG-A-09 navigieren: das geteilte Konto. Und zu MSG-A-04: der **Gegenindiz** (Pablo ist angegeben), das den Score auf 30 senkt.
5. **Betrugsszenarien** EF-01 bis EF-08: EF-02 öffnen.
6. **Beziehungskarte**: MSG-A-09 und MSG-A-02 über dasselbe Konto verbunden, mit einer Akte vom August eines anderen Kontoinhabers.
7. **Indikatorkatalog** → **Neuer Indikator**: Die Vorschau zeigt, welche Meldungen des Stapels ihn auslösen würden. Ohne Speichern schließen.
8. **Fairness nach Kanal**: WhatsApp erhält wegen seines Tons 1,8-mal mehr Warnungen (Maßnahme M-18).

**Falls gefragt wird:** Wie kommt ein neues Muster hinzu? Im Katalog, mit «Neuer Indikator»: Name, Gewicht und die auslösenden Sätze, mit einer Vorschau auf den Stapel vor dem Speichern.

---

### Schritt 13 · Reasoning und Replay (Min. 26-27:30)

**Bildschirm:** Menü → **Reasoning und Replay**. Block **Qualität**.

**Kernsatz:** «Wir auditieren, was passiert ist, und testen, bevor wir etwas ändern.»

**Hervorgehoben:** MSG-A-08 (Reasoning) und MSG-A-04 (Replay RP-0006).

**Wozu dieser Bereich dient**

> Der Bereich Reasoning und Replay zeigt uns, wie jeder Agent zu seinem Ergebnis kam, und lässt uns eine echte Spur mit einem anderen Modell oder einer anderen Prompt-Version wiederholen. So können wir jede Änderung mit echten Fällen testen, bevor sie den Kunden erreicht.

**Was es ist und was es tut**

> Das Reasoning wird Agent für Agent gezeigt: was er erhalten hat, welche Sätze der Meldung er als Beleg genutzt hat und was er geliefert hat. Wichtig: Das ist nicht die interne Gedankenkette des Modells, sondern der strukturierte Datensatz, den jeder Agent mit seinen Zitaten zurückgibt.
>
> Das Replay wiederholt eine echte Spur auf zwei Arten. Im Modus Identisch prüft es, dass sich das Ergebnis reproduzieren lässt. Im Modus What-if ändert es das Modell oder die Prompt-Version und zeigt uns den Unterschied in Entscheidung, Kosten und Latenz.

**Nutzen**

> Jeder Modellwechsel wird mit echten Fällen getestet, bevor er in Produktion geht. In der Demo behielt der Wechsel des Agenten Regeln auf gpt-5-mini die Entscheidung bei 82 % weniger Kosten; gpt-5-nano dagegen machte aus einer Freigabe ein Zu prüfen. Das Replay erkennt es, bevor der Kunde es merkt.
>
> Und wenn der Auditor kommt und fragt, warum eine Entscheidung getroffen wurde, steht die Antwort hier.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 15 · Genauigkeit und Robustheit.** Das System muss während seiner gesamten Lebensdauer eine angemessene Genauigkeit halten, auch nach Änderungen. In diesem Fall gute Praxis. **Risiko:** Ein Modellwechsel zum Sparen, der die Entscheidungen still verschlechtert, ohne dass es jemand merkt, bis die Beschwerden kommen.
- **DSGVO Art. 15.** Der Kunde kann die Logik der Entscheidung verlangen. **Risiko:** Ohne protokolliertes Reasoning wird die Erklärung improvisiert und passt nicht zu dem, was passiert ist.

**Klicks**

1. In der Liste auf MSG-A-08 klicken. Rechts die Kette der Agenten und die Meldung mit den Zitaten, die jeder Agent genutzt hat, in der Farbe des jeweiligen Agenten.
2. Pro Agent: Konfidenz nach Sparte (Kfz gegenüber Gesundheit), Herkunft jedes extrahierten Felds (wörtlich, normalisiert, abgeleitet oder null), Regelmatrix mit dem Weg zur Entscheidung und die Tokens gegenüber CAP-05.
3. Den mittleren Trenner ziehen, um das Reasoning zu verbreitern.
4. **Replay** → Modus **Identisch** → ausführen: gleiche Entscheidung.
5. Modus **What-if** → **Modell von Regeln: gpt-5-mini** → ausführen: der Unterschied in Sparte, Entscheidung, Kosten und Latenz.
6. **Replay-Verlauf**: RP-0006 (MSG-A-04 mit gpt-5-mini: gleiche Entscheidung, −82 % Kosten) und RP-0005 (gpt-5-nano machte aus einem Freigegeben ein Zu prüfen).

---

### Schritt 14 · Knowledge Bases (Min. 27:30-29)

**Bildschirm:** Menü → **Knowledge Bases**. Block **Qualität**.

**Kernsatz:** «Auch Wissen verschlechtert sich, und wir überwachen es genau wie die Agenten.»

**Hervorgehoben:** KB-02 Kfz-Bedingungen 2026, die der Agent Regeln bei Meldungen wie MSG-A-01 und MSG-A-04 abfragt, und KB-06 Werkstattnetzwerk.

**Wozu dieser Bereich dient**

> Im Bereich Knowledge Bases messen wir den Zustand des Wissens, das die Agenten abfragen: die Versicherungsbedingungen, das Handbuch der Schadenbearbeitung, das Netzwerk der Gesundheitsdienstleister oder das Werkstattnetzwerk. Das ist wichtig, denn so gut das Modell auch ist: Fragt es ein veraltetes Dokument ab, entscheidet es schlecht.

**Was es ist und was es tut**

> Jede Wissensdatenbank wird laufend anhand einer Rubrik bewertet, mit Metriken wie dem Recall oder den unbeantworteten Anfragen, und jede Metrik hat ihre Schwelle. Die Karte zeigt uns ihre Konfiguration, woraus sie gespeist wird und wie oft sie synchronisiert wird, ihre Versionen und einen Vergleich, der verschiedene Konfigurationen desselben Inhalts bewertet, um vor dem Anwenden die beste zu wählen.

**Nutzen**

> Mit alten Bedingungen kann der Agent einen Selbstbehalt oder einen Ausschluss anwenden, den es nicht mehr gibt. In der Demo hat die Datenbank der Kfz-Bedingungen 6 Punkte Recall verloren, weil 340 Dokumente von 2024 hineingerutscht sind, und ein Gültigkeitsfilter hebt ihn von 0,81 auf 0,88.
>
> Außerdem wird die Änderung gemessen, bevor sie veröffentlicht wird: Die Neuindexierung geht nur in Produktion, wenn sich die Rubrik nicht verschlechtert.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 10 · Daten und Daten-Governance.** Die Daten, mit denen das System arbeitet, müssen relevant, aktuell und kontrolliert sein. In diesem Fall gute Praxis. **Risiko:** Entscheidungen mit aufgehobenen Bedingungen, die der Versicherer korrigieren und entschädigen müsste.
- **DSGVO Art. 17 · Recht auf Löschung.** Verlangt ein Kunde die Löschung seiner Daten, müssen sie auch aus den Suchindizes gelöscht werden. **Risiko:** Das Handbuch der Schadenbearbeitung hat drei Fragmente mit echten Kundendaten; werden sie nicht aus dem Index entfernt, ist die Löschung unvollständig.

**Klicks**

1. KPIs: 9 Datenbanken (1 echt, 8 simuliert), 5 gesund, durchschnittlicher Recall 0,86, 3,27 % der Anfragen ohne Antwort, 6 Rubriken mit einer Übereinstimmung Judge–Mensch von 0,93.
2. Auf **KB-02 · Kfz-Bedingungen 2026** (beeinträchtigt) klicken: Reiter **Zustand**, jede Metrik gegenüber ihrer Schwelle; der Recall sinkt um 6 Punkte.
3. Reiter **Quelle und Synchronisierung**: die 340 Dokumente der Bedingungen 2024, die über einen schlecht gefilterten Ordner hereinkamen.
4. Reiter **Vergleich**: vier Konfigurationen, bewertet mit der Rubrik R-02; mit Gültigkeitsfilter steigt der Recall von 0,81 auf 0,88. **Anwenden**.
5. Reiter **Versionen**: «Zu dieser Version zurückkehren».
6. Mit › zu **KB-06 · Werkstattnetzwerk** (kritisch) navigieren: Die API antwortet mit 401, und 14 ausgeschiedene Werkstätten stehen noch als Vertragswerkstätten da.
7. **Rubriken** → eine bearbeiten: Die Gewichte müssen 100 ergeben, und es wird eine neue Version gespeichert. Ohne Speichern schließen.

---

### Schritt 15 · Compliance: das Thermometer (Min. 29-30:30)

**Bildschirm:** Menü → **Compliance**. Block **Compliance und Kosten**.

**Kernsatz:** «Die Lösung versetzt den Versicherer in die Lage, nachzuweisen, dass er die Vorschriften einhält.»

**Hervorgehoben:** MSG-A-12 im Inventar personenbezogener Daten.

**Wozu dieser Bereich dient**

> Der Bereich Compliance gibt uns ein regulatorisches Thermometer, mit dem wir verstehen, auf welchem Stand der Einhaltung wir beim AI Act, der DSGVO, DORA, EIOPA und Solvency II sind, und es wird aus allen Spuren berechnet, die das System erzeugt. Es sagt uns, wie viel wir heute nachweisen können und was uns fehlt.

**Was es ist und was es tut**

> Die Kontrollen sind nach Vorschrift gruppiert. Einige werden direkt in den Spuren gemessen, etwa dass jede Entscheidung ihren vollständigen Datensatz hat. Andere werden mit ihrem dokumentarischen Nachweis erklärt, etwa der Exit-Plan eines Anbieters. Eine Matrix sagt uns Artikel für Artikel, was die Vorschrift verlangt, wie die Lösung es umsetzt und welche Spuren es belegen.
>
> Wir haben auch das Inventar der personenbezogenen Daten jeder Meldung und die Integritätskette des Protokolls: Ändert jemand eine bereits versiegelte Spur, bricht die Kette ab diesem Punkt und das Thermometer wird rot.

**Nutzen**

> Die Abdeckung sagt uns, wie viel wir heute nachweisen können; in der Demo 87 %. Die gelben Kontrollen sind die Aufgabenliste, und sie sind echt, etwa die ausstehende Folgenabschätzung oder der fehlende KI-Hinweis in WhatsApp. Das Panel beschönigt nichts.
>
> Ein manipulierter Datensatz wird sofort erkannt, und deshalb kann ein Auditor der Historie vertrauen. Es ist kein Zertifikat, aber es ist der Nachweis, den der DSB braucht, mit jeder Spur neu berechnet.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 35 · Datenschutz-Folgenabschätzung (DSFA).** Pflicht, wenn Gesundheitsdaten in großem Umfang mit neuer Technologie verarbeitet werden. **Risiko:** Ohne aktuelle DSFA zu verarbeiten, ist bereits ein Verstoß, auch ohne Vorfall.
- **AI Act art. 50 · Transparenz gegenüber dem Kunden.** Wer mit einer KI spricht, muss es wissen. **Risiko:** In WhatsApp steht der Hinweis noch aus; ein Kunde, der nicht wusste, dass ihn eine KI bedient, kann sich beschweren.
- **Integrität des Protokolls (AI Act art. 12, DSGVO Art. 32).** **Risiko:** Ein Protokoll, das sich ohne Spuren ändern lässt, ist als Beweis wertlos.

**Klicks**

1. Kopfbereich: Abdeckung 87 %, 26 Kontrollen abgedeckt und 9 teilweise, 14 in den Spuren gemessen und 21 erklärt.
2. Die vier Thermometer: AI Act 86 %, RGPD 87 %, DORA 100 %, EIOPA und Solvencia II 80 %. Auf eines klicken, um die Matrix zu filtern.
3. **Matrix Vorschrift → Kontrolle**: Filter **Nur teilweise**. Auf die DSFA (RGPD art. 35) und den KI-Hinweis in WhatsApp (AI Act art. 50) hinweisen.
4. **Lebenszyklus einer Spur**: die acht Schritte mit ihrer Vorschrift und ihrer Frist.
5. **Inventar personenbezogener Daten** → auf MSG-A-12 klicken: der Text mit den markierten Daten und sein Block `_gobernanza`.
6. **Integrität des Protokolls** → **Manipulation simulieren**: Die Kette bricht und das Thermometer wird rot. Rückgängig machen.
7. **Compliance-Nachweise exportieren** (optional).

**Falls gefragt wird:** Ist die Triage nach dem AI Act Hochrisiko? Nein. Anhang III umfasst nur Preisgestaltung und Risikobewertung in Leben und Gesundheit. Wir wenden die Artikel 9 bis 15 als gute Praxis an.

---

### Schritt 16 · FinOps (Min. 30:30-32)

**Bildschirm:** Menü → **FinOps**. Block **Compliance und Kosten**.

**Kernsatz:** «Wir wollen nicht das günstigste Modell, sondern das günstigste Modell, das uns die höchste Qualität liefert.»

**Hervorgehoben:** der Agent Regeln und die Spur von MSG-A-08.

**Wozu dieser Bereich dient**

> Im Bereich FinOps steuern wir die Ausgaben sekundengenau und über Aktionen. Die Anbieter von KI-Diensten für Unternehmen sagen uns alle 8 Stunden, wie viel wir ausgegeben haben, und in dieser Zeit kann viel passieren: Wir können morgens mit Ausgaben aufwachen, die wir nicht wollten. Hier sehen wir live, wie viel wir pro Agent, pro Modell und pro Token-Art ausgeben, und die Caps handeln selbst, sobald sie überschritten werden.

**Was es ist und was es tut**

> Jede Entscheidung addiert ihre Kosten in dem Moment, in dem sie entsteht, denn die Spur erfasst die Tokens jedes Agenten und die Plattform multipliziert sie mit dem Preis seines Modells. Die Caps wirken auf diese Kosten: pro Agent, global, pro Meldung und für Reasoning-Tokens. Jedes Cap hat eine verknüpfte Aktion. Wird eines überschritten, erklärt die Warnung, was passiert ist, was das System automatisch getan hat, zum Beispiel bis Mitternacht auf ein günstigeres Modell zu wechseln, ohne den Dienst anzuhalten, und welche Aktion es vorschlägt.
>
> Die Ausgaben werden nach Token-Art aufgeschlüsselt, um zu verstehen, woher sie kommen. Und eine Tabelle kreuzt Kosten und Qualität jedes Modells: was es kostet und wie oft es eine gültige Antwort liefert, ohne Wiederholungen und stabil im Replay.

**Nutzen**

> Wir warten keine 8 Stunden, bis der Anbieter uns sagt, was passiert ist: Das Cap greift bei derselben Meldung, die es überschreitet. In der Demo hat der Agent Regeln sein Cap überschritten, und das System hat selbst das Modell gewechselt, ohne den Dienst anzuhalten. Die Ausgaben des Monats liegen bei 296 € von 500 €, mit einer Prognose von 428 €, und es gibt keine Überraschungen auf der Rechnung.
>
> Und wir wissen genau, wo wir ansetzen müssen: Der Agent Regeln verursacht 80 % der Ausgaben, und darin wiegt am meisten der Text, den gpt-5 erzeugt. Die Empfehlungen sagen uns, wie viel jeder Hebel spart.

**Vorschriften und warum sie wichtig sind**

- **Solvency II Art. 41 · Governance-System.** Der Versicherer muss eine solide und umsichtige Geschäftsführung haben, mit Kontrolle seiner operationellen Risiken. **Risiko:** KI-Ausgaben, die unkontrolliert wachsen, sind ein nicht gesteuertes operationelles Risiko, und die Aufsicht kann es bei der Prüfung des Governance-Systems beanstanden.

**Klicks**

1. KPIs: Kosten heute 17,33 € (87 % des Tages-Caps von 20 €), Monatskosten 296,40 € von 500 € mit einer Prognose von 428 €, 3 Caps überschritten, 0,0128 € pro Meldung. Auf **Monatskosten** klicken: das Fenster mit dem Detail.
2. **Wie sich die Ausgaben jedes Agenten entwickeln**: die Zeile Regeln in Rot (13,70 € / 12 €, 80 % des Gesamtbetrags).
3. **Wohin das Geld geht und warum**: Bei Regeln macht die Ausgabe von gpt-5 63 % seiner Kosten aus. Schaltfläche **€ / %**.
4. **Kostenwarnungen**: CAP-03 (was es selbst getan hat: Herabstufung auf gpt-5-mini bis 00:00) und CAP-04/CAP-05 bei MSG-A-08.
5. **Konfigurierte Caps** → auf **CAP-03** klicken: die Karte mit den beteiligten Agenten und dem Verlauf der Überschreitungen. **Neues Cap** (optional, ohne Speichern schließen).
6. **Modelle**: Preis, Aufrufe, Tokens, Kosten, p95 und Qualität (gültiges JSON, ohne Wiederholung, stabil im Replay, Genauigkeit). Auf eine Legende eines Diagramms klicken, um eine Reihe auszublenden.
7. **Empfehlungen**: R-01 bis R-04.

---

### Schritt 17 · Korrekturmaßnahmen (Min. 32-33:30)

**Bildschirm:** Menü → **Korrekturmaßnahmen**. Block **Verbesserung und Audit**.

**Kernsatz:** «Kosten unter Kontrolle und jedes Problem mit seinem Verantwortlichen.»

**Hervorgehoben:** M-01 (kommt aus dem Replay von MSG-A-04), M-02 (kommt aus der Spur von MSG-A-08) und M-10.

**Wozu dieser Bereich dient**

> Der Bereich Korrekturmaßnahmen versammelt in einer einzigen Liste die Probleme, die der Rest des Panels erkennt, jedes mit seinen Alternativen, seiner Ersparnis und wer sie genehmigen muss. Wir wollen, dass jedes Problem einen Verantwortlichen, eine Alternative und eine Prüfung hat.

**Was es ist und was es tut**

> Die Liste umfasst Kosten, Wissen, Compliance, Qualität und Resilienz. Jedes Problem kommt aus einem anderen Bereich des Panels und bringt mehrere Alternativen mit, die empfohlene markiert: ihre Wirkung, ihre Nebenwirkung, der Aufwand, wer sie genehmigt und wie sie vor dem Anwenden validiert wird.
>
> Von hier aus können wir eine Alternative simulieren, anwenden oder ihre Genehmigung anfordern und sie bei Bedarf rückgängig machen. Wird eine Maßnahme verifiziert, aktualisiert sich das Compliance-Thermometer von selbst.

**Nutzen**

> Jede Ersparnis ist belegt. In der Demo wird die Maßnahme, die die einfachen Fälle auf gpt-5-mini verlegt, mit einem Replay validiert, das keine Entscheidung geändert hat, und beim Anwenden steigt die erzielte Ersparnis um 237 € im Monat.
>
> Was eine Genehmigung braucht, wartet auf den KI-Ausschuss, und alles wird protokolliert.

**Vorschriften und warum sie wichtig sind**

- **AI Act art. 9 · Laufendes Risikomanagement.** Erkannte Risiken müssen Maßnahmen und Nachverfolgung haben. **Risiko:** Ein erkanntes Problem ohne Verantwortlichen wiegt bei einer Prüfung schwerer als ein unbekanntes, weil es zeigt, dass es bekannt war.
- **DSGVO Art. 5.2.** **Risiko:** Ohne Protokoll dessen, was korrigiert wurde und wer es genehmigt hat, lässt sich die Sorgfalt nicht nachweisen.

**Klicks**

1. KPIs: 19 offene Maßnahmen (2 kritisch), **erzielte Ersparnis 0 €/Monat von möglichen 278 €**, 9 regulatorische Risiken, 4 zu bereinigende Wissensdatenbanken. Der Kreis des Thermometers oben rechts.
2. Filter: **Kosten** und **Quick Wins**. Entfernen.
3. Karte **M-01 · Regeln überschreitet sein Tages-Cap**: drei Alternativen, die empfohlene «gpt-5-mini für die direkte Freigabe verwenden» (−237 €/Monat, validiert mit dem Replay RP-0006). Auf die Karte klicken: die Karte mit den Alternativen nebeneinander.
4. **Simulieren** → **Anwenden**: Die erzielte Ersparnis steigt auf 237 €/Monat.
5. **M-02 · Kosten und Reasoning bei MSG-A-08** → **Genehmigung anfordern**: Sie bleibt «Ausstehend beim KI-Ausschuss» (41 € ausstehend).
6. **Rückgängig** bei M-01: Die Ersparnis geht auf null zurück. Erneut anwenden.
7. Auf den Kreis des Thermometers klicken (führt zu Compliance) oder auf M-10 (Schulung der Sachbearbeiter).

---

### Schritt 18 · Historie (Min. 33:30-34)

**Bildschirm:** Menü → **Historie**. Block **Verbesserung und Audit**.

**Kernsatz:** «Das ist das Logbuch, das die Aufsicht verlangt, und es füllt sich von selbst.»

**Wozu dieser Bereich dient**

> Die Historie ist die Zeitleiste von allem, was sich im System geändert hat, mit Urheber und Uhrzeit. Sie dient jedem Auditor als Logbuch, und niemand muss sie von Hand führen.

**Was es ist und was es tut**

> Sie protokolliert jede Aktion mit Nutzer und Uhrzeit: angehaltene Agenten, ein- oder ausgeschaltete Guardrails, angewandte oder rückgängig gemachte Maßnahmen, Prüfungen, Overrides, Wechsel von Modell, Prompt und Stufe sowie Vorfälle. Sie lässt sich nach Ereignistyp filtern.

**Nutzen**

> Ein Auditor sieht jede Änderung mit Urheber und Datum, und niemand muss aus E-Mails rekonstruieren, was passiert ist. Alles, was wir in dieser Demo angefasst haben, steht schon hier.

**Vorschriften und warum sie wichtig sind**

- **DSGVO Art. 5.2 und AI Act art. 12.** Es muss sich nachweisen lassen, wer was wann geändert hat. **Risiko:** Ohne Nachvollziehbarkeit der Änderungen lässt sich ein Fehler weder zuordnen noch an der Wurzel korrigieren, und der Versicherer kann nicht nachweisen, dass er sorgfältig gehandelt hat.

**Klicks**

1. Die Zeitleiste: oben, was in der Demo mit dem Nutzer «Operator (diese Sitzung)» getan wurde: der Kill Switch von Extraktion, M-01 angewandt und rückgängig gemacht, M-02 ausstehend, die auf KB-02 angewandte Konfiguration.
2. Typ-Chips: **Betrieb**, **Richtlinien**, **Overrides** (die von J. Herrera und S. Gil am 15/09, dem Tag, an dem Regeln eine Stufe abstieg), **Prüfungen** (die von L. Prieto zu MSG-A-04), **Deployments** (Wechsel von Modell und Prompt), **Vorfälle** (die Häufung von 429-Fehlern).

---

## 7. Abschluss (Min. 34-35)

**Bildschirm:** `gobierno.html` → **Historie**.

**Kernsatz:** «Was KI in Produktion bringt und dort hält, ist die Governance.»

> Wir haben 13 Meldungen über fünf verschiedene Kanäle hereinkommen sehen. 10 wurden selbstständig freigegeben und 3 gingen an einen Menschen, jede mit ihrem Grund und dem Satz des Kunden, der ihn belegt. Wir haben auch einen Fall gesehen, der an die SIU geht, und drei zurückgehaltene Zahlungen, ohne jemanden zu blockieren.
>
> Und um all das herum die Governance: Agenten mit ihrer Autonomiestufe, ihren Berechtigungen und ihrem Verantwortlichen; Guardrails, mit denen die Regeln des Versicherers Vorrang vor dem Modell haben; ein Budget, das jeden Tag gesteuert wird; und eine Spur für jede Entscheidung, mit der wir nachweisen können, wie entschieden wurde.
>
> KI zur Zuordnung von Meldungen ist bereits in Ihrer Reichweite. Was sie in Produktion bringt und dort hält, ist das hier.
>
> Und es ist keine Idee auf dem Papier: Es ist das, was Logicalis bei Kunden aus verschiedenen Branchen umsetzt, angepasst an die Prozesse, Regeln und Vorschriften jedes einzelnen.

---

## Anhang A · Die 13 Meldungen von Paket A

| Meldung | Kanal | Betreff | Sparte | Entscheidung | Grund | Betrug | Schritt |
|---|---|---|---|---|---|---|---|
| MSG-A-01 | E-Mail | Leichter Auffahrunfall auf der M-30 | Kfz | Freigegeben | Leichter Zusammenstoß mit Unfallbericht, keine Verletzten, 1.350 € | — | 3, 14 |
| MSG-A-02 | Web | Geplatzter Schlauch unter der Spüle | Hausrat | Freigegeben | Plötzlicher Wasserschaden, 1.080 € | 35 · Zahlung zurückgehalten (G-11) | 12 |
| MSG-A-03 | Chat | Notaufnahme wegen einer Verstauchung | Gesundheit | Freigegeben | Notaufnahme in einem Krankenhaus des Netzwerks | — | — |
| MSG-A-04 | E-Mail | Schaden am Auto in einem Parkhaus | Kfz | Zu prüfen → Freigegeben (Prüfung durch L. Prieto) | A3: Fahrer nicht angegeben; L. Prieto prüft, dass er es ist | 30 · Gegenindiz | 11, 12, 13 |
| MSG-A-05 | Web | Überspannung | Hausrat | Freigegeben | Anerkannter Elektroschaden, 640 € | — | — |
| MSG-A-06 | E-Mail | Röntgen und Blutuntersuchung verordnet | Gesundheit | Freigegeben | Einfache Untersuchungen ohne Vorabgenehmigung | — | — |
| MSG-A-07 | Chat | Windschutzscheibe durch Kies beschädigt | Kfz | Freigegeben | Windschutzscheibe in einer Vertragswerkstatt, 280 € | — | — |
| MSG-A-08 | Telefon | Motorradunfall mit Krankenhausaufenthalt | Kfz | Zu prüfen | A5 und G-04: Verletzter im Krankenhaus und ein Dritter | — | 1, 4, 6, 8, 10, 13, 16, 17 |
| MSG-A-09 | Web | Kaputte Fensterscheibe | Hausrat | Freigegeben | Fensterscheibe 400 € mit Foto und Kostenvoranschlag | 50 · in Beobachtung · geteiltes Konto | 12 |
| MSG-A-10 | E-Mail | Notaufnahme wegen eines Asthmaanfalls | Gesundheit | Freigegeben | Notaufnahme in einem Krankenhaus des Netzwerks; Fehler 429 mit Wiederholung | — | 8 |
| MSG-A-11 | WhatsApp | Kratzer an der Tür auf einem Parkplatz | Kfz | Freigegeben | Vandalismus mit Anzeige, 600 € | 50 · in Beobachtung · früherer Kratzer | 1, 12 |
| MSG-A-12 | WhatsApp | Sohn in der Notaufnahme nach Sturz mit dem Roller | Gesundheit | Freigegeben | Kindernotaufnahme; Daten eines Minderjährigen und Gesundheitsdaten | — | 5, 15 |
| MSG-A-13 | WhatsApp | Bei uns wurde eingebrochen | Hausrat | Zu prüfen | H4 und H7: keine Anzeige und keine Einbruchsspuren, Schmuck ohne Rechnung, Police von 3 Wochen | 90 · SIU (G-10) | 2, 11, 12 |

## Anhang B · Spickzettel der Zahlen

| Thema | Zahl | Wo sie erscheint |
|---|---|---|
| Stapel | 13 Meldungen · 10 freigegeben · 3 zu prüfen | Triage |
| Effektive Autonomie (14 Tage) | 81 % · 13.540 von 16.720 | Übersicht, Autonomie |
| An einen Menschen eskaliert | 19 % · 3.180 · G-02 62 %, G-04 20 %, G-05 11 % | Menschliches Eingreifen |
| Override | 2,1 % · Ziel ≤ 3 % · Regeln fiel auf L2 bei 4,1 % | Autonomie |
| Expressprüfungen | 3,3 % in unter 30 s · Maximum 5 % | Menschliches Eingreifen |
| Guardrails | 11 von 12 aktiv · 454 Auslösungen · G-02 mit 118 | Guardrails |
| Monatskosten | 296,40 € von 500 € · Prognose 428 € | FinOps |
| Aktive Warnungen | 11 · 3 kritisch · Kosten 3, Betrug 3, Wissensdatenbanken 3, Compliance 2 | Übersicht |
| Agent Regeln | 13,70 € von 12 € heute · 80 % der Ausgaben · 0,011 €/Meldung mit gpt-5 | FinOps, Agenten |
| Teuerste Spur | MSG-A-08 · 0,062 € · 2.610 Reasoning-Tokens | Nachvollziehbarkeit |
| Replay RP-0006 | gpt-5-mini in Regeln · gleiche Entscheidung · −82 % Kosten | Reasoning und Replay |
| Ersparnis M-01 | 237 €/Monat (278 €/Monat mit M-02) | Korrekturmaßnahmen |
| Betrug | 3 mit Hinweisen · 1 bei der SIU · 2.080 € zurückgehalten · 76 % Falsch-Positive | Betrug |
| Knowledge Bases | 5 von 9 gesund · KB-02 −6 Punkte Recall · Vergleich 0,81 → 0,88 | Knowledge Bases |
| Compliance | 87 % · 26 abgedeckt · 9 teilweise · DORA 100 % | Compliance |

## Anhang C · Feinheiten, um nicht in Schwierigkeiten zu geraten

- **Die Triage ist nach dem AI Act kein Hochrisiko.** Anhang III 5(c) umfasst Preisgestaltung und Risikobewertung in Leben und Gesundheit. Die Hochrisiko-Pflichten wurden auf den 2. Dezember 2027 verschoben. Das Argument von heute sind DSGVO, DORA und EIOPA; der AI Act wird als gute Praxis angewandt.
- **Nicht sagen «so etwas gibt es auf dem Markt nicht».** Es gibt Werkzeuge für Modell-Observability und GRC-Plattformen. Was es nicht gibt, ist eine Governance, die an Prozess, Regeln und Kosten jedes Versicherers gebunden ist: Das ist Implementierung.
- **Marktzahlen.** Belegt: 11 Mio. und einer alle 3 s (UNESPA), über 90 % der Versicherer erproben KI (Conning), über 40 % der agentischen Projekte eingestellt (Gartner). Die 10 % der Prämie sind eine Zahl aus den USA. Nicht belegt und aus dem Leitfaden gestrichen: die 4 % der Agenten in Produktion und die Ersparnis von 25-30 % von McKinsey.
- **Demodaten.** Erfunden und stimmig mit Paket A. Die Änderungen im Panel sind simuliert und gehen beim Schließen des Tabs verloren.
- **Betrug.** Immer von «Hinweisen» und einem «passenden Muster» sprechen. Nie von «Betrug» oder «Ablehnung», wenn es um einen konkreten Fall geht.

## Anhang D · Version in 20 Minuten

| Streichen oder kürzen | Ersparnis |
|---|---|
| Einführung: in Die Lösung 2.1, 2.2, 2.3 und einen Satz pro Idee aus 2.4 behalten | 2 Min. |
| Schritt 3 (Akte von MSG-A-01): nur den Reiter Anhänge zeigen und die Belege für Schritt 4 lassen | 1 Min. |
| Eintritt in das Panel (6.0) und «Wozu dieser Bereich dient»: nur den ersten Satz lesen | 1,5 Min. |
| Autonomie und Guardrails (Schritte 9 und 10) in 1,5 Min. zusammenfassen | 1 Min. |
| Schritt 14 (Knowledge Bases): nur der Vergleich von KB-02 | 1 Min. |
| Schritt 15 (Compliance): nur «Manipulation simulieren» | 1 Min. |
| Schritt 18 (Historie) innerhalb des Abschlusses | 0,5 Min. |
