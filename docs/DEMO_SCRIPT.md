# Local rehearsal script

Updated 2026-09-27. Hosting is deferred by the user. Run on a laptop with the local app and, for the caregiver relay, a separate browser profile/context. A local two-tab run is not the required two-phone acceptance. Before a public demo, use real HTTPS on the phones and complete the human checks in [../PROGRESS.md](../PROGRESS.md).

## Preparation

1. Start `pnpm dev`; open the patient app and seed the fictional demo family through setup. Set the caregiver PIN. Use only consented recordings.
2. Use **Mock demo** or configure **local Ollama** on the server. Paid cloud services are not connected. Keep mock/cached badges visible throughout. Verify the actual voice label: device voice or exact recorded phrase.
3. Set the demo clock to 20:58 and show its badge. Enable stage measurement; clear only disposable demo attempts if starting a fresh measured comparison.
4. Use Voice Studio to record exact phrases if demonstrating the free own-voice path. Listen to each and confirm its text. Explain that new sentences use device speech; this build does not create a generative clone or import recording files.
5. Pair a separate caregiver browser context and tap Enable alerts there. Keep it open. Check receipts and Help acknowledgement. Do not use a real phone number in projected settings.
6. Open `/demo` and tap **Warm up three scenarios**. This saves suggestion sets without playing audio. The seven sample scenes prepare inputs and clock settings; they do not exercise a microphone or camera. Prepare a water bottle and grant camera permission on the actual Camera page. Model download may take time; inference runs locally.
7. For eventual phone rehearsal, charge two Android phones, arrange projector mirroring, confirm HTTPS microphone/camera access and check the chosen voices while offline. A LAN HTTP address usually cannot provide required secure-context APIs.

## Six-minute walkthrough

| Time | Action | Say / inspect |
| --- | --- | --- |
| 0:00–0:35 | Show Home, Help, and four input methods | “Sollu offers possible sentences. The person decides what is said.” State the active provider/voice mode and whose consented voice is recorded. |
| 0:35–1:30 | Speak “tablet… raathiri”, or visibly use a labelled mock transcript; choose one night-tablet sentence | Show three different meanings, Listen separately if needed, then the chosen exact sentence. Read the actual taps and time. No claimed two-tap result if extra taps were used. |
| 1:30–2:10 | Repeat the same task on `/baseline` | Use the same measurement rules. Show the measured result without claiming a clinical speed improvement. |
| 2:10–2:45 | Camera points at bottle | Show “bottle” label and water candidates. Never imply generic detector can recognise the tablet box. |
| 2:45–3:25 | Select Dr. Rao; Topics → Pain → shoulder → left | English templates; choose intensity. Amber is urgency styling, not a diagnosis. With free device speech, state that the voice is generic. |
| 3:25–4:05 | Partner question “மதியம் என்ன சாப்பிடணும்?”; fragment “ரசம்” | Show active question and answer candidates. If microphone unavailable, type the question and describe the fallback. |
| 4:05–4:45 | “table” → None of these → reinterpretation | Choose only if it matches the intended meaning. Show the rejected set in the communication log. Do not claim learned substitutions unless the full learning feature is active. |
| 4:45–5:30 | Tap exact Help phrase; caregiver chooses “I'm coming” | The patient speaks only after their own tap; caregiver acknowledgement updates text, never remotely starts patient speech. Receipt/ack status must be real. Cancel with “It was a mistake”. |
| 5:30–6:00 | Therapist-lite and privacy | Show today's actual attempts and CSV export. Explain what stays in the browser and which enabled services receive data. |

## Failure plan

| Failure | Visible recovery |
| --- | --- |
| No microphone support / transcript wrong | Show retry or Type/Topics. Never present a fixture as a recording result. |
| Local model unavailable / provider timeout | Show fallback or explicitly labelled mock/rehearsal output. Do not preserve live-latency claims. |
| Audio becomes ready after tap expires | Ask for a new tap on the exact sentence. Include it in measured taps. |
| Tamil voice missing | Display the sentence; use an exact recorded phrase if present. Do not speak a translated English sentence as though it were the selected Tamil sentence. |
| Camera permission/model fails | Explain the limitation; return to Topics. A manually selected object label must be described as manual input. |
| Caregiver relay disconnected | “Not sent” and SMS option; do not claim delivered. During offline rehearsal skip caregiver steps unless queued-delivery is actually implemented. |
| Device offline | Use precached shell, quick phrases and available local/recorded audio. Mark every replayed intent result CACHED; show text or Help tone if speech unavailable. |

Record two consecutive live phone rehearsals and one offline rehearsal with date, devices, provider mode, actual timings, faults and the human's report. All three are pending until that report exists. The free recording path demonstrates useful voice replay but does not pass the original generative-clone milestone.
