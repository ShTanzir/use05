const express = require("express");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { XMLValidator } = require("fast-xml-parser");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const RUN_TIMEOUT_MS = 10_000; // hard cap so one run can't hang the free instance
const MAX_OUTPUT_CHARS = 20_000;

function truncate(str) {
  if (!str) return str;
  return str.length > MAX_OUTPUT_CHARS
    ? str.slice(0, MAX_OUTPUT_CHARS) + "\n...(output truncated)"
    : str;
}

// Extract the public class name so we can name the file correctly for javac.
function detectPublicClassName(code) {
  const match = code.match(/public\s+(?:final\s+|abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  return match ? match[1] : null;
}

function runProcess(cmd, args, options) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, options);
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, RUN_TIMEOUT_MS);

    if (options.input !== undefined) {
      child.stdin.write(options.input);
    }
    child.stdin.end();

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + "\n" + err.message, timedOut });
    });
  });
}

app.post("/api/run-java", async (req, res) => {
  const { code, stdin } = req.body || {};
  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "No code provided." });
  }

  const className = detectPublicClassName(code) || "Main";
  const workDir = path.join(os.tmpdir(), "javaghor-" + uuidv4());

  try {
    await fs.mkdir(workDir, { recursive: true });
    const filePath = path.join(workDir, `${className}.java`);
    await fs.writeFile(filePath, code, "utf8");

    const compile = await runProcess("javac", [`${className}.java`], { cwd: workDir, input: undefined });

    if (compile.code !== 0) {
      return res.json({
        stage: "compile",
        success: false,
        output: truncate(compile.stderr || compile.stdout || "Compilation failed."),
        timedOut: compile.timedOut,
      });
    }

    const run = await runProcess("java", ["-XX:+UseSerialGC", "-Xmx128m", className], {
      cwd: workDir,
      input: stdin || "",
    });

    return res.json({
      stage: "run",
      success: run.code === 0,
      output: truncate((run.stdout || "") + (run.stderr ? "\n" + run.stderr : "")),
      exitCode: run.code,
      timedOut: run.timedOut,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post("/api/validate-xml", (req, res) => {
  const { xml } = req.body || {};
  if (typeof xml !== "string" || !xml.trim()) {
    return res.status(400).json({ error: "No XML provided." });
  }
  const result = XMLValidator.validate(xml, { allowBooleanAttributes: true });
  if (result === true) {
    return res.json({ valid: true });
  }
  return res.json({
    valid: false,
    error: result.err?.msg || "Invalid XML.",
    line: result.err?.line,
    col: result.err?.col,
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`JavaGhor running on port ${PORT}`);
});
