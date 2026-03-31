// Web REPL Server — Express + WebSocket

import express from "express";
import * as http from "http";
import * as ws from "ws";
import * as path from "path";
import { SandboxedREPL } from "./sandbox";

const TIMEOUT_MS = 5000;

interface WSMessage {
  type: "eval" | "clear" | "ping";
  code?: string;
}

interface WSResponse {
  type: "result" | "error" | "pong";
  output?: string;
  error?: string;
}

export async function startWebRepl(port: number): Promise<void> {
  const app = express();
  const server = http.createServer(app);
  const wss = new ws.Server({ server });

  // Serve static files
  const publicDir = path.join(__dirname, "../web-repl/public");
  app.use(express.static(publicDir));

  // WebSocket connection handler
  wss.on("connection", (socket: ws.WebSocket) => {
    const repl = new SandboxedREPL();
    console.log("[REPL] Client connected");

    socket.on("message", async (data: string) => {
      try {
        const msg: WSMessage = JSON.parse(data);

        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (msg.type === "clear") {
          repl.clear();
          socket.send(
            JSON.stringify({
              type: "result",
              output: "REPL cleared",
            }),
          );
          return;
        }

        if (msg.type === "eval" && msg.code) {
          const response: WSResponse = {
            type: "result",
          };

          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Execution timeout (5s)")), TIMEOUT_MS);
          });

          try {
            await Promise.race([timeoutPromise, repl.eval(msg.code)]);
            response.output = repl.getOutput();
          } catch (err: any) {
            response.type = "error";
            response.error = err.message || String(err);
          }

          socket.send(JSON.stringify(response));
        }
      } catch (err: any) {
        const response: WSResponse = {
          type: "error",
          error: err.message || "Invalid message format",
        };
        socket.send(JSON.stringify(response));
      }
    });

    socket.on("close", () => {
      console.log("[REPL] Client disconnected");
    });

    socket.on("error", (err: Error) => {
      console.error("[REPL] WebSocket error:", err.message);
    });
  });

  server.listen(port, () => {
    console.log(`🌐 Web REPL running at http://localhost:${port}`);
    console.log(`   Open in browser to start coding!`);
  });
}
