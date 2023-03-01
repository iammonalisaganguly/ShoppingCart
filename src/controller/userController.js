const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validator = require("../validator/validator");
const userModel = require("../model/userModel");
const { uploadFile } = require("../validator/awsS3");

const createUser = async function (req, res) {
  try {
    if (!validator.isValidRequestBody(req.body)) {
      return res.status(400).send({
        status: false,
        message: "Please provide user details",
      });
    }
    let mandetory = ["fname", "lname", "email", "password", "phone", "address"];
    const data = req.body;
    // console.log(data.fname)
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
        message: `These are mandetory field, please provide => ${requireList}.`,
      });
    }

    let { fname, lname, email, password, phone, address } = data;
    try {
      address = JSON.parse(address);
    } catch (err) {
      return res.status(400).send({
        status: false,
        message: "provide address in correct JSON object format.",
      });
    }
    // console.log(address);

    // Validation of fname
    if (!validator.isValidName(fname)) {
      return res.status(400).send({ status: false, message: "Invalid fname" });
    }
    // Validation of lname
    if (!validator.isValidName(lname)) {
      return res.status(400).send({ status: false, message: "Invalid lname" });
    }
    // Validation of email id
    if (!validator.isValidEmail(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid email id" });
    }
    // Validation of password
    if (!validator.isValidPassword(password)) {
      return res.status(400).send({
        status: false,
        message: `Password is required, Please enter At least one upper case,  one lower case English letter, one digit,  one special character and minimum eight in length`,
      });
    }

    // Validation of phone number
    if (!validator.isValidMobile(phone)) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid phone number" });
    }
    shippingAddress = address.shipping;
    billingAddress = address.billing;
    if (shippingAddress) {
      if (!validator.isValidAddress(shippingAddress)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid shipping address" });
      }
    } else {
      return res
        .status(400)
        .send({ status: false, message: "provide shipping address" });
    }
    if (billingAddress) {
      if (!validator.isValidAddress(billingAddress)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid billing address" });
      }
    } else {
      return res
        .status(400)
        .send({ status: false, message: "provide billing address" });
    }
    let invalidEmail = await userModel.findOne({ email: email });
    if (invalidEmail) {
      return res.status(400).send({
        status: false,
        message: "Email already exists...",
      });
    }
    let invalidPhone = await userModel.findOne({ phone: phone });
    if (invalidPhone) {
      return res.status(400).send({
        status: false,
        message: "Phone already exists...",
      });
    }
    profileImage = req.files;
    if (profileImage && profileImage.length > 0) {
      //upload to s3 and get the uploaded link
      let uploadedFileURL = await uploadFile(profileImage[0]);
      data.profileImage = uploadedFileURL;
    } else {
      return res.status(400).send({
        status: false,
        message: "profileImage is required.",
      });
    }
    data.password = await bcrypt.hash(password, 10);
    data.address = address;
    const createdUser = await userModel.create(data);
    return res.status(201).send({
      status: true,
      message: "user created Successfully.",
      data: createdUser,
    });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};
//==========================Get User Api (/login)=======================================

const login = async function (req, res) {
  try {
    const requestBody = req.body;
    if (!validator.isValidRequestBody(requestBody)) {
      return res.status(400).send({
        status: false,
        message: "Please provide login details",
      });
    }

    let { email, password } = requestBody;
    if (!validator.isValidEmail(email)) {
      return res.status(400).send({
        status: false,
        message: `Email is mandatory and provide valid email address`,
      });
    }
    if (!validator.isValidPassword(password)) {
      return res.status(400).send({
        status: false,
        message: `Password is required, Please enter At least one upper case,  one lower case English letter, one digit,  one special character and minimum eight in length`,
      });
    }
    let validuser = await userModel.findOne({ email: email });
    if (!validuser) {
      return res
        .status(404)
        .send({ status: false, message: "Credential don't match." });
    } else {
      const result = await bcrypt.compare(password, validuser.password);
      if (!result) {
        return res
          .status(404)
          .send({ status: false, message: "Credential don't match." });
      }
    }
    // creating Jwt
    let token = jwt.sign(
      {
        userId: validuser._id,
        iat: Math.floor(Date.now() / 1000) - 30,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      "secretkey"
    );
    return res.status(200).send({ 
      status: true,
      message: "User login successfully",
      data: { userId: validuser._id, token: token },
    });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

//==========================Get User Api (user/:userId/profile)=======================================

const getUser = async (req, res) => {
  try {
    let userId = req.params.userId;
    if (!validator.isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "Please Provide valid UserId" });
    }
    let checkData = await userModel.findById(userId);
    if (!checkData) {
      return res.status(404).send({ status: false, message: "User not Found" });
    }
    return res
      .status(200)
      .send({ status: true, message: "Success", data: checkData });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//=========================Update User Api (user/:userId/profile)===================================

const update = async function (req, res) {
  try {
    // Validate body
    const body = req.body;
    let profileImage = req.files;
    let isfile = profileImage && profileImage.length > 0;
    if (!isfile) {
      if (!validator.isValidRequestBody(body)) {
        return res.status(400).send({
          status: false,
          message: "please provide updation details...",
        });
      }
    }

    // Validate params
    userId = req.params.userId;
    if (!validator.isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: `${userId} is invalid` });
    }

    const userFound = await userModel.findOne({
      _id: userId,
    });
    if (!userFound) {
      return res
        .status(404)
        .send({ status: false, message: "User does not exist" });
    }

    // Destructuring
    let { fname, lname, email, phone, password, address } = body;

    if (fname) {
      if (!validator.isValidName(fname)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid fname" });
      }
      userFound["fname"] = fname;
    }
    if (lname) {
      if (!validator.isValidName(lname)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid lname" });
      }
      userFound["lname"] = lname;
    }

    // Updating of email
    if (email) {
      if (!validator.isValidEmail(email)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid email id" });
      }
      let invalidEmail = await userModel.findOne({ email: email });
      if (invalidEmail) {
        return res.status(400).send({
          status: false,
          message: "Email already exists...",
        });
      }
      userFound["email"] = email;
    }

    // Updating of phone
    if (phone) {
      if (!validator.isValidMobile(phone)) {
        return res
          .status(400)
          .send({ status: false, message: "Invalid phone number" });
      }
      let invalidPhone = await userModel.findOne({ phone: phone });
      if (invalidPhone) {
        return res.status(400).send({
          status: false,
          message: "phone already exists...",
        });
      }
      userFound["phone"] = phone;
    }

    // Updating of password
    if (password) {
      if (!validator.isValidPassword(password)) {
        return res.status(400).send({
          status: false,
          message: `Password is required, Please enter At least one upper case, one lower case English letter, one digit,  one special character and minimum eight in length`,
        });
      }
      const encrypt = await bcrypt.hash(password, 10);
      userFound["password"] = encrypt;
    }

    // Updating address
    if (address) {
      try {
        address = JSON.parse(address);
      } catch (err) {
        return res.status(400).send({
          status: false,
          message: "provide address in correct JSON object format.",
        });
      }
      if (address["shipping"]) {
        if (address.shipping.street) {
          if (!validator.isValid(address.shipping.street)) {
            return res
              .status(400)
              .send({ status: false, message: "Please provide street" });
          }
          userFound["address"]["shipping"]["street"] = address.shipping.street;
        }
        if (address.shipping.city) {
          if (!validator.isValid(address.shipping.city)) {
            return res
              .status(400)
              .send({ status: false, message: "Please provide city" });
          }
          userFound.address.shipping.city = address.shipping.city;
        }
        if (address.shipping.pincode) {
          // Validate shipping pincode
          if (!validator.isValidPincode(address.shipping.pincode)) {
            return res
              .status(400)
              .send({ status: false, message: "Invalid Shipping pincode" });
          }
          userFound.address.shipping.pincode = address.shipping.pincode;
        }
      }
      if (address.billing) {
        if (address.billing.street) {
          if (!validator.isValid(address.billing.street)) {
            return res.status(400).send({
              status: false,
              message: "Please valid provide street of billing address.",
            });
          }
          userFound.address.billing.street = address.billing.street;
        }
        if (address.billing.city) {
          if (!validator.isValid(address.billing.city)) {
            return res.status(400).send({
              status: false,
              message: "Please valid provide city of billing address.",
            });
          }
          userFound.address.billing.city = address.billing.city;
        }
        if (address.billing.pincode) {
          let pincode = address.billing.pincode;
          if (!validator.isValidPincode(pincode)) {
            return res.status(400).send({
              status: false,
              message: "Please provide valid pincode of billing address.",
            });
          }
          userFound.address.billing.pincode = address.billing.pincode;
        }
      }
    }
    if (profileImage && profileImage.length > 0) {
      //upload to s3 and get the uploaded link
      let uploadedFileURL = await uploadFile(profileImage[0]);
      userFound.profileImage = uploadedFileURL;
    }
    const updated = await userModel.findOneAndUpdate(
      { _id: userId },
      userFound,
      { new: true }
    );
    return res
      .status(200)
      .send({ status: true, message: "updated successfully", data: updated });
  } catch (err) {
    res.status(500).send({ message: "Error", error: err.message });
  }
};

module.exports = { createUser, getUser, update, login };
