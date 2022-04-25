const schemas = require("../validations/Users");
const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const express = require("express");
const { create, index, login, projectsList, resetPassword, update, deleteUser } = require("../controllers/Users");

const router = express.Router();

router.get("/", index);
router.route("/").post(validate(schemas.createValidation), create);
router.route("/").patch(authenticate, validate(schemas.updateValidation), update);
router.route("/login").post(validate(schemas.loginValidation), login);
router.route("/projects").get(authenticate,projectsList)
router.route("/reset-password").post(validate(schemas.resetPasswordValidation), resetPassword)
router.route("/:id").delete(authenticate, deleteUser)

module.exports = router;