import app from "./app";
import { expireOverdueTickets } from "./utils/expire-tickets";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Run expiration check every hour in the long-running dev server
expireOverdueTickets().catch(() => {});
setInterval(() => expireOverdueTickets().catch(() => {}), 60 * 60 * 1000);

export default app;
