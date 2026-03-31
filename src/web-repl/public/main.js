// Web REPL Client — WebSocket communication with xterm

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.host}`);

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
});

const codeInput = document.getElementById("code-input");
const btnRun = document.getElementById("btn-run");
const btnClear = document.getElementById("btn-clear");
const status = document.getElementById("status");

// Mount terminal to DOM
term.open(document.getElementById("terminal"));

term.writeln("🦁 FreeLang v4 Web REPL");
term.writeln("Type your code in the editor and click 'Run' to execute");
term.writeln("");

// WebSocket event handlers
ws.onopen = () => {
  updateStatus("Connected", "success");
  term.writeln("✓ Connected to server");
  term.writeln("");
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);

  if (response.type === "pong") {
    // Ping/pong keep-alive
    return;
  }

  if (response.type === "result") {
    term.write(response.output || "");
    term.writeln("");
    updateStatus("Ready", "success");
  } else if (response.type === "error") {
    term.write(`\x1b[31m❌ Error: ${response.error}\x1b[0m\n`);
    updateStatus("Error", "error");
  }

  term.write("> ");
};

ws.onerror = (error) => {
  updateStatus("Error", "error");
  term.writeln(`\x1b[31m❌ WebSocket error\x1b[0m`);
};

ws.onclose = () => {
  updateStatus("Disconnected", "error");
  term.writeln("\x1b[31m❌ Disconnected from server\x1b[0m");
};

// Button handlers
btnRun.addEventListener("click", () => {
  const code = codeInput.value.trim();
  if (code) {
    executeCode(code);
  }
});

btnClear.addEventListener("click", () => {
  codeInput.value = "";
  ws.send(JSON.stringify({ type: "clear" }));
  term.clear();
  term.writeln("> ");
});

// Keyboard shortcuts
codeInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    btnRun.click();
  }
});

// Helper functions
function executeCode(code) {
  updateStatus("Running...", "loading");
  term.write("> ");
  term.writeln(code.split("\n").join("\n> "));
  ws.send(JSON.stringify({ type: "eval", code }));
}

function updateStatus(message, className) {
  status.textContent = message;
  status.className = `status ${className}`;
}

// Keep-alive ping
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000);

// Show initial prompt
term.write("> ");
