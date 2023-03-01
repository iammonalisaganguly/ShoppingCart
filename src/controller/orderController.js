//!============================***** order Api *******===========================================//
const OrderModel = require("../model/orderModel");
const UserModel = require("../model/userModel");
const CartModel = require("../model/cartModel");

const {
  isValidObjectId,
  isValid,
  isValidRequestBody,
} = require("../validator/validator");
const createOrder = async function (req, res) {
  try {
    const userId = req.params.userId;

    if (!isValidObjectId(userId))
      return res
        .status(400)
        .send({ status: false, message: "USER ID is not in proper format " });

    const findUser = await UserModel.findOne({ _id: userId });
    if (!findUser)
      return res.status(404).send({
        status: false,
        message: "User details not found with this provided userId",
      });

    const data = req.body;
    const { cartId, cancellable, status } = data;

    if (!isValidRequestBody(data))
      return res
        .status(400)
        .send({ status: true, message: "Request body cannot remain empty" });

    // validation for cartId
    if (!isValid(cartId))
      return res
        .status(400)
        .send({ status: false, message: "CartId is required" });
    if (!isValidObjectId(cartId))
      return res.status(400).send({
        status: false,
        message: `The given cartId: ${cartId} is not in proper format`,
      });
    if (cancellable) {
      if (![true, false].includes(cancellable)) {
        return res.status(400).send({
          status: false,
          message: `Cancellable must be true or false.`,
        });
      }
    }
    if (status) {
      if (!["pending"].includes(status)) {
        return res.status(400).send({
          status: false,
          message: `status must be pending only at time of order creation.].`,
        });
      }
    }

    // finding cart details
    const findCart = await CartModel.findOne({ _id: cartId, userId: userId });
    if (!findCart)
      return res.status(404).send({
        status: false,
        message: "Cart details are not found with the cartId",
      });

    // if cart exist getting the OVERALL number of quantity of products
    if (findCart.items.length == 0)
      return res.status(400).send({
        status: false,
        message: "You have not added any products in your cart",
      });
    if (findCart) {
      let array = findCart.items;
      var count = 0;
      for (let i = 0; i < array.length; i++) {
        if (array[i].quantity) {
          count += findCart.items[i].quantity;
        }
      }
    }

    let response = {
      userId: findCart.userId,
      items: findCart.items,
      totalPrice: findCart.totalPrice,
      totalItems: findCart.totalItems,
      totalQuantity: count,
      cancellable: cancellable,
      status: status || "pending",
    };

    // creating the order
    const orderCreated = await OrderModel.create(response);

    // just to update the cart DB after order is placed
    const updatedCart = await CartModel.findOneAndUpdate(
      { _id: cartId, userId: userId },
      { $set: { items: [], totalPrice: 0, totalItems: 0 } },
      { new: true }
    );
    return res
      .status(201)
      .send({ status: true, message: "Success", data: orderCreated });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
const updateOrder = async function (req, res) {
  try {
    const userId = req.params.userId;

    if (!isValidObjectId(userId))
      return res
        .status(400)
        .send({ status: false, message: "USER ID is not in proper format " });

    const findUser = await UserModel.findOne({ _id: userId });
    if (!findUser)
      return res.status(404).send({
        status: false,
        message: "User details not found with this provided userId",
      });

    const data = req.body;
    const { orderId, status } = data;

    if (!isValidRequestBody(data))
      return res
        .status(400)
        .send({ status: true, message: "Request body cannot remain empty" });

    // validation for cartId
    if (!isValid(orderId))
      return res
        .status(400)
        .send({ status: false, message: "orderId is required" });
    if (!isValidObjectId(orderId)) {
      return res.status(400).send({
        status: false,
        message: `The given cartId: ${orderId} is invalid`,
      });
    }
    if (status) {
      if (!["pending", "completed", "canceled"].includes(status)) {
        return res.status(400).send({
          status: false,
          message: `status must be among these [pending, completed, canceled].`,
        });
      }
    } else {
      return res.status(400).send({
        status: false,
        message: `please provide status among these [pending, completed, canceled] to update.`,
      });
    }

    // finding cart details
    const order = await OrderModel.findOne({
      _id: orderId,
      userId: userId,
      isDeleted: false,
    });
    if (!order)
      return res.status(404).send({
        status: false,
        message: "order details are not found with the orderId",
      });
    if (!order.cancellable && status === "canceled") {
      return res.status(400).send({
        status: false,
        message: "your order is not cancellable.",
      });
    }
    if (order.status === "completed") {
      return res.status(400).send({
        status: false,
        message:
          "your order is complete so you cannot change status to pending or canceled.",
      });
    }
    if (order.status === "canceled") {
      return res.status(400).send({
        status: false,
        message:
          "your order is canceled so you cannot change status to pending or completed.",
      });
    }

    const updatedorder = await OrderModel.findOneAndUpdate(
      { _id: orderId, userId: userId },
      { $set: { status: status } },
      { new: true }
    );
    return res
      .status(200)
      .send({ status: true, message: "Success", data: updatedorder });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
module.exports = { createOrder, updateOrder };
