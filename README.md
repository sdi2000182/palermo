# Palermo

The Greek party game, on your phones. Everyone's phone is their secret role card;
a shared "table" screen (laptop, TV, or the host's phone) tells the story out loud.

Roles: Hidden Killer, Shown Killer, Butcher (silences someone for a round), Detective
(knows the Shown Killer), Snitch (secretly on the killers' side, knows the Hidden Killer),
Doctor, Mayor, Trela, Citizens. House rules come as Joker cards: Open Graves, Lovers,
Fog, Last Words, Second Chance, Iron Mayor. The narrator speaks Greek.

Test mode: in the lobby the host can add bots that play by themselves, and open any
bot's phone in another tab to play as them.

Runs on Cloudflare Workers (free plan): the game runs on the server in a Durable
Object, so roles never reach anyone else's phone.

## Play it on your own computer

Needs Node.js 18+.

```sh
npm install
npx wrangler dev --ip 0.0.0.0
```

Open http://localhost:8787 and host a game. Phones on the same Wi-Fi join at
`http://<your computer's local IP>:8787` (for example `http://192.168.1.20:8787`).

## Put it online (free)

**From the Cloudflare dashboard (no terminal):**
1. Sign up at https://dash.cloudflare.com (free).
2. Workers & Pages → Create → **Import a repository** → connect GitHub → pick `palermo`.
3. Leave the build command empty; the deploy command is `npx wrangler deploy`. Deploy.
4. You get `https://palermo.<your-name>.workers.dev`. Every push to `main` redeploys.

**Or from a terminal:** `npx wrangler login`, then `npx wrangler deploy`.

## Files

- `src/worker.js` routes requests and runs each room (Durable Object, WebSockets)
- `src/game.js` the rules: roles, nights, votes, wins, and what each player may see
- `src/story.js` the narrator's lines
- `public/` the app: `app.js` (screens), `bg.js` (swirling background), `style.css`
