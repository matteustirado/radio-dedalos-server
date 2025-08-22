require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const socketService = require('./services/socketService');
const schedulerService = require('./services/schedulerService');

const authRoutes = require('./api/routes/authRoutes');
const songRoutes = require('./api/routes/songRoutes');
const artistRoutes = require('./api/routes/artistRoutes');
const categoryRoutes = require('./api/routes/categoryRoutes');
const playlistRoutes = require('./api/routes/playlistRoutes');
const jukeboxRoutes = require('./api/routes/jukeboxRoutes');
const djRoutes = require('./api/routes/djRoutes');
const userRoutes = require('./api/routes/userRoutes');
const suggestionRoutes = require('./api/routes/suggestionRoutes');
const banRoutes = require('./api/routes/banRoutes');
const logRoutes = require('./api/routes/logRoutes');
const reportRoutes = require('./api/routes/reportRoutes');
const commercialRoutes = require('./api/routes/commercialRoutes');
const settingRoutes = require('./api/routes/settingRoutes');
const priceRoutes = require('./api/routes/priceRoutes');
const slideRoutes = require('./api/routes/slideRoutes');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

socketService.init(httpServer);
schedulerService.initialize();

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/assets/uploads', express.static(path.join(__dirname, '../public/assets/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api', (request, response) => {
    response.send('API da Rádio Dédalos está no ar!');
});

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/jukebox', jukeboxRoutes);
app.use('/api/dj', djRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/bans', banRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/commercials', commercialRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/slides', slideRoutes);

httpServer.listen(PORT, () => {
    console.log(`Servidor da Rádio Dédalos rodando na porta ${PORT}`);
});