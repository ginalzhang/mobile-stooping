import express from "express";

import router from "./routes.js";
import { startJobs } from "./sweeper.js";

const app = express();
const port = Number(process.env.PORT || 8080);

app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(router);

startJobs();

app.listen(port, () => {
  console.log(`Stooping server listening on ${port}`);
});
