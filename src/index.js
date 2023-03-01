const express = require("express");
const route =require("./routes/route")
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();

app.use(express.json());
app.use(multer().any());
mongoose.set('strictQuery', false);
mongoose.connect(
    "mongodb+srv://iammonag:rajmona24@cluster1.hsmwmii.mongodb.net/project5?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
    }
  )
  .then(() => console.log("MongoDb is connected"))
  .catch((err) => console.log(err));

app.use("/", route);

app.listen(process.env.PORT || 3000, function () {
  console.log("Express app running on port " + (process.env.PORT || 3000));
});
