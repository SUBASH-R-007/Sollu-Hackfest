# Durable local relay queue

Patient `spoken`, `help`, and referenced `help_cancel` messages are AES-GCM encrypted before entering IndexedDB. The queue is scoped to pairing room and sender role. It stores encrypted frames and delivery metadata, never plaintext sentences or encryption keys. A returned message ID means the message was retained or sent; it does not mean delivery.

`RelayClient` accepts an optional fourth callback with `{id, type, status}`. Status values are `queued`, `sent`, `delivered`, `expired`, `cancelled`, and `failed`. `getDeliveryStatus(id)` is available after awaiting `send`. `sent` only means the frame was handed to the WebSocket. `delivered` requires a caregiver receipt or acknowledgement. Caregiver `ask`, `ack`, and receipt messages retain the immediate-send-or-null behavior.

Help expires after 60 seconds; spoken messages after five minutes. The receiver independently drops expired Help before any app/alarm callback. Reconnect and a ten-second retry reuse the same encrypted frame and ID. Batches are limited to eight; new sends do not retransmit the entire backlog. Expired queue rows are discarded. At most 50 pending rows are kept; ordinary sends fail visibly at capacity. A cancellation can displace an old queued message at capacity and reports that message as failed.

Cancellation removes the referenced queued Help and stores a referenced cancellation in one transaction. If a reference is omitted, the sender resolves the last active Help from its local queue metadata. Receivers require a reference and the UI must clear only the matching Help. Cancellations expire after five minutes.

Received IDs are persisted for ten minutes, bounded to 1,000 entries. Duplicate spoken/Help/cancel messages are receipted again without repeating the UI callback or alarm. This supports a lost receipt without replaying an alert. Queue and deduplication state survive page reloads. A failed storage operation does not pretend that a message was retained or delivered.

This is not Web Push, a background service, or an emergency service. Delivery still needs the paired pages and relay connection. An acknowledgement means a caregiver tapped the reply; it is separate from delivery and does not establish that a communication was understood.
