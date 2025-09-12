const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/user"); // adjust path

const fixPhoneIndex = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    await User.collection.dropIndex("phone_1");
    console.log("✅ Old phone index dropped");

    await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    console.log("✅ New sparse unique phone index created");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

fixPhoneIndex();
