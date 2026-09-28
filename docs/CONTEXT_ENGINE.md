# Context engine

Implemented locally on 28 September 2026 following the user's request to use time, location and routine to frame the patient's intended message. It supplies hypotheses for the person's review, not a determination of intent.

## Data flow

1. The browser snapshots the current fragment/topic/object, optional partner question, local clock, manually selected place, listener and permitted personal context. Source switches can remove time, place or routines. Context is rebuilt for each generation; changing caregiver settings or partner question invalidates pending/unselected output.
2. Reviewed weekly routines match actual occurrences on the previous/current/next calendar day, the selected 15/45/90-minute window and optional place. Unreviewed, invalid and wrong-place records are excluded. Sample seed routines are usable in demo mode only until a reviewed save explicitly makes them personal. No GPS, geofencing or automatic routine learning is added.
3. Before transmission, the existing allowlist removes personal and recent context unless separately enabled. Cloud generation additionally needs the device's chosen-provider permission. Keys, photos, recordings and the full history database never enter this packet.
4. Shared `deriveContextSignals` prioritizes up to three relevant routine hints using topic/word overlap, time proximity and matching place. Comparable competing routines remain ambiguous. Grammar words are not evidence of relevance. An explicit named object, refusal, uncertainty or temporal qualifier outranks a routine. Missing context stays unknown.
5. The chosen LLM receives the situation summary and exact allowed evidence sources in one bounded structured request. A unique nonclinical routine can support a draft resolving an underspecified category or “usual” reference; an explicit “here” can use the selected place. It cannot prove a completed event, medication need or treatment. Medication/pain routines and labels with known clinical cues are not expansion evidence. A Food/Drink category alone cannot establish that an unfamiliar label names food or drink: expansion needs known vocabulary anchors, and unknown words within mixed labels cannot be quoted as evidence. This is bounded filtering, not exhaustive medical classification; unfamiliar foods may need another word from the person.
6. Shared validation checks evidence, unsupported details, language, polarity, side, quantity, explicit qualifiers and repeated/rejected meanings. Generated output is tied to the actual privacy-filtered request, including its time/place/routine/question snapshot. The browser revalidates using that same packet. Catalog/memory choices retain their separate local context.
7. The patient sees labelled drafts, may inspect context clues, rejects with “None of these,” or taps the exact sentence to speak. There is no automatic speech or silent selection.

## Caregiver controls

The PIN-protected Context engine tab manages current place, clock source, context switches and routine window. The weekly editor bounds the list to 32 activities, validates HH:mm and selected weekdays, prevents overlapping duplicate entries and resets review when editing. Delete supports undo. Routine saves and context settings saves are explicit independent operations. Personal-context sharing is the same switch as Personalize, not a second hidden permission.

The demo clock intentionally advances from its saved anchor. Routine matching checks the occurrence's weekday across midnight. A clinic-only activity cannot appear merely because its time is near while the selected place is home. Historical confirmed messages remain limited to three within ten minutes with the same listener/place/language.

## Design basis and limits

ASHA's [AAC practice guidance](https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/) discusses individual communication needs across environments and communication partners. The Aphasia Institute's [communication resources](https://www.aphasia.ca/health-care-providers/resources-and-tools/free-resources/) include ways to verify the topic and shared message. These inform personalization and patient confirmation; they do not validate Sollu's ranking algorithm or LLM outputs.

The ranking weights and lexical checks are engineering heuristics, not calibrated probabilities. A model can still misread context or mistranslate Tamil. Evidence translations are authored by the model itself. Live provider sentence quality, real-phone usability and native-speaker/SLP/patient review remain pending. A routine schedule is never evidence of a symptom, completed activity or medication instruction. No treatment, recovery, diagnosis or emergency claim is made.
