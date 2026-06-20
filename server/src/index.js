import express from 'express';

import router, { errorHandler } from './routes.js';
import { startJobs } from './sweeper.js';

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(router);
app.use(errorHandler);

startJobs();

app.listen(port, () => {
  console.log(`Stooping server listening on ${port}`);
});
