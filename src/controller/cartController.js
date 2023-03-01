const userModel = require("../model/userModel");
const productModel = require("../model/productModel");
const cartModel = require("../model/cartModel");
const {
  isValidRequestBody,
  isValidObjectId,
} = require("../validator/validator");
// ----------------------------------------------------------------------------------------
// create cart
const createCart = async function (req, res) {
  try {
    let userId = req.params.userId;
    let data = req.body;
    let { productId, quantity, cartId } = data;

    if (!isValidRequestBody(data) || !productId)
      return res
        .status(400)
        .send({ status: false, message: "please enter a product to Cart" });

    if (!isValidObjectId(userId))
      return res
        .status(400)
        .send({ status: false, message: "please enter a valid userID" });
    if (productId) {
      if (!isValidObjectId(productId))
        return res
          .status(400)
          .send({ status: false, message: "please  enter a valid productID" });
    } else {
      return res.status(400).send({ status: false, message: "productID is required." });
    }

    let validUser = await userModel.findOne({ _id: userId });
    //console.log(validUser)
    //console.log(userId)
    if (!validUser)
      return res.status(404).send({ status: false, message: "user not found" });
    
    let validProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    // console.log(productId, validProduct);
    if (!validProduct) {
      return res
        .status(404)
        .send({ status: false, message: "product not found" });
    }
    if (!cartId) {
      const cart = await cartModel.findOne({ userId: userId });
      if (cart) {
        cartId = cart._id;
      }
    }
    if (!cartId) {
      const newCart = {
        userId: userId,
        items: [
          {
            productId: productId,
            quantity: quantity || 1,
          },
        ],
        totalPrice: validProduct.price * (quantity || 1),
        totalItems: 1,
      };
      const cartCreated = await cartModel.create(newCart);
      let fetchData = await cartModel.findById(cartCreated._id).populate({
        path: "items",
        populate: {
          path: "productId",
          select: ["title", "price", "productImage"],
        },
      });
      return res
        .status(201)
        .send({ status: true, message: "Success", data: fetchData });
    } else if (cartId) {
      if (!isValidObjectId(cartId))
        return res
          .status(400)
          .send({ status: false, message: "please  enter a valid cartID" });
      let validCart = await cartModel.findOne({
        _id: cartId,
        userId: userId,
      });
      if (!validCart) {
        return res
          .status(404)
          .send({ status: false, message: "cart no exist" });
      }

      const updationCart = validCart._doc;
      if (validCart) {
        if (updationCart.items.length == 0) {
          let item1 = {
            productId: productId,
            quantity: quantity || 1,
          };
          updationCart.items.push(item1);
          updationCart.totalPrice = validProduct.price * (quantity || 1);
          updationCart.totalItems = 1;
        } else {
          let items = updationCart.items;
          let flag = true;
          for (let item of items) {
            if (item.productId.toString() === productId) {
              item.quantity = item.quantity + 1;
              flag = false;
            }
          }
          if (flag) {
            let item1 = {
              productId: productId,
              quantity: quantity || 1,
            };
            updationCart.items.push(item1);
            updationCart.totalItems += 1;
          }
          updationCart.totalPrice += validProduct.price * (quantity || 1);
        }

        const updatedCart = await cartModel.findOneAndUpdate(
          { _id: cartId, userId: userId },
          updationCart,
          { new: true }
        );
        let fetchData = await cartModel.findById(updatedCart._id).populate({
          path: "items",
          populate: {
            path: "productId",
            select: ["title", "price", "productImage"],
          },
        });
        return res
          .status(201)
          .send({ status: true, message: "Success", data: fetchData });
      }
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
// ----------------------------------------------------------------------------------------
// update cart
const updateCart = async function (req, res) {
  try {
    userId = req.params.userId;

    // validation for userId
    if (!isValidObjectId(userId))
      return res
        .status(400)
        .send({ status: false, message: "userid is invalid " });

    // searching the user Id
    const searchUser = await userModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!searchUser)
      return res.status(404).send({ status: false, message: "User not found" });

    const data = req.body;
    let { cartId, productId, removeProduct } = data;
    // console.log(cartId);

    // checking body for empty or not
    if (!isValidRequestBody(data))
      return res
        .status(400)
        .send({ status: false, message: "please provide updation details." });

    // validation for productId
    if (productId) {
      if (!isValidObjectId(productId))
        return res
          .status(400)
          .send({ status: false, message: "productid is invalid" });
    } else {
      return res
        .status(400)
        .send({ status: false, message: "Please provide productId" });
    }

    const searchProduct = await productModel.findOne({
      _id: productId,
      isDeleted: false,
    });
    if (!searchProduct)
      return res
        .status(404)
        .send({ status: false, message: `Product not found.` });

    // validation for cartId
    if (!cartId)
      return res
        .status(400)
        .send({ status: false, message: "Please provide cartId" });

    if (!isValidObjectId(cartId))
      return res
        .status(400)
        .send({ status: false, message: `cartId is invalid.` });

    //checking cart details available or not
    const searchCart = await cartModel.findOne({ _id: cartId });
    if (!searchCart)
      return res.status(404).send({
        status: false,
        message: `Cart does not exists with this provided cartId: ${cartId}`,
      });

    //check for the empty items i.e., cart is now empty
    if (searchCart.items.length == 0)
      return res
        .status(400)
        .send({ status: false, message: "Your cart is empty." });

    // validatiion for removeProduct
    // if (!removeProduct)
    //   return res
    //     .status(400)
    //     .send({ status: false, message: "removeProduct is required" });

    if (![0, 1].includes(removeProduct))
      return res.status(400).send({
        status: false,
        message: "removeProduct is required, it can be only be '0' & '1'",
      });

    let cart = searchCart.items;
    for (let i = 0; i < cart.length; i++) {
      if (cart[i].productId == productId) {
        const priceChange = cart[i].quantity * searchProduct.price;

        // directly remove a product from the cart ireespective of its quantity
        if (removeProduct == 0) {
          const productRemove = await cartModel.findOneAndUpdate(
            { _id: cartId },
            {
              $pull: { items: { productId: productId } },
              totalPrice: searchCart.totalPrice - priceChange,
              totalItems: searchCart.totalItems - 1,
            },
            { new: true }
          );
          let fetchData = await cartModel.findById(productRemove._id).populate({
            path: "items",
            populate: {
              path: "productId",
              select: ["title", "price", "productImage"],
            },
          });
          return res
            .status(200)
            .send({ status: true, message: "Success", data: fetchData });
        }

        // remove the product when its quantity is 1
        if (removeProduct == 1) {
          if (cart[i].quantity == 1 && removeProduct == 1) {
            const priceUpdate = await cartModel.findOneAndUpdate(
              { _id: cartId },
              {
                $pull: { items: { productId: productId } },
                totalPrice: searchCart.totalPrice - priceChange,
                totalItems: searchCart.totalItems - 1,
              },
              { new: true }
            );
            let fetchData = await cartModel.findById(priceUpdate._id).populate({
              path: "items",
              populate: {
                path: "productId",
                select: ["title", "price", "description"],
              },
            });
            return res
              .status(200)
              .send({ status: true, message: "Success", data: fetchData });
          }

          // decrease the products quantity by 1
          cart[i].quantity = cart[i].quantity - 1;
          const updatedCart = await cartModel.findByIdAndUpdate(
            { _id: cartId },
            {
              items: cart,
              totalPrice: searchCart.totalPrice - searchProduct.price,
            },
            { new: true }
          );
          let fetchData = await cartModel.findById(updatedCart._id).populate({
            path: "items",
            populate: {
              path: "productId",
              select: ["title", "price", "description"],
            },
          });
          return res
            .status(200)
            .send({ status: true, message: "Success", data: fetchData });
        }
      }
    }
    return res
      .status(404)
      .send({ status: false, message: "product is not available in the cart" });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
// ----------------------------------------------------------------------------------------
// get cart
const getCart = async function (req, res) {
  try {
    let userId = req.params.userId;

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: "invalid userID" });
    }
    let checkUserId = await userModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!checkUserId) {
      return res.status(404).send({ status: false, message: "user not found" });
    }
    let fetchData = await cartModel
      .findOne({
        userId: userId,
        isDeleted: false,
      })
      .populate({
        path: "items",
        populate: {
          path: "productId",
          select: ["title", "price", "productImage"],
        },
      });
    if (!fetchData) {
      return res.status(404).send({ status: false, message: "cart not found" });
    }
    if (fetchData.items.length == 0) {
      return res.status(200).send({
        status: true,
        message: "Success",
        data: fetchData,
      });
    }
    return res
      .status(200)
      .send({ status: true, message: "Success", data: fetchData });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

// ----------------------------------------------------------------------------------------
// delete cart
const deleteCart = async function (req, res) {
  try {
    let Userid = req.params.userId;
    if (!isValidObjectId(Userid)) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid  UserID" });
    }
    const finduser = await userModel.findById(Userid);
    if (!finduser) {
      return res.status(404).send({ status: false, message: "user not found" });
    }

    const findCart = await cartModel.findOne({
      userId: Userid,
      isDeleted: false,
    });
    if (!findCart) {
      return res.status(404).send({ status: false, message: "cart not found" });
    }
    const deleteCart = await cartModel.findOneAndUpdate(
      { userId: Userid },
      { $set: { items: [], totalItems: 0, totalPrice: 0 } },
      { new: true }
    );
    return res.status(204).send({ status: true, message: "Success" });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = { createCart, updateCart, getCart, deleteCart };
