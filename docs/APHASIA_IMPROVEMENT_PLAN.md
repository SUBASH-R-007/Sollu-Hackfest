# Sollu: researched improvement plan

**Date:** 28 September 2026. **Status:** phases 1–5 and expanded vocabulary approved by the user's “go” on 28 September 2026. Implementation and verification are recorded in PROGRESS.md. The research review itself was read-only; implementation began after approval. Human language, clinical and patient checks remain separate from software completion.

## Recommended direction

Make Sollu a dependable, personal communication aid: preserve what the person means, make misunderstandings easy to repair, and offer several ways to communicate. Add useful widgets within a calm interface. Treat successful, patient-endorsed communication as the goal; speed is secondary.

Continue the existing constraints: no paid API requirement, no hosting work, Tamil and English first, local data by default, exact-sentence confirmation before speech, no remote patient speech, honest recording/device/model labels. Generative voice cloning is not part of this proposal. The first implementation should cover phases 1–5 below; supervised practice is a separately approved extension.

## Research that changes the design

| Evidence | Implication for Sollu | Boundary |
| --- | --- | --- |
| Aphasia can affect expression, comprehension, reading and writing differently. Aphasia itself does not imply cognitive impairment. [ASHA Aphasia](https://www.asha.org/practice-portal/clinical-topics/aphasia/) | Configure support by the person's abilities and preferences; offer text, photos, pointing, listening and partner support. Retain an adult tone. | A diagnosis label cannot determine the correct interface. |
| Current Canadian guidance recommends supported-conversation training, accessible information and culturally relevant communication supports. [Canadian Stroke Best Practices, 2025](https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication) | Include a partner view with one question at a time, waiting and verification. | Guidance supports these practices, not the efficacy of this app. |
| Supported Conversation emphasizes keywords, pictures, gesture, sufficient response time and checking shared meaning. [Aphasia Institute](https://www.aphasia.ca/communication-tools-communicative-access-sca/) | Add a repair panel, shared topic card and ways to indicate uncertainty or change one's mind. | Avoid patronizing or excessive prompting; do not claim certified SCA training. |
| AAC selection should consider meaningful vocabulary, sensory/motor access, symbol comprehension and the person's preferences. [ASHA AAC](https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/) | Use a configurable access profile and personal vocabulary. Test different presentation sizes. | There is no universal evidence-based number of choices for every person. |
| An eight-person study supported personal contextual photographs for a word-picture task; a five-person study found variable benefits from personal photos/text in narrative retelling. [McKelvey et al., 2010](https://pubmed.ncbi.nlm.nih.gov/20139353/), [Dietz et al., 2014](https://pubmed.ncbi.nlm.nih.gov/25420490/) | Trial personal photo scenes and story cards alongside ordinary symbol grids. | Small studies; photos will not necessarily help every person or every task. |
| Big CACTUS found gains in practiced word finding without corresponding conversation improvement. [Primary trial, 2019](https://www.sciencedirect.com/science/article/pii/S1474442219301929) | Separate practice scores from real communication outcomes. | This was rehabilitation software; it neither proves nor disproves Sollu's assistive value. |
| Consistent design, understandable labels and usable controls support access. [W3C familiar design](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p02-familiar-design/), [consistent help](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help) | Keep button positions stable, reduce decorative text and make Help/Stop predictable. | Cognitive accessibility guidance is useful design guidance, not a claim that aphasia means cognitive impairment. |
| Communication, language and quality of life require distinct evaluation. ROMA-2 selected the Scenario Test for communication research but identifies language/ceiling limitations. [ROMA-2](https://pubmed.ncbi.nlm.nih.gov/36583427/) | Evaluate intended meaning and partner understanding, not only taps or audio start. | Do not translate a clinical scale into Tamil and label it validated. |

The widgets below are design proposals informed by this evidence. None currently has demonstrated clinical benefit in Sollu. Research into clinical therapy does not justify an autonomous therapy bot, diagnostic score, capacity judgment or recovery claim.

## Current application audit

The existing 66 unit tests and 19 browser tests are useful engineering evidence. They do not cover all semantic failures. Read-only inspection and synthetic probes identified these immediate regression cases:

| Priority | Current issue | Required behavior |
| --- | --- | --- |
| P0 | `no water` can produce a request for water | Preserve explicit negation; ask a short clarification when scope is uncertain. |
| P0 | Tamil pain follow-ups use arm wording even when the selected body part is the leg; English gloss can disagree | Render both languages from the same body-part/side/action record. Never silently replace shoulder with arm. |
| P0 | Saved-phrase offline fallback can repeat options after None of these | Apply the same rejection and duplicate checks to online, offline, memory and cached results. |
| P0 | A learned `table → cable` association can still activate the medicine mock branch | Resolve the actual approved mapping and its context; never infer medication from the existence of any mapping. |
| P0 | Generic phone/TV routing can override a request involving a contact other than the special-cased name | Resolve the actual named contact and requested action before broad keyword routing. |
| P0 | Different free-text intent labels allow near-identical water requests through | Deduplicate meaning, not just text or the label the model invented. |
| P0 | The name guard checks known contacts but does not establish support for an arbitrary new name | Require referenced entities to exist in permitted input/context and survive server-side validation. |
| P0 | Competing `lang` and `outputLang` values can cause the wrong output language | Establish one authoritative language contract; derive display and audio from it. |
| P1 | Zero-relevance memories can enter examples; familiar wording is not sufficiently scoped to listener/place | Use relevance thresholds, applicability and explicit approval; exclude unrelated memories. |
| P1 | Speaker gender/dialect are fixed assumptions; navigation remains mostly English in Tamil mode | Add optional speaker preferences and complete reviewed UI localization. Unknown attributes stay unknown. |
| P1 | Help quick strip is Home-only; mobile decoration pushes primary actions down the page | Put essential communication controls in a predictable, reachable location. |
| P1 | Speech capture uses a fixed pause/clip limit; user pacing and draft continuation are limited | Adjustable pacing with an explicit finish action and preserved draft when recording stops. |
| P1 | The baseline board uses English words and English output | Compare like-for-like language, vocabulary, partner support and familiarity. |
| P1 | Provider schema/evaluation require three labels; an unsuccessful repair can discard valid initial cards | Permit zero to three results, retain validated partial results, and evaluate actual displayed meanings. |

Primary implementation locations: `packages/shared/src/mock.ts`, `packages/shared/src/schemas.ts`, `apps/server/src/lib/validation.ts`, `apps/web/src/state.tsx`, `apps/web/src/lib/context.ts`, `apps/web/src/features/demo/service.ts`, `apps/web/src/pages/Patient.tsx`, `apps/web/src/App.tsx` and `apps/web/src/styles.css`.

## Accuracy and non-repetition design

### 1. Prefer controlled, meaningful options

Build a reviewed bilingual intent/phrase catalog for frequent communication: requests, refusals, questions, opinions, social connection and repair. Common needs and sensitive health-related communication use this catalog first. Every template has a stable ID, language variants, required slots, allowed evidence sources and review status.

The free local model may propose intent IDs and slot references. It does not get authority to invent patient facts. Keep optional free-form generation clearly separate and disabled for sensitive factual claims until evaluated. A schema constrains structure; it does not establish meaning or truth. [Ollama structured-output documentation](https://docs.ollama.com/capabilities/structured-outputs)

### 2. Use structured meaning and evidence

Extend the candidate contract with `intentId`, `speechAct`, `polarity`, `subject`, `objectId`, `bodyPart`, `side`, `timeScope`, `requestedAttribute`, `evidenceRefs`, `templateVersion` and `source`. Not every field applies to every message.

Store context items with who supplied them, when, their scope and whether the person confirmed them. An entity's existence does not prove an event happened. A night routine does not prove a tablet was taken, missed or exhausted; seeing a bottle does not prove it is empty. A partner question is context, not an answer supplied by the patient.

Priority: explicit current patient choices/corrections and current input constrain suggestions. Optional confirmed personal context can help rank them. Historical routine and memory cannot override a current refusal. Conflicting or unclear evidence prompts clarification rather than an arbitrary winner. Untrusted model-provided evidence IDs are checked against actual allowed values; their presence alone is not evidence.

### 3. Validate every route before display and signing

Use one shared policy module for mock, catalog, local model, memory, phrase retrieval and rehearsal results. Apply shape checks, slot/entity support, language agreement, negation/side/time consistency, exact duplicates, semantic duplicates and turn-level rejection history. Recheck after inserting a familiar phrase, not only before insertion.

Deduplicate using canonical meaning keys and reviewed synonym maps. Optional multilingual similarity can flag likely paraphrases for additional checks, but similarity alone must not merge opposite meanings. Keep rejected meaning IDs during the current attempt so a reworded rejection does not return. Provide Back/Undo if the person wants to reconsider.

Distinguish three cases: repeated meaning should collapse; unsupported contradiction should be removed; deliberate alternatives such as Yes/No or mild/strong pain can remain when the interface is explicitly asking the person to choose that attribute. Choices are possibilities, not simultaneous factual assertions.

### 4. Ask less, but ask when necessary

Show one to three supported options; never manufacture a third card. When meaning cannot be established, show one short clarification with Not sure, Something else and a route to drawing/typing. No required answer, countdown or forced confirmation.

Change the local-provider contract from required `c1/c2/c3` to zero-to-three structured candidates plus a clarification/abstention result. Return internal drop reasons. Allow one bounded repair with the failed candidates and reasons; preserve already valid results if repair times out or fails. Respect one total request deadline and cancellation across attempts, with no patient text in server logs.

Examples:

| Input | Proposed handling |
| --- | --- |
| `no water` | Preserve refusal; do not offer an affirmative request as the main meaning. |
| `bottle` | Clarify whether the person wants to drink, find it or say something else; do not assert it is empty. |
| left leg pain | Keep left + leg throughout all rounds, languages, previews and recordings. |
| three paraphrases of a water request | Show one request card, then other genuinely supported meanings or fewer cards. |
| already rejected an option | Suppress its paraphrases for this attempt, with Undo available. |
| uncertain medicine fragment | Offer communication about the medicine without inventing a dose, adherence event or supply status. |

### 5. Preserve patient control at playback

Continue the existing trusted exact-sentence tap gate. Any changed word, translation, listener, selected slot or regenerated card invalidates an old audio authorization. Preview remains explicit and uses a neutral channel. Photos, partner messages, restored drafts and background caching never autoplay. Hide technical policy reasons from the patient flow; expose them in caregiver/developer review tools.

## Vocabulary expansion — added at the user's request

Vocabulary is a core workstream in phases 2–4, not an optional cosmetic addition. Expand useful concepts, ways to express them and personal words while keeping the visible choices manageable. A larger dictionary must not produce a larger, more repetitive candidate set. ASHA's AAC guidance supports functional, personally meaningful and culturally relevant vocabulary; the coverage targets below are product proposals, not a prescribed clinical word count. [ASHA AAC](https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/)

### Coverage

| Vocabulary layer | Planned coverage |
| --- | --- |
| Reusable words and concepts | Want, need, like, know, go, come, help, stop, more, less, same, different, here, there, now, later, who, what and where; pronouns and grammatical forms appropriate to each language. |
| Choice, refusal and uncertainty | No, not now, something else, I don't know, I'm not sure, I changed my mind, please ask me, and I want to decide. Keep refusal and uncertainty easy to find. |
| Everyday needs | Food/drinks, toilet, washing, dressing, privacy, rest, room temperature, lights/fan, movement, transport, shopping, money and phone use. |
| Feelings and relationships | Comfort, frustration, worry, loneliness, happiness, affection, greetings, gratitude, disagreement, preferences and requests for company or privacy. |
| Communication repair | Repeat, slower, one question at a time, write it, show me, give me time, wrong person/word, and that's not what I meant. |
| Health communication | Body parts and side, patient-described discomfort, seeing/hearing, asking a clinician a question and asking for help. Do not generate diagnoses, medication instructions or unsupported clinical facts. |
| Life and identity | Work, hobbies, sport, music, celebrations, community and optional spiritual/religious vocabulary selected by the person. Do not restrict conversation to care needs. |
| Personal vocabulary | Names and preferred forms of address, local places, foods, household objects, interests and personally approved expressions; optional photos and exact recordings. |

Author a coverage matrix of concepts × communication functions (request, refuse, ask, comment, express a feeling, tell a story, repair). Expand in reviewed batches rather than padding the library to reach a word count. Keep the initial English and Tamil packs aligned by meaning; personal packs remain independently editable.

### Retrieval and expression

- Support Tamil script, English and reviewed Tanglish spelling variants. Preserve the original input and display uncertain matches as choices; never silently turn a spelling correction into a different intention.
- Store synonyms and spelling aliases under a canonical concept. Different registers of the same request are alternative wording, not three distinct intentions. Do not merge antonyms, negation, body sides, time distinctions or homonyms merely because their text looks similar.
- Use language-specific phrase patterns and reviewed inflections so sentence construction does not apply English word order to Tamil. Offer plain, familiar or polite wording where reviewed and appropriate to the selected listener. Do not automatically change the person's tone.
- Search through short labels, categories, first letters, photos and personal aliases. An optional word-description path can help someone find an object by its use or location. Do not require the person to spell the word they are trying to retrieve.
- Give the person a My words editor: add, preview, pin, correct, hide, export or forget an entry. Caregiver additions are proposals for the person's supported approval. Learned substitutions require an explicit confirmed correction, with their scope visible and reversible.
- Keep a stable small set of favourites; offer additional topic packs on request. Never move controls automatically during use. All approved vocabulary and phrase patterns work offline without a paid model.

### Accuracy and completion checks

Each entry needs a concept ID, language, display form, aliases, word class, meaning/gloss, relevant inflections, permitted template slots, source and review status. User-entered proper names are preserved. Every complete phrase still passes the common meaning policy and exact-sentence playback gate. Adding an alias must never reassign an existing recording: recordings remain bound to their exact approved sentence and language.

Test that multiple aliases retrieve one meaning; an explicit refusal stays negative; first-letter and Tanglish lookup do not invent entities; left/right remain distinct; inflected forms retain meaning; edited/deleted words invalidate old suggestions; and enlarged Tamil text remains readable. Include actual displayed Tamil in native review, not only its English gloss. Test unfamiliar words with the intended person and retain a text/photo alternative when an icon is unclear.

This work expands communication vocabulary. It does not claim to restore a person's vocabulary or provide a validated word-learning therapy; any practice module remains separately reviewed.

## Patient interface and widget pack

Keep four primary content choices by default and stable placement. New tools live in predictable locations and can be pinned during setup; no automatic rearrangement based on usage. Offer a simpler presentation with fewer choices for people who prefer it, without treating that preference as a clinical severity score.

| Widget or improvement | Patient interaction | Constraints and acceptance |
| --- | --- | --- |
| **Repair panel** | “Wrong word”, “Not that”, “Give me time”, “Something else”; correct a person/action/object while retaining the rest | Always reachable; preserves negation; no restart required; rejected meanings do not reappear without Undo. |
| **Personal photo scenes** | A kitchen, family photo or familiar place with labelled regions and a few personally useful messages | Start with manually labelled hotspots; local photo storage; accessible list alternative; hotspot reveals a message, exact sentence tap speaks it. No model needed. |
| **Pain and comfort board** | Extend the existing body-part/side flow with optional body image and patient-selected needs such as rest, positioning, hot/cold or toilet | Also offer an ordinary labelled list. No inferred diagnosis, treatment, pain score or automatic advice; body/side remain consistent. Severity options are alternatives awaiting selection, not an assessment. |
| **Word-finding toolbox** | Point, draw, type the first letters, select a category or show a photo | Preserve input between methods. Drawing is shown as drawing, not silently “recognized” as fact. No score or correction that shames the user. |
| **Conversation card** | Show the current topic/question, a few keywords and the chosen message; “Correct”, “Not quite”, “Change it” | Partner can propose a question; only the person confirms their message. Received, spoken and understood are separate states. No inferred consent/capacity from taps. |
| **My stories and communication passport** | Personal story cards, people/interests, and “How to talk with me” preferences for showing or printing | Authored/approved content only; original photos with permission; no invented biography; no sensitive data in public QR links. |
| **Simpler view / pause** | Manually choose fewer visible options, larger text, reduced decoration, pause and resume | Never infer fatigue from response time. Keep draft; no automatic switch; prevent fixed controls from covering text or keyboard focus. |
| **Personal sentence board** | Combine reviewed words/phrases, undo, see the complete sentence and speak it | Tamil/English grammar-aware composition rather than English word order applied to Tamil; preserve choice positions and exact final preview. |

Widgets are communication supports, not diagnostic tools. Symbols and photographs need testing with the intended person. Use original or appropriately licensed assets; link to external training resources instead of copying proprietary pictographs, manuals or test items.

Complete the access profile: preferred input/display/spoken languages, photo versus symbol preference, text size, number of choices, hand placement, repeat-tap interval, optional select-then-speak, preview speed and listening pause. Offer concrete trials of these settings without calling them an aphasia assessment. Implement current incomplete hand-layout settings rather than showing controls with little effect.

Maintain at least 72×72 CSS px patient targets and 120 px primary tiles as project requirements. Test every patient route at narrow widths, large text, keyboard navigation and with screen readers. These sizes exceed W3C's 44×44 enhanced target criterion; size alone does not establish accessibility. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)

## Free architecture, content governance and persistence

- **Always available:** reviewed catalog, sentence board, repair, personal photos, communication passport and saved exact recordings operate without a paid model or network after setup.
- **Optional local intent:** retain Ollama and benchmark candidate models on this machine before choosing one. Report accuracy, abstentions, Tamil negation and real latency. Model size, license and hardware fit require a separate setup decision; no automatic large download.
- **Speech:** keep feature-detected browser recognition with clear transfer disclosure. The existing three-second silence and 15-second recording cap match the original brief; extend them with configurable pause handling, explicit finish and resume-preserved-draft. Keep useful recognition alternatives with provenance rather than treating the first transcript as certain. Evaluate recognition on consented Tamil/English/Tanglish aphasic speech before claiming quality; do not silently substitute a sample transcript.
- **Voice:** detect available language/locality, provide an onboarding listening check, and build optional exact recorded phrase packs. If no matching voice/recording exists, offer text and a clearly labelled fallback. Recordings cannot speak new or translated text.
- **Content:** version each reviewed phrase by language, meaning, author/reviewer and review date. Use a Tamil-speaking reviewer for meaning, register, body parts, polarity and gloss agreement; health-related wording also needs an SLP/appropriate clinician. Automated translation/back-translation is a check, not approval.
- **Memory:** distinguish a past utterance, an approved reusable phrase and a confirmed persistent preference. Let people inspect, correct and forget learned items. Repetition alone must not turn a past event into a current fact.
- **Offline:** cache by all applicable meaning/context versions and source, invalidate on correction/deletion/language changes, and revalidate on retrieval. Add an offline readiness view that tests actual assets/recordings, not just `navigator.onLine`.
- **Caregiver delivery:** finish an encrypted outbox with message IDs, deduplication, timestamps, cancellation and explicit late-delivery status. Old Help messages must expire or require renewed confirmation; never surprise someone with stale emergency alarms.
- **Data:** use versioned IndexedDB migrations and encrypted export/import with reviewed content previews, no silent overwrite, and retention controls. Patient/family data, raw speech and photos stay out of source control and default study exports.

Split `Patient.tsx` into feature routes as the work proceeds. Add shared intent/phrase policy modules and localized content catalogs rather than more ad hoc conditionals. Preserve the central audio boundary and role-bound encrypted relay. Use feature flags for new widgets and a documented rollback path for storage migrations.

## Implementation sequence and completion gates

| Phase | Deliverables | Completion gate |
| --- | --- | --- |
| **1. Correct existing behavior** | Regressions for negation, body/side/gloss, language conflict, learned substitution, offline exclusions and unsupported names; remove irrelevant memory injection | Each reproduced defect has a failing-then-passing test; old audio/relay/privacy checks still pass. |
| **2. Shared meaning policy and reviewed content** | Expanded Tamil/English vocabulary and phrase catalog, concept/intent IDs, reviewed aliases and inflections, source references, unified validation, semantic rejection history and clarification fallback | Model/mocks/memory/offline obey the same rules; vocabulary coverage and language review are recorded; aliases do not duplicate choices or reverse meaning. |
| **3. Patient access and core widgets** | Complete Tamil/English UI, calmer Home, stable Help/Stop/repair, access profile, draft persistence, sentence board and pain/comfort board | All patient routes tested for target sizes/contrast/focus/zoom; state transitions retain the correct meaning; no unrequested audio. |
| **4. Personal communication and partner support** | Personal vocabulary editor and topic packs, photo scenes, word-finding tools, stories/passport, shared conversation card, approved memory controls, offline packs, encrypted backup and reliable relay queue | End-to-end personal word/scene, repair, offline restore and two-device flows; corrections invalidate old suggestions; private media stays local; late/cancelled delivery is explicit. |
| **5. Validation and refinement** | Expanded bilingual corpus, free-model benchmark, fair baseline, outcome log and small supported usability sessions | Engineering gates pass; native/SLP reviews recorded where performed; unresolved user findings remain visible. No clinical release or benefit claim from automated tests. |
| **Optional later: supervised practice** | Clinician/person-selected scripts or word practice in a separate area | Separate approval, content review and outcome plan; no automated diagnosis, therapy dose or claim that practice scores measure recovery. |

Phases 1 and 2 are dependencies for suggestion-generating widgets. Localization/catalog authoring and visual design can run in parallel after the contracts are fixed. Phase 4 can be delivered widget by widget; keep new features optional so the patient interface stays simple. Human review cannot be scheduled or marked complete by an agent.

## Test and evaluation plan

### Engineering and language checks

Propose a versioned **240-case initial challenge set**, balanced across Tamil, English and Tanglish where applicable: 80 everyday intents, 60 paraphrase/repetition cases, 40 negation/conflicting-context cases, 30 pain/medicine/entity cases, and 30 memory/cache/offline cases. Counts are planned coverage, not evidence of performance. Split development and held-out cases by scenario/paraphrase family to reduce leakage.

Annotate intended meaning, allowed alternatives, forbidden additions, required slots, acceptable abstention and reviewer uncertainty. Include unsupported arbitrary names, translated gloss mismatches, left/right, past/current events, overlapping negation, browser/model outages, rejected guesses, ambiguous fragments and prompt injection inside patient context.

Use exact assertions for deterministic invariants plus human semantic review. Include mutation tests: change only polarity, body side, person or time and verify that unrelated meaning is not changed; rename an intent label and verify duplicates still collapse. Test the entire candidate set after memory insertion and cache retrieval. A model judging itself is insufficient.

Keep the existing 13 fixtures as regression checks, but stop treating model-authored English intent labels/glosses as the ground truth for Tamil sentence correctness. Add exhaustive supported body-part × side × language × round coverage. Tests must accept a justified one-card or abstention outcome instead of rewarding three cards regardless of meaning.

Release targets: zero known unsafe playback, unsupported medication claims, polarity reversals, body-side mismatches or repeated rejected meanings in the locked regression suite. Every shown catalog sentence must map to a reviewed template and permitted slots. Report model top-k coverage, semantic duplicate/contradiction rate, abstention, latency and confidence intervals separately; establish model thresholds before held-out testing. Passing a finite suite cannot guarantee arbitrary free-form accuracy.

### Human usability and outcomes

Begin with an SLP and Tamil-speaking content review, then an exploratory series such as 6–8 person/partner pairs if collaborators are available. This is a formative design proposal, not a powered clinical trial. Use supported consent, participant-selected tasks, breaks and an immediate stop option; recording requires separate agreement.

Primary outcome: the person endorses the meaning and the partner independently describes what they understood. Also record unintended selections, successful repairs, ability to refuse/change one's mind, assistance required, effort, preference and conversational participation. Separate patient reports from caregiver reports. A rejected suggestion can demonstrate successful agency.

Measure time to shared understanding, taps and audio latency as secondary outcomes. Keep failed and stopped attempts in the denominator. Compare against each person's usual method or a suitable personalized board using the same language, vocabulary, practice and partner support; counterbalance order. The current English-only baseline cannot establish superiority for Tamil-speaking users.

Report individual results and error examples. No automatic severity, capacity, depression or recovery scores. Any validated clinical instrument requires appropriate administration, permissions and language validity; custom ratings are labelled exploratory. Long-term benefit requires a later study.

## Approval boundary

Recommended approval is for phases 1–5 as an incremental local build, starting with accuracy fixes and the common validation policy. Keep no-key operation and deferred hosting. Optional therapy/practice, paid providers, additional languages and deployment are not included by default.

After approval, implement and demonstrate each phase with dated evidence. Until then, this file is the only planned repository addition; the application remains unchanged.
