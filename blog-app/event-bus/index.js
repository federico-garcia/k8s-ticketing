const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const events = [];

app.post("/events", (req, res) => {
  const event = req.body;

  events.push(event);

  // axios.post("http://posts-cluster-ip-srv:3001/events", event);
  axios.post("http://comments-srv:5000/events", event);
  axios.post("http://query-srv:4000/events", event);
  axios.post("http://moderation-srv:3000/events", event);

  res.send({ status: "OK" });
});

app.get("/events", (req, res) => {
  res.send(events);
});

app.listen(3000, () => {
  console.log("Listening on 3000");
});
