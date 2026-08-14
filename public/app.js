(function () {
  "use strict";

  const STORAGE_KEY = "javaghor.files.v1";
  const THEME_KEY = "javaghor.theme";
  const FONT_KEY = "javaghor.fontSize";

  const TEMPLATES = {
    "hello-java": {
      name: "Hello.java",
      lang: "java",
      content:
        'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello, JavaGhor!");\n    }\n}\n',
    },
    "class-main": {
      name: "Main.java",
      lang: "java",
      content:
        'public class Main {\n\n    static int square(int n) {\n        return n * n;\n    }\n\n    public static void main(String[] args) {\n        for (int i = 1; i <= 5; i++) {\n            System.out.println(i + " -> " + square(i));\n        }\n    }\n}\n',
    },
    "scanner-input": {
      name: "ScannerDemo.java",
      lang: "java",
      content:
        'import java.util.Scanner;\n\npublic class ScannerDemo {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("তোমার নাম লেখো: ");\n        String name = sc.nextLine();\n        System.out.println("স্বাগতম, " + name + "!");\n    }\n}\n',
    },
    "layout-xml": {
      name: "layout.xml",
      lang: "xml",
      content:
        '<?xml version="1.0" encoding="utf-8"?>\n<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent"\n    android:layout_height="match_parent"\n    android:orientation="vertical"\n    android:padding="16dp">\n\n    <TextView\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="Hello, JavaGhor!" />\n\n</LinearLayout>\n',
    },
  };

  let files = loadFiles();
  let activeFileId = files[0].id;
  let editor = null;
  let models = {};
  let fontSize = parseInt(localStorage.getItem(FONT_KEY) || "14", 10);

  function loadFiles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return [
      { id: uid(), name: "Main.java", lang: "java", content: TEMPLATES["class-main"].content, dirty: false },
    ];
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function langFromName(name) {
    if (name.endsWith(".xml")) return "xml";
    if (name.endsWith(".java")) return "java";
    return "plaintext";
  }

  // ---------------- Monaco setup ----------------
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    monaco.editor.defineTheme("javaghor-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#181B25",
        "editor.lineHighlightBackground": "#1F2330",
        "editorLineNumber.foreground": "#565C70",
        "editorGutter.background": "#181B25",
      },
    });
    monaco.editor.defineTheme("javaghor-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0EEE8",
      },
    });

    editor = monaco.editor.create(document.getElementById("monacoEditor"), {
      value: "",
      language: "java",
      theme: document.body.dataset.theme === "light" ? "javaghor-light" : "javaghor-dark",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: fontSize,
      minimap: { enabled: true },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: "all",
      tabSize: 4,
    });

    editor.onDidChangeModelContent(() => {
      const f = getActiveFile();
      if (!f) return;
      const val = editor.getValue();
      if (val !== f.content) {
        f.content = val;
        f.dirty = true;
        renderTabs();
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCurrent);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrent);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, createFile);

    openFile(activeFileId);
    renderFileList();
    renderTabs();
  });

  function getActiveFile() {
    return files.find((f) => f.id === activeFileId);
  }

  function openFile(id) {
    activeFileId = id;
    const f = getActiveFile();
    if (!f || !editor) return;
    editor.setValue(f.content);
    monaco.editor.setModelLanguage(editor.getModel(), f.lang);
    document.getElementById("statusFile").textContent = f.name;
    document.getElementById("statusLang").textContent = f.lang === "xml" ? "XML" : "Java";
    renderFileList();
    renderTabs();
  }

  function saveCurrent(e) {
    if (e && e.preventDefault) e.preventDefault();
    const f = getActiveFile();
    if (!f) return;
    f.dirty = false;
    persist();
    renderTabs();
    flashConsole("💾 সেভ হয়েছে (browser এ)।", "ok");
  }

  function createFile() {
    const name = prompt("নতুন ফাইলের নাম দাও (যেমন Practice.java):", "Practice.java");
    if (!name) return;
    const f = { id: uid(), name, lang: langFromName(name), content: "", dirty: false };
    files.push(f);
    persist();
    openFile(f.id);
  }

  function closeFile(id, evt) {
    if (evt) evt.stopPropagation();
    if (files.length === 1) {
      flashConsole("অন্তত একটা ফাইল থাকতে হবে।", "err");
      return;
    }
    files = files.filter((f) => f.id !== id);
    persist();
    if (activeFileId === id) openFile(files[0].id);
    else {
      renderFileList();
      renderTabs();
    }
  }

  function renderFileList() {
    const ul = document.getElementById("fileList");
    ul.innerHTML = "";
    files.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f.name;
      li.className = f.id === activeFileId ? "active" : "";
      li.addEventListener("click", () => {
        openFile(f.id);
        closeMobileSidebar();
      });
      const closeBtn = document.createElement("span");
      closeBtn.className = "close-file";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", (e) => closeFile(f.id, e));
      li.appendChild(closeBtn);
      ul.appendChild(li);
    });
  }

  function renderTabs() {
    const bar = document.getElementById("tabbar");
    bar.innerHTML = "";
    files.forEach((f) => {
      const tab = document.createElement("div");
      tab.className = "tab" + (f.id === activeFileId ? " active" : "") + (f.dirty ? " dirty" : "");
      tab.innerHTML = `<span>${f.name}</span><span class="tab-dot"></span>`;
      tab.addEventListener("click", () => openFile(f.id));
      bar.appendChild(tab);
    });
  }

  // ---------------- Run / Validate ----------------
  async function runCurrent() {
    const f = getActiveFile();
    if (!f) return;
    const runBtn = document.getElementById("runBtn");
    runBtn.classList.add("running");
    setConsoleState("running", "চলছে...");

    try {
      if (f.lang === "java") {
        const stdin = document.getElementById("stdinInput").value;
        const res = await fetch("/api/run-java", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: f.content, stdin }),
        });
        const data = await res.json();
        if (data.error) {
          setConsoleState("err", "Error");
          writeConsole(data.error, "err");
        } else if (!data.success) {
          setConsoleState("err", data.stage === "compile" ? "Compile error" : "Runtime error");
          writeConsole(data.output, "err");
        } else {
          setConsoleState("ok", "Done");
          writeConsole(data.output || "(কোনো output নেই)", "ok");
        }
      } else if (f.lang === "xml") {
        const res = await fetch("/api/validate-xml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml: f.content }),
        });
        const data = await res.json();
        if (data.valid) {
          setConsoleState("ok", "Valid XML");
          writeConsole("✅ XML সঠিক ও well-formed।", "ok");
        } else {
          setConsoleState("err", "Invalid XML");
          writeConsole(`❌ ${data.error}` + (data.line ? `\nLine ${data.line}, Col ${data.col}` : ""), "err");
        }
      } else {
        writeConsole("এই ফাইল টাইপ রান করা যায় না।", "err");
        setConsoleState("err", "Unsupported");
      }
    } catch (err) {
      setConsoleState("err", "Network error");
      writeConsole("সার্ভারে পৌঁছানো যায়নি: " + err.message, "err");
    } finally {
      runBtn.classList.remove("running");
    }
    expandMobileConsole();
  }

  function setConsoleState(state, title) {
    const dot = document.getElementById("consoleDot");
    dot.className = "console-dot " + state;
    document.getElementById("consoleTitle").textContent = title;
  }

  function writeConsole(text, cls) {
    const out = document.getElementById("consoleOutput");
    out.textContent = text;
    out.className = "console-output " + (cls === "err" ? "err-text" : cls === "ok" ? "ok-text" : "");
  }

  function flashConsole(msg, cls) {
    setConsoleState(cls, cls === "ok" ? "Done" : "Notice");
    writeConsole(msg, cls);
  }

  // ---------------- Chrome: theme / font / sidebar / console / modal ----------------
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    if (window.monaco && editor) {
      monaco.editor.setTheme(theme === "light" ? "javaghor-light" : "javaghor-dark");
    }
  }

  function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarScrim").classList.toggle("open");
  }
  function closeMobileSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarScrim").classList.remove("open");
  }
  function expandMobileConsole() {
    if (window.innerWidth <= 820) document.getElementById("consolePanel").classList.add("expanded");
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(localStorage.getItem(THEME_KEY) || "dark");

    document.getElementById("runBtn").addEventListener("click", runCurrent);
    document.getElementById("newFileBtn").addEventListener("click", createFile);
    document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar);
    document.getElementById("sidebarScrim").addEventListener("click", closeMobileSidebar);
    document.getElementById("consoleToggle").addEventListener("click", () => {
      document.getElementById("consolePanel").classList.toggle("expanded");
    });
    document.getElementById("consoleHeader").addEventListener("click", (e) => {
      if (window.innerWidth <= 820 && e.target.id !== "clearConsoleBtn") {
        document.getElementById("consolePanel").classList.toggle("expanded");
      }
    });
    document.getElementById("clearConsoleBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      writeConsole("এখানে output দেখাবে। Run চাপো অথবা Ctrl+Enter।", "");
      setConsoleState("", "Console");
    });

    document.getElementById("themeToggle").addEventListener("click", () => {
      applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
    });

    document.getElementById("fontUp").addEventListener("click", () => setFontSize(fontSize + 1));
    document.getElementById("fontDown").addEventListener("click", () => setFontSize(fontSize - 1));

    document.querySelectorAll(".template-list li").forEach((li) => {
      li.addEventListener("click", () => {
        const key = li.dataset.template;
        const t = TEMPLATES[key];
        if (!t) return;
        const f = { id: uid(), name: t.name, lang: t.lang, content: t.content, dirty: false };
        files.push(f);
        persist();
        openFile(f.id);
        closeMobileSidebar();
      });
    });

    document.getElementById("shortcutsBtn").addEventListener("click", () => {
      document.getElementById("shortcutsModal").classList.remove("hidden");
    });
    document.getElementById("closeShortcuts").addEventListener("click", () => {
      document.getElementById("shortcutsModal").classList.add("hidden");
    });

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveCurrent();
      }
    });

    window.addEventListener("beforeunload", persist);
  });

  function setFontSize(size) {
    fontSize = Math.max(10, Math.min(28, size));
    localStorage.setItem(FONT_KEY, String(fontSize));
    if (editor) editor.updateOptions({ fontSize });
  }
})();
