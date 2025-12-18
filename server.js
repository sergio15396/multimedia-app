import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";

// Configurar __dirname per a ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar la base de dades
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, {
  games: [],
  songs: [],
  clips: [],
});

// Inicialitzar la base de dades
try {
  await db.read();
  console.log(`📖 Base de datos leída desde: ${file}`);
  console.log(`📊 Estado inicial - Juegos: ${db.data?.games?.length || 0}, Canciones: ${db.data?.songs?.length || 0}, Clips: ${db.data?.clips?.length || 0}`);
} catch (error) {
  console.error("❌ Error al leer la base de datos:", error);
}

// Si la base de datos no existe o está vacía, inicializarla
if (!db.data) {
  console.log("⚠️ db.data es null/undefined, inicializando...");
  db.data = {
    games: [],
    songs: [],
    clips: [],
  };
  await db.write();
}

// Asegurar que los arrays existan (sin sobrescribir si ya tienen datos)
if (!Array.isArray(db.data.games)) {
  console.log("⚠️ games no es un array, inicializando...");
  db.data.games = [];
  await db.write();
}
if (!Array.isArray(db.data.songs)) {
  console.log("⚠️ songs no es un array, inicializando...");
  db.data.songs = [];
  await db.write();
}
if (!Array.isArray(db.data.clips)) {
  console.log("⚠️ clips no es un array, inicializando...");
  db.data.clips = [];
  await db.write();
}

// Log final del estado
console.log(`✅ Base de datos inicializada - Juegos: ${db.data.games.length}, Canciones: ${db.data.songs.length}, Clips: ${db.data.clips.length}`);

// Configuració de multer per pujar fitxers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "";
    if (file.fieldname === "image") {
      uploadPath = path.join(__dirname, "uploads", "games");
    } else if (file.fieldname === "thumbnail") {
      uploadPath = path.join(__dirname, "uploads", "clips", "thumbnails");
    } else if (file.fieldname === "clip") {
      uploadPath = path.join(__dirname, "uploads", "clips", "videos");
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Funcions auxiliars
const getYouTubeID = (url) => {
  if (!url) return "";
  const arr = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  return arr[2] !== undefined ? arr[2].split(/[^0-9a-z_\-]/i)[0] : arr[0];
};

// Rutes per al frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint de debug para verificar el estado de la base de datos
app.get("/api/debug", async (req, res) => {
  try {
    await db.read();
    const fileExists = fs.existsSync(file);
    let fileContent = null;
    if (fileExists) {
      try {
        fileContent = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        fileContent = { error: 'No se pudo leer el archivo' };
      }
    }
    res.json({
      filePath: file,
      fileExists: fileExists,
      __dirname: __dirname,
      data: {
        games: db.data?.games?.length || 0,
        songs: db.data?.songs?.length || 0,
        clips: db.data?.clips?.length || 0,
      },
      sampleGames: db.data?.games?.slice(0, 3) || [],
      sampleSongs: db.data?.songs?.slice(0, 3) || [],
      fileContent: fileContent ? {
        games: fileContent.games?.length || 0,
        songs: fileContent.songs?.length || 0,
        clips: fileContent.clips?.length || 0,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// API per a Jocs
app.get("/api/games", async (req, res) => {
  try {
    await db.read();
    console.log(`📊 GET /api/games - Juegos en DB: ${db.data?.games?.length || 0}`);
    const { page = 1, limit = 25 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    const items = db.data.games.slice(startIndex, endIndex);
    const total = db.data.games.length;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      items,
      total,
      totalPages,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("❌ Error en GET /api/games:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/games/:id", async (req, res) => {
  await db.read();
  const gameId = parseInt(req.params.id);
  const game = db.data.games.find((g) => g.id === gameId);

  if (!game) {
    return res.status(404).json({ error: "Juego no encontrado" });
  }

  res.json(game);
});

app.post("/api/games", upload.single("image"), async (req, res) => {
  await db.read();

  const gameData = {
    id: Date.now(),
    title: req.body.title,
    status: req.body.status || "Jugando",
    rating: req.body.rating ? parseFloat(req.body.rating) : null,
    notes: req.body.notes || "",
    trailerUrl: req.body.trailerUrl || "",
    launchDate: req.body.launchDate || null,
    imageUrl: req.file
      ? `/uploads/games/${req.file.filename}`
      : req.body.imageUrl || "",
  };

  db.data.games.push(gameData);
  await db.write();
  res.status(201).json(gameData);
});

app.put("/api/games/:id", upload.single("image"), async (req, res) => {
  await db.read();
  const gameId = parseInt(req.params.id);
  const gameIndex = db.data.games.findIndex((g) => g.id === gameId);

  if (gameIndex === -1) {
    return res.status(404).json({ error: "Juego no encontrado" });
  }

  const updatedGame = {
    ...db.data.games[gameIndex],
    title: req.body.title || db.data.games[gameIndex].title,
    status: req.body.status || db.data.games[gameIndex].status,
    rating: req.body.rating
      ? parseFloat(req.body.rating)
      : db.data.games[gameIndex].rating,
    notes: req.body.notes || db.data.games[gameIndex].notes,
    trailerUrl: req.body.trailerUrl || db.data.games[gameIndex].trailerUrl,
    launchDate: req.body.launchDate || db.data.games[gameIndex].launchDate,
    imageUrl: req.file
      ? `/uploads/games/${req.file.filename}`
      : req.body.imageUrl || db.data.games[gameIndex].imageUrl,
  };

  db.data.games[gameIndex] = updatedGame;
  await db.write();
  res.json(updatedGame);
});

app.delete("/api/games/:id", async (req, res) => {
  await db.read();
  const gameId = parseInt(req.params.id);
  const gameIndex = db.data.games.findIndex((g) => g.id === gameId);

  if (gameIndex === -1) {
    return res.status(404).json({ error: "Juego no encontrado" });
  }

  db.data.games.splice(gameIndex, 1);
  await db.write();
  res.status(204).send();
});

// API per a Música
app.get("/api/songs", async (req, res) => {
  try {
    await db.read();
    console.log(`📊 GET /api/songs - Canciones en DB: ${db.data?.songs?.length || 0}`);
    const { page = 1, limit = 24 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    const items = db.data.songs.slice(startIndex, endIndex);
    const total = db.data.songs.length;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      items,
      total,
      totalPages,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("❌ Error en GET /api/songs:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/songs/:id", async (req, res) => {
  await db.read();
  const songId = parseInt(req.params.id);
  const song = db.data.songs.find((s) => s.id === songId);

  if (!song) {
    return res.status(404).json({ error: "Canción no encontrada" });
  }

  res.json(song);
});

app.post("/api/songs", async (req, res) => {
  await db.read();

  const songData = {
    id: Date.now(),
    title: req.body.title,
    artist: req.body.artist || "",
    youtubeUrl: req.body.youtubeUrl,
    coverImageUrl: req.body.coverImageUrl || "",
  };

  db.data.songs.push(songData);
  await db.write();
  res.status(201).json(songData);
});

app.put("/api/songs/:id", async (req, res) => {
  await db.read();
  const songId = parseInt(req.params.id);
  const songIndex = db.data.songs.findIndex((s) => s.id === songId);

  if (songIndex === -1) {
    return res.status(404).json({ error: "Canción no encontrada" });
  }

  const updatedSong = {
    ...db.data.songs[songIndex],
    title: req.body.title || db.data.songs[songIndex].title,
    artist: req.body.artist || db.data.songs[songIndex].artist,
    youtubeUrl: req.body.youtubeUrl || db.data.songs[songIndex].youtubeUrl,
    coverImageUrl:
      req.body.coverImageUrl || db.data.songs[songIndex].coverImageUrl,
  };

  db.data.songs[songIndex] = updatedSong;
  await db.write();
  res.json(updatedSong);
});

app.delete("/api/songs/:id", async (req, res) => {
  await db.read();
  const songId = parseInt(req.params.id);
  const songIndex = db.data.songs.findIndex((s) => s.id === songId);

  if (songIndex === -1) {
    return res.status(404).json({ error: "Canción no encontrada" });
  }

  db.data.songs.splice(songIndex, 1);
  await db.write();
  res.status(204).send();
});

// API per a Clips
app.get("/api/clips", async (req, res) => {
  await db.read();
  res.json({ clips: db.data.clips });
});

app.post(
  "/api/clips",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "clip", maxCount: 1 },
  ]),
  async (req, res) => {
    await db.read();

    const clipData = {
      id: Date.now(),
      title: req.body.title,
      description: req.body.description || "",
      thumbnailUrl: req.files?.thumbnail
        ? `/uploads/clips/thumbnails/${req.files.thumbnail[0].filename}`
        : "",
      videoUrl: req.files?.clip
        ? `/uploads/clips/videos/${req.files.clip[0].filename}`
        : "",
    };

    db.data.clips.push(clipData);
    await db.write();
    res.status(201).json(clipData);
  }
);

app.put(
  "/api/clips/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "clip", maxCount: 1 },
  ]),
  async (req, res) => {
    await db.read();
    const clipId = parseInt(req.params.id);
    const clipIndex = db.data.clips.findIndex((c) => c.id === clipId);

    if (clipIndex === -1) {
      return res.status(404).json({ error: "Clip no encontrado" });
    }

    const updatedClip = {
      ...db.data.clips[clipIndex],
      title: req.body.title || db.data.clips[clipIndex].title,
      description: req.body.description || db.data.clips[clipIndex].description,
      thumbnailUrl: req.files?.thumbnail
        ? `/uploads/clips/thumbnails/${req.files.thumbnail[0].filename}`
        : db.data.clips[clipIndex].thumbnailUrl,
      videoUrl: req.files?.clip
        ? `/uploads/clips/videos/${req.files.clip[0].filename}`
        : db.data.clips[clipIndex].videoUrl,
    };

    db.data.clips[clipIndex] = updatedClip;
    await db.write();
    res.json(updatedClip);
  }
);

app.delete("/api/clips/:id", async (req, res) => {
  await db.read();
  const clipId = parseInt(req.params.id);
  const clipIndex = db.data.clips.findIndex((c) => c.id === clipId);

  if (clipIndex === -1) {
    return res.status(404).json({ error: "Clip no encontrado" });
  }

  db.data.clips.splice(clipIndex, 1);
  await db.write();
  res.status(204).send();
});

// Ruta isomòrfica per a jocs
app.get("/games", async (req, res) => {
  await db.read();

  const gamesList = db.data.games
    .slice(0, 25)
    .map(
      (game) => `
    <div class="game-card aspect-[3/4] bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out">
      ${
        game.imageUrl
          ? `<img src="${
              game.imageUrl.startsWith("http")
                ? game.imageUrl
                : `http://localhost:${PORT}${game.imageUrl}`
            }" alt="${game.title}" class="w-full h-full object-cover">`
          : `<div class="w-full h-full flex items-center justify-center">
          <span class="text-lg text-slate-300 text-center px-2">${game.title}</span>
        </div>`
      }
    </div>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mis Juegos - Aplicación Multimedia</title>
      <link rel="stylesheet" href="/style.css">
      <script>
        // Añadir el script del cliente
        document.addEventListener('DOMContentLoaded', function() {
          const gameCards = document.querySelectorAll('.game-card');
          gameCards.forEach(card => {
            card.addEventListener('click', function() {
              alert('Funcionalidad completa en la versión cliente');
            });
          });
        });
      </script>
    </head>
    <body class="bg-slate-900 text-white">
      <div class="p-8">
        <h1 class="text-4xl font-bold mb-8">Mis Juegos</h1>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          ${gamesList}
        </div>
        <div class="mt-8 text-center text-slate-400">
          <p>${db.data.games.length} juegos en total</p>
          <a href="/" class="text-blue-400 hover:underline mt-4 inline-block">Volver al inicio</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Ruta isomòrfica per a música
app.get("/music", async (req, res) => {
  await db.read();

  const musicList = db.data.songs
    .slice(0, 24)
    .map((song) => {
      const youtubeId = getYouTubeID(song.youtubeUrl);
      return `
      <div class="music-card aspect-video bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out">
        <img src="${
          song.coverImageUrl ||
          `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
        }" 
             alt="${song.title}" 
             class="w-full h-full object-cover">
      </div>
    `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mi Música - Aplicación Multimedia</title>
      <link rel="stylesheet" href="/style.css">
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const musicCards = document.querySelectorAll('.music-card');
          musicCards.forEach(card => {
            card.addEventListener('click', function() {
              alert('Funcionalidad completa en la versión cliente');
            });
          });
        });
      </script>
    </head>
    <body class="bg-slate-900 text-white">
      <div class="p-8">
        <h1 class="text-4xl font-bold mb-8">Mi Música</h1>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${musicList}
        </div>
        <div class="mt-8 text-center text-slate-400">
          <p>${db.data.songs.length} canciones en total</p>
          <a href="/" class="text-blue-400 hover:underline mt-4 inline-block">Volver al inicio</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Ruta isomòrfica per a clips
app.get("/clips", async (req, res) => {
  await db.read();

  const clipsList = db.data.clips
    .map(
      (clip) => `
    <div class="clip-card aspect-video bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out rounded-lg">
      ${
        clip.thumbnailUrl
          ? `<img src="http://localhost:${PORT}${clip.thumbnailUrl}" alt="${clip.title}" class="w-full h-full object-cover">`
          : `<div class="w-full h-full flex items-center justify-center">
          <span class="text-lg text-slate-300 text-center px-2">${clip.title}</span>
        </div>`
      }
      <div class="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
        <h3 class="font-bold">${clip.title}</h3>
      </div>
    </div>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mis Clips - Aplicación Multimedia</title>
      <link rel="stylesheet" href="/style.css">
      <style>
        .clip-card { position: relative; }
      </style>
    </head>
    <body class="bg-slate-900 text-white">
      <div class="p-8">
        <h1 class="text-4xl font-bold mb-8">Mis Clips</h1>
        ${
          clipsList
            ? `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${clipsList}</div>`
            : `<p class="text-center text-slate-400">No hay clips disponibles</p>`
        }
        <div class="mt-8 text-center text-slate-400">
          <p>${db.data.clips.length} clips en total</p>
          <a href="/" class="text-blue-400 hover:underline mt-4 inline-block">Volver al inicio</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Ruta isomòrfica per al dashboard
app.get("/dashboard", async (req, res) => {
  await db.read();

  const stats = {
    totalGames: db.data.games.length,
    totalSongs: db.data.songs.length,
    totalClips: db.data.clips.length,
  };

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - Aplicación Multimedia</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body class="bg-slate-900 text-white">
      <div class="min-h-screen flex items-center justify-center">
        <div class="bg-black/40 backdrop-blur-sm p-12 rounded-lg text-center max-w-2xl mx-4">
          <h1 class="text-5xl font-bold text-white mb-6">¡Bienvenido a la Aplicación Multimedia!</h1>
          <p class="text-xl text-slate-200 leading-relaxed mb-8">
            Tu plataforma personal para organizar juegos, música y clips.
          </p>
          
          <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-blue-600/20 backdrop-blur-sm p-6 rounded-lg border border-blue-500/30">
              <h3 class="text-2xl font-bold text-blue-300 mb-2">${stats.totalGames}</h3>
              <h4 class="text-blue-200 font-semibold mb-2">Juegos</h4>
              <a href="/games" class="text-blue-400 hover:underline">Ver juegos →</a>
            </div>
            
            <div class="bg-purple-600/20 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30">
              <h3 class="text-2xl font-bold text-purple-300 mb-2">${stats.totalSongs}</h3>
              <h4 class="text-purple-200 font-semibold mb-2">Canciones</h4>
              <a href="/music" class="text-purple-400 hover:underline">Ver música →</a>
            </div>
            
            <div class="bg-emerald-600/20 backdrop-blur-sm p-6 rounded-lg border border-emerald-500/30">
              <h3 class="text-2xl font-bold text-emerald-300 mb-2">${stats.totalClips}</h3>
              <h4 class="text-emerald-200 font-semibold mb-2">Clips</h4>
              <a href="/clips" class="text-emerald-400 hover:underline">Ver clips →</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🎮 Juegos: http://localhost:${PORT}/games`);
  console.log(`🎵 Música: http://localhost:${PORT}/music`);
  console.log(`🎬 Clips: http://localhost:${PORT}/clips`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📁 Base de datos: ${file}`);
  console.log(`📊 Juegos: ${db.data.games.length}, Canciones: ${db.data.songs.length}, Clips: ${db.data.clips.length}`);
});
