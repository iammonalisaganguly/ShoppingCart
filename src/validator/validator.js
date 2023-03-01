const mongoose = require("mongoose");

const isValidName = function (value) {
  if (
    typeof value === "string" &&
    value.trim().length > 0 &&
    /^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(value)
  )
    return true;
  return false;
};
const isValid = function (value) {
  if (typeof value === "string" && value.trim().length > 0) return true;
  return false;
};
const isValidPassword = function (value) {
  if (
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(
      value
    )
  )
    return true;
  return false;
};
const isValidEmail = function (value) {
  if (/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(value)) return true;
  return false;
};
const isValidDate = function (value) {
  if (/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/.test(value))
    return true;
  return false;
};

const isValidTitle = function (title) {
  return ["Mr", "Mrs", "Miss"].includes(title);
};

const isValidMobile = function (value) {
  if (typeof value === "string" && /^[0-9]\d{9}$/gi.test(value)) return true;
  return false;
};
const isValidPincode = function (value) {
  if (typeof value === "string" && /^[0-9]\d{5}$/gi.test(value)) return true;
  return false;
};

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

const isValidObjectId = function (objectId) {
  return mongoose.isValidObjectId(objectId);
};

const isStringsArray = function (arr) {
  if (!Array.isArray(arr)) return false;
  for (let i = 0; i < arr.length; i++) {
    if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(arr[i])) return false;
  }
  return true;
};
const isValidAddress = function (obj) {
  const { street, city, pincode } = obj;
  if (!isValid(street)) return false;
  if (!isValid(city)) return false;
  if (!isValidPincode(pincode)) return false;
  return true;
};

module.exports = {
  isValid,
  isValidTitle,
  isValidRequestBody,
  isValidObjectId,
  isValidPassword,
  isValidEmail,
  isStringsArray,
  isValidName,
  isValidMobile,
  isValidDate,
  isValidAddress,
  isValidPincode,
};

// console.log(typeof 122);
