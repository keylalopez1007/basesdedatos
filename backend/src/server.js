require('./config/env').validateEnvironment();

const app = require('./app');

const port = Number(process.env.PORT || 3307);

app.listen(port, () => {
  console.log(`Backend disponible en http://localhost:${port}`);
});
