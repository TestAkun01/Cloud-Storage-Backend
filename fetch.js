import fetch from "node-fetch";
import fs from "fs";
import https from "https";
// const fetch = require("node-fetch");
// const fs = require("fs");
// const https = require("https");

async function extractEndpoints() {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await fetch("https://localhost:3000/swagger/json", {
      agent,
    });
    const data = await response.json();

    const endpoints = Object.entries(data.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => ({
        method: method.toUpperCase(),
        path,
      }))
    );

    fs.writeFileSync("endpoints.json", JSON.stringify(endpoints, null, 2));
    console.log("Endpoints saved to endpoints.json");
  } catch (error) {
    console.error("Error fetching Swagger JSON:", error);
  }
}

extractEndpoints();
