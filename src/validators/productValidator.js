const { body, query } = require("express-validator");

const url = (field) =>
  body(field)
    .optional()
    .isString()
    .bail()
    .isURL()
    .withMessage(`${field} must be a valid URL`);

exports.createOrUpdateRules = [
  body("name").isString().trim().isLength({ min: 2, max: 180 }),
  body("description").isString().trim().isLength({ min: 10, max: 4000 }),
  body("category").isString().trim().notEmpty(),
  body("subcategory").optional().isString().trim(),
  body("brand").optional().isString().trim(),

  body("sku")
    .isString()
    .trim()
    .notEmpty()
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage("sku must be alphanumeric/dash/underscore"),

  body("price").isFloat({ min: 0 }),
  body("discount_price").optional().isFloat({ min: 0 }),

  body("stock_quantity").optional().isInt({ min: 0 }),
  body("unit").optional().isString().trim(),
  body("availability_status")
    .optional()
    .isIn(["In Stock", "Out of Stock", "Preorder", "Discontinued"]),

  body("images").optional().isArray({ max: 12 }),
  body("images.*").optional().isURL(),
  url("video"),

  body("attributes").optional().isObject(),
  body("attributes.size").optional().isArray(),
  body("attributes.color").optional().isArray(),

  body("shipping").optional().isObject(),
  body("shipping.delivery_options").optional().isArray(),
  body("shipping.shipping_cost").optional().isFloat({ min: 0 }),

  body("metadata").optional().isObject(),
  body("metadata.tags").optional().isArray(),
  body("metadata.rating").optional().isFloat({ min: 0, max: 5 }),
  body("metadata.reviews_count").optional().isInt({ min: 0 }),

  body("is_new_arrival").optional().isBoolean(),
  body("is_best_seller").optional().isBoolean(),
  body("is_deal").optional().isBoolean(),
  body("added_date").optional().isISO8601(),

  // guard: discount <= price
  body().custom((val) => {
    if (
      val.discount_price != null &&
      val.price != null &&
      Number(val.discount_price) > Number(val.price)
    ) {
      throw new Error("discount_price cannot be greater than price");
    }
    return true;
  }),
];

exports.listRules = [
  query("search").optional().isString(),
  query("category").optional().isString(),
  query("brand").optional().isString(),
  query("is_deal").optional().isBoolean().toBoolean(),
  query("is_best_seller").optional().isBoolean().toBoolean(),
  query("is_new_arrival").optional().isBoolean().toBoolean(),
  query("minPrice").optional().isFloat({ min: 0 }).toFloat(),
  query("maxPrice").optional().isFloat({ min: 0 }).toFloat(),
  query("tags").optional().isString(), // pipe-separated
  query("sort").optional().isString(), // price_asc|price_desc|newest|top_rated
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];
