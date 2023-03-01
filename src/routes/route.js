const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const productController = require("../controller/productController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
const auth = require("../middleware/auth");

//user Apis
router.post("/register", userController.createUser);
router.post("/login", userController.login);
router.get("/user/:userId/profile",auth.Authentication,auth.Authorisation,userController.getUser);
router.put("/user/:userId/profile",auth.Authentication,auth.Authorisation,userController.update);

//product Apis
router.post("/products", productController.createProduct);
router.get("/products", productController.getByQuery);
router.get("/products/:productId", productController.getById);
router.put("/products/:productId", productController.updateProduct);
router.delete("/products/:productId", productController.deleteById);
//cart Apis
router.post("/users/:userId/cart",auth.Authentication,auth.Authorisation,cartController.createCart);
router.get("/users/:userId/cart",auth.Authentication,auth.Authorisation,cartController.getCart);
router.put("/users/:userId/cart",auth.Authentication,auth.Authorisation,cartController.updateCart);
router.delete("/users/:userId/cart",auth.Authentication,auth.Authorisation,cartController.deleteCart);

//order Apis
router.post("/users/:userId/orders",auth.Authentication,auth.Authorisation,orderController.createOrder);
router.put("/users/:userId/orders",auth.Authentication,auth.Authorisation,orderController.updateOrder);

router.all("/*", function (req, res) {
  res.status(400).send("Invalid request....!!!");
});

module.exports = router;
