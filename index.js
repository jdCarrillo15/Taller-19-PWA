require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
 res.send('Taller-19-PWA funcionando');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});