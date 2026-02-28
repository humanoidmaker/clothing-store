const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const apiApp = require('./apiApp');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use('/api', apiApp);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
