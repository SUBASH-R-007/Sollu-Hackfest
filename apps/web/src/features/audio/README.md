# Audio safety boundary

All output uses this directory. Importing the `audio` singleton creates no audio
context and plays nothing. Recordings are microphone input in `features/voice`;
they can only be played through this boundary.

An exact-sentence control may create a one-use ticket synchronously from:

- A trusted primary pointer-up.
- Trusted Enter or Space key-up on the same control.
- A trusted native `click` with `detail === 0`, the activation delivered by
  screen readers and other assistive technology.

Keyboard and assistive activation are the deliberate accessibility interpretation
of the brief's pointer-tap rule. Ordinary mouse clicks, synthetic events and
`HTMLElement.click()` cannot create tickets. UI controls prevent the native
Enter/Space default action and handle key-up so one key activation is counted once.
Actual TalkBack interaction still requires a human device check.

Tickets bind the exact displayed text, role and surface. They expire after 1500 ms,
are consumed before playback, and a newer activation or Stop invalidates earlier
work. Native speech queues are cancelled if playback has not started by this
deadline. A recording that decodes late requires another explicit activation.
Prefetch and cache utilities cannot play audio.

Patient speech, neutral preview, caregiver Studio, caregiver alarm and baseline
have separate channel permissions. A remote event can only trigger a neutral
tone on `/care` after the caregiver locally enables alerts. Preview and baseline
never use an own-voice recording. A failed Studio recording never silently falls
back to device speech.

Device voices are browser/OS voices, and some may use an online service. Local
recordings replay an exact consented phrase; this is not generative voice cloning.
The caller must verify stored recording text, language and active consent before
passing a blob. Help can fall back to an alert tone, which must be reported as a
tone rather than as successfully spoken words.
