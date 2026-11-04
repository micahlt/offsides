# Offsides DM notifier

The Sidechat/YikYak API can't push notifications to third-party apps, so this small
program watches for new DMs on your behalf and pushes them to your phone through
Firebase Cloud Messaging. Run it on anything that stays on - a Raspberry Pi is plenty.
It only makes outgoing connections, so no port forwarding is needed, and your phone
gets notifications on any network.

It checks the newest 20 chats about every 30 seconds (randomly varied a little,
so it doesn't poll like clockwork). A notification is sent for messages from
other people that arrived since the last check and since your own latest reply. Group
chats are off by default (`groupChats` in the config).

## What you need

- Node 20 or newer
- A Firebase project whose Android app is registered with package name
  `com.micahlindley.offsides`, and whose `google-services.json` the Offsides build uses
- From that project: **Project settings > Service accounts > Generate new private key**.
  Save it here as `service-account.json`. It's a secret - anyone with it can send
  notifications to your phone.
- Your YikYak login token
- Your notification key: in Offsides, **Settings > Copy Notification Key**

## Setup

```sh
npm ci --omit=dev
cp config.example.json config.json   # then fill it in
chmod 600 config.json service-account.json
node index.mjs --test                # should buzz your phone
node index.mjs --dry-run             # optional: watch without sending
```

To run it at boot and restart it if it crashes, edit `USER` in
`offsides-notifier.service`, then:

```sh
sudo cp offsides-notifier.service /etc/systemd/system/
sudo systemctl enable --now offsides-notifier
journalctl -u offsides-notifier -f   # logs
```

## Good to know

- If YikYak rejects the token, you get one "DM notifications stopped" push, and it
  checks back every 10 minutes. Put a new token in `config.json` and run
  `sudo systemctl restart offsides-notifier`.
- `state.json` remembers what has already been notified. Deleting it means "start
  fresh from now"; nothing old gets replayed.
- Signing out of Offsides unsubscribes the phone, and signing back in creates a new
  notification key, which has to go into `config.json`.
