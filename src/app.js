const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ApiError = require("./utils/ApiError");
const app = express();
const router = require("./router");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("../swagger_output.json"); // Generated Swagger file
const fileUpload = require("express-fileupload");
const crypto = require("crypto");
// const stripe = require("stripe")(
//   "sk_test_51OE16ACCCn8BoWQ4rQMOpN6kdhqsJWYQRpmKTIu6AY63kUGpZRfDvk480vtyqga2GBfmo3u7Wx3Y2Qu279Wa0JaU00VUcXAvQE"
// );
const fs = require("fs");
const path = require("path");
// const stripe = require("stripe")(
//   "sk_test_51NTfNnFZBUanTSPGIISZwxWJZEQ8xXtHJFZeEQLkcP3CrGr9BztDZCjqk6gHEVHeq3nNMhFq4tw8lXgxFZRKix0U000GuAZRy3"
// );
// umermemon4648@gmail.com => stripe key
const stripe = require("stripe")(
  "sk_test_51P2H7LRsBI9RwO6zj7d2wTE8h7D7yRhJNTv59hh5Fjn4ljn9qjpZZ1H7M9kUZhhlFK37Do2XiQMBPX6KOH9bRFHq00mlwqaG1Y"
);

// const STRIPE_CLIENT_ID =
//   "pk_test_51NTfNnFZBUanTSPGPrsF6rWLNPzpv8DnG6u3THjcQ42IkBNIoM7WovT3g1gV24hSY5bBpiDOICqbmBMqY63wsCIK00dljJ1UZj";
// const STRIPE_CLIENT_ID =
//   "pk_test_51OE16ACCCn8BoWQ43KNACLEWsYoIJvjP0ijCroGqkzC117iuiSTPRdo1G4q2jRUkUTxohfeOaFBICJdfs8gjvp4500MJnj6lej";
// Middlewares
app.use(express.json());
app.use(cors());
app.options("*", cors());
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(loggerMiddleware);

// router index
app.use("/", router);

// api doc
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

const user = {
  name: "Sadia",
  // email: "memonumer504@gmail.com",
  email: "seneri8749@ekposta.com",
  country: "US",
};

app.get("/", async (req, res) => {
  try {
    const iconPath = path.join(__dirname, "icon.png");
    const logoPath = path.join(__dirname, "icon.png");

    const iconData = fs.readFileSync(iconPath);
    const logoData = fs.readFileSync(logoPath);

    const iconFile = await stripe.files.create({
      file: {
        data: iconData,
        name: "icon.png",
        type: "image/png",
      },
      purpose: "business_icon",
    });
    console.log("icons file.....", iconFile);

    const logoFile = await stripe.files.create({
      file: {
        data: logoData,
        name: "icon.png",
        type: "image/png",
      },
      purpose: "business_logo",
    });
    console.log("logoFile file.....", logoFile);

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      business_type: "individual",
      business_profile: {
        mcc: "5718",
        url: "https://chat.openai.com/c/f2978386-c877-48eb-810a-d8fc652fc824",
        name: user.name,
        product_description: "Email newsletter",
        support_email: user.email,
      },
      tos_acceptance: {
        service_agreement: "recipient",
        service_agreement: user.country == "US" ? "full" : "recipient",
      },
      // settings: {
      //   branding: {
      //     icon: iconFile.id,
      //     logo: logoFile.id,
      //     primary_color: "#09aed3",
      //     secondary_color: "#092027",
      //   },
      // },
    });

    console.log("account..................", account);
    res.send(account);
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://example.com/reauth",
      return_url: "https://example.com/return",
      type: "account_onboarding",
      // collect: "eventually_due",
    });
    res.redirect(link.url);
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const sellers = [
  {
    connectedAccountId: "acct_1P1XxQCBxNw9K7WH",
    productName: "Product 1",
    amount: 10,
  },
  {
    connectedAccountId: "acct_1P1Z3JQ5nbVA3I7s",
    productName: "Product 2",
    amount: 20,
  },
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
