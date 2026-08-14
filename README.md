# JavaGhor 🏠{ }

> তোমার নিজের Java ও XML প্র্যাকটিস রুম — একটা lightweight, browser-based code editor।

JavaGhor একটা ছোট, দ্রুত, aesthetic code editor — Java কোড লিখে সাথে সাথে compile+run করার জন্য, আর XML লিখে well-formedness validate করার জন্য। Monaco Editor (VS Code এর মূল editor engine) দিয়ে বানানো, PC ও Mobile দুই জায়গাতেই ভালোভাবে কাজ করে।

## ✨ Features

- Monaco Editor — Java ও XML syntax highlighting, bracket matching, minimap
- Multi-file tab system, browser localStorage এ auto-persist
- Run button (Ctrl+Enter) — `javac` + `java` দিয়ে সত্যিকারের compile ও run
- stdin input support (Scanner দিয়ে practice করার জন্য)
- XML validator — well-formed কিনা, error line/column সহ
- Compile/runtime error console, success/error color states
- Dark/Light theme toggle, font size control
- Ready-made templates: Hello World, Class+main, Scanner input, Android layout XML
- Mobile-responsive: collapsible sidebar, bottom-sheet console
- Docker-based deploy, Render Free Plan এ compatible

## 🚀 Local এ চালানো

```bash
npm install
npm start
# http://localhost:10000
```

জাভা compile/run করার জন্য local এ JDK install থাকা লাগবে (`javac`, `java` PATH এ থাকতে হবে)।

## 🐳 Docker দিয়ে চালানো

```bash
docker build -t javaghor .
docker run -p 10000:10000 javaghor
```

## ☁️ Render.com এ Deploy (Free Plan)

1. এই folder টা GitHub এ একটা repo হিসেবে push করো
2. Render Dashboard → **New +** → **Web Service**
3. তোমার GitHub repo connect করো
4. Environment হিসেবে **Docker** সিলেক্ট করো (Render নিজে থেকেই `Dockerfile` detect করবে)
5. Instance Type: **Free**
6. **Create Web Service** চাপো — কয়েক মিনিটে লাইভ হয়ে যাবে

`render.yaml` ফাইল থাকায় চাইলে Render Blueprint দিয়েও এক ক্লিকে deploy করতে পারো (New + → Blueprint)।

### Free Plan এর ব্যাপারে মনে রাখার বিষয়

- 512 MB RAM / 0.1 CPU — একজন ব্যবহারকারীর ছোট practice code এর জন্য যথেষ্ট, কিন্তু ভারী/অসীম loop wale code সাবধানে চালিও
- 15 মিনিট inactive থাকলে service ঘুমিয়ে যায়, পরের request এ ~30-60 সেকেন্ড cold start লাগে
- Free tier এ persistent disk নেই — তাই ফাইলগুলো browser এর localStorage এ সেভ হয় (server restart হলেও হারাবে না, কারণ browser এ থাকে)
- প্রতিটা run 10 সেকেন্ডের মধ্যে timeout হয়ে যায় (infinite loop protection)

## 📁 প্রজেক্ট স্ট্রাকচার

```
javaghor/
├── Dockerfile
├── package.json
├── render.yaml
├── server.js          # Express backend + javac/java runner + XML validator
└── public/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── logo.svg
    └── favicon.svg
```

## 🔒 নিরাপত্তা নোট

এই tool টা ব্যক্তিগত শেখার জন্য বানানো (single-user practice tool)। এটাতে full sandboxing/isolation নেই, তাই public এ open রেখে অচেনা মানুষদের arbitrary code চালাতে দিও না। নিজের practice এর জন্য ব্যবহার করলে সমস্যা নেই।

---

Built with 🧡 for **TANZIRx**
