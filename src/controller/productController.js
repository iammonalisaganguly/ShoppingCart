const productModel = require("../model/productModel");
const { uploadFile } = require("../validator/awsS3");
const validator = require("../validator/validator");

const createProduct = async function (req, res) {
  try {
    if (!validator.isValidRequestBody(req.body)) {
      return res.status(400).send({
        status: false,
        message: "Please provide product details",
      });
    }
    let mandetory = [
      "title",
      "description",
      "price",
      "currencyId",
      "currencyFormat",
    ];
    const data = req.body;
    // console.log(data.price);
    let keys = Object.keys(req.body);
    let requireList = [];
    for (element of mandetory) {
      if (!keys.includes(element) || !data[element]) {
        requireList.push(element);
      }
    }
    if (requireList.length > 0) {
      return res.status(400).send({
        status: false,
        message: `These are mandetory field, please provide. => ${requireList}`,
      });
    }

    let {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      availableSizes,
      style,
    } = data;
    productImage = req.files;

    if (!validator.isValid(title)) {
      return res.status(400).send({
        status: false,
        message: "Title must be strings.",
      });
    }
    if (!/^[\d]+[.]*[\d]*$/.test(price)) {
      return res.status(400).send({
        status: false,
        message: "price must be valid.",
      });
    }
    const validTitle = await productModel.findOne({ title: title });
    if (validTitle) {
      return res.status(400).send({
        status: false,
        message: "Title already exists...",
      });
    }
    if (!validator.isValid(description)) {
      return res.status(400).send({
        status: false,
        message: "Description must be strings.",
      });
    }

    if (currencyId !== "INR") {
      return res.status(400).send({
        status: false,
        message: "CurrencyId must be INR.",
      });
    }
    if (currencyFormat !== "₹") {
      return res.status(400).send({
        status: false,
        message: "currencyFormat must be ₹.",
      });
    }
    if (availableSizes) {
      availableSizes = availableSizes.split(",");
      if (!validator.isStringsArray(availableSizes)) {
        // console.log("1");
        return res.status(400).send({
          status: false,
          message:
            "availableSizes must be among these [S, XS, M, X, L, XXL, XL] only.",
        });
      }
      data.availableSizes = availableSizes;
    }

    if (style && !validator.isValid(style)) {
      return res.status(400).send({
        status: false,
        message: "Style must be string .",
      });
    }
    if (productImage && productImage.length > 0) {
      //upload to s3 and get the uploaded link
      let uploadedFileURL = await uploadFile(productImage[0]);
      data.productImage = uploadedFileURL;
    } else {
      return res.status(400).send({
        status: false,
        message: "productImage is required.",
      });
    }
    const createdProduct = await productModel.create(data);
    return res.status(201).send({
      status: true,
      message: "Success",
      data: createdProduct,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getByQuery = async function (req, res) {
  try {
    const { size, name, priceGreaterThan, priceLessThan, priceSort } =
      req.query;
    if (size) {
      if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size)) {
        return res.status(400).send({
          status: false,
          message: "size must be among these [S, XS, M, X, L, XXL, XL] only.",
        });
      }
    }
    if (priceSort) {
      if (!["1", "-1"].includes(priceSort)) {
        return res.status(400).send({
          status: false,
          message: "priceSort must be 1 or -1.",
        });
      }
    }
    if (priceGreaterThan) {
      if (!/^[\d]+[.]*[\d]*$/.test(priceGreaterThan)) {
        return res.status(400).send({
          status: false,
          message: "priceGreaterThan must be valid.",
        });
      }
    }
    if (priceLessThan) {
      if (!/^[\d]+[.]*[\d]*$/.test(priceLessThan)) {
        return res.status(400).send({
          status: false,
          message: "priceLessThan must be valid.",
        });
      }
    }
    let totalProducts = await productModel
      .find({ isDeleted: false })
      .sort({ price: priceSort || 1 });
    const query = {};
    if (name) {
      query["title"] = { $regex: name };
    }
    if (size) {
      query["availableSizes"] = size;
    }
    if (priceGreaterThan && priceLessThan) {
      query["price"] = {
        $gt: Number(priceGreaterThan),
        $lt: Number(priceLessThan),
      };
    } else if (priceLessThan) {
      query["price"] = { $lt: Number(priceLessThan) };
    } else if (priceGreaterThan) {
      query["price"] = { $gt: Number(priceGreaterThan) };
    }
    query.isDeleted = false;
    // console.log(query);

    if (totalProducts.length === 0) {
      return res
        .status(404)
        .send({ status: false, message: "No Product found" });
    } else if (Object.keys(query).length === 1) {
      return res
        .status(200)
        .send({ status: true, message: "Success", data: totalProducts });
    } else {
      let finalFilter = await productModel
        .find(query)
        .sort({ price: priceSort || 1 });
      if (finalFilter.length > 0) {
        return res
          .status(200)
          .send({ status: true, message: "Success", data: finalFilter });
      } else {
        return res
          .status(404)
          .send({ status: false, message: "No Product found" });
      }
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

const getById = async function (req, res) {
  try {
    let productId = req.params.productId;
    if (!validator.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Please Provide valid productId" });
    }
    let checkData = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!checkData) {
      return res
        .status(404)
        .send({ status: false, message: "Product not Found" });
    } else {
      return res
        .status(200)
        .send({ status: true, message: "Success", data: checkData });
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

const updateProduct = async function (req, res) {
  try {
    let productId = req.params.productId;
    productImage = req.files;
    let isfile = productImage && productImage.length > 0;
    if (!validator.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Please Provide valid productId" });
    }
    let product = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not Found" });
    }
    if (!isfile) {
      if (!validator.isValidRequestBody(req.body)) {
        return res.status(400).send({
          status: false,
          message: "Please provide product updation details",
        });
      }
    }
    let {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      availableSizes,
      style,
      isFreeShipping,
      installments,
    } = req.body;

    if (productImage && productImage.length > 0) {
      //upload to s3 and get the uploaded link
      let uploadedFileURL = await uploadFile(productImage[0]);
      product.productImage = uploadedFileURL;
    }
    // console.log(req.body);
    if (title) {
      if (!validator.isValid(title)) {
        return res.status(400).send({
          status: false,
          message: "Title must be strings.",
        });
      }
      const validTitle = await productModel.findOne({ title: title });
      if (validTitle) {
        return res.status(400).send({
          status: false,
          message: "Title already exists...",
        });
      }
      product.title = title;
    }
    if (isFreeShipping) {
      if (!["false", "true"].includes(isFreeShipping)) {
        return res.status(400).send({
          status: false,
          message: "isFreeShipping must be true or false.",
        });
      }
      product.isFreeShipping = isFreeShipping;
    }
    if (price) {
      if (!/^[\d]+[.]*[\d]*$/.test(price)) {
        return res.status(400).send({
          status: false,
          message: "price must be valid.",
        });
      }
      product.price = price;
    }
    if (installments) {
      if (!/^[\d]+$/.test(installments)) {
        return res.status(400).send({
          status: false,
          message: "Installments must be valid.",
        });
      }
      product.installments = installments;
    }
    if (description) {
      if (!validator.isValid(description)) {
        return res.status(400).send({
          status: false,
          message: "Description must be strings.",
        });
      }
      product.description = description;
    }
    if (currencyId) {
      if (currencyId !== "INR") {
        return res.status(400).send({
          status: false,
          message: "CurrencyId must be INR.",
        });
      }
    }
    if (currencyFormat) {
      if (currencyFormat !== "₹") {
        return res.status(400).send({
          status: false,
          message: "currencyFormat must be ₹.",
        });
      }
    }
    if (availableSizes) {
      availableSizes = availableSizes.split(",");
      if (!validator.isStringsArray(availableSizes)) {
        // console.log("1");
        return res.status(400).send({
          status: false,
          message:
            "availableSizes must be among these [S, XS, M, X, L, XXL, XL] only.",
        });
      }
      product.availableSizes = availableSizes;
    }
    if (style) {
      if (!validator.isValid(style)) {
        return res.status(400).send({
          status: false,
          message: "Style must be string .",
        });
      }
      product.style = style;
    }
    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      product,
      { new: true }
    );
    return res.status(200).send({
      status: true,
      message: "Success",
      data: updatedProduct,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
const deleteById = async function (req, res) {
  try {
    let productId = req.params.productId;
    if (!validator.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Please Provide valid productId" });
    }
    let checkData = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!checkData) {
      return res
        .status(404)
        .send({ status: false, message: "Product not Found" });
    } else {
      let del = await productModel.updateOne(
        { _id: productId },
        { isDeleted: true },
        { new: true }
      );
      return res.status(200).send({ status: true, message: "Success" });
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
module.exports = {
  createProduct,
  getById,
  getByQuery,
  updateProduct,
  deleteById,
};
