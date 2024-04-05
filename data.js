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

// stripe flow
// Function to generate a random state string for CSRF protection
function generateRandomString(length) {
  return crypto.randomBytes(length).toString("hex");
}

// Route to initiate connection with Stripe account
app.get("/connect1", async (req, res) => {
  try {
    // Initiate OAuth process with Stripe
    const redirectUrl = await stripe.oauth.authorizeUrl({
      response_type: "code",
      scope: "read_write",
      redirect_uri: "http://localhost:8001/callback", // Your custom callback URL
    });

    // Redirect the user to the Stripe authentication page
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error connecting Stripe account:", error);
    res.status(500).json({ message: "Failed to connect Stripe account." });
  }
});

app.get("/connect", (req, res) => {
  const state = generateRandomString(16);
  const redirectUri = "http://localhost:8001/callback"; // Replace with your frontend's callback URL
  const scope = "account:read write"; // Requested permissions

  // const authorizationUrl = new URL(
  //   "https://dashboard.stripe.com/oauth/authorize"
  // );
  // authorizationUrl.searchParams.set("client_id", stripe);
  // authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  // authorizationUrl.searchParams.set("state", state);
  // authorizationUrl.searchParams.set("scope", scope);
  // authorizationUrl.searchParams.set("response_type", "code");

  // So the issue here is that you are missing access-control-allow-origin header in your request. You can add this line to your headers:

  // headers: {
  //           Access-Control-Allow-Origin:: "https://connect.stripe.com",
  //         },
  //   const stripeAuthUrl = `
  //   https://dashboard.stripe.com/oauth/authorize?
  //     response_type=code
  //     &client_id=${process.env.STRIPE_CLIENT_ID}
  //     &scope=read_write
  // `;

  res.redirect(authorizationUrl.toString());
  // res.redirect(stripeAuthUrl);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  // Verify state to prevent CSRF attacks (omitted for brevity)
  // ...

  const data = {
    client_id: STRIPE_CLIENT_ID,
    client_secret: STRIPE_SECRET_KEY,
    grant_type: "authorization_code",
    code,
    redirect_uri: "http://localhost:8001/callback", // Replace with your callback URL
  };

  try {
    const tokenResponse = await axios.post(
      "https://oauth.stripe.com/v1/token",
      data
    );
    const accessToken = tokenResponse.data.access_token;

    // Use the access token to fetch account information or create an account
    const accountResponse = await axios.get(
      "https://api.stripe.com/v1/account",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const accountId = accountResponse.data.id;

    // Store the account ID in your database
    console.log(`Connected Stripe account ID: ${accountId}`);

    res.send("Account connected successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during connection.");
  }
});

app.get("/connect-stripe", async (req, res) => {
  try {
    // Initiate OAuth process with Stripe
    const redirectUrl = await stripe.oauth.authorizeUrl({
      response_type: "code",
      // client_id
      scope: "read_write", // Specify required permissions
    });

    // Redirect the user to the Stripe authentication page
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error connecting Stripe account:", error);
    res.status(500).json({ message: "Failed to connect Stripe account." });
  }
});

// Route to handle Stripe OAuth callback
app.get("/stripe-oauth", async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = response.stripe_user_id;

    // Store stripeAccountId in your database
    // This is a simplified example, you need to handle this securely

    res.json(stripeAccountId); // Send account details as JSON response
    // res.send({ message: "Stripe account connected successfully." });
  } catch (error) {
    console.error("Error handling Stripe OAuth callback:", error);
    res
      .status(500)
      .json({ message: "Failed to handle Stripe OAuth callback." });
  }
});

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

    // Upload branding logo file to Stripe
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
