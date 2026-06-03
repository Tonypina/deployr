import app from "./app";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LAN:           http://${getLocalIp()}:${PORT}`);
});

function getLocalIp(): string {
  const { networkInterfaces } = require("os");
  for (const ifaces of Object.values(networkInterfaces() as Record<string, any[]>)) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "0.0.0.0";
}

export default app;
