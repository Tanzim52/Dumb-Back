const { body } = require("express-validator");

const categoryValidator = [
  // Main category fields
  body("id")
    .exists({ checkNull: true })
    .withMessage("id is required")
    .bail()
    .isString()
    .withMessage("id must be a string")
    .trim(),
  body("name")
    .exists({ checkNull: true })
    .withMessage("name is required")
    .bail()
    .isString()
    .withMessage("name must be a string")
    .trim(),
  body("slug")
    .exists({ checkNull: true })
    .withMessage("slug is required")
    .bail()
    .isString()
    .withMessage("slug must be a string")
    .trim()
    .toLowerCase(),

  // subCategories is optional but if present must be an array
  body("subCategories")
    .optional()
    .isArray()
    .withMessage("subCategories must be an array"),

  // Validate each subCategory entry
  body("subCategories.*.id")
    .optional()
    .isString()
    .withMessage("subCategory id must be a string")
    .trim(),
  body("subCategories.*.name")
    .optional()
    .isString()
    .withMessage("subCategory name must be a string")
    .trim(),
  body("subCategories.*.slug")
    .optional()
    .isString()
    .withMessage("subCategory slug must be a string")
    .trim()
    .toLowerCase(),

  // childCategories inside each subCategory
  body("subCategories.*.childCategories")
    .optional()
    .isArray()
    .withMessage("childCategories must be an array"),
  body("subCategories.*.childCategories.*.id")
    .optional()
    .isString()
    .withMessage("childCategory id must be a string")
    .trim(),
  body("subCategories.*.childCategories.*.name")
    .optional()
    .isString()
    .withMessage("childCategory name must be a string")
    .trim(),
  body("subCategories.*.childCategories.*.slug")
    .optional()
    .isString()
    .withMessage("childCategory slug must be a string")
    .trim()
    .toLowerCase(),
];

module.exports = { categoryValidator };
