import dotenv from "dotenv";
dotenv.config();

import "./db/db"; // ensure schema is created before the app starts
import { app } from "./app";

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NudMedi API listening on http://localhost:${PORT}`);
});
