const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    pid: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Za-z0-9_-]{1,50}$/
    },
    pname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isFinite
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model('Product', productSchema);
