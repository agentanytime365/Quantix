require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
const fs = require('fs');
const distPath = path.join(__dirname, '../client/dist');
const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(distPath);

app.use(cors());
app.use(express.json());

// Mount all API routes
app.use('/api', routes);

// Serve built Vite client whenever dist/ exists (production / deployment)
if (isProd) {
  app.use(express.static(distPath));
  // SPA fallback — any non-API route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Quantix server running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
});
