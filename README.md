# REMINDER BOT
Project ini terinspirasi dari meme bulan puasa yang bertebaran di facebook setiap harinya
![Meme](https://github.com/fdvky1/reminder-bot/blob/main/result.jpg?raw=true "Meme nya")


## SETUP
```bash
cp .env.example .env #isi .env nya
npm i
```

## START
Memulai bot(akan menjalankan semua sesi yang tersimpan atau akan membuat sesi baru jika tidak ada sesi login)
```bash
node index.js
```
Membuat sesi baru
```bash
node index.js --new --session=nama_sesi
```
Menjalankan sesi tertentu
```bash
node index.js --session=nama_sesi
```

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/fdvky1/reminder-bot)
