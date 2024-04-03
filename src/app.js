const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ApiError = require("./utils/ApiError");
const app = express();
const router = require("./router");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("../swagger_output.json"); // Generated Swagger file
const stripe = require("stripe")(
  "sk_test_51OE16ACCCn8BoWQ4rQMOpN6kdhqsJWYQRpmKTIu6AY63kUGpZRfDvk480vtyqga2GBfmo3u7Wx3Y2Qu279Wa0JaU00VUcXAvQE"
);

// Middlewares
app.use(express.json());
app.use(cors());
app.options("*", cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(loggerMiddleware);

// router index
app.use("/", router);
// api doc
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.get("/", async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: "jiwero9803@felibg.com",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
    });
    res.json(account); // Send account details as JSON response
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/get-price-id", async (req, res) => {
  try {
    const price = await stripe.prices.create({
      unit_amount: 1000, // The amount in the smallest currency unit (e.g., cents for USD)
      currency: "usd",
      product: "your_product_id", // Replace 'your_product_id' with the ID of your product
      recurring: {
        // Optional: Add recurring details if it's a recurring price
        interval: "month",
      },
    });
    console.log("Price created:", price.id);
    res.json(price); // Send account details as JSON response
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/account-link", async (req, res) => {
  try {
    const accountId = "acct_1P1XWWCIWEReYA9E";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://example.com/reauth",
      return_url: "https://example.com/return",
      type: "account_onboarding",
    });
    // res.json(accountLink); // Send account details as JSON response
    // res.send(accountLink);
    console.log(accountLink);
    console.log(accountId);
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-account", async (req, res) => {
  try {
    // Seller ka email address jo aapke paas available hai
    const sellerEmail = "jiwero9803@felibg.com";

    // Stripe ke API ke through seller ke email address ke basis par Express account ID retrieve karna
    const accounts = await stripe.accounts.list({ email: sellerEmail });
    console.log("accounts.......", accounts);

    // Agar koi Express account milta hai seller ke email address ke basis par
    if (accounts && accounts.data && accounts.data.length > 0) {
      // Sabse pehle account ka ID retrieve karna
      const expressAccountId = accounts.data[0].id;

      // Express account ID ko provide karna
      res.json({ expressAccountId });
    } else {
      // Agar koi account nahi milta seller ke email address ke basis par
      res
        .status(404)
        .json({ error: "No account found for the provided email address" });
    }
  } catch (error) {
    console.error("Error fetching Express account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const sellers = [
  {
    connectedAccountId: "acct_1P1XxQCBxNw9K7WH",
    productName: "Product 1",
    amount: 10,
  },
  // {
  //   connectedAccountId: "acct_1P1Z3JQ5nbVA3I7s",
  //   productName: "Product 2",
  //   amount: 20,
  // },
];

app.post("/process-payout", async (req, res) => {
  try {
    let totalAmount = 0;
    sellers.forEach((seller) => {
      totalAmount += seller.amount;
    });

    // Create payouts to each seller's connected account
    const payouts = await Promise.all(
      sellers.map(async (seller) => {
        // const payout = await stripe.payouts.create({
        //   amount: seller.amount,
        //   currency: "usd",
        //   method: "instant", // Change to 'standard' for standard payout
        //   destination: seller.connectedAccountId,
        //   description: `Payout for ${seller.productName}`,
        // });
        const payout = await stripe.transfers.create({
          amount: seller.amount,
          currency: "usd",
          destination: seller.connectedAccountId,
          transfer_group: "ORDER10", // Optional: Use a transfer group to group related transfers
        });
        // const payout = await stripe.checkout.sessions.create({
        //   mode: "payment",
        //   line_items: [
        //     {
        //       price: "price_1P1ZnvCCCn8BoWQ4rMeDtL2e",
        //       quantity: 1,
        //     },
        //   ],
        //   payment_intent_data: {
        //     application_fee_amount: 2,
        //     transfer_data: {
        //       destination: seller.connectedAccountId,
        //     },
        //   },
        //   success_url: "https://example.com/success",
        //   cancel_url: "https://example.com/cancel",
        // });
        return payout;
      })
    );

    // Respond with payout information
    res.json({ totalAmount: totalAmount, payouts: payouts });
  } catch (error) {
    console.error("Error processing payouts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, "Not found"));
});

module.exports = app;
