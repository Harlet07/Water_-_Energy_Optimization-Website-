const express = require('express');
const path = require('path');
const api = require('./api');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', api);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
