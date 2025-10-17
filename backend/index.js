import { config } from "./config.js";
import { createApp } from "./app.js";
import { createSocketServer } from "./socketServer.js";

const app = createApp();
const { server } = createSocketServer(app);

server.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});

