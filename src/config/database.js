const mongoose = require("mongoose");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected tot database");
  } catch (error) {
    console.log(error);
  }
}
module.exports = connectToDB;