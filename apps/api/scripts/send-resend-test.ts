import "dotenv/config";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "re_xxxxxxxxx";
const to = process.env.RESEND_TEST_TO ?? "naren.sathiya@tether-labs.com";

if (apiKey === "re_xxxxxxxxx") {
  throw new Error(
    "Replace re_xxxxxxxxx with your real Resend API key by setting RESEND_API_KEY in .env or your shell.",
  );
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
  to,
  subject: "Hello World",
  html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
});

if (error) {
  throw new Error(`Resend test failed: ${error.message}`);
}

console.log("Resend test email sent:", data);
