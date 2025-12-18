// Router SPA con todas las funcionalidades
class MultimediaApp {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:4000/api' 
            : '/api';
        this.currentPage = 'home';
        this.currentPageNumber = 1;
        this.gamesPerPage = 25;
        this.songsPerPage = 24;
        this.initialize();
    }

    initialize() {
        this.bindEvents();
        this.loadPage('home');
    }

    bindEvents() {
        // Navegación
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.loadPage(page);
            }
            
            // Botones de paginación
            if (e.target.matches('[data-page-prev]')) {
                this.changePage(-1);
            }
            if (e.target.matches('[data-page-next]')) {
                this.changePage(1);
            }
            
            // Cerrar modales
            if (e.target.matches('[data-close-modal]') || e.target.closest('[data-close-modal]')) {
                this.closeModal();
            }
        });
        
        // Formularios
        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (e.target.matches('#gameForm')) {
                await this.submitGameForm(e.target);
            }
            if (e.target.matches('#musicForm')) {
                await this.submitMusicForm(e.target);
            }
            if (e.target.matches('#clipForm')) {
                await this.submitClipForm(e.target);
            }
        });
    }

    async loadPage(page) {
        this.currentPage = page;
        this.currentPageNumber = 1; // Reset paginación
        
        // Actualizar navegación activa
        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });

        try {
            switch(page) {
                case 'home':
                    await this.renderHome();
                    break;
                case 'games':
                    await this.renderGames();
                    break;
                case 'music':
                    await this.renderMusic();
                    break;
                case 'clips':
                    await this.renderClips();
                    break;
                case 'content':
                    await this.renderContentManagement();
                    break;
            }
        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            this.renderError();
        }
    }

    changePage(delta) {
        this.currentPageNumber += delta;
        if (this.currentPage === 'games') {
            this.renderGames();
        } else if (this.currentPage === 'music') {
            this.renderMusic();
        }
    }

    // PÁGINA HOME
    async renderHome() {
        try {
            const [gamesRes, songsRes, clipsRes] = await Promise.all([
                fetch(`${this.API_URL}/games?limit=3`),
                fetch(`${this.API_URL}/songs?limit=3`),
                fetch(`${this.API_URL}/clips`)
            ]);
            
            const games = await gamesRes.json();
            const songs = await songsRes.json();
            const clips = await clipsRes.json();

            const container = document.getElementById('pageContainer');
            container.innerHTML = `
                <div class="h-screen flex items-center justify-center overflow-hidden"
                    style="
                        background-image: url('https://images8.alphacoders.com/135/1352905.png');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        background-attachment: fixed;
                        margin-top: -64px;
                    ">
                    <div class="bg-black/40 backdrop-blur-sm p-12 rounded-lg text-center max-w-2xl mx-4">
                        <h1 class="text-5xl font-bold text-white mb-6">¡Bienvenido!</h1>
                        <p class="text-xl text-slate-200 leading-relaxed">
                            Tu galería multimedia personal. ${games.total} juegos, ${songs.total} canciones, ${clips.clips?.length || 0} clips.
                        </p>
                        <div class="mt-8 flex flex-wrap justify-center gap-4">
                            <div class="bg-blue-600/20 backdrop-blur-sm p-4 rounded-lg border border-blue-500/30">
                                <h3 class="text-blue-300 font-semibold">Juegos</h3>
                                <p class="text-sm text-slate-300">${games.total} en colección</p>
                                <button data-page="games" class="mt-2 text-blue-400 hover:underline">Ver todos →</button>
                            </div>
                            <div class="bg-purple-600/20 backdrop-blur-sm p-4 rounded-lg border border-purple-500/30">
                                <h3 class="text-purple-300 font-semibold">Música</h3>
                                <p class="text-sm text-slate-300">${songs.total} canciones</p>
                                <button data-page="music" class="mt-2 text-purple-400 hover:underline">Escuchar →</button>
                            </div>
                            <div class="bg-sky-600/20 backdrop-blur-sm p-4 rounded-lg border border-sky-500/30">
                                <h3 class="text-sky-300 font-semibold">Clips</h3>
                                <p class="text-sm text-slate-300">${clips.clips?.length || 0} momentos</p>
                                <button data-page="clips" class="mt-2 text-sky-400 hover:underline">Ver clips →</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering home:', error);
        }
    }

    // PÁGINA JUEGOS
    async renderGames() {
        try {
            const response = await fetch(`${this.API_URL}/games?page=${this.currentPageNumber}&limit=${this.gamesPerPage}`);
            const data = await response.json();
            
            const container = document.getElementById('pageContainer');
            container.innerHTML = `
                <div class="w-full p-8">
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        ${data.items.map(game => `
                            <div class="game-card aspect-[3/4] bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out"
                                 data-game-id="${game.id}">
                                ${game.imageUrl ? 
                                    `<img src="${this.getImageUrl(game.imageUrl)}" alt="${game.title}" class="w-full h-full object-cover">` :
                                    `<div class="w-full h-full flex items-center justify-center">
                                        <span class="text-lg text-slate-300 text-center px-2">${game.title}</span>
                                    </div>`
                                }
                            </div>
                        `).join('')}
                    </div>

                    ${data.totalPages > 1 ? `
                        <div class="flex justify-center items-center gap-2 mt-8">
                            <button data-page-prev class="px-3 py-1 rounded bg-slate-700 text-white ${this.currentPageNumber === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}"
                                    ${this.currentPageNumber === 1 ? 'disabled' : ''}>
                                Anterior
                            </button>
                            <span class="mx-2 text-slate-300">
                                Página ${this.currentPageNumber} de ${data.totalPages} (${data.total} juegos)
                            </span>
                            <button data-page-next class="px-3 py-1 rounded bg-slate-700 text-white ${this.currentPageNumber === data.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}"
                                    ${this.currentPageNumber === data.totalPages ? 'disabled' : ''}>
                                Siguiente
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Agregar eventos a las tarjetas usando delegación de eventos
            container.addEventListener('click', async (e) => {
                const gameCard = e.target.closest('.game-card');
                if (gameCard) {
                    const gameId = gameCard.getAttribute('data-game-id');
                    if (gameId) {
                    await this.showGameDetails(gameId);
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering games:', error);
        }
    }

    // PÁGINA MÚSICA
    async renderMusic() {
        try {
            const response = await fetch(`${this.API_URL}/songs?page=${this.currentPageNumber}&limit=${this.songsPerPage}`);
            const data = await response.json();
            
            const container = document.getElementById('pageContainer');
            container.innerHTML = `
                <div class="w-full p-8">
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        ${data.items.map(song => `
                            <div class="music-card aspect-video bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out"
                                 data-song-id="${song.id}">
                                <img src="${this.getYouTubeThumbnail(song.youtubeUrl, song.coverImageUrl)}" 
                                     alt="${song.title}" 
                                     class="w-full h-full object-cover">
                            </div>
                        `).join('')}
                    </div>

                    ${data.totalPages > 1 ? `
                        <div class="flex justify-center items-center gap-2 mt-8">
                            <button data-page-prev class="px-3 py-1 rounded bg-slate-700 text-white ${this.currentPageNumber === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}"
                                    ${this.currentPageNumber === 1 ? 'disabled' : ''}>
                                Anterior
                            </button>
                            <span class="mx-2 text-slate-300">
                                Página ${this.currentPageNumber} de ${data.totalPages} (${data.total} canciones)
                            </span>
                            <button data-page-next class="px-3 py-1 rounded bg-slate-700 text-white ${this.currentPageNumber === data.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}"
                                    ${this.currentPageNumber === data.totalPages ? 'disabled' : ''}>
                                Siguiente
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Agregar eventos a las tarjetas de música
            document.querySelectorAll('.music-card').forEach(card => {
                card.addEventListener('click', async () => {
                    const songId = card.getAttribute('data-song-id');
                    const song = data.items.find(s => s.id == songId);
                    if (song) {
                        this.playYouTubeVideo(song.youtubeUrl, song.id);
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering music:', error);
        }
    }

    // PÁGINA CLIPS
    async renderClips() {
        try {
            const response = await fetch(`${this.API_URL}/clips`);
            const data = await response.json();
            const clips = data.clips || [];
            
            const container = document.getElementById('pageContainer');
            container.innerHTML = `
                <div class="w-full p-8">
                    
                    ${clips.length > 0 ? `
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            ${clips.map(clip => `
                                <div class="clip-card aspect-video bg-slate-800 overflow-hidden cursor-pointer hover:brightness-125 hover:shadow-lg transition-all duration-300 ease-in-out rounded-lg relative"
                                     data-clip-id="${clip.id}">
                                    ${clip.thumbnailUrl ? 
                                        `<img src="${this.getImageUrl(clip.thumbnailUrl)}" alt="${clip.title}" class="w-full h-full object-cover">` :
                                        `<div class="w-full h-full flex items-center justify-center">
                                            <span class="text-lg text-slate-300 text-center px-2">${clip.title}</span>
                                        </div>`
                                    }
                                    <div class="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                                        <h3 class="font-bold">${clip.title}</h3>
                                        ${clip.description ? `<p class="text-sm text-slate-300 truncate">${clip.description}</p>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-12">
                            <p class="text-xl text-slate-400">No hay clips disponibles</p>
                            <button data-page="content" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                                Añadir primer clip
                            </button>
                        </div>
                    `}
                </div>
            `;
            
            // Agregar eventos a las tarjetas de clips
            document.querySelectorAll('.clip-card').forEach(card => {
                card.addEventListener('click', async () => {
                    const clipId = card.getAttribute('data-clip-id');
                    const clip = clips.find(c => c.id == clipId);
                    if (clip && clip.videoUrl) {
                        this.showVideoPlayer(clip);
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering clips:', error);
        }
    }

    // PÁGINA GESTIÓN DE CONTENIDO
    async renderContentManagement() {
        try {
            const [gamesRes, songsRes, clipsRes] = await Promise.all([
                fetch(`${this.API_URL}/games?limit=100`),
                fetch(`${this.API_URL}/songs?limit=100`),
                fetch(`${this.API_URL}/clips`)
            ]);
            
            const games = await gamesRes.json();
            const songs = await songsRes.json();
            const clips = await clipsRes.json();

            const container = document.getElementById('pageContainer');
            container.innerHTML = `
                <div class="p-8 max-w-7xl mx-auto">
                    <h2 class="text-3xl font-bold mb-8">Gestionar Contenido</h2>
                    
                    <div class="flex space-x-2 border-b border-slate-700 mb-6">
                        <button data-tab="games" class="content-tab px-4 py-2 text-lg font-medium rounded-t-md cursor-pointer transition-colors bg-slate-700 text-white">
                            Juegos
                        </button>
                        <button data-tab="music" class="content-tab px-4 py-2 text-lg font-medium rounded-t-md cursor-pointer transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700">
                            Música
                        </button>
                        <button data-tab="clips" class="content-tab px-4 py-2 text-lg font-medium rounded-t-md cursor-pointer transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700">
                            Clips
                        </button>
                    </div>
                    
                    <div id="contentTabContainer" class="bg-slate-700/50 p-6 rounded-b-md">
                        <!-- Las pestañas se cargarán aquí -->
                    </div>
                </div>
            `;
            
            // Cargar primera pestaña
            this.renderGamesTab(games.items);
            
            // Eventos para cambiar pestañas
            document.querySelectorAll('.content-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.content-tab').forEach(t => {
                        t.classList.remove('bg-slate-700', 'text-white');
                        t.classList.add('bg-slate-800', 'text-slate-400');
                    });
                    tab.classList.remove('bg-slate-800', 'text-slate-400');
                    tab.classList.add('bg-slate-700', 'text-white');
                    
                    const tabName = tab.getAttribute('data-tab');
                    switch(tabName) {
                        case 'games':
                            this.renderGamesTab(games.items);
                            break;
                        case 'music':
                            this.renderMusicTab(songs.items);
                            break;
                        case 'clips':
                            this.renderClipsTab(clips.clips || []);
                            break;
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering content management:', error);
        }
    }

    // FUNCIONES AUXILIARES
    getYouTubeID(url) {
        if (!url) return '';
        const arr = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        return (arr[2] !== undefined) ? arr[2].split(/[^0-9a-z_\-]/i)[0] : arr[0];
    }

    getYouTubeThumbnail(youtubeUrl, coverImageUrl) {
        const videoId = this.getYouTubeID(youtubeUrl);
        if (coverImageUrl) {
            return this.getImageUrl(coverImageUrl);
        }
        return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '/placeholder.jpg';
    }

    getImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads')) {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
            return baseUrl + url;
        }
        return url;
    }

    renderStars(rating) {
        if (!rating) return 'Sin calificación';
        const fullStars = Math.floor(rating);
        const emptyStars = 5 - fullStars;
        const stars = '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
        return `${stars} <span class="ml-2 text-slate-400">(${rating}/5)</span>`;
    }

    // MODALES Y DETALLES
    async showGameDetails(gameId) {
        try {
            if (!gameId) {
                throw new Error('ID de juego no válido');
            }
            
            const response = await fetch(`${this.API_URL}/games/${gameId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Juego no encontrado');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const game = await response.json();
            
            if (!game || !game.title) {
                throw new Error('Datos del juego inválidos');
            }
            
            // Cerrar modales existentes
            this.closeModal();
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center';
            modal.style.zIndex = '9999';
            modal.setAttribute('data-modal', 'true');
            modal.innerHTML = `
                <div class="bg-slate-800 rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 text-white" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-3xl font-bold">${game.title}</h2>
                        <button data-close-modal class="text-slate-400 hover:text-white text-2xl font-bold ml-4" aria-label="Cerrar">×</button>
                    </div>
                    
                    ${game.trailerUrl ? `
                        <div class="mb-4 aspect-video">
                            <iframe
                                width="100%"
                                height="315"
                                src="https://www.youtube.com/embed/${this.getYouTubeID(game.trailerUrl)}"
                                title="YouTube trailer"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen
                                class="w-full h-full rounded-md">
                            </iframe>
                        </div>
                    ` : ''}
                    
                    <div class="space-y-2">
                        <div><span class="font-semibold">Fecha de lanzamiento:</span> ${game.launchDate ? new Date(game.launchDate).toLocaleDateString() : 'Sin fecha'}</div>
                        <div><span class="font-semibold">Estado:</span> ${game.status || 'Sin estado'}</div>
                        <div><span class="font-semibold">Descripción:</span> ${game.notes || 'Sin descripción'}</div>
                        <div><span class="font-semibold">Puntuación:</span> ${this.renderStars(game.rating)}</div>
                    </div>
                    
                    <div class="mt-6 flex justify-end">
                        <button data-close-modal class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Cerrar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Función para cerrar el modal
            const handleEscape = (e) => {
                if (e.key === 'Escape' && modal.parentNode) {
                    closeModal();
                }
            };
            
            const closeModal = () => {
                    modal.remove();
                document.removeEventListener('keydown', handleEscape);
            };
            
            // Manejar clic en botón cerrar
            modal.querySelectorAll('[data-close-modal]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeModal();
                });
            });
            
            // Manejar clic fuera del modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
            
            // Manejar tecla Escape
            document.addEventListener('keydown', handleEscape);
        } catch (error) {
            console.error('Error showing game details:', error);
            alert(`Error: ${error.message || 'Error al cargar los detalles del juego. Por favor, intenta de nuevo.'}`);
        }
    }

    playYouTubeVideo(youtubeUrl, songId) {
        const videoId = this.getYouTubeID(youtubeUrl);
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50';
        modal.setAttribute('data-modal', 'true');
        modal.innerHTML = `
            <div class="relative max-w-4xl w-full p-4" onclick="event.stopPropagation()">
                <button data-close-modal class="absolute -top-10 right-0 text-white text-2xl hover:text-slate-300 cursor-pointer" aria-label="Cerrar">✕</button>
                <iframe
                    width="100%"
                    height="500"
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                    title="YouTube video player"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    class="rounded-lg">
                </iframe>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Función para cerrar el modal
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                closeModal();
            }
        };
        
        const closeModal = () => {
                modal.remove();
            document.removeEventListener('keydown', handleEscape);
        };
        
        // Manejar clic en botón cerrar
        modal.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeModal();
            });
        });
        
        // Manejar clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Manejar tecla Escape
        document.addEventListener('keydown', handleEscape);
    }

    showVideoPlayer(clip) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50';
        modal.setAttribute('data-modal', 'true');
        modal.innerHTML = `
            <div class="relative max-w-4xl w-full p-4" onclick="event.stopPropagation()">
                <button data-close-modal class="absolute -top-10 right-0 text-white text-2xl hover:text-slate-300 cursor-pointer" aria-label="Cerrar">✕</button>
                <video controls autoplay class="w-full rounded-lg">
                    <source src="${this.getImageUrl(clip.videoUrl)}" type="video/mp4">
                    Tu navegador no soporta videos HTML5.
                </video>
                <div class="mt-4 text-white">
                    <h3 class="text-2xl font-bold">${clip.title}</h3>
                    ${clip.description ? `<p class="mt-2">${clip.description}</p>` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Función para cerrar el modal
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                closeModal();
            }
        };
        
        const closeModal = () => {
                modal.remove();
            document.removeEventListener('keydown', handleEscape);
        };
        
        // Manejar clic en botón cerrar
        modal.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeModal();
            });
        });
        
        // Manejar clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Manejar tecla Escape
        document.addEventListener('keydown', handleEscape);
    }

    closeModal() {
        const modals = document.querySelectorAll('[data-modal="true"]');
        modals.forEach(modal => modal.remove());
    }

    // PESTAÑAS DE GESTIÓN
    renderGamesTab(games) {
        const container = document.getElementById('contentTabContainer');
        container.innerHTML = `
            <div>
                <div class="mb-8">
                    <h3 class="text-2xl font-bold mb-4">Añadir Nuevo Juego</h3>
                    <form id="gameForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Título *</label>
                                <input type="text" name="title" required class="form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Estado</label>
                                <select name="status" class="form-input">
                                    <option value="Jugando">Jugando</option>
                                    <option value="Completado">Completado</option>
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Abandonado">Abandonado</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Puntuación (1-5)</label>
                                <input type="number" name="rating" min="1" max="5" step="0.1" class="form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">URL Trailer YouTube</label>
                                <input type="url" name="trailerUrl" class="form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">URL Imagen</label>
                                <input type="url" name="imageUrl" class="form-input" placeholder="https://ejemplo.com/imagen.jpg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Fecha Lanzamiento</label>
                                <input type="date" name="launchDate" class="form-input">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300">Descripción</label>
                            <textarea name="notes" rows="3" class="form-input"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">O subir imagen:</label>
                            <input type="file" name="image" accept="image/*" class="form-input">
                        </div>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                            Añadir Juego
                        </button>
                    </form>
                </div>
                
                <div>
                    <h3 class="text-2xl font-bold mb-4">Juegos Existentes (${games.length})</h3>
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${games.map(game => `
                            <div class="bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold">${game.title}</h4>
                                    <p class="text-sm text-slate-400">${game.status} | ${this.renderStars(game.rating)}</p>
                                </div>
                                <div class="space-x-2">
                                    <button onclick="app.editGame(${game.id})" class="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm">
                                        Editar
                                    </button>
                                    <button onclick="app.deleteGame(${game.id})" class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderMusicTab(songs) {
        const container = document.getElementById('contentTabContainer');
        container.innerHTML = `
            <div>
                <div class="mb-8">
                    <h3 class="text-2xl font-bold mb-4">Añadir Nueva Canción</h3>
                    <form id="musicForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Título *</label>
                                <input type="text" name="title" required class="form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Artista</label>
                                <input type="text" name="artist" class="form-input">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300">URL YouTube *</label>
                            <input type="url" name="youtubeUrl" required class="form-input" placeholder="https://youtube.com/watch?v=...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300">URL Portada (opcional)</label>
                            <input type="url" name="coverImageUrl" class="form-input" placeholder="https://ejemplo.com/portada.jpg">
                        </div>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                            Añadir Canción
                        </button>
                    </form>
                </div>
                
                <div>
                    <h3 class="text-2xl font-bold mb-4">Canciones Existentes (${songs.length})</h3>
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${songs.map(song => `
                            <div class="bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold">${song.title}</h4>
                                    <p class="text-sm text-slate-400">${song.artist || 'Artista desconocido'}</p>
                                </div>
                                <div class="space-x-2">
                                    <button onclick="app.editSong(${song.id})" class="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm">
                                        Editar
                                    </button>
                                    <button onclick="app.deleteSong(${song.id})" class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderClipsTab(clips) {
        const container = document.getElementById('contentTabContainer');
        container.innerHTML = `
            <div>
                <div class="mb-8">
                    <h3 class="text-2xl font-bold mb-4">Añadir Nuevo Clip</h3>
                    <form id="clipForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Título *</label>
                                <input type="text" name="title" required class="form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300">Descripción</label>
                                <textarea name="description" rows="2" class="form-input"></textarea>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Miniatura (Imagen)</label>
                            <input type="file" name="thumbnail" accept="image/*" class="form-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Video (MP4, etc.) *</label>
                            <input type="file" name="video" accept="video/*" required class="form-input">
                        </div>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                            Añadir Clip
                        </button>
                    </form>
                </div>
                
                <div>
                    <h3 class="text-2xl font-bold mb-4">Clips Existentes (${clips.length})</h3>
                    ${clips.length > 0 ? `
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            ${clips.map(clip => `
                                <div class="bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <h4 class="font-bold">${clip.title}</h4>
                                        ${clip.description ? `<p class="text-sm text-slate-400">${clip.description}</p>` : ''}
                                    </div>
                                    <div class="space-x-2">
                                        <button onclick="app.editClip(${clip.id})" class="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm">
                                            Editar
                                        </button>
                                        <button onclick="app.deleteClip(${clip.id})" class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm">
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-center text-slate-400 py-8">No hay clips disponibles</p>
                    `}
                </div>
            </div>
        `;
    }

    // FUNCIONES CRUD
    async submitGameForm(form) {
        const formData = new FormData(form);
        const editId = formData.get('editId');
        
        try {
            let response;
            if (editId) {
                // Actualizar juego existente
                response = await fetch(`${this.API_URL}/games/${editId}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                // Crear nuevo juego
                response = await fetch(`${this.API_URL}/games`, {
                method: 'POST',
                    body: formData
            });
            }
            
            if (response.ok) {
                alert(editId ? 'Juego actualizado correctamente' : 'Juego añadido correctamente');
                form.reset();
                // Remover el campo editId si existe
                const hiddenId = form.querySelector('[name="editId"]');
                if (hiddenId) hiddenId.remove();
                // Restaurar el texto del botón y título
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Añadir Juego';
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) formTitle.textContent = 'Añadir Nuevo Juego';
                this.renderContentManagement();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error submitting game:', error);
            alert(editId ? 'Error al actualizar juego' : 'Error al añadir juego');
        }
    }

    async submitMusicForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const editId = data.editId;
        
        // Remover editId de los datos antes de enviar
        delete data.editId;
        
        try {
            let response;
            if (editId) {
                // Actualizar canción existente
                response = await fetch(`${this.API_URL}/songs/${editId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Crear nueva canción
                response = await fetch(`${this.API_URL}/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            }
            
            if (response.ok) {
                alert(editId ? 'Canción actualizada correctamente' : 'Canción añadida correctamente');
                form.reset();
                // Remover el campo editId si existe
                const hiddenId = form.querySelector('[name="editId"]');
                if (hiddenId) hiddenId.remove();
                // Restaurar el texto del botón y título
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Añadir Canción';
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) formTitle.textContent = 'Añadir Nueva Canción';
                this.renderContentManagement();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error submitting music:', error);
            alert(editId ? 'Error al actualizar canción' : 'Error al añadir canción');
        }
    }

    async submitClipForm(form) {
        const formData = new FormData(form);
        const editId = formData.get('editId');
        
        try {
            let response;
            if (editId) {
                // Actualizar clip existente
                response = await fetch(`${this.API_URL}/clips/${editId}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                // Crear nuevo clip
                response = await fetch(`${this.API_URL}/clips`, {
                method: 'POST',
                body: formData
            });
            }
            
            if (response.ok) {
                alert(editId ? 'Clip actualizado correctamente' : 'Clip añadido correctamente');
                form.reset();
                // Remover el campo editId si existe
                const hiddenId = form.querySelector('[name="editId"]');
                if (hiddenId) hiddenId.remove();
                // Restaurar el texto del botón y título
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Añadir Clip';
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) formTitle.textContent = 'Añadir Nuevo Clip';
                // Restaurar campos requeridos
                const thumbnailInput = form.querySelector('[name="thumbnail"]');
                const videoInput = form.querySelector('[name="video"]');
                if (videoInput) videoInput.setAttribute('required', 'required');
                this.renderContentManagement();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error submitting clip:', error);
            alert(editId ? 'Error al actualizar clip' : 'Error al añadir clip');
        }
    }

    async deleteGame(id) {
        if (confirm('¿Estás seguro de eliminar este juego?')) {
            try {
                const response = await fetch(`${this.API_URL}/games/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Juego eliminado correctamente');
                    this.renderContentManagement();
                }
            } catch (error) {
                console.error('Error deleting game:', error);
                alert('Error al eliminar juego');
            }
        }
    }

    async deleteSong(id) {
        if (confirm('¿Estás seguro de eliminar esta canción?')) {
            try {
                const response = await fetch(`${this.API_URL}/songs/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Canción eliminada correctamente');
                    this.renderContentManagement();
                }
            } catch (error) {
                console.error('Error deleting song:', error);
                alert('Error al eliminar canción');
            }
        }
    }

    async deleteClip(id) {
        if (confirm('¿Estás seguro de eliminar este clip?')) {
            try {
                const response = await fetch(`${this.API_URL}/clips/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Clip eliminado correctamente');
                    this.renderContentManagement();
                }
            } catch (error) {
                console.error('Error deleting clip:', error);
                alert('Error al eliminar clip');
            }
        }
    }

    async editGame(id) {
        try {
            const response = await fetch(`${this.API_URL}/games/${id}`);
            if (!response.ok) {
                throw new Error('Juego no encontrado');
            }
            const game = await response.json();
            
            // Cambiar a la pestaña de juegos si no está activa
            document.querySelectorAll('.content-tab').forEach(tab => {
                if (tab.getAttribute('data-tab') === 'games') {
                    tab.click();
                }
            });
            
            // Esperar un momento para que se renderice la pestaña
            setTimeout(() => {
                const form = document.getElementById('gameForm');
                if (!form) return;
                
                // Pre-llenar el formulario
                form.querySelector('[name="title"]').value = game.title || '';
                form.querySelector('[name="status"]').value = game.status || 'Jugando';
                form.querySelector('[name="rating"]').value = game.rating || '';
                form.querySelector('[name="trailerUrl"]').value = game.trailerUrl || '';
                form.querySelector('[name="imageUrl"]').value = game.imageUrl || '';
                form.querySelector('[name="launchDate"]').value = game.launchDate ? game.launchDate.split('T')[0] : '';
                form.querySelector('[name="notes"]').value = game.notes || '';
                
                // Agregar campo oculto con el ID
                let hiddenId = form.querySelector('[name="editId"]');
                if (!hiddenId) {
                    hiddenId = document.createElement('input');
                    hiddenId.type = 'hidden';
                    hiddenId.name = 'editId';
                    form.appendChild(hiddenId);
                }
                hiddenId.value = game.id;
                
                // Cambiar el texto del botón
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Actualizar Juego';
                }
                
                // Cambiar el título del formulario
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) {
                    formTitle.textContent = 'Editar Juego';
                }
                
                // Scroll al formulario
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('Error loading game for edit:', error);
            alert('Error al cargar el juego para editar');
        }
    }

    async editSong(id) {
        try {
            const response = await fetch(`${this.API_URL}/songs/${id}`);
            if (!response.ok) {
                throw new Error('Canción no encontrada');
            }
            const song = await response.json();
            
            // Cambiar a la pestaña de música si no está activa
            document.querySelectorAll('.content-tab').forEach(tab => {
                if (tab.getAttribute('data-tab') === 'music') {
                    tab.click();
                }
            });
            
            // Esperar un momento para que se renderice la pestaña
            setTimeout(() => {
                const form = document.getElementById('musicForm');
                if (!form) return;
                
                // Pre-llenar el formulario
                form.querySelector('[name="title"]').value = song.title || '';
                form.querySelector('[name="artist"]').value = song.artist || '';
                form.querySelector('[name="youtubeUrl"]').value = song.youtubeUrl || '';
                form.querySelector('[name="coverImageUrl"]').value = song.coverImageUrl || '';
                
                // Agregar campo oculto con el ID
                let hiddenId = form.querySelector('[name="editId"]');
                if (!hiddenId) {
                    hiddenId = document.createElement('input');
                    hiddenId.type = 'hidden';
                    hiddenId.name = 'editId';
                    form.appendChild(hiddenId);
                }
                hiddenId.value = song.id;
                
                // Cambiar el texto del botón
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Actualizar Canción';
                }
                
                // Cambiar el título del formulario
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) {
                    formTitle.textContent = 'Editar Canción';
                }
                
                // Scroll al formulario
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('Error loading song for edit:', error);
            alert('Error al cargar la canción para editar');
    }
    }

    async editClip(id) {
        try {
            const response = await fetch(`${this.API_URL}/clips`);
            if (!response.ok) {
                throw new Error('Error al cargar clips');
            }
            const data = await response.json();
            const clip = (data.clips || []).find(c => c.id == id);
            
            if (!clip) {
                throw new Error('Clip no encontrado');
            }
            
            // Cambiar a la pestaña de clips si no está activa
            document.querySelectorAll('.content-tab').forEach(tab => {
                if (tab.getAttribute('data-tab') === 'clips') {
                    tab.click();
                }
            });
            
            // Esperar un momento para que se renderice la pestaña
            setTimeout(() => {
                const form = document.getElementById('clipForm');
                if (!form) return;
                
                // Pre-llenar el formulario
                form.querySelector('[name="title"]').value = clip.title || '';
                form.querySelector('[name="description"]').value = clip.description || '';
                
                // Agregar campo oculto con el ID
                let hiddenId = form.querySelector('[name="editId"]');
                if (!hiddenId) {
                    hiddenId = document.createElement('input');
                    hiddenId.type = 'hidden';
                    hiddenId.name = 'editId';
                    form.appendChild(hiddenId);
                }
                hiddenId.value = clip.id;
                
                // Cambiar el texto del botón
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Actualizar Clip';
                }
                
                // Cambiar el título del formulario
                const formTitle = form.closest('.mb-8').querySelector('h3');
                if (formTitle) {
                    formTitle.textContent = 'Editar Clip';
                }
                
                // Hacer que los campos de archivo no sean requeridos al editar
                const thumbnailInput = form.querySelector('[name="thumbnail"]');
                const videoInput = form.querySelector('[name="video"]');
                if (thumbnailInput) thumbnailInput.removeAttribute('required');
                if (videoInput) videoInput.removeAttribute('required');
                
                // Scroll al formulario
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('Error loading clip for edit:', error);
            alert('Error al cargar el clip para editar');
        }
    }

    renderError() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="p-8 text-center">
                <h2 class="text-2xl font-bold text-red-400 mb-4">Error</h2>
                <p class="text-slate-300">No se pudo cargar la página. Intenta recargar.</p>
                <button onclick="location.reload()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                    Recargar
                </button>
            </div>
        `;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MultimediaApp();
});