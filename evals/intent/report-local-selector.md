# Installed local selector benchmark

Started 2026-09-28T07:02:09.105Z; finished 2026-09-28T07:04:50.263Z. Synthetic fictional data only. Isolated API: loopback port 8791, closed after run. No .env change, model installation, hosting or paid request.

Model: llama3:latest; 8.0B; Q4_0; installed artifact 4.66 GB. CPU: 13th Gen Intel(R) Core(TM) i7-13650HX; RAM 15.6 GiB. Per-request model budget 8000 ms, including any bounded repair.

| Measure | Observed |
|---|---:|
| Cases | 24 |
| Actual model-selection responses | 0 |
| Local-model unavailable → controlled-catalog fallback | 20 |
| No allowed meaning → clarification without model call | 4 |
| HTTP errors | 0 |
| Displayed results pass deterministic policy | 24 / 24 |
| Returned meanings remain inside allowed set | 24 / 24 |
| Model responses with same order/set as baseline | 0 / 0 |
| Successful model calls returning no choices | 0 |
| Overall HTTP p50 / p95 | 8019 / 8038 ms |

| Case | Input | Language | Allowed / returned | Route | HTTP ms |
|---|---|---|---|---|---:|
| 1 | thanni | ta | 1 / 1 | catalog-v2 · local model unavailable | 8033 |
| 2 | water | en | 1 / 1 | catalog-v2 · local model unavailable | 8036 |
| 3 | தண்ணி வேண்டாம் | ta | 1 / 1 | catalog-v2 · local model unavailable | 8038 |
| 4 | no water | en | 1 / 1 | catalog-v2 · local model unavailable | 8064 |
| 5 | puriyala | ta | 1 / 1 | catalog-v2 · local model unavailable | 8030 |
| 6 | I don't understand | en | 1 / 1 | catalog-v2 · local model unavailable | 8018 |
| 7 | manasa maathiten | ta | 1 / 1 | catalog-v2 · local model unavailable | 8026 |
| 8 | changed my mind | en | 1 / 1 | catalog-v2 · local model unavailable | 8034 |
| 9 | left shoulder pain | ta | 3 / 3 | catalog-v2 · local model unavailable | 8019 |
| 10 | right knee pain | en | 3 / 3 | catalog-v2 · local model unavailable | 8010 |
| 11 | left shoulder pain | ta | 3 / 3 | catalog-v2 · local model unavailable | 8012 |
| 12 | right knee pain | en | 3 / 3 | catalog-v2 · local model unavailable | 8008 |
| 13 | table | ta | 3 / 3 | catalog-v2 · local model unavailable | 8024 |
| 14 | table | en | 3 / 3 | catalog-v2 · local model unavailable | 8009 |
| 15 | table | ta | 3 / 3 | catalog-v2 · local model unavailable | 8014 |
| 16 | table | en | 3 / 3 | catalog-v2 · local model unavailable | 8015 |
| 17 | tablet raathiri | ta | 3 / 3 | catalog-v2 · local model unavailable | 8029 |
| 18 | night tablets | en | 3 / 3 | catalog-v2 · local model unavailable | 8020 |
| 19 | Priya phone | ta | 3 / 3 | catalog-v2 · local model unavailable | 8021 |
| 20 | Priya phone | en | 3 / 3 | catalog-v2 · local model unavailable | 8033 |
| 21 | no water but tea | ta | 0 / 0 | catalog-v2 · clarification | 40 |
| 22 | no water but tea | en | 0 / 0 | catalog-v2 · clarification | 25 |
| 23 | zzzxq | ta | 0 / 0 | catalog-v2 · clarification | 44 |
| 24 | zzzxq | en | 0 / 0 | catalog-v2 · clarification | 57 |

## Interpretation limits

The model selects prevalidated meaning IDs; it does not author Tamil or English sentences. Many cases offer a single allowed choice. A safe subset is an engineering containment result, not proof of intent understanding, useful ranking, translation quality, clinical benefit or a speed improvement. Fallback rows are catalog success, not model success; bypass rows make no inference call. Ambiguous multi-option prompts have no independently endorsed target meaning in this benchmark, so ranking accuracy is not claimed. The 240-case controlled regression has separate explicit semantic oracles. No human utterance, audio, speech recognition or voice playback was evaluated. Native-language and real-device review remain pending.
